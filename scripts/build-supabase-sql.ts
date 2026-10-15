import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';

const root=path.resolve('prisma/migrations');
const entries=(await readdir(root,{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name));
const parts=[`-- SAHA: Supabase SQL Editor kurulumu. Kaynak: prisma/migrations.
-- Bu dosya veri/parola içermez. Mevcut kayıtları silmez veya güncellemez.
-- Tek transaction: hata olursa bütün kurulum geri alınır.
BEGIN;
CREATE SCHEMA IF NOT EXISTS "saha";
SET LOCAL search_path TO "saha", pg_catalog;
DO $saha_guard$
BEGIN
 IF to_regclass('saha._prisma_migrations') IS NULL AND EXISTS (
  SELECT 1 FROM pg_tables WHERE schemaname='saha'
 ) THEN
  RAISE EXCEPTION 'saha schemasinda Prisma gecmisi olmayan tablolar var; otomatik degisiklik yapilmadi.';
 END IF;
END $saha_guard$;
CREATE TABLE IF NOT EXISTS "saha"."_prisma_migrations" (
 "id" VARCHAR(36) PRIMARY KEY,
 "checksum" VARCHAR(64) NOT NULL,
 "finished_at" TIMESTAMPTZ,
 "migration_name" VARCHAR(255) NOT NULL,
 "logs" TEXT,
 "rolled_back_at" TIMESTAMPTZ,
 "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
 "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
`];
for(const entry of entries){
 const bytes=await readFile(path.join(root,entry.name,'migration.sql'));
 const checksum=createHash('sha256').update(bytes).digest('hex');
 const name=entry.name.replaceAll("'","''");
 parts.push(`-- Migration: ${entry.name}
DO $saha_migration$
BEGIN
 IF EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='${name}' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum<>'${checksum}') THEN
  RAISE EXCEPTION 'Migration checksum farkli: ${name}. Mevcut veri korundu.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='${name}' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum='${checksum}') THEN
${bytes.toString('utf8')}
 INSERT INTO "saha"."_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count)
 VALUES ('${randomUUID()}','${checksum}','${name}',now(),1);
 END IF;
END $saha_migration$;
`);
}
parts.push(`-- Uygulama kendi Express oturum/rol denetimini kullanir.
-- Data API rollerine acik okuma/yazma politikasi eklenmez.
REVOKE ALL ON SCHEMA "saha" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA "saha" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "saha" FROM PUBLIC, anon, authenticated, service_role;
DO $saha_rls$
DECLARE t RECORD;
BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='saha' LOOP
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY','saha',t.tablename);
 END LOOP;
END $saha_rls$;
COMMIT;

-- Basarili kurulumda 13 uygulama tablosu ve Prisma migration tablosu listelenir.
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='saha' ORDER BY tablename;
`);
await mkdir('supabase',{recursive:true});
await writeFile('supabase/kurulum.sql',parts.join('\n'),'utf8');
console.log('supabase/kurulum.sql hazir: '+entries.length+' migration, parola veya isletme verisi icermez.');
