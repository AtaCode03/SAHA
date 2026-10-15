// Browser-safe geometry/file validation. No credentials, DB or Node imports.
import {boundarySchema} from './domain.js';
import {booleanIntersects,polygon} from '@turf/turf';
export type ParcelGeometry={type:'Polygon',coordinates:number[][][]}|{type:'MultiPolygon',coordinates:number[][][][]};
export type ParcelFeature={type:'Feature',properties:Record<string,never>,geometry:ParcelGeometry};
export type ParcelCollection={type:'FeatureCollection',features:ParcelFeature[]};
export function validateParcelGeometry(input:unknown):ParcelCollection{
 if(!input||typeof input!=='object')throw Error('Geçerli GeoJSON Polygon veya MultiPolygon gerekli.');
 const root=input as Record<string,any>;
 if(root.crs)throw Error('Yalnız WGS84 (EPSG:4326) koordinatları desteklenir. Dosyayı WGS84 olarak dışa aktarın.');
 const features=root.type==='FeatureCollection'?root.features:root.type==='Feature'?[root]:[{type:'Feature',geometry:root}];
 if(!Array.isArray(features)||!features.length||features.length>20)throw Error('Dosyada 1–20 alan geometrisi bulunmalı.');
 let positions=0,polygons=0;
 const output:ParcelFeature[]=features.map((feature:any)=>{
  if(feature?.type!=='Feature'||!feature.geometry||feature.crs)throw Error('Her kayıt geçerli bir alan geometrisi olmalı.');
  const g=feature.geometry;
  if(g.type!=='Polygon'&&g.type!=='MultiPolygon')throw Error('Yalnız Polygon/MultiPolygon desteklenir; nokta/çizgi verisi sınır değildir.');
  const pieces=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  if(!Array.isArray(pieces)||!pieces.length)throw Error('Boş geometri kabul edilmez.');
  for(const rings of pieces){
   if(++polygons>30||!Array.isArray(rings)||!rings.length)throw Error('En fazla 30 poligon desteklenir.');
   for(const ring of rings){if(!Array.isArray(ring)||ring.length>500||(positions+=ring.length)>2000)throw Error('Dosya çok ayrıntılı; en fazla 500 köşe/halka ve toplam 2000 köşe desteklenir.');}
   boundarySchema.parse({type:'Polygon',coordinates:rings});
  }
  if(g.type==='MultiPolygon')for(let i=0;i<pieces.length;i++)for(let j=0;j<i;j++)if(booleanIntersects(polygon(pieces[i]),polygon(pieces[j])))throw Error('MultiPolygon parçaları ayrık olmalı; çakışan veya birbirine dokunan parçaları tek Polygon olarak dışa aktarın.');
  return {type:'Feature',properties:{},geometry:{type:g.type,coordinates:g.coordinates}};
 });
 return {type:'FeatureCollection',features:output};
}
export function geoJsonMetadata(text:string):Record<string,string|number>{
 try{
  const root=JSON.parse(text),p=root.type==='Feature'?root.properties:root.type==='FeatureCollection'&&root.features?.length===1?root.features[0]?.properties:null;
  if(!p||typeof p!=='object')return {};
  const out:Record<string,string|number>={};
  for(const k of ['province','district','neighborhood','block','parcel','nature'])if(typeof p[k]==='string'&&p[k].trim()&&p[k].length<=200)out[k]=p[k];
  if(typeof p.areaSquareMeters==='number'&&Number.isFinite(p.areaSquareMeters)&&p.areaSquareMeters>0)out.areaSquareMeters=p.areaSquareMeters;
  if(typeof p.updatedAt==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(p.updatedAt)&&Number.isFinite(Date.parse(p.updatedAt)))out.updatedAt=p.updatedAt;
  return out;
 }catch{return {};}
}
export function parseParcelFile(text:string,extension:string,parser?:DOMParser):ParcelCollection{
 if(new TextEncoder().encode(text).byteLength>1024*1024)throw Error('Dosya en fazla 1 MB olabilir.');
 if(extension.toLowerCase()!=='kml'){
  try{return validateParcelGeometry(JSON.parse(text));}catch(e){if(e instanceof SyntaxError)throw Error('Dosya geçerli JSON değil.');throw e;}
 }
 if(/<!DOCTYPE|<!ENTITY|<(?:\w+:)?NetworkLink\b|<(?:\w+:)?Model\b/i.test(text))throw Error('KML dış kaynak/DTD/NetworkLink içeremez; yalnız yerel sınır geometrisi yükleyin.');
 const doc=(parser??new DOMParser()).parseFromString(text,'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('KML geçerli XML değil.');
 const nodes=Array.from(doc.getElementsByTagNameNS('*','Polygon'));
 if(!nodes.length)throw Error('KML içinde Polygon sınırı bulunamadı.');
 if(nodes.length>30)throw Error('En fazla 30 poligon desteklenir.');
 const features=nodes.map(node=>{
  const outer=node.getElementsByTagNameNS('*','outerBoundaryIs');
  if(outer.length!==1)throw Error('KML poligonunda tek dış halka olmalı.');
  const holes=Array.from(node.getElementsByTagNameNS('*','innerBoundaryIs'));
  const coordinates=[outer[0],...holes].map(ring=>{
   const c=ring.getElementsByTagNameNS('*','coordinates');if(c.length!==1)throw Error('KML halka koordinatları eksik.');
   return (c[0].textContent??'').trim().split(/\s+/).map(pair=>{
    const parts=pair.split(',');if(parts.length<2||parts.length>3||parts.some(p=>p.trim()===''||!Number.isFinite(Number(p))))throw Error('KML koordinatları boylam,enlem[,yükseklik] olmalı.');
    return [Number(parts[0]),Number(parts[1])];
   });
  });return {type:'Feature',geometry:{type:'Polygon',coordinates}};
 });
 return validateParcelGeometry({type:'FeatureCollection',features});
}
