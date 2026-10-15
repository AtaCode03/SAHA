import EmbeddedPostgres from "embedded-postgres";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, cp, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
const dir = await mkdtemp(path.join(tmpdir(), "saha-test-"));
const password = randomBytes(24).toString("hex"),
  name = "saha_test_" + randomUUID().replaceAll("-", "");
const pg = new EmbeddedPostgres({
  databaseDir: path.join(dir, "data"),
  user: "postgres",
  password,
  port: 55439,
  persistent: true,
  authMethod: "scram-sha-256",
  initdbFlags: ["--locale=C", "--encoding=UTF8"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
let native: string | undefined,
  started = false;
try {
  if (process.platform === "win32") {
    // Windows PostgreSQL binaries do not consistently handle a Turkish installation
    // path during initdb. Copy ONLY the test binaries to the new ASCII temp folder.
    native = path.join(dir, "native");
    await cp(
      path.resolve("node_modules/@embedded-postgres/windows-x64/native"),
      native,
      { recursive: true },
    );
    const passwordFile = path.join(dir, "password");
    await writeFile(passwordFile, password, { mode: 0o600 });
    try {
      execFileSync(
        path.join(native, "bin/initdb.exe"),
        [
          "-D",
          path.join(dir, "data"),
          "-U",
          "postgres",
          "--pwfile=" + passwordFile,
          "--auth=scram-sha-256",
          "--locale=C",
          "--encoding=UTF8",
        ],
        { windowsHide: true, stdio: "ignore" },
      );
    } finally {
      await unlink(passwordFile);
    }
    execFileSync(
      path.join(native, "bin/pg_ctl.exe"),
      [
        "-D",
        path.join(dir, "data"),
        "-l",
        path.join(dir, "postgres.log"),
        "-o",
        "-h 127.0.0.1 -p 55439",
        "-w",
        "start",
      ],
      { windowsHide: true, stdio: "ignore" },
    );
    started = true;
    const control = new PrismaClient({
      datasourceUrl: `postgresql://postgres:${password}@127.0.0.1:55439/postgres`,
    });
    try {
      await control.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
    } finally {
      await control.$disconnect();
    }
  } else {
    await pg.initialise();
    await pg.start();
    started = true;
    await pg.createDatabase(name);
  }
  process.env.DATABASE_URL = `postgresql://postgres:${password}@127.0.0.1:55439/${name}`;
  process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;
  if(process.argv.includes('--supabase-sql')){
    const {testSupabaseSql}=await import('./test-supabase-sql.js');
    await testSupabaseSql(process.env.DATABASE_URL);
  }
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { stdio: "inherit", env: process.env },
  );
  const { integration } = await import("./integration.js");
  await integration();
} finally {
  if (started) {
    if (native)
      execFileSync(
        path.join(native, "bin/pg_ctl.exe"),
        ["-D", path.join(dir, "data"), "-m", "fast", "-w", "stop"],
        { windowsHide: true, stdio: "ignore" },
      );
    else await pg.stop();
  }
  console.log(
    "Geçici test PostgreSQL durduruldu. İşletme veritabanına dokunulmadı.",
  );
}
