import {z} from 'zod';
import {Decimal} from 'decimal.js';
import {AppError,money} from './domain.js';
export const priceItemInput=z.object({name:z.string().trim().min(2).max(100),category:z.enum(['SERVICE','CHEMICAL','OTHER']),unit:z.enum(['DEKAR','LITER','KG','FIXED']),unitCost:money,active:z.boolean().default(true)}).strict();
export const pricingInput=z.object({markupPercent:z.string().regex(/^\d{1,3}(\.\d{1,2})?$/).refine(v=>new Decimal(v).lte(500)),lines:z.array(z.object({itemId:z.uuid(),version:z.number().int().positive(),quantity:z.string().regex(/^\d{1,9}(\.\d{1,3})?$/).optional()}).strict()).min(1).max(30)}).strict().refine(v=>new Set(v.lines.map(l=>l.itemId)).size===v.lines.length,'Aynı kalemi yalnız bir kez seçin.');
export function calculatePrice(dekar:string,input:z.infer<typeof pricingInput>,items:any[]){
 const area=new Decimal(dekar);if(!area.isFinite()||area.lte(0))throw new AppError(422,'AREA_REQUIRED','Fiyat için pozitif tarla alanı gerekli.');
 const lines=input.lines.map(l=>{const item=items.find(i=>i.id===l.itemId);if(!item?.active||item.version!==l.version)throw new AppError(409,'PRICE_CHANGED','Tarife değişti veya arşivlendi. Fiyatı yeniden hesaplayın.');const quantity=item.unit==='DEKAR'?area:new Decimal(l.quantity??'0');if(quantity.lte(0))throw new AppError(422,'QUANTITY_REQUIRED','Litre/kg veya sabit kalem için pozitif toplam miktar girin.');return {itemId:item.id,version:item.version,name:item.name,category:item.category,unit:item.unit,quantity:quantity.toFixed(3),unitCost:item.unitCost.toString(),cost:quantity.mul(item.unitCost.toString()).toFixed(2,Decimal.ROUND_HALF_UP)};});
 const cost=lines.reduce((s,l)=>s.plus(l.cost),new Decimal(0)),profit=cost.mul(input.markupPercent).div(100).toDecimalPlaces(2,Decimal.ROUND_HALF_UP),total=cost.plus(profit);if(total.gt('999999999999.99'))throw new AppError(422,'PRICE_LIMIT','Toplam bedel kayıt sınırını aşıyor.');
 return {method:'COST_PLUS_V1',currency:'TRY',dekar:area.toFixed(3),markupPercent:input.markupPercent,lines,cost:cost.toFixed(2),profit:profit.toFixed(2),total:total.toFixed(2),rounding:'Kalem ve kâr kuruşa HALF_UP; maliyet üzerine kâr. Vergi/fatura hesabı içermez.'};
}
