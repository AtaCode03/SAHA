import {z} from 'zod';
import {AppError} from './domain.js';
export const researchWeatherEnabled=()=>process.env.WEATHER_PROVIDER==='OPEN_METEO'&&process.env.WEATHER_USAGE_MODE==='RESEARCH'&&process.env.NODE_ENV!=='production';
const variables=['temperature_2m','relative_humidity_2m','wind_speed_10m','wind_gusts_10m','wind_direction_10m','precipitation','precipitation_probability'] as const;
export function forecastDate(date:string,now=new Date()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new AppError(422,'WEATHER_DATE','Geçerli tarih gerekli.');
 const today=now.toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'}),days=(Date.parse(date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000;
 if(days<0||days>15)throw new AppError(422,'WEATHER_OUTSIDE_HORIZON','Tahmin için bugün ile önümüzdeki15 gün arasında tarih seçin. Uzak tarihli randevu kaydedilebilir, hava henüz değerlendirilmez.');return date;
}
export function normalizeOpenMeteo(raw:unknown,date:string,retrievedAt=new Date()){
 const numeric=z.array(z.number().finite().nullable());
 const parsed=z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),hourly_units:z.record(z.string(),z.string()),hourly:z.object({time:z.array(z.number().int().positive()),temperature_2m:numeric,relative_humidity_2m:numeric,wind_speed_10m:numeric,wind_gusts_10m:numeric,wind_direction_10m:numeric,precipitation:numeric,precipitation_probability:numeric})}).safeParse(raw);
 const fail=()=>new AppError(502,'WEATHER_RESPONSE_INVALID','Open-Meteo tahmin yanıtı doğrulanamadı.');if(!parsed.success)throw fail();const j=parsed.data,h=j.hourly;
 for(const [v,unit] of Object.entries({temperature_2m:'°C',relative_humidity_2m:'%',wind_speed_10m:'m/s',wind_gusts_10m:'m/s',wind_direction_10m:'°',precipitation:'mm',precipitation_probability:'%'}))if(j.hourly_units[v]!==unit||h[v as typeof variables[number]].length!==h.time.length)throw fail();
 if(h.time.length>400||new Set(h.time).size!==h.time.length||h.time.some((v,i)=>i>0&&v-h.time[i-1]!==3600))throw fail();
 const range=(n:number|null,min:number,max:number)=>n===null||(n>=min&&n<=max);
 const hours=h.time.flatMap((time,i)=>{if(new Date(time*1000).toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'})!==date)return [];if(!range(h.temperature_2m[i],-100,70)||!range(h.relative_humidity_2m[i],0,100)||!range(h.wind_speed_10m[i],0,200)||!range(h.wind_gusts_10m[i],0,200)||!range(h.wind_direction_10m[i],0,360)||!range(h.precipitation[i],0,1000)||!range(h.precipitation_probability[i],0,100))throw fail();return [{validAt:new Date(time*1000).toISOString(),temperatureC:h.temperature_2m[i],relativeHumidityPercent:h.relative_humidity_2m[i],windSpeedMs:h.wind_speed_10m[i],windGustMs:h.wind_gusts_10m[i],windDirectionDegrees:h.wind_direction_10m[i],precipitationMm:h.precipitation[i],rainProbabilityPercent:h.precipitation_probability[i]}];});
 if(hours.length!==24)throw new AppError(502,'WEATHER_INCOMPLETE','Hedef günün24 saatlik tahmini eksik. Eksik saatler doldurulmadı.');
 return {provider:'OPEN_METEO',adapterVersion:'open-meteo-v1',usageMode:'RESEARCH',dataType:'FORECAST',retrievedAt:retrievedAt.toISOString(),issuedAt:null,requestedDate:date,timezone:'Europe/Istanbul',forecastLocation:{latitude:j.latitude,longitude:j.longitude},windReferenceHeightMeters:10,temperatureReferenceHeightMeters:2,aggregation:{wind:'instant',gust:'preceding_hour_max',precipitation:'preceding_hour_sum'},hours,suitability:'NOT_EVALUATED',sourceUrl:'https://open-meteo.com/',attribution:'Weather data by Open-Meteo (CC BY 4.0)'};
}
export async function fetchOpenMeteo(latitude:number,longitude:number,date:string){
 if(!researchWeatherEnabled())throw new AppError(503,'WEATHER_NOT_CONFIGURED','Open-Meteo ücretsiz araştırma modu etkin değil.');forecastDate(date);
 const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:String(latitude),longitude:String(longitude),hourly:variables.join(','),forecast_days:'16',timezone:'Europe/Istanbul',timeformat:'unixtime',wind_speed_unit:'ms',temperature_unit:'celsius',precipitation_unit:'mm'}).toString();let raw:unknown;
 try{const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000)});if(!r.ok||!r.headers.get('content-type')?.includes('json')||!r.body)throw Error();const reader=r.body.getReader(),chunks:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024*1024){await reader.cancel();throw Error();}chunks.push(value);}}finally{reader.releaseLock();}raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AppError(502,'WEATHER_SERVICE_ERROR','Open-Meteo tahmini alınamadı. Veri kaydedilmedi; tekrar deneyin.');}
 return {...normalizeOpenMeteo(raw,date),requestedLocation:{latitude,longitude}};
}
