import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../server/db.js";
const password = z
  .string()
  .min(12)
  .max(72)
  .refine((p) => Buffer.byteLength(p, "utf8") <= 72)
  .parse(process.env.SEED_PASSWORD);
try {
  await db.$transaction(async (tx) => {
    const u = await tx.user.upsert({
      where: { email: "demo.operator@example.invalid" },
      update: {},
      create: {
        email: "demo.operator@example.invalid",
        name: "Sentetik Operatör",
        role: "OPERATOR",
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
    let c = await tx.customer.findFirst({
      where: { name: "SENTETİK • Örnek Müşteri", source: "SYNTHETIC" },
    });
    if (!c)
      c = await tx.customer.create({
        data: {
          name: "SENTETİK • Örnek Müşteri",
          phone: "DEMO-TELEFON",
          neighborhood: "Örnek mahalle",
          source: "SYNTHETIC",
        },
      });
    let f = await tx.field.findFirst({ where: { customerId: c.id } });
    if (!f)
      f = await tx.field.create({
        data: {
          customerId: c.id,
          name: "SENTETİK • Eğitim Tarlası",
          neighborhood: "Örnek mahalle",
          area: "20",
          crop: "Sentetik ürün",
          source: "SYNTHETIC",
        },
      });
    let d = await tx.drone.findFirst({ where: { name: "SENTETİK • Drone" } });
    if (!d)
      d = await tx.drone.create({
        data: {
          name: "SENTETİK • Drone",
          model: "Demo model",
          tankLiters: "30",
        },
      });
    if (!(await tx.workOrder.findFirst({ where: { fieldId: f.id } })))
      await tx.workOrder.create({
        data: {
          customerId: c.id,
          fieldId: f.id,
          operatorId: u.id,
          droneId: d.id,
          service: "Sentetik hizmet ziyareti",
          plannedArea: "20",
          agreedPrice: "1000",
          source: "SYNTHETIC",
          snapshot: {
            area: "20",
            crop: "Sentetik ürün",
            settings: { crewSize: 1, refillAccess: "UNKNOWN" },
            drone: { model: "Demo model", tankLiters: "30" },
          },
        },
      });
  });
  console.log("Yalnızca açıkça sentetik kayıtlar eklendi.");
} finally {
  await db.$disconnect();
}
