import {Router} from 'express';
import {z} from 'zod';
import {rateLimit} from 'express-rate-limit';
import {pointOnFeature} from '@turf/turf';
import {createHash} from 'node:crypto';
import {admin} from './auth.js';
import {weatherStatus} from './weather-provider.js';
import {researchWeatherEnabled,forecastDate,fetchOpenMeteo} from './open-meteo.js';
import {db} from './db.js';
import {AppError,boundarySchema} from './domain.js';
export const weatherRouter=Router();weatherRouter.use(admin);
weatherRouter.get('/status',(_req,res)=>res.json(process.env.WEATHER_PROVIDER==='OPEN_METEO'?{provider:'OPEN_METEO',configured:researchWeatherEnabled(),forecastDays:16,usageMode:'RESEARCH',sourceUrl:'https://open-meteo.com/',message:'Ücretsiz geliştirme/araştırma modu. Ticari operasyon için kullanılmaz.',suitability:'NOT_EVALUATED'}:weatherStatus()));
const inflight=new Map<string,Promise<any>>();
weatherRouter.post('/fields/:id/forecast',rateLimit({windowMs:15*60000,limit:60,keyGenerator:req=>req.actor!.id,standardHeaders:true,legacyHeaders:false,message:{error:{code:'WEATHER_RATE_LIMIT',message:'Hava sorgu sınırına ulaşıldı; biraz sonra deneyin.'}}}),async(req,res)=>{
 if(!researchWeatherEnabled())throw new AppError(503,'WEATHER_NOT_CONFIGURED','Open-Meteo araştırma modu etkin değil.');
 const {date}=z.object({date:z.string()}).strict().parse(req.body);forecastDate(date);
 const field=await db.field.findUnique({where:{id:String(req.params.id)}});if(!field)throw new AppError(404,'FIELD_NOT_FOUND','Tarla bulunamadı.');
 let latitude=field.latitude,longitude=field.longitude;
 if(field.boundary){const geometry=boundarySchema.parse(field.boundary);if(!geometry)throw new AppError(422,'WEATHER_LOCATION_MISSING','Tarla sınırı bulunmuyor.');const point=pointOnFeature(geometry).geometry.coordinates;longitude=point[0];latitude=point[1];}
 if(latitude==null||longitude==null)throw new AppError(422,'WEATHER_LOCATION_MISSING','Tarlanın kayıtlı sınırı veya konumu bulunmuyor. Önce parseli sorgulayıp tarlayı kaydedin.');
 const hash=createHash('sha256').update(JSON.stringify({fieldId:field.id,latitude,longitude,date,version:'open-meteo-v1'})).digest('hex');
 const cached=await db.weatherForecast.findFirst({where:{inputHash:hash,retrievedAt:{gte:new Date(Date.now()-15*60000)}},orderBy:{retrievedAt:'desc'}});if(cached){res.json({id:cached.id,payload:cached.payload,cached:true});return;}
 let pending=inflight.get(hash);if(!pending){const actor=req.actor!.id;pending=(async()=>{const payload=await fetchOpenMeteo(latitude!,longitude!,date);const row=await db.weatherForecast.create({data:{fieldId:field.id,createdById:actor,provider:payload.provider,adapterVersion:payload.adapterVersion,usageMode:payload.usageMode,requestedDate:date,inputHash:hash,retrievedAt:new Date(payload.retrievedAt),validFrom:new Date(payload.hours[0].validAt),validTo:new Date(new Date(payload.hours.at(-1)!.validAt).getTime()+3600000),payload}});return {id:row.id,payload:row.payload,cached:false};})().finally(()=>inflight.delete(hash));inflight.set(hash,pending);}
 res.json(await pending);
});
