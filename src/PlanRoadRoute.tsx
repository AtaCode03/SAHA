import {useEffect,useState} from 'react';
import {api,date,number} from './api';
import {FieldMap} from './Map';
export function PlanRoadRoute({plan,profiles}:{plan:any;profiles:any[]}){
 const [consent,C]=useState(false),[routes,R]=useState<Record<string,any>>({}),[error,E]=useState(''),[busy,B]=useState(false);
 useEffect(()=>{R({});E('');C(false);},[plan.id]);
 if(!plan.input.roadMatrixIds?.length)return null;
 return <section className="panel"><h2>Karayolu güzergâhı</h2><label className="checkbox"><input type="checkbox" checked={consent} onChange={e=>C(e.target.checked)}/>Bu planın depo ve teyitli giriş koordinatlarının yol çizgisi için OpenRouteService'e gönderilmesini onaylıyorum.</label>{plan.result.routes.filter((r:any)=>plan.result.stops.some((s:any)=>s.profileId===r.id)).map((r:any)=><div key={r.id}><button className="secondary" disabled={busy||!consent} onClick={async()=>{B(true);E('');try{const data=await api('/road-planning/plans/'+plan.id+'/route','POST',{profileId:r.id,transmitConsent:true});R({...routes,[r.id]:data});}catch(e){E((e as Error).message);}finally{B(false);}}}>{profiles.find(p=>p.id===r.id)?.name??'Ekip'} güzergâhını göster</button>{routes[r.id]&&<RouteDisplay data={routes[r.id]}/>}</div>)}{error&&<p className="error" role="alert">{error}</p>}</section>;
}
function RouteDisplay({data}:{data:any}){return <><FieldMap route={data.geometry}/><p>{number(data.meters/1000,'km')} · {number(data.minutes,'dakika')} · alınma {date(data.retrievedAt)}</p><p className="hint">{data.attribution}. Çizgi taşıma aracının yol tahminidir; drone uçuş planı değildir. Yeni Directions yanıtı planın onaylı saatlerini değiştirmez.</p></>;}
export function OrderRoadRoute({id}:{id:string}){const [data,D]=useState<any>(null),[error,E]=useState('');useEffect(()=>{let active=true;api('/road-planning/orders/'+id+'/route').then(r=>{if(active)D(r);}).catch(e=>{if(active)E(e.message);});return()=>{active=false;};},[id]);return <section className="panel"><h2>Kayıtlı ekip güzergâhı</h2>{data?<RouteDisplay data={data}/>:<p className="hint">{error||'Güzergâh kaydı yükleniyor…'}</p>}</section>;}
