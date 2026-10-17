import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import request from 'supertest';
const {mock,fetchWeather}=vi.hoisted(()=>({mock:{session:{findUnique:vi.fn()},field:{findUnique:vi.fn()},weatherForecast:{findFirst:vi.fn(),create:vi.fn()}},fetchWeather:vi.fn()}));
vi.mock('../server/db.js',()=>({db:mock}));
vi.mock('../server/open-meteo.js',async importOriginal=>({...await importOriginal<typeof import('../server/open-meteo.js')>(),fetchOpenMeteo:fetchWeather}));
import {app} from '../server/app.js';
const headers={Cookie:'session=test',Origin:'http://localhost:5173','x-csrf-token':'token'};
const date=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('WEATHER_PROVIDER','OPEN_METEO');vi.stubEnv('WEATHER_USAGE_MODE','RESEARCH');vi.stubEnv('NODE_ENV','development');mock.session.findUnique.mockResolvedValue({id:'hash',csrf:'token',expiresAt:new Date(Date.now()+100000),user:{id:'manager',name:'Manager',active:true,role:'ADMIN'}});mock.field.findUnique.mockResolvedValue({id:'field',latitude:37,longitude:31});mock.weatherForecast.findFirst.mockResolvedValue(null);});
afterEach(()=>vi.unstubAllEnvs());
it('oturumsuz, operatör ve CSRF eksik istek dış servise erişemez',async()=>{
 expect((await request(app).post('/api/weather/fields/field/forecast').send({date:date()})).status).toBe(401);
 expect((await request(app).post('/api/weather/fields/field/forecast').set({Cookie:'session=test',Origin:headers.Origin}).send({date:date()})).status).toBe(403);
 mock.session.findUnique.mockResolvedValue({csrf:'token',expiresAt:new Date(Date.now()+100000),user:{id:'op',active:true,role:'OPERATOR'}});
 expect((await request(app).post('/api/weather/fields/field/forecast').set(headers).send({date:date()})).status).toBe(403);expect(fetchWeather).not.toHaveBeenCalled();
});
it('konum eksikliği ve sağlayıcı hatası kayıt oluşturmaz',async()=>{
 mock.field.findUnique.mockResolvedValueOnce({id:'field'});
 expect((await request(app).post('/api/weather/fields/field/forecast').set(headers).send({date:date()})).status).toBe(422);
 const {AppError}=await import('../server/domain.js');fetchWeather.mockRejectedValueOnce(new AppError(502,'WEATHER_SERVICE_ERROR','Servis hatası'));
 expect((await request(app).post('/api/weather/fields/field/forecast').set(headers).send({date:date()})).status).toBe(502);expect(mock.weatherForecast.create).not.toHaveBeenCalled();
});
it('snapshot kaydeder ve güncel önbelleği yeniden sorgulamadan döndürür',async()=>{
 const payload={provider:'OPEN_METEO',adapterVersion:'open-meteo-v1',usageMode:'RESEARCH',retrievedAt:new Date().toISOString(),hours:[{validAt:date()+'T00:00:00Z'}]};fetchWeather.mockResolvedValueOnce(payload);mock.weatherForecast.create.mockResolvedValueOnce({id:'forecast',payload});
 const first=await request(app).post('/api/weather/fields/field/forecast').set(headers).send({date:date()});expect(first.status).toBe(200);expect(first.body.cached).toBe(false);expect(mock.weatherForecast.create.mock.calls[0][0].data).toMatchObject({fieldId:'field',createdById:'manager',requestedDate:date(),payload});
 mock.weatherForecast.findFirst.mockResolvedValueOnce({id:'forecast',payload});const second=await request(app).post('/api/weather/fields/field/forecast').set(headers).send({date:date()});expect(second.body.cached).toBe(true);expect(fetchWeather).toHaveBeenCalledTimes(1);expect(mock.weatherForecast.create).toHaveBeenCalledTimes(1);
});
