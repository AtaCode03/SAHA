import { Decimal } from "decimal.js";
import { z } from "zod";
import {
  area,
  booleanValid,
  booleanWithin,
  booleanIntersects,
  kinks,
  polygon,
  length,
  lineString,
} from "@turf/turf";
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const fail = (code: string, message: string, status = 422): never => {
  throw new AppError(status, code, message);
};
export const money = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, "TL değerini ondalık metin olarak girin");
export const positiveArea = z
  .string()
  .regex(/^\d{1,9}(\.\d{1,3})?$/)
  .refine((v) => new Decimal(v).gt(0));
export const timestamp = z.iso.datetime({ offset: true });
export const balance = (
  price: string,
  adjustment: string,
  payments: string[],
) =>
  new Decimal(price)
    .plus(adjustment)
    .minus(payments.reduce((s, v) => s.plus(v), new Decimal(0)))
    .toFixed(2);
export const transitions: Record<string, string[]> = {
  REQUESTED: ["PLANNED", "CANCELLED"],
  PLANNED: ["RUNNING", "POSTPONED", "CANCELLED"],
  RUNNING: ["COMPLETED", "POSTPONED", "CANCELLED"],
  POSTPONED: ["PLANNED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
export function assertTransition(from: string, to: string) {
  if (!transitions[from]?.includes(to))
    fail("STATUS_TRANSITION", "Bu durum geçişine izin verilmiyor.");
}
export function assertAccess(
  role: string,
  userId: string,
  operatorId: string | null,
) {
  if (role !== "ADMIN" && userId !== operatorId)
    fail("FORBIDDEN", "Bu iş size atanmadı.", 403);
}
export function overlaps(a: Date, b: Date, c: Date, d: Date) {
  return a < d && c < b;
}
export const boundarySchema = z.unknown().transform((value, ctx) => {
  if (value === null || value === undefined) return null;
  try {
    const g = z
      .object({
        type: z.literal("Polygon"),
        coordinates: z
          .array(
            z
              .array(
                z.tuple([
                  z.number().min(-180).max(180),
                  z.number().min(-90).max(90),
                ]),
              )
              .min(4),
          )
          .min(1),
      })
      .strict()
      .parse(value);
    for (const ring of g.coordinates) {
      const first = ring[0],
        last = ring.at(-1)!;
      if (first[0] !== last[0] || first[1] !== last[1])
        throw Error("Halka kapalı olmalı");
    }
    const p = polygon(g.coordinates);
    if (!booleanValid(p) || area(p) <= 0 || kinks(p).features.length)
      throw Error("Geçersiz sınır");
    const outer = polygon([g.coordinates[0]]);
    for (let i = 1; i < g.coordinates.length; i++) {
      const hole = polygon([g.coordinates[i]]);
      if (!booleanWithin(hole, outer))
        throw Error("Delik dış sınırın içinde olmalı");
      for (let j = 1; j < i; j++)
        if (booleanIntersects(hole, polygon([g.coordinates[j]])))
          throw Error("Delikler kesişemez");
    }
    // Self intersections are rejected separately because booleanValid does not detect all of them.
    for (const ring of g.coordinates) {
      for (let i = 0; i < ring.length - 1; i++)
        for (let j = i + 2; j < ring.length - 1; j++) {
          if (i === 0 && j === ring.length - 2) continue;
          const [a, b, c, d] = [ring[i], ring[i + 1], ring[j], ring[j + 1]];
          const cross = (p: number[], q: number[], r: number[]) =>
            (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
          if (
            cross(a, b, c) * cross(a, b, d) <= 0 &&
            cross(c, d, a) * cross(c, d, b) <= 0 &&
            Math.max(a[0], b[0]) >= Math.min(c[0], d[0]) &&
            Math.max(c[0], d[0]) >= Math.min(a[0], b[0]) &&
            Math.max(a[1], b[1]) >= Math.min(c[1], d[1]) &&
            Math.max(c[1], d[1]) >= Math.min(a[1], b[1])
          )
            throw Error("Kesişen sınır");
        }
    }
    return g;
  } catch {
    ctx.addIssue({
      code: "custom",
      message:
        "Geçerli, kapalı ve kesişmeyen GeoJSON Polygon gerekli. Sıra [boylam, enlem].",
    });
    return z.NEVER;
  }
});
export function shapeFeatures(boundary: unknown) {
  if (!boundary)
    return {
      boundaryAreaDekar: null,
      perimeterMeters: null,
      compactness: null,
    };
  const g = boundarySchema.parse(boundary)!;
  const p = polygon(g.coordinates);
  const a = area(p);
  const perimeter = g.coordinates.reduce(
    (s, r) => s + length(lineString(r), { units: "meters" }),
    0,
  );
  return {
    boundaryAreaDekar: a / 1000,
    perimeterMeters: perimeter,
    compactness: (4 * Math.PI * a) / (perimeter * perimeter),
  };
}
export type Event = { kind: string; at: Date | string };
export function operation(events: Event[], allowOpen = true) {
  const totals: Record<string, number> = {
    preparation: 0,
    flight: 0,
    refill: 0,
    battery: 0,
    waiting: 0,
  };
  let state: string | null = null,
    start: number | null = null,
    first: number | null = null,
    last = -Infinity,
    completed: number | null = null;
  const intervals: {
    kind: string;
    start: string;
    end: string;
    minutes: number;
  }[] = [];
  const close = (t: number) => {
    if (state && start !== null) {
      const minutes = (t - start) / 60000;
      totals[state] += minutes;
      intervals.push({
        kind: state,
        start: new Date(start).toISOString(),
        end: new Date(t).toISOString(),
        minutes,
      });
    }
  };
  for (const e of events) {
    const t = new Date(e.at).getTime();
    if (!Number.isFinite(t) || t <= last)
      fail("EVENT_TIME", "Olay zamanları artan ve farklı olmalı.");
    if (completed) fail("EVENT_SEQUENCE", "Tamamlanmış işte yeni olay olamaz.");
    last = t;
    if (e.kind === "PREPARATION") {
      if (first !== null) fail("EVENT_SEQUENCE", "Hazırlık zaten başladı.");
      first = t;
      state = "preparation";
      start = t;
      continue;
    }
    if (first === null) fail("EVENT_SEQUENCE", "Önce hazırlığa başlayın.");
    if (e.kind === "FLIGHT_START") {
      if (state === "flight" || state === "waiting")
        fail("OPEN_INTERVAL", "Önce açık uçuş/beklemeyi bitirin.");
      close(t);
      state = "flight";
      start = t;
    } else if (e.kind === "FLIGHT_END") {
      if (state !== "flight") fail("EVENT_SEQUENCE", "Açık uçuş yok.");
      close(t);
      state = "preparation";
      start = t;
    } else if (e.kind === "WAIT_START") {
      if (state === "flight" || state === "waiting")
        fail("OPEN_INTERVAL", "Önce açık aralığı bitirin.");
      close(t);
      state = "waiting";
      start = t;
    } else if (e.kind === "WAIT_END") {
      if (state !== "waiting") fail("EVENT_SEQUENCE", "Açık bekleme yok.");
      close(t);
      state = "preparation";
      start = t;
    } else if (e.kind === "REFILL" || e.kind === "BATTERY") {
      if (state === "flight" || state === "waiting")
        fail("OPEN_INTERVAL", "Önce açık uçuş/beklemeyi bitirin.");
      close(t);
      state = e.kind === "REFILL" ? "refill" : "battery";
      start = t;
    } else if (e.kind === "COMPLETE") {
      if (state === "flight" || state === "waiting")
        fail("OPEN_INTERVAL", "İşi tamamlamadan uçuş/beklemeyi bitirin.");
      close(t);
      state = null;
      start = null;
      completed = t;
    } else fail("EVENT_KIND", "Bilinmeyen olay.");
  }
  if (!allowOpen && first !== null && completed === null)
    fail("OPEN_INTERVAL", "İş tamamlanmadı.");
  return {
    totals,
    intervals,
    open: state,
    totalMinutes:
      first !== null && completed !== null ? (completed - first) / 60000 : null,
    startedAt: first === null ? null : new Date(first).toISOString(),
    completedAt: completed === null ? null : new Date(completed).toISOString(),
  };
}
export const researchColumns = [
  "job_id",
  "field_group",
  "source",
  "area_origin",
  "target_origin",
  "planned_area_dekar",
  "crop",
  "drone_model",
  "tank_liters",
  "crew_size",
  "growth_stage",
  "refill_access",
  "boundary_area_dekar",
  "perimeter_m",
  "compactness",
  "target_minutes",
  "missing_features",
  "split",
];
export function csv(rows: Record<string, unknown>[], columns: string[]) {
  const cell = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      columns.map(cell).join(","),
      ...rows.map((r) => columns.map((c) => cell(r[c])).join(",")),
    ].join("\r\n")
  );
}
