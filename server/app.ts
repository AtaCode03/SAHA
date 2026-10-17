import {pricingInput} from './pricing-domain.js';
import {priceForField} from './pricing.js';
import {pricingRouter} from './pricing.js';
import {weatherRouter} from './weather.js';
import {roadRouter} from './roads.js';
import {roadPlanningRouter} from './road-planning.js';
import {planningRouter,assertAppointmentSchedule} from './planning.js';
import {mapRouter} from './maps.js';
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { z, ZodError } from "zod";
import { Prisma, Status, EventKind } from "@prisma/client";
import { Decimal } from "decimal.js";
import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import {parcelRouter} from './parcels.js';
import {
  requireAuth,
  admin,
  csrf,
  login,
  loginLimiter,
  cookieOptions,
  hash,
} from "./auth.js";
import {
  AppError,
  fail,
  money,
  positiveArea,
  timestamp,
  boundarySchema,
  shapeFeatures,
  assertAccess,
  assertTransition,
  operation,
  balance,
  csv,
  researchColumns,
} from "./domain.js";
export const app = express();
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: { imgSrc: ["'self'", "data:", "https:"] },
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.get("/api/health", async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "PostgreSQL bağlantısı kurulamadı.",
      },
    });
  }
});
app.post("/api/auth/login", loginLimiter, login);
app.use("/api", requireAuth, csrf);
app.use('/api/parcels',parcelRouter);
app.use('/api/maps',mapRouter);
app.use('/api/weather',weatherRouter);
app.use('/api/roads',roadRouter);
app.use('/api/road-planning',roadPlanningRouter);
app.use('/api/planning',planningRouter);
app.use('/api/pricing',pricingRouter);
app.get("/api/auth/me", (req, res) =>
  res.json({ user: req.actor, csrf: req.session!.csrf }),
);
app.post("/api/auth/logout", async (req, res) => {
  await db.session.delete({ where: { id: req.session!.id } });
  res.clearCookie("session", cookieOptions);
  res.status(204).end();
});
app.post("/api/auth/revoke-all", async (req, res) => {
  await db.session.deleteMany({ where: { userId: req.actor!.id } });
  res.clearCookie("session", cookieOptions);
  res.status(204).end();
});
const id = z.uuid();
const optionalText = z.string().max(2000).nullable().optional();
const paging = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().max(200).default(""),
});
const customerInput = z
  .object({
    name: z.string().min(2).max(200),
    phone: z.string().min(5).max(30),
    neighborhood: z.string().max(150),
    notes: optionalText,
    active: z.boolean().default(true),
  })
  .strict();
const fieldInput = z
  .object({
    customerId: id,
    name: z.string().min(2).max(200),
    province: z.string().min(2).default("Konya"),
    district: z.string().min(2).default("Seydişehir"),
    neighborhood: z.string().min(1).max(150),
    block: optionalText,
    parcel: optionalText,
    area: positiveArea.nullable().optional().default(null),
    areaOrigin: z
      .enum(["MEASURED", "OPERATOR_ESTIMATE", "EXTERNAL"])
      .nullable().optional().default(null),
    crop: z.string().min(1).max(100).nullable().optional().default(null),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    boundary: boundarySchema.optional(),
    accessNotes: optionalText,
    active: z.boolean().default(true),
  })
  .strict()
  .refine(
    (v) => (v.latitude == null) === (v.longitude == null),
    "Enlem ve boylam birlikte gerekli",
  );
const droneInput = z
  .object({
    name: z.string().min(2).max(100),
    model: z.string().min(2).max(100),
    tankLiters: positiveArea.nullable().optional(),
    active: z.boolean().default(true),
  })
  .strict();
async function audit(
  tx: Prisma.TransactionClient,
  userId: string,
  entity: string,
  entityId: string,
  action: string,
  before: unknown,
  after: unknown,
  reason?: string,
) {
  await tx.auditLog.create({
    data: {
      userId,
      entity,
      entityId,
      action,
      before:
        before == null ? Prisma.JsonNull : JSON.parse(JSON.stringify(before)),
      after:
        after == null ? Prisma.JsonNull : JSON.parse(JSON.stringify(after)),
      reason,
    },
  });
}
async function serial<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  try {
    return await db.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034")
      throw new AppError(
        409,
        "CONCURRENT_CHANGE",
        "Kayıt eşzamanlı değişti; yenileyip tekrar deneyin.",
      );
    throw e;
  }
}
app.get("/api/customers", admin, async (req, res) => {
  const p = paging.parse(req.query),
    where = {
      OR: [
        { name: { contains: p.q, mode: "insensitive" as const } },
        { phone: { contains: p.q } },
      ],
    };
  const [data, total] = await Promise.all([
    db.customer.findMany({
      where,
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      orderBy: { name: "asc" },
    }),
    db.customer.count({ where }),
  ]);
  res.json({ data, total, ...p });
});
app.post("/api/customers", admin, async (req, res) =>
  res
    .status(201)
    .json(await db.customer.create({ data: customerInput.parse(req.body) })),
);
app.put("/api/customers/:id", admin, async (req, res) => {
  const input = customerInput.parse(req.body),
    key = id.parse(req.params.id);
  res.json(
    await serial(async (tx) => {
      const before = await tx.customer.findUniqueOrThrow({
        where: { id: key },
      });
      const after = await tx.customer.update({
        where: { id: key },
        data: input,
      });
      await audit(tx, req.actor!.id, "customer", key, "UPDATE", before, after);
      return after;
    }),
  );
});
app.delete("/api/customers/:id", admin, async (req, res) => {
  res.json(
    await db.customer.update({
      where: { id: id.parse(req.params.id) },
      data: { active: false },
    }),
  );
});
app.get("/api/fields", admin, async (req, res) => {
  const p = paging.parse(req.query),
    where = { name: { contains: p.q, mode: "insensitive" as const } };
  const [data, total] = await Promise.all([
    db.field.findMany({
      where,
      include: { customer: { select: { name: true } } },
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      orderBy: { name: "asc" },
    }),
    db.field.count({ where }),
  ]);
  res.json({ data, total, ...p });
});
async function fieldData(input: z.infer<typeof fieldInput>) {
  const c = await db.customer.findUnique({ where: { id: input.customerId } });
  if (!c?.active) fail("INACTIVE_CUSTOMER", "Aktif müşteri seçin.");
  return {
    ...input,
    source: c!.source,
    boundary: input.boundary ?? Prisma.JsonNull,
  };
}
app.post("/api/fields", admin, async (req, res) =>
  res.status(201).json(
    await db.field.create({
      data: await fieldData(fieldInput.parse(req.body)),
    }),
  ),
);
app.put("/api/fields/:id", admin, async (req, res) => {
  const input = await fieldData(fieldInput.parse(req.body)),
    key = id.parse(req.params.id);
  res.json(
    await serial(async (tx) => {
      const before = await tx.field.findUniqueOrThrow({ where: { id: key } });
      const after = await tx.field.update({ where: { id: key }, data: input });
      await audit(tx, req.actor!.id, "field", key, "UPDATE", before, after);
      return after;
    }),
  );
});
app.get("/api/drones", admin, async (req, res) => {
  const p = paging.parse(req.query);
  res.json({
    data: await db.drone.findMany({
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      orderBy: { name: "asc" },
    }),
    total: await db.drone.count(),
    ...p,
  });
});
app.post("/api/drones", admin, async (req, res) =>
  res
    .status(201)
    .json(await db.drone.create({ data: droneInput.parse(req.body) })),
);
app.put("/api/drones/:id", admin, async (req, res) =>
  res.json(
    await db.drone.update({
      where: { id: id.parse(req.params.id) },
      data: droneInput.parse(req.body),
    }),
  ),
);
app.get("/api/operators", admin, async (_req, res) =>
  res.json({
    data: await db.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
    }),
  }),
);
const settings = z
  .object({
    crewSize: z.number().int().min(1).max(20).nullable().default(null),
    growthStage: z.string().max(100).nullable().default(null),
    refillAccess: z
      .enum(["KNOWN_NEAR", "KNOWN_FAR", "UNKNOWN"])
      .default("UNKNOWN"),
    plannedSettings: z.string().max(1000).nullable().default(null),
    manualTravelMinutes: z.number().min(0).max(1440).nullable().default(null),
  })
  .strict();
const orderInput = z
  .object({
    fieldId: id,
    operatorId: id.nullable().optional(),
    droneId: id.nullable().optional(),
    requestedAt: timestamp.optional(),
    plannedStart: timestamp.nullable().optional(),
    plannedEnd: timestamp.nullable().optional(),
    sequence: z.number().int().min(0).default(0),
    service: z.string().min(1).max(150),
    plannedArea: positiveArea,
    plannedAreaOrigin: z
      .enum(["MEASURED", "OPERATOR_ESTIMATE", "EXTERNAL"])
      .default("OPERATOR_ESTIMATE"),
    agreedPrice: money, pricing:pricingInput.optional(),
    notes: optionalText,
    settings: settings.default({
      crewSize: null,
      growthStage: null,
      refillAccess: "UNKNOWN",
      plannedSettings: null,
      manualTravelMinutes: null,
    }),
  })
  .strict();
async function validateSchedule(
  tx: Prisma.TransactionClient,
  input: {
    operatorId?: string | null;
    droneId?: string | null;
    plannedStart?: string | null;
    plannedEnd?: string | null;
  },
  exclude?: string,
) {
  if (input.operatorId) {
    const op = await tx.user.findUnique({ where: { id: input.operatorId } });
    if (!op?.active)
      fail("ASSIGNMENT", "Aktif operatör seçin.");
  }
  if (input.droneId) {
    const drone = await tx.drone.findUnique({ where: { id: input.droneId } });
    if (!drone?.active) fail("ASSIGNMENT", "Aktif drone seçin.");
  }
  if (!input.plannedStart && !input.plannedEnd) return;
  if (
    !input.plannedStart ||
    !input.plannedEnd ||
    !input.operatorId ||
    !input.droneId
  )
    fail(
      "SCHEDULE",
      "Program için başlangıç/bitiş, operatör ve drone gerekli.",
    );
  const start = new Date(input.plannedStart!),
    end = new Date(input.plannedEnd!);
  if (end <= start) fail("SCHEDULE", "Bitiş başlangıçtan sonra olmalı.");
  const op = await tx.user.findUnique({ where: { id: input.operatorId! } }),
    drone = await tx.drone.findUnique({ where: { id: input.droneId! } });
  if (!op?.active || !drone?.active)
    fail("ASSIGNMENT", "Aktif operatör ve drone seçin.");
  const conflict = await tx.workOrder.findFirst({
    where: {
      id: exclude ? { not: exclude } : undefined,
      status: { in: ["PLANNED", "RUNNING"] },
      plannedStart: { lt: end },
      plannedEnd: { gt: start },
      OR: [{ operatorId: input.operatorId }, { droneId: input.droneId }],
    },
  });
  if (conflict)
    fail(
      "SCHEDULE_CONFLICT",
      "Operatör veya drone bu zaman aralığında başka işe atanmış.",
      409,
    );
}
const orderInclude = {
  field: true,
  customer: true,
  operator: { select: { id: true, name: true } },
  drone: true,
  payments: true,
  events: { orderBy: { at: "asc" as const } },
  expenses: true,
};
function presentOrder(order: any, role: string) {
  const o = {
    ...order,
    field: { ...order.field, ...((order.snapshot as any)?.field ?? {}) },
    operation: operation(order.events),
    balance: balance(
      String(order.agreedPrice),
      String(order.adjustment),
      order.payments.map((p: any) => String(p.amount)),
    ),
  };
  if (role === "ADMIN") return o;
  const {
    agreedPrice,
    adjustment,
    payments,
    expenses,
    balance: remaining,
    snapshot,
    ...safe
  } = o;
  const { name, phone, neighborhood } = o.customer;
  const customer = { name, phone, neighborhood };
  const { block, parcel, researchId: fi, source: fs, ...field } = o.field;
  return {
    ...safe,
    customer,
    field,
    snapshot: {
      area: snapshot.area,
      crop: snapshot.crop,
      drone: snapshot.drone,
      settings: snapshot.settings,
    },
  };
}
app.get("/api/orders", async (req, res) => {
  const p = paging.parse(req.query);
  const filter = z
    .object({
      status: z.enum(Object.values(Status) as [Status, ...Status[]]).optional(),
      from: timestamp.optional(),
      to: timestamp.optional(),
    })
    .parse(req.query);
  const where: Prisma.WorkOrderWhereInput = {
    operatorId: req.actor!.role === "OPERATOR" ? req.actor!.id : undefined,
    status: filter.status,
    plannedStart:
      filter.from || filter.to
        ? {
            gte: filter.from ? new Date(filter.from) : undefined,
            lt: filter.to ? new Date(filter.to) : undefined,
          }
        : undefined,
    OR: p.q
      ? [
          { customer: { name: { contains: p.q, mode: "insensitive" } } },
          { field: { name: { contains: p.q, mode: "insensitive" } } },
        ]
      : undefined,
  };
  const [data, total] = await Promise.all([
    db.workOrder.findMany({
      where,
      include: orderInclude,
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      orderBy: [
        { sequence: "asc" },
        { plannedStart: "asc" },
        { requestedAt: "desc" },
      ],
    }),
    db.workOrder.count({ where }),
  ]);
  res.json({
    data: data.map((o) => presentOrder(o, req.actor!.role)),
    total,
    ...p,
  });
});
app.get("/api/orders/:id", async (req, res) => {
  const o = await db.workOrder.findUniqueOrThrow({
    where: { id: id.parse(req.params.id) },
    include: orderInclude,
  });
  assertAccess(req.actor!.role, req.actor!.id, o.operatorId);
  res.json(presentOrder(o, req.actor!.role));
});
app.post("/api/orders", admin, async (req, res) => {
  const input = orderInput.parse(req.body);
  res.status(201).json(
    await serial(async (tx) => {
      const f = await tx.field.findUniqueOrThrow({
        where: { id: input.fieldId },
        include: { customer: true },
      });
      if (!f.active || !f.customer.active)
        fail("INACTIVE_FIELD", "Aktif müşteri/tarla gerekli.");
      await validateSchedule(tx, input);
      const d = input.droneId
        ? await tx.drone.findUniqueOrThrow({ where: { id: input.droneId } })
        : null;
      const { settings: config, plannedAreaOrigin, pricing, ...data } = input;
      const priceSnapshot=pricing?await priceForField(tx,f,pricing):null;
      if(priceSnapshot&&!new Prisma.Decimal(input.agreedPrice).equals(priceSnapshot.total))fail('PRICE_CHANGED','Fiyat değişti. Yeniden hesaplayın.',409);
      const o = await tx.workOrder.create({
        data: {
          ...data, ...(priceSnapshot?{agreedPrice:priceSnapshot.total,plannedArea:priceSnapshot.dekar}:{}),
          customerId: f.customerId,
          requestedAt: input.requestedAt
            ? new Date(input.requestedAt)
            : undefined,
          plannedStart: input.plannedStart
            ? new Date(input.plannedStart)
            : null,
          plannedEnd: input.plannedEnd ? new Date(input.plannedEnd) : null,
          status: input.plannedStart ? "PLANNED" : "REQUESTED",
          source: f.source,
          snapshot: JSON.parse(
            JSON.stringify({
              pricing:priceSnapshot, area: priceSnapshot?.dekar??f.area,
              crop: f.crop,
              field: {
                name: f.name,
                province: f.province,
                district: f.district,
                neighborhood: f.neighborhood,
                latitude: f.latitude,
                longitude: f.longitude,
                boundary: f.boundary,
                accessNotes: f.accessNotes,
              },
              areaOrigin: f.areaOrigin,
              plannedAreaOrigin,
              shape: shapeFeatures(f.boundary),
              drone: d ? { model: d.model, tankLiters: d.tankLiters } : null,
              settings: config,
              snapshotAt: new Date().toISOString(),
            }),
          ),
        },
      });
      await audit(tx, req.actor!.id, "order", o.id, "CREATE", null, o);
      return o;
    }),
  );
});
const scheduleInput = z
  .object({
    operatorId: id,
    droneId: id,
    plannedStart: timestamp,
    plannedEnd: timestamp,
    sequence: z.number().int().min(0).default(0),
    settings: settings,
  })
  .strict();
app.put("/api/orders/:id/schedule", admin, async (req, res) => {
  const input = scheduleInput.parse(req.body),
    key = id.parse(req.params.id);
  res.json(
    await serial(async (tx) => {
      const o = await tx.workOrder.findUniqueOrThrow({ where: { id: key } });
      if (
        !["REQUESTED", "PLANNED", "POSTPONED"].includes(o.status) ||
        (await tx.operationEvent.count({ where: { orderId: key } }))
      )
        fail("LOCKED", "Başlamış/terminal iş yeniden planlanamaz.");
      await assertAppointmentSchedule(tx,o,input);
      await validateSchedule(tx, input, key);
      const drone = await tx.drone.findUniqueOrThrow({
        where: { id: input.droneId },
      });
      const { settings: config, ...data } = input;
      const after = await tx.workOrder.update({
        where: { id: key },
        data: {
          ...data,
          plannedStart: new Date(input.plannedStart),
          plannedEnd: new Date(input.plannedEnd),
          status: "PLANNED",
          snapshot: {
            ...(o.snapshot as any),
            drone: {
              model: drone.model,
              tankLiters: drone.tankLiters?.toString() ?? null,
            },
            settings: config,
          },
        },
      });
      await audit(tx, req.actor!.id, "order", key, "SCHEDULE", o, after);
      return after;
    }),
  );
});
app.post("/api/orders/:id/status", admin, async (req, res) => {
  const input = z
    .object({
      status: z.enum(Object.values(Status) as [Status, ...Status[]]),
      reason: z.string().min(3).max(1000).optional(),
    })
    .strict()
    .parse(req.body);
  res.json(
    await serial(async (tx) => {
      const key = id.parse(req.params.id),
        o = await tx.workOrder.findUniqueOrThrow({ where: { id: key } });
      assertTransition(o.status, input.status);
      if(input.status==='PLANNED')await assertAppointmentSchedule(tx,o,{plannedStart:o.plannedStart?.toISOString(),plannedEnd:o.plannedEnd?.toISOString(),operatorId:o.operatorId,droneId:o.droneId});
      if (["RUNNING", "COMPLETED"].includes(input.status))
        fail(
          "USE_EVENTS",
          "Başlatma ve tamamlama operasyon olaylarıyla yapılır.",
        );
      if (["POSTPONED", "CANCELLED"].includes(input.status) && !input.reason)
        fail("REASON", "Erteleme/iptal gerekçesi gerekli.");
      if (input.status === "PLANNED")
        await validateSchedule(
          tx,
          {
            ...o,
            plannedStart: o.plannedStart?.toISOString(),
            plannedEnd: o.plannedEnd?.toISOString(),
          },
          key,
        );
      if (input.status === "PLANNED" && !o.plannedStart)
        fail("SCHEDULE", "Önce program oluşturun.");
      const after = await tx.workOrder.update({
        where: { id: key },
        data: { status: input.status, reason: input.reason },
      });
      await audit(
        tx,
        req.actor!.id,
        "order",
        key,
        "STATUS",
        o,
        after,
        input.reason,
      );
      return after;
    }),
  );
});
const eventInput = z
  .object({
    kind: z.enum(Object.values(EventKind) as [EventKind, ...EventKind[]]),
    at: timestamp,
    idempotencyKey: z.string().min(8).max(100),
    actualArea: positiveArea.nullable().optional(),
    actualAreaOrigin: z
      .enum(["MEASURED", "OPERATOR_ESTIMATE", "EXTERNAL"])
      .optional(),
    origin: z
      .enum(["MEASURED", "OPERATOR_ESTIMATE", "EXTERNAL"])
      .default("MEASURED"),
  })
  .strict();
app.post("/api/orders/:id/events", async (req, res) => {
  const input = eventInput.parse(req.body),
    key = id.parse(req.params.id);
  res.status(201).json(
    await serial(async (tx) => {
      const o = await tx.workOrder.findUniqueOrThrow({
        where: { id: key },
        include: { events: { orderBy: { at: "asc" } } },
      });
      assertAccess(req.actor!.role, req.actor!.id, o.operatorId);
      const payloadHash = hash(JSON.stringify(input));
      const existing = o.events.find(
        (e) => e.idempotencyKey === input.idempotencyKey,
      );
      if (existing) {
        if (existing.payloadHash !== payloadHash)
          fail("IDEMPOTENCY", "Aynı istek anahtarı farklı veri içeriyor.", 409);
        return existing;
      }
      if (!["PLANNED", "RUNNING"].includes(o.status))
        fail("EVENT_STATUS", "İş planlanmış veya devam ediyor olmalı.");
      if (new Date(input.at).getTime() > Date.now() + 30000)
        fail("FUTURE_TIME", "Gelecek zamanlı olay girilemez.");
      const summary = operation([
        ...o.events,
        { kind: input.kind, at: input.at },
      ]);
      if (input.actualArea != null && input.kind !== "COMPLETE")
        fail("ACTUAL_AREA", "İşlenen alan tamamlama sırasında girilir.");
      const event = await tx.operationEvent.create({
        data: {
          kind: input.kind,
          origin: input.origin,
          idempotencyKey: input.idempotencyKey,
          at: new Date(input.at),
          orderId: key,
          userId: req.actor!.id,
          payloadHash,
        },
      });
      let status = o.status;
      if (input.kind === "PREPARATION") {
        assertTransition(o.status, "RUNNING");
        status = "RUNNING";
      }
      if (input.kind === "COMPLETE") {
        if (input.actualArea != null && !input.actualAreaOrigin)
          fail("AREA_ORIGIN", "İşlenen alanın kaynağını seçin.");
        assertTransition(o.status, "COMPLETED");
        status = "COMPLETED";
      }
      await tx.workOrder.update({
        where: { id: key },
        data: {
          status,
          ...(input.kind === "COMPLETE"
            ? {
                actualArea: input.actualArea ?? null,
                actualAreaOrigin: input.actualArea
                  ? input.actualAreaOrigin
                  : null,
              }
            : {}),
          completedAt: summary.completedAt
            ? new Date(summary.completedAt)
            : null,
        },
      });
      await audit(tx, req.actor!.id, "order", key, "EVENT", null, event);
      return event;
    }),
  );
});
app.put("/api/orders/:id/events/:eventId", async (req, res) => {
  const input = z
      .object({
        at: timestamp,
        kind: z.enum(Object.values(EventKind) as [EventKind, ...EventKind[]]),
        reason: z.string().min(5).max(1000),
        origin: z
          .enum(["MEASURED", "OPERATOR_ESTIMATE", "EXTERNAL"])
          .default("OPERATOR_ESTIMATE"),
      })
      .strict()
      .parse(req.body),
    key = id.parse(req.params.id),
    eventId = id.parse(req.params.eventId);
  res.json(
    await serial(async (tx) => {
      const o = await tx.workOrder.findUniqueOrThrow({
        where: { id: key },
        include: { events: { orderBy: { at: "asc" } } },
      });
      assertAccess(req.actor!.role, req.actor!.id, o.operatorId);
      const before = o.events.find((e) => e.id === eventId);
      if (!before) fail("NOT_FOUND", "Olay bulunamadı.", 404);
      if (new Date(input.at).getTime() > Date.now() + 30000)
        fail("FUTURE_TIME", "Gelecek zamanlı düzeltme olamaz.");
      const events = o.events
        .map((e) =>
          e.id === eventId
            ? { ...e, at: new Date(input.at), kind: input.kind }
            : e,
        )
        .sort((a, b) => a.at.getTime() - b.at.getTime());
      const summary = operation(events, o.status !== "COMPLETED");
      if ((o.status === "COMPLETED") !== Boolean(summary.completedAt))
        fail(
          "CORRECTION_STATUS",
          "Düzeltme işin tamamlanma durumunu değiştiremez.",
        );
      const after = await tx.operationEvent.update({
        where: { id: eventId },
        data: {
          at: new Date(input.at),
          kind: input.kind,
          origin: input.origin,
        },
      });
      await tx.workOrder.update({
        where: { id: key },
        data: {
          completedAt: summary.completedAt
            ? new Date(summary.completedAt)
            : null,
        },
      });
      await audit(
        tx,
        req.actor!.id,
        "event",
        eventId,
        "CORRECTION",
        before,
        after,
        input.reason,
      );
      return after;
    }),
  );
});
app.get("/api/orders/:id/audit", admin, async (req, res) => {
  const key = id.parse(req.params.id),
    events = await db.operationEvent.findMany({
      where: { orderId: key },
      select: { id: true },
    });
  res.json({
    data: await db.auditLog.findMany({
      where: {
        OR: [
          { entity: "order", entityId: key },
          { entity: "event", entityId: { in: events.map((e) => e.id) } },
        ],
      },
      include: { user: { select: { name: true } } },
      orderBy: { at: "desc" },
      take: 100,
    }),
  });
});
app.post("/api/orders/:id/payments", admin, async (req, res) => {
  const input = z
      .object({
        amount: money.refine((v) => new Decimal(v).gt(0)),
        at: timestamp,
        note: optionalText,
        idempotencyKey: z.string().min(8).max(100),
      })
      .strict()
      .parse(req.body),
    key = id.parse(req.params.id);
  res.status(201).json(
    await serial(async (tx) => {
      const exists = await tx.payment.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (exists) {
        if (
          exists.orderId !== key ||
          exists.amount.toString() !== new Decimal(input.amount).toString() ||
          exists.at.toISOString() !== new Date(input.at).toISOString() ||
          exists.note !== (input.note ?? null)
        )
          fail(
            "IDEMPOTENCY",
            "Ödeme anahtarı farklı içerikle kullanıldı.",
            409,
          );
        return exists;
      }
      const o = await tx.workOrder.findUniqueOrThrow({
        where: { id: key },
        include: { payments: true },
      });
      const remaining = balance(
        o.agreedPrice.toString(),
        o.adjustment.toString(),
        o.payments.map((p) => p.amount.toString()),
      );
      if (new Decimal(input.amount).gt(remaining))
        fail("OVERPAYMENT", "Tahsilat kalan bakiyeyi aşamaz.");
      const p = await tx.payment.create({
        data: { ...input, at: new Date(input.at), orderId: key },
      });
      await audit(tx, req.actor!.id, "order", key, "PAYMENT", null, p);
      return p;
    }),
  );
});
app.post("/api/orders/:id/adjustment", admin, async (req, res) => {
  const input = z
      .object({
        adjustment: z.string().regex(/^-?\d{1,12}(\.\d{1,2})?$/),
        reason: z.string().min(5).max(1000),
      })
      .strict()
      .parse(req.body),
    key = id.parse(req.params.id);
  res.json(
    await serial(async (tx) => {
      const o = await tx.workOrder.findUniqueOrThrow({
        where: { id: key },
        include: { payments: true },
      });
      if (
        new Decimal(
          balance(
            o.agreedPrice.toString(),
            input.adjustment,
            o.payments.map((p) => p.amount.toString()),
          ),
        ).lt(0)
      )
        fail(
          "NEGATIVE_BALANCE",
          "Düzeltme tahsil edilmiş bedelin altına düşüremez.",
        );
      const after = await tx.workOrder.update({
        where: { id: key },
        data: { adjustment: input.adjustment },
      });
      await audit(
        tx,
        req.actor!.id,
        "order",
        key,
        "ADJUSTMENT",
        o,
        after,
        input.reason,
      );
      return after;
    }),
  );
});
const expenseInput = z
  .object({
    orderIds: z.array(id).max(100).default([]),
    kind: z.enum(["TRANSPORT", "ENERGY", "LABOR", "CONSUMABLE", "OTHER"]),
    amount: money.refine((v) => new Decimal(v).gt(0)),
    at: timestamp,
    note: optionalText,
    allocationRule: z.enum(["DIRECT", "EQUAL"]).default("DIRECT"),
  })
  .strict();
app.post("/api/expenses", admin, async (req, res) => {
  const input = expenseInput.parse(req.body);
  if (new Set(input.orderIds).size !== input.orderIds.length)
    fail("DUPLICATE", "İşler tekrarlanamaz.");
  if (input.orderIds.length > 1 && input.allocationRule !== "EQUAL")
    fail("ALLOCATION", "Birden çok iş için eşit paylaştırma seçin.");
  res.status(201).json(
    await serial(async (tx) => {
      for (const key of input.orderIds)
        await tx.workOrder.findUniqueOrThrow({ where: { id: key } });
      const group = randomUUID(),
        count = Math.max(1, input.orderIds.length),
        cents = new Decimal(input.amount).times(100);
      const base = cents.div(count).floor(),
        remainder = cents.minus(base.times(count)).toNumber();
      const out = [];
      for (let i = 0; i < count; i++) {
        const amount = base
          .plus(i < remainder ? 1 : 0)
          .div(100)
          .toFixed(2);
        if (new Decimal(amount).eq(0))
          fail("ALLOCATION", "Paylaştırılan tutar en az 0,01 TL olmalı.");
        out.push(
          await tx.expense.create({
            data: {
              kind: input.kind,
              at: new Date(input.at),
              amount,
              note: input.note,
              orderId: input.orderIds[i] ?? null,
              allocationGroup: group,
              allocationRule:
                count > 1
                  ? "EQUAL"
                  : input.orderIds.length
                    ? "DIRECT"
                    : "UNALLOCATED",
            },
          }),
        );
      }
      await audit(tx, req.actor!.id, "expense", group, "CREATE", null, out);
      return out;
    }),
  );
});
const dates = z.object({
  from: timestamp.optional(),
  to: timestamp.optional(),
});
app.get("/api/reports", admin, async (req, res) => {
  const range = dates.parse(req.query),
    at = {
      gte: range.from ? new Date(range.from) : undefined,
      lt: range.to ? new Date(range.to) : undefined,
    };
  const [orders, payments, expenses] = await Promise.all([
    db.workOrder.findMany({
      where: { requestedAt: at },
      include: orderInclude,
    }),
    db.payment.findMany({ where: { at } }),
    db.expense.findMany({ where: { at } }),
  ]);
  const sum = (vals: string[]) =>
    vals.reduce((s, v) => s.plus(v), new Decimal(0)).toFixed(2);
  res.json({
    orderCount: orders.length,
    pending: orders.filter((o) => ["REQUESTED", "POSTPONED"].includes(o.status))
      .length,
    processedArea: orders.some(
      (o) => o.status === "COMPLETED" && o.actualArea != null,
    )
      ? sum(
          orders
            .filter((o) => o.status === "COMPLETED" && o.actualArea != null)
            .map((o) => o.actualArea!.toString()),
        )
      : null,
    processedAreaMissing: orders.filter(
      (o) => o.status === "COMPLETED" && o.actualArea == null,
    ).length,
    completedPlannedArea: sum(
      orders
        .filter((o) => o.status === "COMPLETED")
        .map((o) => o.plannedArea.toString()),
    ),
    collected: sum(payments.map((p) => p.amount.toString())),
    outstanding: sum(
      orders.map((o) =>
        balance(
          o.agreedPrice.toString(),
          o.adjustment.toString(),
          o.payments.map((p) => p.amount.toString()),
        ),
      ),
    ),
    expenseTotal: sum(expenses.map((e) => e.amount.toString())),
    expenses,
    operations: orders
      .filter((o) => o.status === "COMPLETED")
      .map((o) => ({
        id: o.id,
        field: o.field.name,
        area: o.plannedArea.toString(),
        ...operation(o.events, false),
      })),
    basis:
      "İş/alan/alacak: talep tarihi; tahsilat/gider: işlem tarihi. İşlenen alan yalnız tamamlama sırasında ayrıca girilen değerdir; eksik ölçüm sıfırla doldurulmaz. Süre/alan oranı planlanan dekarı kullanır.",
  });
});
app.get("/api/exports/business", admin, async (_req, res) => {
  const orders = await db.workOrder.findMany({ include: orderInclude });
  res
    .type("text/csv")
    .attachment("isletme-ozel.csv")
    .send(
      csv(
        orders.map((o) => ({
          id: o.id,
          customer: o.customer.name,
          phone: o.customer.phone,
          field: o.field.name,
          status: o.status,
          source: o.source,
          planned_area: o.plannedArea.toString(),
          price: o.agreedPrice.toString(),
          balance: balance(
            o.agreedPrice.toString(),
            o.adjustment.toString(),
            o.payments.map((p) => p.amount.toString()),
          ),
          minutes: operation(o.events).totalMinutes,
        })),
        [
          "id",
          "customer",
          "phone",
          "field",
          "status",
          "source",
          "planned_area",
          "price",
          "balance",
          "minutes",
        ],
      ),
    );
});
app.post("/api/exports/research", admin, async (req, res) => {
  z.object({}).strict().parse(req.body);
  const orders = await db.workOrder.findMany({
    where: {
      status: "COMPLETED",
      source: "REAL",
      field: { source: "REAL" },
      customer: { source: "REAL" },
    },
    include: { field: true, events: { orderBy: { at: "asc" } } },
    orderBy: [{ completedAt: "asc" }, { id: "asc" }],
  });
  const usable = orders.filter(
    (o) => operation(o.events).totalMinutes !== null,
  );
  const rows = usable.map((o, i) => {
    const s = o.snapshot as any,
      config = s.settings ?? {},
      sh = s.shape ?? {};
    const row: Record<string, unknown> = {
      job_id: o.researchId,
      field_group: o.field.researchId,
      source: o.source,
      area_origin: s.plannedAreaOrigin ?? "OPERATOR_ESTIMATE",
      target_origin: [...new Set(o.events.map((e) => e.origin))]
        .sort()
        .join("|"),
      planned_area_dekar: o.plannedArea.toString(),
      crop: s.crop,
      drone_model: s.drone?.model,
      tank_liters: s.drone?.tankLiters,
      crew_size: config.crewSize,
      growth_stage: config.growthStage,
      refill_access: config.refillAccess,
      boundary_area_dekar: sh.boundaryAreaDekar,
      perimeter_m: sh.perimeterMeters,
      compactness: sh.compactness,
      target_minutes: operation(o.events, false).totalMinutes,
      split:
        i < Math.floor(usable.length * 0.6)
          ? "train"
          : i < Math.floor(usable.length * 0.8)
            ? "validation"
            : "test",
    };
    row.missing_features = researchColumns
      .filter((c) => c !== "missing_features" && row[c] == null)
      .join("|");
    return row;
  });
  const version = "research-1.0";
  const exportedCsv = csv(rows, researchColumns);
  const manifest = {
    version,
    dataSha256: hash(exportedCsv),
    count: rows.length,
    source: "REAL only",
    dateResolution: "none",
    locationResolution: "none",
    split:
      "Tamamlanma zamanına göre kronolojik %60 eğitim / %20 doğrulama / %20 test; aynı tarlayı ayrıca grup testinde inceleyin.",
    publication: "Yayımlanmadı; DOI yok.",
    privacy:
      "Ad/telefon/not/ada-parsel/ham tarih/konum çıkarıldı. Kararlı rastgele tarla kimliği tekrar analizi içindir. Nadir ürün ve ekipman ile yeniden tanımlama riski ayrıca incelenmelidir; açık paylaşım öncesi insan incelemesi zorunlu.",
    excludedIncomplete: orders.length - rows.length,
  };
  await db.researchExport.create({
    data: { version, count: rows.length, manifest },
  });
  res.json({
    manifest,
    files: {
      "operations.csv": exportedCsv,
      "manifest.json": JSON.stringify(manifest, null, 2),
      "DATA_DICTIONARY.md": researchDictionary(),
      "COLLECTION_METHOD.md":
        "Bir satır bir tamamlanmış gerçek iş emridir. Hazırlık başlangıcı–işi tamamlama arasındaki saha süresi; ulaşım hariç, bekleme dahil. Olaylar operatör girişidir, otomatik drone telemetrisi değildir. Eksik özellik boş bırakılır. Ölçüm kaynağı ve düzeltme geçmişi işletme veritabanında tutulur. Veri toplama protokolü ve etik/izin incelemesi işletme tarafından tamamlanmalıdır.",
      "EXPERIMENT.md":
        "Araştırma sorusu: Önceden bilinen özellikler alan × eğitimde ortalama dakika/dekar baseline yönteminden daha düşük süre hatası sağlar mı? Gerçek eğitim/değerlendirme yapılmadı. Başarı/tasarruf iddiası yok. Python hattı MAE, medyan mutlak hata, hata dağılımı, alan grupları, tarla tekrarları ve tahmin süresini raporlar.",
      "MISSING_DATA.md":
        "Eksik değerler CSV içinde boş; missing_features listesi satır bazında eksikleri belirtir. Hedef süresi tamamlanmayan işler dışarıda. Sentetik işler varsayılan paketten hariç. Sıfır ile doldurma yapılmaz.",
      "REVIEW_BEFORE_SHARING.md":
        "Mendeley Data yüklemesinden önce nadir ürün/ekipman gruplarını, alan ve şekil birleşimleriyle yeniden tanımlanma riskini inceleyin; gerektiğinde gruplama veya sütun bastırma uygulayın. Dosyaları elle yayımlayın; otomatik yayın yok.",
    },
  });
});
function researchDictionary() {
  const dictionary: Record<string, string> = {
    job_id: "İş için ayrı kararlı rastgele araştırma UUID'si",
    field_group:
      "Tekrarlı tarlaları incelemek için kararlı rastgele tarla UUID'si; eşleştirme dışarı çıkmaz",
    source: "REAL; sentetik kayıtlar hariç",
    area_origin:
      "Planlanan alan kaynağı: MEASURED / OPERATOR_ESTIMATE / EXTERNAL",
    target_origin:
      "Süre olaylarının kaynak türleri; birden çoksa | ile birleşir",
    planned_area_dekar: "İş başlamadan planlanan alan, dekar (1 dekar=1000 m²)",
    crop: "Planlama snapshot ürün kategorisi; nadir gruplar paylaşım öncesi incelenir",
    drone_model: "Planlama snapshot drone modeli",
    tank_liters: "Planlama snapshot tank kapasitesi, litre",
    crew_size: "Planlanan ekip kişi sayısı",
    growth_stage: "Varsa planlanan ürün gelişim dönemi",
    refill_access:
      "Planlama anında bilinen dolum erişimi: KNOWN_NEAR / KNOWN_FAR / UNKNOWN",
    boundary_area_dekar:
      "Planlama sınırından hesaplanan alan, dekar; planlanan alanı otomatik değiştirmez",
    perimeter_m: "Planlama sınırından hesaplanan çevre, metre",
    compactness: "Boyutsuz 4πA/P² şekil özelliği",
    target_minutes:
      "Hazırlık başlangıcı–tamamlanma saha süresi, dakika; bekleme dahil, ulaşım hariç",
    missing_features:
      "Boş sütunların | ile birleştirilmiş listesi; eksik ölçüm sıfır değildir",
    split:
      "Tamamlanma zamanında kronolojik %60 train / %20 validation / %20 test; ham tarih çıkarılır",
  };
  return (
    "# Veri sözlüğü v1.0\n\nCSV ondalık noktası kullanır; eksik ölçümler boş. Bir satır bir tamamlanmış gerçek ziyarettir.\n\n" +
    researchColumns.map((c) => `${c}: ${dictionary[c]}`).join("\n\n")
  );
}
app.post("/api/orders/:id/prediction", admin, async (req, res) => {
  const key = id.parse(req.params.id);
  res.json(
    await serial(async (tx) => {
      const o = await tx.workOrder.findUniqueOrThrow({
        where: { id: key },
        include: { events: true },
      });
      if (
        o.events.length ||
        !["REQUESTED", "PLANNED", "POSTPONED"].includes(o.status)
      )
        fail("PREDICTION_TIME", "Ön tahmin yalnızca iş başlamadan yapılır.");
      const history = await tx.workOrder.findMany({
        where: {
          status: "COMPLETED",
          source: "REAL",
          completedAt: { lt: new Date() },
          id: { not: key },
        },
        include: { events: { orderBy: { at: "asc" } } },
      });
      const complete = history.filter(
        (x) => operation(x.events).totalMinutes !== null,
      );
      const totalArea = complete.reduce(
        (s, v) => s.plus(v.plannedArea),
        new Decimal(0),
      );
      const totalMinutes = complete.reduce(
        (s, v) => s.plus(operation(v.events, false).totalMinutes!),
        new Decimal(0),
      );
      const minutes = totalArea.gt(0)
        ? totalMinutes.div(totalArea).times(o.plannedArea).toFixed(3)
        : null;
      return tx.predictionSnapshot.create({
        data: {
          orderId: key,
          input: {
            plannedArea: o.plannedArea.toString(),
            snapshot: o.snapshot,
            historyCount: complete.length,
            historyResearchIds: complete.map((v) => v.researchId),
            historyTotalAreaDekar: totalArea.toString(),
            historyTotalMinutes: totalMinutes.toString(),
          },
          method: minutes ? "AREA_BASELINE" : "INSUFFICIENT_DATA",
          version: "baseline-1.0",
          minutes,
        },
      });
    }),
  );
});
app.get("/api/planning/suggestion", admin, async (req, res) => {
  const range = dates.parse(req.query);
  if (!range.from || !range.to)
    fail("DATE_RANGE", "Gün başlangıç ve bitiş zamanı gerekli.");
  const jobs = await db.workOrder.findMany({
    where: {
      status: "PLANNED",
      plannedStart: { gte: new Date(range.from!), lt: new Date(range.to!) },
    },
    orderBy: [{ sequence: "asc" }, { plannedStart: "asc" }],
    include: {
      field: { select: { name: true } },
      predictions: { orderBy: { at: "desc" }, take: 1 },
    },
  });
  let cursor = Math.max(
    new Date(range.from!).getTime(),
    jobs[0]?.plannedStart?.getTime() ?? 0,
  );
  res.json({
    method: "MANUAL_SEQUENCE_DURATION",
    routeOptimized: false,
    data: jobs.map((o) => {
      const travel = (o.snapshot as any)?.settings?.manualTravelMinutes;
      const duration =
        o.predictions[0]?.minutes?.toNumber() ??
        (o.plannedEnd && o.plannedStart
          ? (o.plannedEnd.getTime() - o.plannedStart.getTime()) / 60000
          : null);
      if (travel == null || duration == null)
        return {
          id: o.id,
          field: o.field.name,
          missing: "Manuel ulaşım veya saha süresi eksik",
          suggestedStart: null,
        };
      cursor += travel * 60000;
      const start = new Date(cursor).toISOString();
      cursor += duration * 60000;
      return {
        id: o.id,
        field: o.field.name,
        suggestedStart: start,
        suggestedEnd: new Date(cursor).toISOString(),
        manualTravelMinutes: travel,
        durationMinutes: duration,
      };
    }),
    notice:
      "Mevcut yönetici sırası korunur. Yol/rota optimizasyonu ve müşteri zaman aralığı entegrasyonu henüz yok; öneriler otomatik kaydedilmez.",
  });
});
app.use("/api", (_req, res) =>
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "API yolu bulunamadı." } }),
);
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof SyntaxError && "body" in err)
      return res.status(400).json({
        error: {
          code: "INVALID_JSON",
          message: "İstek gövdesi geçerli JSON olmalı.",
        },
      });
    if (err instanceof ZodError)
      return res.status(422).json({
        error: {
          code: "VALIDATION",
          message: "Alanları kontrol edin.",
          details: err.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
      });
    if (err instanceof AppError)
      return res
        .status(err.status)
        .json({ error: { code: err.code, message: err.message } });
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025")
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Kayıt bulunamadı." } });
      if (["P2002", "P2003"].includes(err.code))
        return res.status(409).json({
          error: {
            code: "CONFLICT",
            message: "Kayıt ilişkisi veya benzersizlik çakışması.",
          },
        });
    }
    res.status(503).json({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message:
          "İşlem kaydedilemedi. Veritabanı/servis bağlantısını kontrol edip yeniden deneyin.",
      },
    });
  },
);
