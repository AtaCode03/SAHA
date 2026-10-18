import {useState} from 'react';
import {FieldMap} from './Map';
import {date,number} from './api';
export function NextJob({orders,onOpen}:{orders:any[];onOpen:(id:string)=>void}){
 const [map,M]=useState(false);
 const next=[...orders].filter(o=>['RUNNING','PLANNED'].includes(o.status)).sort((a,b)=>Number(b.status==='RUNNING')-Number(a.status==='RUNNING')||new Date(a.plannedStart).getTime()-new Date(b.plannedStart).getTime())[0];
 if(!next)return null;
 return <section className="panel next-job"><span className="eyebrow">{next.status==='RUNNING'?'DEVAM EDEN İŞ':'SIRADAKİ İŞ'}</span><h2>{next.field.name}</h2><p className="next-job-time">{date(next.plannedStart)}</p><p>{next.customer.name} · {number(next.plannedArea,'dekar')} · {next.service}</p><p>{next.field.neighborhood} / {next.field.district}</p><div className="next-job-actions">{next.customer.phone?<a className="button secondary" href={'tel:'+next.customer.phone}>Müşteriyi ara</a>:<span>Telefon kayıtlı değil</span>}<button className="secondary" onClick={()=>M(!map)} aria-expanded={map}>{map?'Konumu kapat':'Konumu aç'}</button><button onClick={()=>onOpen(next.id)}>{next.status==='RUNNING'?'İşe devam et':'İşi aç ve başlat'}</button></div>{map&&<FieldMap key={next.id} boundary={next.field.boundary} latitude={next.field.latitude} longitude={next.field.longitude}/>}</section>;
}
