import {expect,it} from 'vitest';
import request from 'supertest';
import {validateDeployment} from '../server/deployment';
import handler from '../api/index';
it('yerel geliştirmeyi değiştirmez; Vercel için HTTPS origin ve uzak veritabanı ister',()=>{
 expect(()=>validateDeployment({})).not.toThrow();
 const env={VERCEL:'1',NODE_ENV:'production',APP_ORIGIN:'https://saha-test.vercel.app',DATABASE_URL:'postgresql://test:test@db.example.com/postgres?schema=saha'};
 expect(()=>validateDeployment(env)).not.toThrow();
 for(const origin of ['','http://saha-test.vercel.app','https://saha-test.vercel.app/','https://saha-test.vercel.app/path','https://localhost','https://u:p@saha-test.vercel.app'])expect(()=>validateDeployment({...env,APP_ORIGIN:origin})).toThrow();
 expect(()=>validateDeployment({...env,DATABASE_URL:'postgresql://test:test@localhost/db'})).toThrow();
 expect(()=>validateDeployment({...env,NODE_ENV:'development'})).toThrow();
});
it('sunucusuz giriş dosyası /api yolunu ve oturum korumasını korur',async()=>{
 const result=await request(handler).get('/api/auth/me');
 expect(result.status).toBe(401);expect(result.body.error.code).toBe('UNAUTHENTICATED');expect(result.headers['cache-control']).toBe('private, no-store');
 const login=await request(handler).post('/api/auth/login').set('Origin','https://untrusted.example').send({email:'burak_demirel_42',password:'not-used'});
 expect(login.status).toBe(403);expect(login.body.error.code).toBe('ORIGIN');
});
