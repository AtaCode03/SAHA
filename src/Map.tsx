import {api} from './api';
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
type Props = {
  latitude?: number | null;
  longitude?: number | null;
  boundary?: any;
  route?: any;
  onPoint?: (lat: number, lng: number) => void;
  onBoundary?: (value: any) => void;
};
export function FieldMap({
  latitude,
  longitude,
  boundary,
  route,
  onPoint,
  onBoundary,
}: Props) {
  const [config,C]=useState<any>(null),[mapError,ME]=useState(''),[theme,T]=useState<'standard'|'satellite'>('standard');
  useEffect(()=>{let active=true;api('/maps/config').then(c=>{if(active){C(c);T(c.defaultLayer??'standard');}}).catch(()=>{if(active)ME('Harita yapılandırması alınamadı.');});return()=>{active=false;};},[]);
  const container = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    group = useRef<L.LayerGroup | null>(null),
    points = useRef<number[][]>([]),
    draw = useRef(false),
    callbacks = useRef({ onPoint, onBoundary });
  callbacks.current = { onPoint, onBoundary };
  useEffect(() => {
    if (!container.current) return;
    const m = L.map(container.current).setView(
      [latitude ?? 37.419, longitude ?? 31.849],
      13,
    );
    map.current = m;
    group.current = L.layerGroup().addTo(m);
    m.on("click", (e) => {
      if (draw.current) {
        points.current.push([e.latlng.lng, e.latlng.lat]);
        L.circleMarker(e.latlng, { radius: 5 }).addTo(group.current!);
      } else callbacks.current.onPoint?.(e.latlng.lat, e.latlng.lng);
    });
    const resize = new ResizeObserver(() => m.invalidateSize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(()=>{if(!map.current||!config)return;ME('');const selected=config[theme];if(!selected){ME('Uydu sağlayıcısı için API anahtarı gerekli.');return;}
    const layers=L.layerGroup([selected.url,...(selected.overlayUrl?[selected.overlayUrl]:[])].map((url:string)=>L.tileLayer(url,{maxZoom:20}).on('tileerror',()=>ME('Harita görüntüsü yüklenemedi. Sağlayıcı ayarlarını kontrol edin.')))).addTo(map.current);
    return()=>{layers.remove();};
  },[config,theme]);
  useEffect(() => {
    const m = map.current,
      g = group.current;
    if (!m || !g) return;
    g.clearLayers();
    if (latitude != null && longitude != null) {
      L.circleMarker([latitude, longitude], {
        radius: 9,
        color: "#174e40",
        fillOpacity: 1,
      }).addTo(g);
      m.setView([latitude, longitude]);
    }
    if (boundary) {
      try {
        const b = L.geoJSON(boundary,{style:{color:"#dc2626",weight:3,fillColor:"#ef4444",fillOpacity:0.18}}).addTo(g);
        const bounds=b.getBounds();if(latitude!=null&&longitude!=null)bounds.extend([latitude,longitude]);m.fitBounds(bounds);
      } catch {
        /* validation displayed by form */
      }
    }
    if(route){try{const line=L.geoJSON(route,{style:{color:'#2563eb',weight:5}}).addTo(g);m.fitBounds(line.getBounds(),{padding:[15,15]});}catch{ME('Yol çizgisi görüntülenemedi.');}}
  }, [latitude, longitude, boundary, route]);
  return (
    <div>
      <div className="map" ref={container} aria-label={route?'Karayolu güzergâhı haritası':'Tarla konumu haritası'} />
      <p className="hint">{config?.message??'Harita yapılandırması yükleniyor…'}</p>
      {config&&<div className="actions" role="group" aria-label="Harita altlığı"><button type="button" className="secondary" aria-pressed={theme==='standard'} onClick={()=>T('standard')}>Standart</button><button type="button" className="secondary" aria-pressed={theme==='satellite'} onClick={()=>T('satellite')}>Hava fotoğrafı{config.satellite?'':' · anahtar gerekli'}</button><span className="hint"><a href={config[theme]?.attributionUrl} target="_blank" rel="noreferrer">{config[theme]?.attribution}</a></span></div>}
      {mapError&&<p className="error" role="alert">{mapError}</p>}
      {onBoundary && (
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              points.current = [];
              draw.current = true;
              group.current?.clearLayers();
            }}
          >
            Sınır çizimine başla
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (points.current.length < 3) return;
              draw.current = false;
              callbacks.current.onBoundary?.({
                type: "Polygon",
                coordinates: [[...points.current, points.current[0]]],
              });
            }}
          >
            Sınırı kapat
          </button>
          <span className="hint">Çizimde en az 3 köşeye dokunun.</span>
        </div>
      )}
    </div>
  );
}
