import { beforeEach, describe, it, expect, vi } from "vitest";
import request from "supertest";
const { mock } = vi.hoisted(() => ({
  mock: {
    session: { findUnique: vi.fn() },
    workOrder: { findUniqueOrThrow: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));
vi.mock("../server/db.js", () => ({ db: mock }));
import { app } from "../server/app.js";
const session = (role = "OPERATOR") => ({
  id: "hash",
  csrf: "token",
  expiresAt: new Date(Date.now() + 3600000),
  user: { id: "operator", name: "Operator", role, active: true },
});
describe("API güvenlik sınırları (izole bağlantı)", () => {
  it("geçersiz JSON tutarlı 400 hatası döner", async () => {
    const r = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_JSON");
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mock.session.findUnique.mockResolvedValue(session());
  });
  it("oturumsuz müşteri isteğine 401 döner", async () => {
    expect((await request(app).get("/api/customers")).status).toBe(401);
  });
  it("operatör finans/müşteri/araştırma APIlerini okuyamaz", async () => {
    for (const p of [
      "/api/reports",
      "/api/customers",
      "/api/fields",
      "/api/drones",
      "/api/exports/business",
    ])
      expect(
        (await request(app).get(p).set("Cookie", "session=test")).status,
      ).toBe(403);
    const r = await request(app)
      .post("/api/exports/research")
      .set("Cookie", "session=test")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", "token")
      .send({});
    expect(r.status).toBe(403);
  });
  it("başkasına atanmış işe erişimi API reddeder", async () => {
    mock.workOrder.findUniqueOrThrow.mockResolvedValue({ operatorId: "other" });
    expect(
      (
        await request(app)
          .get("/api/orders/00000000-0000-4000-8000-000000000001")
          .set("Cookie", "session=test")
      ).status,
    ).toBe(403);
  });
  it("yazma isteğinde CSRF ve origin birlikte gereklidir", async () => {
    mock.session.findUnique.mockResolvedValue(session("ADMIN"));
    for (const origin of ["http://evil.invalid", "http://localhost:5173"]) {
      const r = await request(app)
        .post("/api/customers")
        .set("Cookie", "session=test")
        .set("Origin", origin)
        .send({});
      expect(r.status).toBe(403);
    }
  });
  it("devre dışı kullanıcı veya süresi geçmiş oturum geçmez", async () => {
    mock.session.findUnique.mockResolvedValue({
      ...session(),
      expiresAt: new Date(0),
    });
    expect(
      (await request(app).get("/api/auth/me").set("Cookie", "session=test"))
        .status,
    ).toBe(401);
    mock.session.findUnique.mockResolvedValue({
      ...session(),
      user: { ...session().user, active: false },
    });
    expect(
      (await request(app).get("/api/auth/me").set("Cookie", "session=test"))
        .status,
    ).toBe(401);
  });
  it("veritabanı yokken sahte başarı yanıtı dönmez", async () => {
    mock.$queryRaw.mockRejectedValue(Error("offline"));
    expect((await request(app).get("/api/health")).status).toBe(503);
  });
});
