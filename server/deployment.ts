export function validateDeployment(env:NodeJS.ProcessEnv){
 if(env.VERCEL!=='1')return;
 let origin:URL;
 try{origin=new URL(env.APP_ORIGIN??'');}catch{throw Error('Vercel APP_ORIGIN: uygulamanın tam HTTPS adresini ayarlayın.');}
 if(origin.protocol!=='https:'||origin.origin!==env.APP_ORIGIN||origin.username||origin.password||['localhost','127.0.0.1'].includes(origin.hostname))throw Error('Vercel APP_ORIGIN yalnız tam HTTPS origin olmalı; sonunda / bulunmamalı.');
 let database:URL;
 try{database=new URL(env.DATABASE_URL??'');}catch{throw Error('Vercel DATABASE_URL ayarlanmalı.');}
 if(!['postgresql:','postgres:'].includes(database.protocol)||['localhost','127.0.0.1','[::1]'].includes(database.hostname))throw Error('Vercel için uzak PostgreSQL bağlantısı gerekli.');
 if(env.NODE_ENV!=='production')throw Error('Vercel NODE_ENV=production olmalı.');
}
