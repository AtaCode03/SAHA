import {beforeEach,it,expect,vi} from 'vitest';
import request from 'supertest';
import {DOMParser as XmlParser} from '@xmldom/xmldom';
import {readFileSync} from 'node:fs';
import {validateParcelGeometry,parseParcelFile,geoJsonMetadata} from '../server/parcel-geometry.js';
const {mock}=vi.hoisted(()=>({mock:{session:{findUnique:vi.fn()}}}));
vi.mock('../server/db.js',()=>({db:mock}));
import {app} from '../server/app.js';
const body={provinceId:'demo-konya',districtId:'demo-seydisehir',neighborhoodId:'demo-mahalle',block:'100',parcel:'1',mode:'DEMO'};
const headers={Cookie:'session=test',Origin:'http://localhost:5173','x-csrf-token':'token'};
beforeEach(()=>{mock.session.findUnique.mockResolvedValue({id:'hash',csrf:'token',expiresAt:new Date(Date.now()+100000),user:{id:'manager',name:'Manager',active:true,role:'ADMIN'}});});
it('kademeli demo seçimleri ve açık demo sonucu',async()=>{
 expect((await request(app).get('/api/parcels/provinces').set(headers)).body.source).toBe('TURKIYE_API');
 const districts=await request(app).get('/api/parcels/districts?provinceId=tr-province-42').set(headers);expect(districts.body.data.some((d:any)=>d.name==='Seydişehir')).toBe(true);
 const r=await request(app).post('/api/parcels/query').set(headers).send(body);expect(r.status).toBe(200);expect(r.body.provenance).toBe('DEMO');expect(r.body.areaSquareMeters).toBeNull();expect(r.body.geometry.features).toHaveLength(1);
});
it('başka numaraya sahte sınır vermez, gerçek sorgu kapalıdır',async()=>{
 expect((await request(app).post('/api/parcels/query').set(headers).send({...body,parcel:'999'})).status).toBe(404);
 const real=await request(app).post('/api/parcels/query').set(headers).send({...body,mode:'REAL'});expect(real.status).toBe(503);expect(real.body.error.code).toBe('PARCEL_SERVICE_NOT_CONFIGURED');
 expect((await request(app).post('/api/parcels/query').set(headers).send({...body,provinceId:'demo-ankara'})).status).toBe(422);
});
it('oturumsuz ve operatör sorgusuna izin vermez',async()=>{
 expect((await request(app).get('/api/parcels/status')).status).toBe(401);
 mock.session.findUnique.mockResolvedValue({id:'hash',csrf:'token',expiresAt:new Date(Date.now()+100000),user:{id:'op',name:'OP',active:true,role:'OPERATOR'}});
 expect((await request(app).get('/api/parcels/status').set(headers)).status).toBe(403);
});
it('GeoJSON/KML örnekleri geçer; dış kaynak, çizgi ve kesişim reddedilir',()=>{
 const json=readFileSync('public/samples/parsel-demo.geojson','utf8');expect(parseParcelFile(json,'geojson').features).toHaveLength(1);
 const parser={parseFromString:(text:string)=>new XmlParser().parseFromString(text,'application/xml')} as unknown as DOMParser;
 expect(parseParcelFile(readFileSync('public/samples/parsel-demo.kml','utf8'),'kml',parser).features).toHaveLength(1);
 expect(()=>parseParcelFile('<!DOCTYPE kml><kml/>','kml',parser)).toThrow();
 expect(()=>parseParcelFile('<kml><NetworkLink/></kml>','kml',parser)).toThrow();
 expect(()=>validateParcelGeometry({type:'LineString',coordinates:[[31,37],[32,38]]})).toThrow();
 expect(()=>validateParcelGeometry({type:'Polygon',coordinates:[[[31,37],[32,38],[31,38],[32,37],[31,37]]]})).toThrow();
 expect(()=>validateParcelGeometry({type:'Polygon',coordinates:[[[31,97],[32,37],[32,38],[31,97]]]})).toThrow();
});
it('dosya özniteliklerinde eksikleri uydurmaz ve serbest metni taşımaz',()=>{
 const p=geoJsonMetadata(JSON.stringify({type:'Feature',properties:{areaSquareMeters:12.5,nature:'Tarla',secret:'hidden',updatedAt:'bad'}}));expect(p).toEqual({areaSquareMeters:12.5,nature:'Tarla'});
});
it('gerçek sağlayıcı yetki ayarı ister ve servis hatasını başarı saymaz',async()=>{
 const {realParcelEnabled,parcelOptions}=await import('../server/parcel-provider.js');
 vi.stubEnv('PARCEL_PROVIDER','TKGM');vi.stubEnv('PARCEL_USAGE_AUTHORIZATION_REFERENCE','');expect(realParcelEnabled()).toBe(false);
 vi.stubEnv('PARCEL_USAGE_AUTHORIZATION_REFERENCE','TEST-CONTRACT');
 const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({features:[{properties:{id:64,text:'Konya'}}]}),{headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetchMock);
 try{expect(await parcelOptions('ilListe')).toEqual([{id:'64',name:'Konya'}]);expect(fetchMock.mock.calls[0][0]).toContain('/idariYapi/ilListe');fetchMock.mockResolvedValue(new Response('error',{status:500}));await expect(parcelOptions('ilListe')).rejects.toMatchObject({code:'PARCEL_SERVICE_ERROR'});}finally{vi.unstubAllEnvs();vi.unstubAllGlobals();}
});
it('81 il, bağlı ilçeler ve mahalle/köy kataloğu döner; kimlikler TKGM ile karışmaz',async()=>{
 const {catalogProvinces,catalogDistricts,catalogNeighborhoods}=await import('../server/administrative.js');
 const provinces=catalogProvinces();expect(provinces).toHaveLength(81);expect(new Set(provinces.map(p=>p.id)).size).toBe(81);
 for(const province of provinces)expect(catalogDistricts(province.id).length).toBeGreaterThan(0);
 const seydisehir=catalogDistricts('tr-province-42').find(d=>d.name==='Seydişehir');expect(seydisehir).toBeDefined();expect(catalogNeighborhoods(seydisehir!.id).some(n=>n.name==='Kızılcalar')).toBe(true);
 expect(catalogDistricts('64')).toEqual([]);expect(catalogNeighborhoods('not-a-district')).toEqual([]);
 const r=await request(app).post('/api/parcels/query').set(headers).send({provinceId:'tr-province-42',districtId:seydisehir!.id,neighborhoodId:catalogNeighborhoods(seydisehir!.id)[0].id,block:'100',parcel:'1',mode:'REAL'});expect(r.status).toBe(503);
});
it('tarla adres sorgusu eksik bilgi veya bağlantı yokken sahte sınır vermez',async()=>{
 const data={province:'Konya',district:'Seydişehir',neighborhood:'Kızılcalar',block:'100',parcel:'1'};
 const r=await request(app).post('/api/parcels/query-address').set(headers).send(data);expect(r.status).toBe(503);expect(r.body.error.code).toBe('PARCEL_SERVICE_NOT_CONFIGURED');expect(r.body.geometry).toBeUndefined();
 expect((await request(app).post('/api/parcels/query-address').set(headers).send({...data,block:''})).status).toBe(422);
});
it('yerel TKGM testi yalnız development ve loopback origin ile açılır',async()=>{
 const {realParcelEnabled}=await import('../server/parcel-provider.js');vi.stubEnv('PARCEL_PROVIDER','TKGM_LOCAL_TEST');
 try{vi.stubEnv('NODE_ENV','development');vi.stubEnv('APP_ORIGIN','http://localhost:5173');expect(realParcelEnabled()).toBe(true);vi.stubEnv('NODE_ENV','production');expect(realParcelEnabled()).toBe(false);vi.stubEnv('NODE_ENV','development');vi.stubEnv('APP_ORIGIN','https://example.com');expect(realParcelEnabled()).toBe(false);}finally{vi.unstubAllEnvs();}
});
it('HGM anahtarı olmadan açık fallback, anahtar varken gizli proxy ve iki ortofoto katmanı sunar',async()=>{
 const {mapConfiguration,atlasTileUrl}=await import('../server/maps.js');vi.stubEnv('MAP_PROVIDER','HGM_ATLAS');vi.stubEnv('HGM_ATLAS_API_KEY','');
 try{const missing=mapConfiguration();expect(missing.activeProvider).toBe('OSM');expect(missing.message).toContain('API anahtarı yok');expect((await request(app).get('/api/maps/hgm/temel/1/0/0').set(headers)).status).toBe(503);
 vi.stubEnv('HGM_ATLAS_API_KEY','test-only-secret');const configured=mapConfiguration();expect(configured.activeProvider).toBe('HGM_ATLAS');expect(configured.satellite?.overlayUrl).toContain('/etiket/');expect(JSON.stringify(configured)).not.toContain('test-only-secret');expect(atlasTileUrl('ortofoto',1,0,0,'test-only-secret')).toContain('/ortofoto/1/0/0.jpg?apikey=');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(new Uint8Array([137,80,78,71]),{headers:{'content-type':'image/png'}})));const tile=await request(app).get('/api/maps/hgm/temel/1/0/0').set(headers);expect(tile.status).toBe(200);expect(tile.headers['cache-control']).toBe('private, no-store');expect((await request(app).get('/api/maps/hgm/temel/1/4/0').set(headers)).status).toBe(422);
 }finally{vi.unstubAllGlobals();vi.unstubAllEnvs();}
});
it('MapTiler uydu varsayılandır ve anahtar istemci configine sızmaz',async()=>{
 const {mapConfiguration}=await import('../server/maps.js');vi.stubEnv('MAP_PROVIDER','MAPTILER');vi.stubEnv('MAPTILER_API_KEY','TEST-SECRET');
 try{const c=mapConfiguration();expect(c.activeProvider).toBe('MAPTILER');expect(c.defaultLayer).toBe('satellite');expect(c.satellite?.url).toContain('/api/maps/maptiler/');expect(JSON.stringify(c)).not.toContain('TEST-SECRET');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(new Uint8Array([255,216,255]),{headers:{'content-type':'image/jpeg'}})));expect((await request(app).get('/api/maps/maptiler/satellite/1/0/0').set(headers)).status).toBe(200);expect((await request(app).get('/api/maps/maptiler/satellite/1/5/0').set(headers)).status).toBe(422);}finally{vi.unstubAllGlobals();vi.unstubAllEnvs();}
});
