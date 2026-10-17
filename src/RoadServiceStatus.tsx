import {useEffect,useState} from 'react';
import {api} from './api';
export function RoadServiceStatus(){
 const [data,S]=useState<any>(null),[error,E]=useState(''),[retry,R]=useState(0);
 useEffect(()=>{let active=true;api('/roads/status').then(r=>{if(active){S(r);E('');}}).catch(e=>{if(active)E(e.message);});return()=>{active=false;};},[retry]);
 return <section className="panel"><h2>Karayolu API bağlantısı</h2>{error?<p className="error" role="alert">{error}</p>:!data?<p>Servis ayarları kontrol ediliyor…</p>:<><span className={'badge '+(data.configured?'':'warning')}>{data.configured?'Yapılandırılmış · canlı test bekliyor':'Henüz yapılandırılmadı'}</span><p>{data.message}</p><p className="hint">OpenRouteService Matrix ve Directions sunucu adaptörleri hazır. Depo ve tarla girişlerini haritada teyit ettikten sonra API ile yol matrisini hesaplayabilirsiniz. Manuel süreler ayrı seçilir. Parsel merkezi araç girişi sayılmaz.</p><a href="https://account.heigit.org/" target="_blank" rel="noreferrer">HeiGIT / OpenRouteService hesabı</a></>}<button type="button" className="secondary" onClick={()=>R(retry+1)}>Bağlantı ayarlarını tekrar kontrol et</button></section>;
}
