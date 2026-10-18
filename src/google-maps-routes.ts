export type MapPoint={longitude:number;latitude:number};
export type MapStop={id:string;name:string;coordinates:unknown};
export type RouteStop={id:string;name:string;point:MapPoint;sequence:number;isReturn:boolean};
const MAX_TARGETS=4; // Three intermediate waypoints plus destination, for mobile browsers.
function validPoint(point:MapPoint){
 if(typeof point?.longitude!=='number'||!Number.isFinite(point.longitude)||Math.abs(point.longitude)>180||typeof point?.latitude!=='number'||!Number.isFinite(point.latitude)||Math.abs(point.latitude)>90)throw Error('Geçersiz konum bilgisi; Google Maps güzergâhı hazırlanamadı.');
 return {longitude:point.longitude,latitude:point.latitude};
}
function coordinates(value:unknown):MapPoint{
 if(!Array.isArray(value)||value.length!==2)throw Error('Tarla konumu eksik; parseli yeniden sorgulayın.');
 return validPoint({longitude:value[0],latitude:value[1]});
}
const position=(p:MapPoint)=>`${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`;
export function directionsUrl(origin:MapPoint,targets:MapPoint[]){
 if(!targets.length||targets.length>MAX_TARGETS)throw Error('Bir bağlantıda 1–4 hedef bulunmalı.');
 const start=validPoint(origin),points=targets.map(validPoint);
 const params=new URLSearchParams({api:'1',origin:position(start),destination:position(points.at(-1)!),travelmode:'driving'});
 if(points.length>1)params.set('waypoints',points.slice(0,-1).map(position).join('|'));
 const url='https://www.google.com/maps/dir/?'+params.toString();
 if(url.length>2048)throw Error('Güzergâh bağlantısı çok uzun; daha az durak seçin.');
 return url;
}
export function googleMapsRoutes(origin:MapPoint,stops:MapStop[],returnToStart=false){
 const start=validPoint(origin);
 if(stops.length>100)throw Error('Bir günlük listede en çok 100 tarla aktarılabilir.');
 if(new Set(stops.map(s=>s.id)).size!==stops.length)throw Error('Listede tekrarlı durak var; günlük sırayı yenileyin.');
 const targets:RouteStop[]=stops.map((s,i)=>({id:s.id,name:s.name,point:coordinates(s.coordinates),sequence:i+1,isReturn:false}));
 if(!targets.length)return {parts:[],individual:[]};
 if(returnToStart)targets.push({id:'__return_to_start__',name:'Seydişehir merkeze dönüş',point:start,sequence:targets.length+1,isReturn:true});
 const parts:{number:number;origin:MapPoint;stops:RouteStop[];url:string}[]=[];
 let previous=start;
 for(let i=0;i<targets.length;i+=MAX_TARGETS){const group=targets.slice(i,i+MAX_TARGETS);parts.push({number:parts.length+1,origin:previous,stops:group,url:directionsUrl(previous,group.map(s=>s.point))});previous=group.at(-1)!.point;}
 return {parts,individual:targets.map((stop,i)=>({stop,url:directionsUrl(i?targets[i-1].point:start,[stop.point])}))};
}
