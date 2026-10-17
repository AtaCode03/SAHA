import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';

export async function testSupabaseSql(url:string){
 if(!new URL(url).pathname.startsWith('/saha_test_'))throw Error('Yalniz izole test veritabaninda calisir.');
 const {Client}=await import('pg');
 const client=new Client({connectionString:url});await client.connect();
 const sql=await readFile('supabase/kurulum.sql','utf8');
 const remoteUrl=new URL(url);remoteUrl.searchParams.set('schema','saha');
 const db=new PrismaClient({datasourceUrl:remoteUrl.toString()});
 try{
  for(const role of ['anon','authenticated','service_role'])await client.query(`CREATE ROLE "${role}" NOLOGIN`);
  await client.query(sql);
  const user=await db.user.create({data:{email:'sql-schema-test@example.invalid',name:'SYNTHETIC SQL TEST',passwordHash:'TEST_ONLY_NOT_A_LOGIN_HASH',role:'ADMIN'}});
  await client.query(sql); // A repeat must preserve records and ledger, not recreate tables.
  assert.equal((await db.user.findUniqueOrThrow({where:{id:user.id}})).email,user.email);
  const tables=await client.query("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='saha'");
  assert.equal(tables.rows.length,21);assert.ok(tables.rows.every((t:any)=>t.rowsecurity));
  const migrations=await client.query('SELECT count(*)::int AS n FROM saha._prisma_migrations');assert.equal(migrations.rows[0].n,8);
  const access=await client.query("SELECT has_schema_privilege('anon','saha','USAGE') AS allowed");assert.equal(access.rows[0].allowed,false);
  execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','status'],{env:{...process.env,DATABASE_URL:remoteUrl.toString()},stdio:'pipe',windowsHide:true});
  console.log('Supabase SQL testi gecti: 21 tablo, RLS/erisim kisiti, tekrar calistirmada veri korunmasi ve Prisma migration status uyumu.');
 }finally{await db.$disconnect();await client.end();}
}
