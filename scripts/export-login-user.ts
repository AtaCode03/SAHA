import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const state=JSON.parse(await readFile('.local/state.json','utf8'));
const sourceUrl=new URL(state.databaseUrl);
if(!['localhost','127.0.0.1'].includes(sourceUrl.hostname)||sourceUrl.pathname!=='/saha_local')throw Error('Yerel kaynak doğrulanamadı.');
const db=new PrismaClient({datasourceUrl:state.databaseUrl});
const quote=(v:string)=>"'"+v.replaceAll("'","''")+"'";
try{
 const user=await db.user.findUniqueOrThrow({where:{email:state.email}});
 if(!user.active||user.role!=='ADMIN')throw Error('İlk yerel yönetici doğrulanamadı.');
 const values=[quote(user.id),quote(user.email),quote(user.name),quote(user.passwordHash),quote(user.role),user.active?'TRUE':'FALSE',quote(user.createdAt.toISOString())].join(',');
 const sql=`-- ÖZEL: Yerel yönetici hesabı. Parola özeti içerir; paylaşmayın.
-- Önce supabase/kurulum.sql uygulanmalı. Supabase Auth kullanıcısı değildir.
BEGIN;
DO $guard$ BEGIN IF to_regclass('saha.users') IS NULL THEN RAISE EXCEPTION 'Once supabase/kurulum.sql uygulanmali'; END IF; END $guard$;
INSERT INTO saha.users (id,email,name,"passwordHash",role,active,"createdAt") VALUES (${values})
ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name,"passwordHash"=EXCLUDED."passwordHash",role=EXCLUDED.role,active=EXCLUDED.active;
SELECT email,name,role,active FROM saha.users WHERE email=${quote(user.email)};
COMMIT;
`;
 await mkdir('.local/supabase',{recursive:true});
 await writeFile('.local/supabase/ilk-kullanici.sql',sql,{mode:0o600});
 await writeFile('.local/supabase/ilk-kullanici-manifest.json',JSON.stringify({createdAt:new Date().toISOString(),accountCount:1,sessionsExcluded:true,format:'saha-single-user-1',sqlSha256:createHash('sha256').update(sql).digest('hex')},null,2),{mode:0o600});
 console.log('Tek yönetici için özel SQL hazır: .local/supabase/ilk-kullanici.sql. Parola veya özeti loglanmadı.');
}finally{await db.$disconnect();}
