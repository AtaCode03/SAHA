import {useEffect,useState} from 'react';
import {api,today,number} from './api';
export function AppointmentTodayCard({appointment:a,onOpen}:{appointment:any;onOpen:()=>void}){
 return <article className="panel order-row"><div><span className="badge">Program bekliyor</span>{a.source==='SYNTHETIC'&&<span className="badge warning">Sentetik</span>}<h2>{a.field.customer.name} · {a.field.name}</h2><p>{a.service} · {a.windows.map((w:any)=>w.start+'–'+w.end).join(', ')}</p><p>{number(a.agreedPrice,'TL')}</p></div><button onClick={onOpen}>Randevuyu aç</button></article>;
}
export function TodayAppointments({onOpen}:{onOpen:()=>void}){
 const [data,S]=useState<any>(null),[error,E]=useState(''),[page,P]=useState(1),[reload,R]=useState(0),[loading,L]=useState(true);
 const day=today();
 useEffect(()=>{let live=true;L(true);E('');api('/planning/appointments?'+new URLSearchParams({status:'PENDING',day,page:String(page),pageSize:'25'})).then(r=>{if(live)S(r);}).catch(e=>{if(live)E(e.message);}).finally(()=>{if(live)L(false);});return()=>{live=false;};},[day,page,reload]);
 return <section aria-label="Bugünün randevuları"><div className="section-head"><h2>Bugünün randevuları</h2>{!loading&&!error&&data&&<span className="badge">{data.total} randevu</span>}</div><p className="hint">Bugün için istenen, henüz programa alınmamış talepler. Programlanan randevular aşağıdaki iş listesinde görünür.</p>{loading?<p role="status">Randevular yükleniyor…</p>:error?<div className="error" role="alert">{error}<button onClick={()=>R(reload+1)}>Tekrar dene</button></div>:data&&<>{!data.total&&<p className="empty">Bugün için program bekleyen randevu yok.</p>}{data.data.map((a:any)=><AppointmentTodayCard key={a.id} appointment={a} onOpen={onOpen}/>)}{data.total>25&&<div className="actions"><button className="secondary" disabled={page===1} onClick={()=>P(page-1)}>Önceki</button><span>Sayfa {page}</span><button className="secondary" disabled={page*25>=data.total} onClick={()=>P(page+1)}>Sonraki</button></div>}</>}</section>;
}
