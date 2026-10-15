import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import request from "supertest";
export async function integration() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.startsWith("/saha_test_"))
    throw Error(
      "Ayrı saha_test_ ile başlayan TEST_DATABASE_URL gerekli. İşletme DB kullanılamaz.",
    );
  process.env.DATABASE_URL = url;
  process.env.APP_ORIGIN = "http://localhost:5173";
  const { db } = await import("../server/db.js"),
    { app } = await import("../server/app.js");
  const suffix = randomUUID(),
    password = randomUUID() + "Az1!";
  const adminUser = await db.user.create({
    data: {
      email: suffix + "@example.invalid",
      name: "TEST YÖNETİCİ",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  const operator = await db.user.create({
    data: {
      email: "op-" + suffix + "@example.invalid",
      name: "TEST OPERATÖR",
      role: "OPERATOR",
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  const other = await db.user.create({
    data: {
      email: "other-" + suffix + "@example.invalid",
      name: "DİĞER TEST",
      role: "OPERATOR",
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  const adminAgent = request.agent(app),
    opAgent = request.agent(app),
    otherAgent = request.agent(app);
  async function authenticate(agent: any, email: string) {
    const r = await agent
      .post("/api/auth/login")
      .set("Origin", process.env.APP_ORIGIN!)
      .send({ email, password });
    assert.equal(r.status, 200);
    assert.match(r.headers["set-cookie"][0], /HttpOnly/);
    assert.match(r.headers["set-cookie"][0], /SameSite=Strict/i);
    return r.body.csrf as string;
  }
  const adminCsrf = await authenticate(adminAgent, adminUser.email),
    opCsrf = await authenticate(opAgent, operator.email),
    otherCsrf = await authenticate(otherAgent, other.email);
  const write = (
    agent: any,
    csrf: string,
    path: string,
    body: any,
    method = "post",
  ) =>
    agent[method]("/api" + path)
      .set("Origin", process.env.APP_ORIGIN!)
      .set("x-csrf-token", csrf)
      .send(body);
  try {
    const c = await write(adminAgent, adminCsrf, "/customers", {
      name: "TEST • Hassas Ad " + suffix,
      phone: "TEST-HASSAS-PHONE",
      neighborhood: "Test mahalle",
      notes: "TEST-HASSAS-NOTE",
    });
    assert.equal(c.status, 201);
    await db.customer.update({
      where: { id: c.body.id },
      data: { source: "SYNTHETIC" },
    });
    const f = await write(adminAgent, adminCsrf, "/fields", {
      customerId: c.body.id,
      name: "TEST TARLA",
      neighborhood: "Test",
      area: "20.125",
      crop: "TEST ÜRÜN",
      latitude: 37.42,
      longitude: 31.85,
      block: "HASSAS-ADA",
      parcel: "HASSAS-PARSEL",
    });
    assert.equal(f.status, 201);
    const d = await write(adminAgent, adminCsrf, "/drones", {
      name: "TEST DRONE",
      model: "TEST MODEL",
      tankLiters: "30",
    });
    assert.equal(d.status, 201);
    const start = new Date(Date.now() + 3600000).toISOString(),
      end = new Date(Date.now() + 7200000).toISOString();
    const input = {
      fieldId: f.body.id,
      operatorId: operator.id,
      droneId: d.body.id,
      plannedStart: start,
      plannedEnd: end,
      service: "TEST",
      plannedArea: "20.125",
      agreedPrice: "1000.10",
      settings: { crewSize: 2, manualTravelMinutes: 15 },
    };
    const o = await write(adminAgent, adminCsrf, "/orders", input);
    assert.equal(o.status, 201);
    assert.equal(o.body.source, "SYNTHETIC");
    const key = o.body.id;
    assert.equal(
      (await write(adminAgent, adminCsrf, "/orders", input)).status,
      409,
    );
    const before = JSON.stringify(o.body.snapshot);
    await write(
      adminAgent,
      adminCsrf,
      "/fields/" + f.body.id,
      {
        customerId: c.body.id,
        name: "TEST TARLA YENİ",
        neighborhood: "Test",
        area: "99",
        crop: "DEĞİŞMİŞ ÜRÜN",
      },
      "put",
    );
    const same = await adminAgent.get("/api/orders/" + key);
    assert.equal(JSON.stringify(same.body.snapshot), before);
    assert.equal((await otherAgent.get("/api/orders/" + key)).status, 403);
    const own = await opAgent.get("/api/orders/" + key);
    assert.equal(own.status, 200);
    for (const sensitive of [
      "agreedPrice",
      "balance",
      "payments",
      "expenses",
      "adjustment",
    ])
      assert.equal(sensitive in own.body, false);
    assert.equal(
      (
        await write(opAgent, opCsrf, "/orders/" + key + "/payments", {
          amount: "1",
          at: new Date().toISOString(),
          idempotencyKey: randomUUID(),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await write(adminAgent, adminCsrf, "/orders/" + key + "/status", {
          status: "COMPLETED",
        })
      ).status,
      422,
    );
    const base = Date.now() - 40 * 60000;
    const events = [
      ["PREPARATION", 0],
      ["FLIGHT_START", 5],
      ["FLIGHT_END", 15],
      ["REFILL", 17],
      ["BATTERY", 20],
      ["WAIT_START", 22],
      ["WAIT_END", 27],
      ["COMPLETE", 30],
    ] as const;
    for (const [kind, minutes] of events) {
      const body = {
        kind,
        ...(kind === "COMPLETE"
          ? { actualArea: "19.75", actualAreaOrigin: "MEASURED" }
          : {}),
        at: new Date(base + minutes * 60000).toISOString(),
        idempotencyKey: randomUUID(),
      };
      const r = await write(
        opAgent,
        opCsrf,
        "/orders/" + key + "/events",
        body,
      );
      assert.equal(r.status, 201, JSON.stringify(r.body));
      const retry = await write(
        opAgent,
        opCsrf,
        "/orders/" + key + "/events",
        body,
      );
      assert.equal(retry.status, 201);
      assert.equal(retry.body.id, r.body.id);
      assert.equal(
        (
          await write(opAgent, opCsrf, "/orders/" + key + "/events", {
            ...body,
            at: new Date(base + minutes * 60000 + 1).toISOString(),
          })
        ).status,
        409,
      );
    }
    const done = await adminAgent.get("/api/orders/" + key);
    assert.equal(done.body.status, "COMPLETED");
    assert.equal(done.body.operation.totalMinutes, 30);
    assert.equal(done.body.actualArea, "19.75");
    const first = done.body.events[0];
    assert.equal(
      (
        await write(
          opAgent,
          opCsrf,
          `/orders/${key}/events/${first.id}`,
          {
            kind: "PREPARATION",
            at: new Date(base - 60000).toISOString(),
            reason: "TEST: zaman düzeltme",
          },
          "put",
        )
      ).status,
      200,
    );
    const changed = await adminAgent.get("/api/orders/" + key);
    assert.equal(changed.body.operation.totalMinutes, 31);
    const audit = await adminAgent.get(`/api/orders/${key}/audit`);
    assert.ok(
      audit.body.data.some(
        (a: any) =>
          a.action === "CORRECTION" && a.before && a.after && a.reason,
      ),
    );
    const payment = {
      amount: "300.10",
      at: new Date().toISOString(),
      idempotencyKey: randomUUID(),
    };
    assert.equal(
      (await write(adminAgent, adminCsrf, `/orders/${key}/payments`, payment))
        .status,
      201,
    );
    assert.equal(
      (await write(adminAgent, adminCsrf, `/orders/${key}/payments`, payment))
        .status,
      201,
    );
    assert.equal(
      (await adminAgent.get("/api/orders/" + key)).body.balance,
      "700.00",
    );
    assert.equal(
      (
        await write(adminAgent, adminCsrf, `/orders/${key}/payments`, {
          ...payment,
          amount: "700.01",
          idempotencyKey: randomUUID(),
        })
      ).status,
      422,
    );
    const ex = await write(adminAgent, adminCsrf, "/expenses", {
      orderIds: [key],
      kind: "TRANSPORT",
      amount: "50.05",
      at: new Date().toISOString(),
    });
    assert.equal(ex.status, 201);
    const raceInput = {
      ...input,
      plannedStart: new Date(Date.now() + 3 * 3600000).toISOString(),
      plannedEnd: new Date(Date.now() + 4 * 3600000).toISOString(),
    };
    const race = await Promise.all([
      write(adminAgent, adminCsrf, "/orders", raceInput),
      write(adminAgent, adminCsrf, "/orders", raceInput),
    ]);
    assert.equal(
      race.filter((r) => r.status === 201).length,
      1,
      "Serializable calendar race must accept only one",
    );
    assert.equal(race.filter((r) => r.status === 409).length, 1);
    const second = race.find((r) => r.status === 201)!.body.id;
    const prediction = await write(
      adminAgent,
      adminCsrf,
      `/orders/${second}/prediction`,
      {},
    );
    assert.equal(prediction.status, 200);
    assert.equal(prediction.body.method, "INSUFFICIENT_DATA");
    assert.equal(prediction.body.minutes, null);
    const allocated = await write(adminAgent, adminCsrf, "/expenses", {
      orderIds: [key, second],
      kind: "TRANSPORT",
      amount: "0.05",
      at: new Date().toISOString(),
      allocationRule: "EQUAL",
    });
    assert.equal(allocated.status, 201);
    assert.deepEqual(
      allocated.body.map((e: any) => e.amount),
      ["0.03", "0.02"],
    );
    const paymentRace = await Promise.all([
      write(adminAgent, adminCsrf, `/orders/${key}/payments`, {
        amount: "400.00",
        at: new Date().toISOString(),
        idempotencyKey: randomUUID(),
      }),
      write(adminAgent, adminCsrf, `/orders/${key}/payments`, {
        amount: "400.00",
        at: new Date().toISOString(),
        idempotencyKey: randomUUID(),
      }),
    ]);
    assert.equal(paymentRace.filter((r) => r.status === 201).length, 1);
    assert.equal(
      (await adminAgent.get("/api/orders/" + key)).body.balance,
      "300.00",
    );
    const report = await adminAgent.get("/api/reports");
    assert.equal(report.body.processedArea, "19.75");
    const exp = await write(adminAgent, adminCsrf, "/exports/research", {});
    assert.equal(exp.status, 200);
    assert.equal(exp.body.manifest.count, 0);
    // Simulate the REAL-only gate in this isolated disposable test database.
    // These fixtures are not field observations and never leave the test run.
    await db.customer.update({
      where: { id: c.body.id },
      data: { source: "REAL" },
    });
    await db.field.update({
      where: { id: f.body.id },
      data: { source: "REAL" },
    });
    await db.workOrder.update({ where: { id: key }, data: { source: "REAL" } });
    const nonempty = await write(
      adminAgent,
      adminCsrf,
      "/exports/research",
      {},
    );
    assert.equal(nonempty.body.manifest.count, 1);
    assert.match(nonempty.body.manifest.dataSha256, /^[a-f0-9]{64}$/);
    assert.ok(nonempty.body.files["operations.csv"].includes('"31"'));
    await db.customer.update({
      where: { id: c.body.id },
      data: { source: "SYNTHETIC" },
    });
    await db.field.update({
      where: { id: f.body.id },
      data: { source: "SYNTHETIC" },
    });
    await db.workOrder.update({
      where: { id: key },
      data: { source: "SYNTHETIC" },
    });
    for (const text of Object.values(nonempty.body.files))
      for (const secret of [
        "TEST-HASSAS-PHONE",
        "TEST-HASSAS-NOTE",
        "HASSAS-ADA",
        "HASSAS-PARSEL",
      ])
        assert.equal(String(text).includes(secret), false);
    assert.equal(
      (await write(otherAgent, otherCsrf, "/exports/research", {})).status,
      403,
    );
    assert.equal(
      (await write(adminAgent, "bad", "/customers", {})).status,
      403,
    );
    assert.equal(
      (await write(opAgent, opCsrf, "/auth/revoke-all", {})).status,
      204,
    );
    assert.equal((await opAgent.get("/api/auth/me")).status, 401);
    console.log(
      "PostgreSQL E2E geçti: giriş/rol/atama, müşteri→tarla→iş→operasyon→tahsilat, snapshot, çakışma, idempotency, düzeltme audit, decimal bakiye, sentetik dışlama, hassas veri ve oturum iptali.",
    );
  } finally {
    await db.$disconnect();
  }
}
if (process.argv[1]?.endsWith("integration.ts")) await integration();
