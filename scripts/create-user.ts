import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../server/db.js";
import {loginIdentifier} from '../server/login-identifier.js';
const input = z
  .object({
    USER_EMAIL: loginIdentifier,
    USER_NAME: z.string().min(2),
    USER_PASSWORD: z
      .string()
      .min(12)
      .max(72)
      .refine((p) => Buffer.byteLength(p, "utf8") <= 72),
    USER_ROLE: z.enum(["ADMIN", "OPERATOR"]),
  })
  .parse(process.env);
try {
  await db.user.create({
    data: {
      email: input.USER_EMAIL.toLowerCase(),
      name: input.USER_NAME,
      passwordHash: await bcrypt.hash(input.USER_PASSWORD, 12),
      role: input.USER_ROLE,
    },
  });
  console.log("Kullanıcı oluşturuldu.");
} finally {
  await db.$disconnect();
}
