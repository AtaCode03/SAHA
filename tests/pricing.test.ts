import {describe,it,expect} from 'vitest';
import {calculatePrice,pricingInput} from '../server/pricing-domain.js';
const id='00000000-0000-4000-8000-000000000001',id2='00000000-0000-4000-8000-000000000002';
describe('Maliyet üzerine kâr',()=>{
 it('dekar ve toplam litre miktarını Decimal ile hesaplar',()=>{const r=calculatePrice('10.500',{markupPercent:'20',lines:[{itemId:id,version:1},{itemId:id2,version:1,quantity:'2.500'}]},[{id,version:1,active:true,name:'Hizmet',unit:'DEKAR',unitCost:'10.10'},{id:id2,version:1,active:true,name:'İlaç',unit:'LITER',unitCost:'20.20'}]);expect(r.cost).toBe('156.55');expect(r.profit).toBe('31.31');expect(r.total).toBe('187.86');});
 it('kuruşu HALF_UP yuvarlar',()=>expect(calculatePrice('1.005',{markupPercent:'0',lines:[{itemId:id,version:1}]},[{id,version:1,active:true,unit:'DEKAR',unitCost:'1'}]).total).toBe('1.01'));
 it('bilinmeyen alanı sıfır saymaz',()=>expect(()=>calculatePrice('0',{markupPercent:'20',lines:[]},[])).toThrow());
 it('eski veya arşivlenmiş tarifeyi reddeder',()=>{for(const item of [{version:2,active:true},{version:1,active:false}])expect(()=>calculatePrice('1',{markupPercent:'0',lines:[{itemId:id,version:1}]},[{id,...item}])).toThrow();});
 it('toplam miktarı bilinmeyen litreyi reddeder',()=>expect(()=>calculatePrice('1',{markupPercent:'0',lines:[{itemId:id,version:1}]},[{id,version:1,active:true,unit:'LITER'}])).toThrow());
 it('tekrarlı kalem ve negatif kârı reddeder',()=>{expect(pricingInput.safeParse({markupPercent:'-1',lines:[{itemId:id,version:1}]}).success).toBe(false);expect(pricingInput.safeParse({markupPercent:'20',lines:[{itemId:id,version:1},{itemId:id,version:1}]}).success).toBe(false);});
});
