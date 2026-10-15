import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

const models = [
  "user",
  "customer",
  "field",
  "drone",
  "workOrder",
  "operationEvent",
  "expense",
  "payment",
  "auditLog",
  "predictionSnapshot",
  "modelVersion",
  "researchExport",
] as const;
const fingerprint = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const mode = process.argv[2] ?? "check";
if (!["check", "backup", "transfer"].includes(mode))
  throw Error("check / backup / transfer kullanın.");
let source: PrismaClient | undefined, target: PrismaClient | undefined;
async function snapshot(client: PrismaClient) {
  return client.$transaction(
    async (tx) => {
      const result: Record<string, any[]> = {};
      for (const model of models)
        result[model] = JSON.parse(
          JSON.stringify(
            await (tx as any)[model].findMany({ orderBy: { id: "asc" } }),
          ),
        );
      return result;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 60000,
    },
  );
}
try {
  if (mode !== "check") {
    const state = JSON.parse(await readFile(".local/state.json", "utf8"));
    const url = new URL(state.databaseUrl);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.pathname !== "/saha_local"
    )
      throw Error("Yerel kaynak doğrulanamadı.");
    source = new PrismaClient({ datasourceUrl: state.databaseUrl });
    const data = await snapshot(source),
      folder = path.resolve(".local/backups");
    await mkdir(folder, { recursive: true });
    const file = path.join(
      folder,
      "supabase-before-" +
        new Date().toISOString().replaceAll(":", "-") +
        ".json",
    );
    await writeFile(
      file,
      JSON.stringify(
        {
          format: "saha-transfer-1",
          createdAt: new Date().toISOString(),
          sessionsExcluded: true,
          fingerprint: fingerprint(data),
          data,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        backupReady: true,
        file,
        counts: Object.fromEntries(models.map((m) => [m, data[m].length])),
      }),
    );
    if (mode === "backup") process.exitCode = 0;
    else {
      const remote = remoteUrl();
      target = new PrismaClient({ datasourceUrl: remote.toString() });
      await target.$connect();
      const before = await target.$queryRaw<
        { table_count: bigint }[]
      >`SELECT count(*) AS table_count FROM information_schema.tables WHERE table_schema='saha'`;
      if (
        Number(before[0].table_count) > 0 &&
        fingerprint(await snapshot(target)) !== fingerprint(data)
      )
        throw Error(
          "Hedef saha şemasında farklı kayıtlar var; hiçbir tablo değiştirilmedi.",
        );
      // Dedicated schema: no public Data API access to customers/password hashes/sessions.
      await target.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS "saha"');
      await target.$executeRawUnsafe(
        'REVOKE ALL ON SCHEMA "saha" FROM PUBLIC, anon, authenticated, service_role',
      );
      try {
        execFileSync(
          process.execPath,
          ["node_modules/prisma/build/index.js", "migrate", "deploy"],
          {
            env: { ...process.env, DATABASE_URL: remote.toString() },
            stdio: "pipe",
            windowsHide: true,
          },
        );
      } catch {
        throw Error("Supabase migration uygulanamadı; yerel veri korundu.");
      }
      await target.$executeRawUnsafe(
        'REVOKE ALL ON ALL TABLES IN SCHEMA "saha" FROM PUBLIC, anon, authenticated, service_role',
      );
      await target.$executeRawUnsafe(
        'REVOKE ALL ON ALL SEQUENCES IN SCHEMA "saha" FROM PUBLIC, anon, authenticated, service_role',
      );
      const protectedTables = await target.$queryRaw<
        { tablename: string }[]
      >`SELECT tablename FROM pg_tables WHERE schemaname='saha'`;
      for (const table of protectedTables)
        await target.$executeRawUnsafe(
          'ALTER TABLE "saha"."' +
            table.tablename.replaceAll('"', '""') +
            '" ENABLE ROW LEVEL SECURITY',
        );
      const existing = await snapshot(target);
      if (models.some((m) => existing[m].length)) {
        if (fingerprint(existing) !== fingerprint(data))
          throw Error(
            "Hedefte farklı kayıtlar var; otomatik birleştirme veya üzerine yazma yapılmadı.",
          );
      } else
        await target.$transaction(
          async (tx) => {
            for (const model of models) {
              const rows = data[model].map((row) => {
                const record = { ...row };
                for (const key of ["boundary", "before", "after"])
                  if (key in record && record[key] === null)
                    record[key] = Prisma.JsonNull;
                return record;
              });
              if (rows.length)
                await (tx as any)[model].createMany({ data: rows });
            }
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 60000,
          },
        );
      if (fingerprint(await snapshot(source)) !== fingerprint(data))
        throw Error(
          "Aktarım sırasında yerel veriler değişti; bağlantı geçişi yapılmadı. Yeniden karşılaştırma gerekli.",
        );
      if (fingerprint(await snapshot(target)) !== fingerprint(data))
        throw Error("Hedef veri doğrulaması geçmedi; yerel bağlantı korundu.");
      await writeFile(
        ".local/supabase-transfer.json",
        JSON.stringify(
          {
            verifiedAt: new Date().toISOString(),
            backup: file,
            fingerprint: fingerprint(data),
            schema: "saha",
            sessionsExcluded: true,
          },
          null,
          2,
        ),
        { mode: 0o600 },
      );
      console.log(
        "Supabase aktarımı ve veri hash karşılaştırması başarılı. Kullanıcı parolaları korundu, oturumlar taşınmadı. Yerel DATABASE_URL otomatik değiştirilmedi.",
      );
    }
  } else {
    target = new PrismaClient({ datasourceUrl: remoteUrl().toString() });
    await target.$connect();
    await target.$queryRaw`SELECT 1`;
    console.log("Supabase PostgreSQL bağlantısı başarılı.");
  }
} catch (error) {
  const code =
    (error as { errorCode?: string; code?: string }).errorCode ??
    (error as { code?: string }).code;
  console.error(
    "Supabase işlemi tamamlanamadı" +
      (code ? " (" + code + ")" : "") +
      ". Yerel veriler ve mevcut DATABASE_URL korundu.",
  );
  if (error instanceof Error && !code && !error.message.includes("prisma"))
    console.error(
      error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[gizli bağlantı]"),
    );
  process.exitCode = 1;
} finally {
  await source?.$disconnect();
  await target?.$disconnect();
}
function remoteUrl() {
  const raw = process.env.SUPABASE_DATABASE_URL;
  if (!raw) throw Error(".env içinde SUPABASE_DATABASE_URL gerekli.");
  const url = new URL(raw);
  if (
    !url.hostname.endsWith(".supabase.com") &&
    !url.hostname.endsWith(".supabase.co")
  )
    throw Error("Supabase hedefi doğrulanamadı.");
  if (
    !url.username.endsWith(".ilhdqrudssndtmsreieh") &&
    url.hostname !== "db.ilhdqrudssndtmsreieh.supabase.co"
  )
    throw Error("Beklenen Supabase projesiyle eşleşmiyor.");
  url.searchParams.set("schema", "saha");
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("connect_timeout", "15");
  url.searchParams.set("pool_timeout", "15");
  return url;
}
