import {Router} from 'express';
import {z} from 'zod';
import {Prisma} from '@prisma/client';
import {admin} from './auth.js';
import {db} from './db.js';
import {AppError} from './domain.js';
import {estimateField} from './planning-domain.js';
import {calculatePrice,priceItemInput,pricingInput} from './pricing-domain.js';
export const pricingRouter=Router();pricingRouter.use(admin);
export async function priceForField(tx:Prisma.TransactionClient,field:any,input:z.infer<typeof pricingInput>){
 const estimate=estimateField(field.boundary,{preparationMinutes:'0',minutesPerDekar:'0',closingMinutes:'0'});
 const items=await tx.priceItem.findMany({where:{id:{in:input.lines.map(l=>l.itemId)}}});
 return {...calculatePrice(estimate.dekar,input,items),areaOrigin:'GEOMETRY_CALCULATED',boundary:field.boundary,calculatedAt:new Date().toISOString()};
}
pricingRouter.get('/items',async(req,res)=>{const p=z.object({page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(100)}).parse(req.query);const [data,total]=await Promise.all([db.priceItem.findMany({orderBy:{name:'asc'},skip:(p.page-1)*p.pageSize,take:p.pageSize}),db.priceItem.count()]);res.json({data,total,...p});});
pricingRouter.post('/items',async(req,res)=>{const input=priceItemInput.parse(req.body);res.status(201).json(await db.$transaction(async tx=>{const row=await tx.priceItem.create({data:input});await tx.auditLog.create({data:{userId:req.actor!.id,entity:'price_item',entityId:row.id,action:'CREATE',after:JSON.parse(JSON.stringify(row))}});return row;}));});
pricingRouter.put('/items/:id',async(req,res)=>{const {version,...input}=priceItemInput.extend({version:z.number().int().positive()}).parse(req.body);const id=z.uuid().parse(req.params.id);res.json(await db.$transaction(async tx=>{const before=await tx.priceItem.findUniqueOrThrow({where:{id}});const change=await tx.priceItem.updateMany({where:{id,version},data:{...input,version:{increment:1}}});if(!change.count)throw new AppError(409,'PRICE_CHANGED','Tarife değişti; listeyi yenileyin.');const row=await tx.priceItem.findUniqueOrThrow({where:{id}});await tx.auditLog.create({data:{userId:req.actor!.id,entity:'price_item',entityId:id,action:'UPDATE',before:JSON.parse(JSON.stringify(before)),after:JSON.parse(JSON.stringify(row))}});return row;}));});
pricingRouter.post('/calculate',async(req,res)=>{const input=z.object({fieldId:z.uuid(),pricing:pricingInput}).strict().parse(req.body);res.json(await db.$transaction(async tx=>{const field=await tx.field.findUniqueOrThrow({where:{id:input.fieldId}});if(!field.active)throw new AppError(422,'FIELD_INACTIVE','Tarla arşivlenmiş.');return priceForField(tx,field,input.pricing);}));});
