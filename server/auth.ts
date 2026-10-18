import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { db } from "./db.js";
import { AppError } from "./domain.js";
import {loginIdentifier} from './login-identifier.js';
declare global {
  namespace Express {
    interface Request {
      actor?: { id: string; name: string; role: "ADMIN" | "OPERATOR" };
      session?: { id: string; csrf: string };
    }
  }
}
export const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api",
};
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "LOGIN_LIMIT",
      message: "Çok fazla giriş denemesi. 15 dakika sonra deneyin.",
    },
  },
});
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const raw = req.cookies?.session;
    if (!raw) throw new AppError(401, "UNAUTHENTICATED", "Giriş yapın.");
    const s = await db.session.findUnique({
      where: { id: hash(raw) },
      include: { user: true },
    });
    if (!s || s.expiresAt < new Date() || !s.user.active)
      throw new AppError(401, "UNAUTHENTICATED", "Oturum sona erdi.");
    req.actor = { id: s.user.id, name: s.user.name, role: s.user.role };
    req.session = { id: s.id, csrf: s.csrf };
    next();
  } catch (e) {
    next(e);
  }
}
export function admin(req: Request, _res: Response, next: NextFunction) {
  next(
    req.actor?.role === "ADMIN"
      ? undefined
      : new AppError(403, "FORBIDDEN", "Yönetici yetkisi gerekli."),
  );
}
export function csrf(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const expected = process.env.APP_ORIGIN ?? "http://localhost:5173";
  const got = req.get("x-csrf-token") ?? "";
  const stored = req.session?.csrf ?? "";
  if (
    req.get("origin") !== expected ||
    !got ||
    Buffer.byteLength(got) !== Buffer.byteLength(stored) ||
    !timingSafeEqual(Buffer.from(got), Buffer.from(stored))
  )
    return next(
      new AppError(
        403,
        "CSRF",
        "Güvenlik doğrulaması başarısız. Sayfayı yenileyin.",
      ),
    );
  next();
}
const loginInput = z
  .object({
    email: loginIdentifier,
    password: z
      .string()
      .min(1)
      .max(72)
      .refine(
        (p) => Buffer.byteLength(p, "utf8") <= 72,
        "Parola en fazla 72 UTF-8 bayt olabilir.",
      ),
  })
  .strict();
const dummyHash = bcrypt.hashSync(token(), 12);
export async function login(req: Request, res: Response) {
  if (req.get("origin") !== (process.env.APP_ORIGIN ?? "http://localhost:5173"))
    throw new AppError(403, "ORIGIN", "Geçersiz kaynak.");
  const input = loginInput.parse(req.body);
  const u = await db.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  const matches = await bcrypt.compare(
    input.password,
    u?.passwordHash ?? dummyHash,
  );
  if (!matches || !u?.active)
    throw new AppError(401, "LOGIN_FAILED", "Kullanıcı adı/e-posta veya parola hatalı.");
  const raw = token(),
    csrf = token();
  const hours = z.coerce
    .number()
    .min(1)
    .max(72)
    .parse(process.env.SESSION_HOURS ?? 12);
  await db.session.create({
    data: {
      id: hash(raw),
      csrf,
      userId: u.id,
      expiresAt: new Date(Date.now() + hours * 3600000),
    },
  });
  res.cookie("session", raw, { ...cookieOptions, maxAge: hours * 3600000 });
  res.json({ user: { id: u.id, name: u.name, role: u.role }, csrf });
}
