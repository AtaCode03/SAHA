import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
if(process.env.DATABASE_MODE!=='SUPABASE')throw Error('Supabase modu seçilmedi.');
const url=new URL(process.env.DATABASE_URL??'');
if(url.hostname!=='aws-0-ap-northeast-2.pooler.supabase.com'||decodeURIComponent(url.username)!=='postgres.ilhdqrudssndtmsreieh'||url.searchParams.get('schema')!=='saha')throw Error('Supabase hedefi doğrulanamadı.');
for(const port of [3001,5173])await new Promise<void>((resolve,reject)=>{const probe=createServer();probe.once('error',()=>reject(Error(`${port} portu kullanımda. Açık uygulamayı kapatın.`)));probe.listen(port,'127.0.0.1',()=>probe.close(()=>resolve()));});
const db=new PrismaClient();try{await db.$queryRaw`SELECT 1`;if(await db.user.count({where:{role:'ADMIN',active:true}})===0)throw Error('Supabase yönetici aktarımı doğrulanamadı.');}finally{await db.$disconnect();}
const env={...process.env,APP_ORIGIN:'http://localhost:5173',NODE_ENV:'development',PORT:'3001'};
console.log('Supabase veritabanı hazır. Web arayüzü localhost:5173 üzerinde; kullanıcı ve yeni oturumlar Supabase saha şemasına yazılır.');
const api=spawn(process.execPath,['dist-server/index.js'],{env,stdio:'inherit',windowsHide:true,detached:true});
const web=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--port','5173','--host','127.0.0.1','--strictPort'],{env,stdio:'inherit',windowsHide:true,detached:true});
let stopping=false;function stop(code=0){if(stopping)return;stopping=true;api.kill();web.kill();process.exit(code);}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());api.on('error',()=>stop(1));web.on('error',()=>stop(1));api.on('exit',()=>{if(!stopping)stop(1);});web.on('exit',()=>{if(!stopping)stop(1);});
