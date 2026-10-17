import {Client} from 'pg';
import { randomBytes } from "node:crypto";
import {
  mkdir,
  cp,
  writeFile,
  unlink,
  readFile,
  access,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawn } from "node:child_process";
import { openSync, closeSync } from "node:fs";
import { createServer } from "node:net";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { updateEnvFile } from "./env-file.js";

// Windows local development only. No production hosting or sample field data.
if (process.platform !== "win32")
  throw Error(
    "Bu başlatıcı Windows içindir; diğer sistemlerde README Docker akışını kullanın.",
  );
const root = process.cwd(),
  local = path.join(root, ".local");
const dataRoot = path.join(os.homedir(), "AppData", "Local", "SahaLocal");
const native = path.join(dataRoot, "native"),
  data = path.join(dataRoot, "data");
await mkdir(local, { recursive: true });
await mkdir(dataRoot, { recursive: true });
const exists = async (p: string) => {
  try {
    await access(p);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
};
const stateFile = path.join(local, "state.json");
let state: { databaseUrl: string; email: string } | undefined;
if (await exists(stateFile))
  state = JSON.parse(await readFile(stateFile, "utf8"));
if (!state && (await exists(path.join(root, ".env"))))
  throw Error(
    "Mevcut .env korunuyor. Yerel otomatik kurulum mevcut DB yapılandırmasını değiştiremez.",
  );
if (!(await exists(path.join(native, "bin", "pg_ctl.exe"))))
  await cp(
    path.join(
      root,
      "node_modules",
      "@embedded-postgres",
      "windows-x64",
      "native",
    ),
    native,
    { recursive: true },
  );
const ctl = path.join(native, "bin", "pg_ctl.exe");
for (const port of [3001, 5173]) {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () =>
      reject(
        new Error(
          `${port} portu kullanımda. Önceden açık uygulamayı Ctrl+C ile kapatın veya http://localhost:5173 adresini kontrol edin.`,
        ),
      ),
    );
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve()));
  });
}
if (!state) {
  if (await exists(path.join(data, "PG_VERSION")))
    throw Error(
      "Mevcut yerel küme bulundu, bağlantı bilgisi olmadan yeniden kurulmaz.",
    );
  const password = randomBytes(24).toString("hex"),
    pwfile = path.join(
      dataRoot,
      "pg-password-" + randomBytes(8).toString("hex") + ".tmp",
    );
  await writeFile(pwfile, password, { mode: 0o600 });
  try {
    execFileSync(
      path.join(native, "bin", "initdb.exe"),
      [
        "-D",
        data,
        "-U",
        "postgres",
        "--pwfile=" + pwfile,
        "--auth=scram-sha-256",
        "--locale=C",
        "--encoding=UTF8",
      ],
      { windowsHide: true, stdio: "ignore" },
    );
  } finally {
    await unlink(pwfile);
  }
  state = {
    databaseUrl: `postgresql://postgres:${password}@127.0.0.1:55440/saha_local`,
    email: "yonetici@local.test",
  };
  await writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
}
if (!(await exists(path.join(data, "PG_VERSION"))))
  throw Error(`Mevcut PostgreSQL veri klasörü okunamıyor: ${data}. Veri sıfırlanmadı; dosya erişimini kontrol edin.`);
let running = false;
try {
  execFileSync(ctl, ["-D", data, "status"], {
    windowsHide: true,
    stdio: "ignore",
  });
  running = true;
} catch {}
if (!running) {
  // A separate Windows process group prevents terminal Ctrl+C from killing
  // PostgreSQL in the middle of its recovery/shutdown. pg_ctl still waits
  // for readiness; all normal shutdowns below use pg_ctl fast stop.
  const startupLog = path.join(local, "postgres-startup.log");
  await writeFile(startupLog, `Başlatma: ${new Date().toISOString()}\nVeri klasörü: ${data}\n`, {mode:0o600});
  const fd = openSync(startupLog, "a", 0o600);
  const exitCode = await new Promise<number>((resolve, reject) => {
    let child;
    try {
      child = spawn(
        ctl,
        [
          "-D",
          data,
          "-l",
          path.join(dataRoot, "postgres.log"),
          "-o",
          "-h 127.0.0.1 -p 55440",
          "-t",
          "60",
          "-w",
          "start",
        ],
        { cwd: dataRoot, env: {...process.env, PGDATA:data}, windowsHide: true, detached: true, stdio: ["ignore", fd, fd] },
      );
    } finally {
      closeSync(fd);
    }
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  let accepting = false;
  const probe = new Client({connectionString:state.databaseUrl.replace('/saha_local','/postgres'),connectionTimeoutMillis:5000,query_timeout:5000});
  try { await probe.connect(); await probe.query('SELECT 1'); accepting = true; } catch {} finally { await probe.end().catch(()=>{}); }
  if (!accepting) {
    const detail = (await readFile(startupLog, "utf8")).slice(-2500);
    throw new Error(
      `PostgreSQL bağlantı kabul etmiyor (pg_ctl çıkış: ${exitCode}). Mevcut veri korundu. Ayrıntı: ${startupLog}\n${detail}`,
    );
  }
}
console.log("PostgreSQL hazır. Yerel veritabanı kontrol ediliyor…");
const control = new PrismaClient({
  datasourceUrl: state.databaseUrl.replace("/saha_local", "/postgres"),
});
try {
  const rows = await control.$queryRaw<
    { exists: boolean }[]
  >`SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname='saha_local') AS exists`;
  if (!rows[0].exists)
    await control.$executeRawUnsafe('CREATE DATABASE "saha_local"');
} finally {
  await control.$disconnect();
}
const env = {
  ...process.env,
  DATABASE_URL: state.databaseUrl,
  APP_ORIGIN: "http://localhost:5173",
  NODE_ENV: "development",
  PORT: "3001",
};
await updateEnvFile(path.join(root, ".env"), {
  DATABASE_URL: state.databaseUrl,
  APP_ORIGIN: "http://localhost:5173",
  PORT: "3001",
  SESSION_HOURS: "12",
});
execFileSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { env, stdio: "inherit", windowsHide: true },
);
const db = new PrismaClient({ datasourceUrl: state.databaseUrl });
try {
  const user = await db.user.findUnique({ where: { email: state.email } });
  if (!user) {
    const password = randomBytes(18).toString("base64url");
    await db.user.create({
      data: {
        email: state.email,
        name: "İşletme Yöneticisi",
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
    await writeFile(
      path.join(local, "GIRIS_BILGILERI.md"),
      `# Yerel uygulama giriş bilgileri\n\nAdres: http://localhost:5173/\n\nE-posta: ${state.email}\n\nParola: ${password}\n\nBu dosya yalnız yerel ilk yönetici hesabı içindir, Git'e dahil edilmez.\n`,
      { mode: 0o600 },
    );
  }
} finally {
  await db.$disconnect();
}
console.log(
  "Yerel veritabanı ve yönetici hesabı hazır. Giriş bilgileri .local/GIRIS_BILGILERI.md dosyasında. Sentetik saha kaydı eklenmedi.",
);
const api = spawn(process.execPath, ["dist-server/index.js"], {
  env,
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
  detached: true,
});
const web = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--port",
    "5173",
    "--host",
    "127.0.0.1",
    "--strictPort",
  ],
  { env, cwd: root, stdio: "inherit", windowsHide: true, detached: true },
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill();
  web.kill();
  try {
    execFileSync(ctl, ["-D", data, "-m", "fast", "-w", "stop"], {
      windowsHide: true,
      stdio: "ignore",
    });
  } catch {}
  process.exit(code);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
api.on("error", () => stop(1));
web.on("error", () => stop(1));
api.on("exit", () => {
  if (!stopping) stop(1);
});
web.on("exit", () => {
  if (!stopping) stop(1);
});
