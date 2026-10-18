import {expect,it} from 'vitest';
import {rankNearby} from '../server/proximity';
const field=(id:string,lon:number)=>({id,field:{name:id,boundary:{type:'Polygon',coordinates:[[[lon,37.419],[lon+.001,37.419],[lon+.001,37.420],[lon,37.420],[lon,37.419]]]}}});
it('giriş/çalışma ayarı istemeden merkeze göre yakından uzağa sıralar',()=>{const r=rankNearby([field('uzak',32),field('yakın',31.85)]);expect(r.rows.map(x=>x.id)).toEqual(['yakın','uzak']);expect(r.rows.map(x=>x.sequence)).toEqual([1,2]);expect(r.distanceType).toBe('STRAIGHT_LINE');expect(r.rows[0].distanceKm).toBeLessThan(r.rows[1].distanceKm);});
it('eksik geometriyi sıfır mesafe gibi göstermez',()=>{const r=rankNearby([{id:'eksik',field:{name:'Eksik',boundary:null}}]);expect(r.rows).toHaveLength(0);expect(r.excluded).toHaveLength(1);});
