import { describe, it, expect } from "vitest";
import {
  assertAccess,
  assertTransition,
  balance,
  operation,
  overlaps,
  boundarySchema,
  csv,
  researchColumns,
} from "../server/domain.js";
describe("Yetki ve iş akışı", () => {
  it("operatör yalnız kendi atamasını görür", () => {
    expect(() => assertAccess("OPERATOR", "a", "b")).toThrow();
    expect(() => assertAccess("OPERATOR", "a", null)).toThrow();
    expect(() => assertAccess("OPERATOR", "a", "a")).not.toThrow();
    expect(() => assertAccess("ADMIN", "a", "b")).not.toThrow();
  });
  it("terminal veya atlanan durum geçişini reddeder", () => {
    expect(() => assertTransition("REQUESTED", "COMPLETED")).toThrow();
    expect(() => assertTransition("COMPLETED", "RUNNING")).toThrow();
    expect(() => assertTransition("PLANNED", "RUNNING")).not.toThrow();
  });
  it("kısmi tahsilatı kuruş kaybetmeden hesaplar", () => {
    expect(balance("1000.10", "-0.10", ["200.20", "299.80"])).toBe("500.00");
    expect(balance("0.30", "0", ["0.10", "0.20"])).toBe("0.00");
  });
  it("komşu program aralıkları çakışmaz", () => {
    const d = (h: number) => new Date(2026, 0, 1, h);
    expect(overlaps(d(9), d(10), d(10), d(11))).toBe(false);
    expect(overlaps(d(9), d(11), d(10), d(12))).toBe(true);
  });
});
const e = (kind: string, m: number) => ({
  kind,
  at: new Date(Date.UTC(2026, 0, 1, 0, m)),
});
describe("Operasyon süreleri", () => {
  it("bekleme dahil tek saha süresi ve çakışmayan alt süreler üretir", () => {
    const o = operation(
      [
        e("PREPARATION", 0),
        e("FLIGHT_START", 5),
        e("FLIGHT_END", 15),
        e("REFILL", 17),
        e("BATTERY", 20),
        e("WAIT_START", 22),
        e("WAIT_END", 27),
        e("COMPLETE", 30),
      ],
      false,
    );
    expect(o.totalMinutes).toBe(30);
    expect(o.totals).toEqual({
      preparation: 10,
      flight: 10,
      refill: 3,
      battery: 2,
      waiting: 5,
    });
    expect(Object.values(o.totals).reduce((s, v) => s + v, 0)).toBe(30);
  });
  it("eksik tamamlanmayı sıfır olarak sunmaz", () => {
    expect(operation([e("PREPARATION", 0)]).totalMinutes).toBeNull();
    expect(() => operation([e("PREPARATION", 0)], false)).toThrow();
  });
  it("tekrarlanan/ters zaman ve açık uçuşu reddeder", () => {
    expect(() =>
      operation([e("PREPARATION", 0), e("FLIGHT_START", 0)]),
    ).toThrow();
    expect(() =>
      operation([e("PREPARATION", 1), e("FLIGHT_START", 0)]),
    ).toThrow();
    expect(() =>
      operation([e("PREPARATION", 0), e("FLIGHT_START", 1), e("COMPLETE", 2)]),
    ).toThrow();
    expect(() =>
      operation([
        e("PREPARATION", 0),
        e("WAIT_START", 1),
        e("FLIGHT_START", 2),
      ]),
    ).toThrow();
  });
});
describe("GeoJSON ve paylaşım", () => {
  it("koordinat aralığı, açık halka ve kesişimi reddeder", () => {
    expect(
      boundarySchema.safeParse({
        type: "Polygon",
        coordinates: [
          [
            [31, 37],
            [32, 37],
            [32, 38],
            [31, 37],
          ],
        ],
      }).success,
    ).toBe(true);
    expect(
      boundarySchema.safeParse({
        type: "Polygon",
        coordinates: [
          [
            [31, 97],
            [32, 37],
            [32, 38],
            [31, 97],
          ],
        ],
      }).success,
    ).toBe(false);
    expect(
      boundarySchema.safeParse({
        type: "Polygon",
        coordinates: [
          [
            [31, 37],
            [32, 37],
            [32, 38],
            [31, 38],
          ],
        ],
      }).success,
    ).toBe(false);
    expect(
      boundarySchema.safeParse({
        type: "Polygon",
        coordinates: [
          [
            [31, 37],
            [32, 38],
            [31, 38],
            [32, 37],
            [31, 37],
          ],
        ],
      }).success,
    ).toBe(false);
  });
  it("CSV sütun allowlist hassas veri taşımaz, formül enjeksiyonunu nötrler", () => {
    const output = csv(
      [
        {
          job_id: "j",
          field_group: "f",
          crop: "=SUM(1)",
          phone: "SECRET",
          name: "SECRET",
          latitude: "SECRET",
          notes: "SECRET",
        },
      ],
      researchColumns,
    );
    expect(output).not.toContain("SECRET");
    expect(output).toContain("'=SUM(1)");
    expect(researchColumns).not.toContain("customer_id");
    expect(researchColumns).not.toContain("completed_at");
  });
});
