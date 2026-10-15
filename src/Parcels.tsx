import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import {api,number} from './api';
import {parseParcelFile,geoJsonMetadata,type ParcelCollection} from '../server/parcel-geometry';

type Option={id:string,name:string};
type Status={defaultLayer?:'standard'|'satellite',mapMessage?:string,localDevelopmentTest?:boolean,mode:'DEMO'|'REAL'|'CATALOG',message:string,administrativeCoverage:string,standard:{url:string,attribution:string,attributionUrl:string},satellite:{url:string,overlayUrl?:string,attribution:string,attributionUrl?:string}|null};
type Result={provenance:'DEMO'|'USER_FILE'|'REAL',province:string|null,district:string|null,neighborhood:string|null,block:string|null,parcel:string|null,areaSquareMeters:number|null,nature:string|null,source:string,updatedAt:string|null,geometry:ParcelCollection};
function BoundaryMap({geometry,status}:{geometry:ParcelCollection|null,status:Status}){
 const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),boundary=useRef<L.GeoJSON|null>(null),base=useRef<L.LayerGroup|null>(null);
 const [layer,S]=useState<'standard'|'satellite'>(status.defaultLayer??'standard'),[error,E]=useState(''),[full,F]=useState(false);
 const focus=()=>{const bounds=boundary.current?.getBounds();if(bounds?.isValid())map.current?.fitBounds(bounds,{padding:[35,35],maxZoom:18});};
 useEffect(()=>{if(!canvas.current)return;const m=L.map(canvas.current,{scrollWheelZoom:false}).setView([37.418,31.85],13);map.current=m;
  const resize=new ResizeObserver(()=>{m.invalidateSize();});resize.observe(canvas.current);
  return()=>{resize.disconnect();m.remove();map.current=null;};
 },[]);
 useEffect(()=>{
  if(!map.current)return;E('');base.current?.remove();base.current=null;
  const config=layer==='satellite'?status.satellite:status.standard;
  if(!config){E('Uydu sağlayıcısı bağlı değil. Lisanslı döşeme servisi yapılandırılmalı.');return;}
  // Attribution from server config is displayed as plain React text, not HTML.
  const urls=[config.url,...('overlayUrl' in config&&config.overlayUrl?[config.overlayUrl]:[])];
  const tiles=L.layerGroup(urls.map(url=>L.tileLayer(url,{maxZoom:20,referrerPolicy:'strict-origin-when-cross-origin'}).on('tileerror',()=>E('Harita görüntüsü yüklenemedi. Bağlantı/sağlayıcı ayarlarını kontrol edin.')))).addTo(map.current);
  base.current=tiles;return()=>{tiles.remove();};
 },[layer,status]);
 useEffect(()=>{if(!map.current)return;boundary.current?.remove();boundary.current=null;if(geometry){boundary.current=L.geoJSON(geometry,{style:{color:'#dc2626',weight:3,fillColor:'#ef4444',fillOpacity:.19}}).addTo(map.current);focus();}},[geometry]);
 useEffect(()=>{const changed=()=>{F(document.fullscreenElement===root.current);setTimeout(()=>map.current?.invalidateSize(),0);};document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);},[]);
 const fullscreen=async()=>{try{if(document.fullscreenElement===root.current)await document.exitFullscreen();else if(root.current?.requestFullscreen)await root.current.requestFullscreen();else F(!full);}catch{F(!full);}};
 return <section className={'parcel-map-panel panel '+(full?'parcel-fullscreen':'')} ref={root} aria-label="Parsel haritası">
  <div className="parcel-map-toolbar"><div className="actions" role="group" aria-label="Harita katmanı"><button type="button" className={layer==='standard'?'':'secondary'} aria-pressed={layer==='standard'} onClick={()=>S('standard')}>Standart</button><button type="button" className={layer==='satellite'?'':'secondary'} aria-pressed={layer==='satellite'} onClick={()=>S('satellite')}>Uydu{!status.satellite?' · bağlı değil':''}</button></div><div className="actions"><button type="button" className="secondary" disabled={!geometry} onClick={focus}>⌖ Parsele odaklan</button><button type="button" className="secondary" onClick={fullscreen}>{full?'Tam ekrandan çık':'⛶ Tam ekran'}</button></div></div>
  {error&&<p className="error" role="alert">{error}</p>}
  <div ref={canvas} className="parcel-map"/>
  <div className="parcel-attribution">{status.mapMessage&&<span>{status.mapMessage} · </span>}{layer==='standard'?<a href={status.standard.attributionUrl} target="_blank" rel="noreferrer">{status.standard.attribution}</a>:status.satellite?<a href={status.satellite.attributionUrl??'https://www.maptiler.com/copyright/'} target="_blank" rel="noreferrer">{status.satellite.attribution}</a>:'Uydu görüntüsü yapılandırılmadı.'} · Kırmızı sınır ayrı geometri katmanıdır.</div>
  {!geometry&&<p className="hint">Parseli gösterin veya sınır dosyası yükleyin. Uydu/standart görüntüsü tapu sınırı sağlamaz.</p>}
 </section>;
}
export function Parcels(){
 const [status,T]=useState<Status|null>(null),[provinces,P]=useState<Option[]>([]),[districts,D]=useState<Option[]>([]),[neighborhoods,N]=useState<Option[]>([]);
 const [province,SP]=useState(''),[district,SD]=useState(''),[neighborhood,SN]=useState(''),[block,B]=useState(''),[parcel,PN]=useState('');
 const [loading,L]=useState(''),[error,E]=useState(''),[result,R]=useState<Result|null>(null),[initial,I]=useState(true),[districtBusy,DB]=useState(false),[neighborhoodBusy,NB]=useState(false),[catalogError,CE]=useState(''),[retry,Retry]=useState(0);
 const request=useRef(0);
 const clear=()=>{request.current++;R(null);E('');L('');};
 useEffect(()=>{let active=true;I(true);E('');Promise.all([api('/parcels/status'),api('/parcels/provinces')]).then(([s,p])=>{if(active){T(s);P(p.data);}}).catch(e=>{if(active)E(e.message);}).finally(()=>{if(active)I(false);});return()=>{active=false;};},[retry]);
 useEffect(()=>{let active=true;D([]);N([]);CE('');DB(Boolean(province));if(province)api('/parcels/districts?provinceId='+encodeURIComponent(province)).then(r=>{if(active)D(r.data);}).catch(e=>{if(active)CE('İlçeler yüklenemedi: '+e.message);}).finally(()=>{if(active)DB(false);});return()=>{active=false;};},[province,retry]);
 useEffect(()=>{let active=true;N([]);CE('');NB(Boolean(district));if(district)api('/parcels/neighborhoods?districtId='+encodeURIComponent(district)).then(r=>{if(active)N(r.data);}).catch(e=>{if(active)CE('Mahalleler yüklenemedi: '+e.message);}).finally(()=>{if(active)NB(false);});return()=>{active=false;};},[district,retry]);
 useEffect(()=>()=>{request.current++;},[]);
 const query=async(e:React.FormEvent)=>{e.preventDefault();E('');R(null);L('Parsel sınırı yükleniyor…');const sequence=++request.current;try{const found=await api('/parcels/query','POST',{provinceId:province,districtId:district,neighborhoodId:neighborhood,block:block.trim(),parcel:parcel.trim(),mode:status?.mode==='DEMO'?'DEMO':'REAL'});if(sequence===request.current)R(found);}catch(e){if(sequence===request.current)E((e as Error).message);}finally{if(sequence===request.current)L('');}};
 const upload=async(file:File)=>{const sequence=++request.current;E('');R(null);L('Dosya kontrol ediliyor…');try{const extension=file.name.split('.').at(-1)?.toLowerCase()??'';if(!['geojson','json','kml'].includes(extension))throw Error('GeoJSON (.geojson/.json) veya KML dosyası seçin.');if(file.size>1024*1024)throw Error('Dosya en fazla 1 MB olabilir.');const text=await file.text(),parsed=parseParcelFile(text,extension);const checked=await api('/parcels/validate-file','POST',parsed);if(sequence===request.current)R({provenance:'USER_FILE',province:null,district:null,neighborhood:null,block:null,parcel:null,areaSquareMeters:null,nature:null,updatedAt:null,...(extension==='kml'?{}:geoJsonMetadata(text)),source:file.name+' — kullanıcı dosyası öznitelikleri, resmî doğrulama yapılmadı',geometry:checked.geometry} as Result);}catch(e){if(sequence===request.current)E((e as Error).message);}finally{if(sequence===request.current)L('');}};
 return <div className="parcel-workspace">
  <header className="page-head"><div><span className="eyebrow">HARİTA VE KONUM</span><h1>Arsa ve Parsel Sorgulama</h1><p className="muted">İdari seçim, parsel sınırı ve dosyadan geometri görüntüleme.</p></div><span className="badge warning">{status?.localDevelopmentTest?'Yerel test · TKGM':status?.mode==='REAL'?'TKGM servisi':'Gerçek servis bağlı değil'}</span></header>
  <details className="parcel-service-note"><summary>{status?.mode==='REAL'?'Veri kaynağı ve bağlantı bilgisi':'Türkiye adres kataloğu · Gerçek parsel servisi bağlı değil'}</summary><p>{status?.message} {status?.administrativeCoverage} Gösterilen demo sınır gerçek taşınmaz değildir.</p></details>
  {initial&&<p role="status">Modül yükleniyor…</p>}
  {!initial&&!status&&<div className="error" role="alert">{error}<button type="button" className="secondary" onClick={()=>Retry(retry+1)}>Bağlantıyı tekrar dene</button></div>}
  {status&&<><div className="parcel-layout"><aside className="parcel-search-panel">
   <form className="panel" onSubmit={query}><h2>Parsel seçimi <span className="badge warning">{status.mode==='REAL'?'TKGM':status.mode==='CATALOG'?'Türkiye adresleri':'Demo veri'}</span></h2>{status.mode==='DEMO'&&<p className="hint">Örnek sonuç: Konya → Seydişehir → Örnek Mahalle, ada <strong>100</strong>, parsel <strong>1</strong>. Diğer numaralar gerçek servise gönderilmez.</p>}
    <label>İl<select required value={province} disabled={initial} onChange={e=>{clear();SP(e.target.value);SD('');SN('');}}><option value="">İl seçin</option>{provinces.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>İlçe<select required value={district} disabled={!province||districtBusy} onChange={e=>{clear();SD(e.target.value);SN('');}}><option value="">{districtBusy?'İlçeler yükleniyor…':!province?'Önce il seçin':'İlçe seçin'}</option>{districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    <label>Mahalle / köy<select required value={neighborhood} disabled={!district||neighborhoodBusy} onChange={e=>{clear();SN(e.target.value);}}><option value="">{neighborhoodBusy?'Mahalleler yükleniyor…':!district?'Önce ilçe seçin':'Mahalle / köy seçin'}</option>{neighborhoods.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
    <div className="form-grid"><label>Ada numarası<input inputMode="numeric" pattern="[0-9]{1,10}" maxLength={10} value={block} required onChange={e=>{clear();B(e.target.value);}}/></label><label>Parsel numarası<input inputMode="numeric" pattern="[0-9]{1,10}" maxLength={10} value={parcel} required onChange={e=>{clear();PN(e.target.value);}}/></label></div>
    {catalogError&&<p className="error" role="alert">{catalogError}<button type="button" className="secondary" onClick={()=>Retry(retry+1)}>Listeleri tekrar yükle</button></p>}
    <button className="parcel-submit" disabled={Boolean(loading)||districtBusy||neighborhoodBusy||!neighborhood||!block.trim()||!parcel.trim()}>Parseli Göster</button>
   </form>
   <details className="panel parcel-upload"><summary>GeoJSON / KML dosyası yükle</summary><p className="hint">WGS84 GeoJSON veya KML · En fazla 1 MB. Dosya kaydedilmez; geometrisi yerel API'de doğrulanır. KMZ desteklenmez.</p><label>GeoJSON / KML dosyası yükle<input type="file" accept=".geojson,.json,.kml" disabled={Boolean(loading)} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value='';}}/></label><a href="/samples/parsel-demo.geojson" download>Etiketli demo GeoJSON indir</a><br/><a href="/samples/parsel-demo.kml" download>Etiketli demo KML indir</a></details>
  </aside><div className="parcel-map-stage">
   {loading&&<p className="notice" role="status">{loading}</p>}{error&&<div className="error" role="alert">{error}</div>}
   <BoundaryMap geometry={result?.geometry??null} status={status}/>
   {result?<details className="panel parcel-result" aria-label="Parsel bilgileri"><summary>Parsel bilgileri · {result.block ?? '—'} / {result.parcel ?? '—'}</summary><div className="row"><h2>Kaynak bilgileri</h2><span className={'badge '+(result.provenance==='DEMO'?'warning':'')}>{result.provenance==='DEMO'?'Demo veri':result.provenance==='REAL'?'TKGM':'Kullanıcı dosyası'}</span></div><dl className="parcel-facts">{[['İl',result.province],['İlçe',result.district],['Mahalle / köy',result.neighborhood],['Ada',result.block],['Parsel',result.parcel],['Yüzölçümü',result.areaSquareMeters==null?null:number(result.areaSquareMeters,'m²')],['Taşınmaz niteliği',result.nature],['Güncellenme tarihi',result.updatedAt?new Date(result.updatedAt).toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'}):null]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'Veri kaynağında belirtilmemiş'}</dd></div>)}</dl><p className="hint"><strong>Veri kaynağı:</strong> {result.source}</p><p className="hint">Eksik bilgiler veya ada/parsel kimliği geometriden tahmin edilmez. Dosyadaki serbest metin özellikleri güvenilir resmî bilgi sayılmaz.</p></details>:!loading&&!error&&<div className="empty">Henüz parsel görüntülenmedi. Adres, ada ve parseli seçip sorgulayın.</div>}
  </div></div></>}
 </div>;
}
