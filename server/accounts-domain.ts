import {Decimal} from 'decimal.js';
import {AppError} from './domain.js';
export const total=(v:any[])=>v.reduce((s,x)=>s.plus(String(x)),new Decimal(0)).toFixed(2);
export function orderAccount(o:any,today:string){
 const charged=new Decimal(o.agreedPrice.toString()).plus(o.adjustment.toString()),paid=new Decimal(total(o.payments.map((p:any)=>p.amount))),remaining=charged.minus(paid),accrued=o.status==='COMPLETED'||(!!o.appointment&&o.status!=='CANCELLED');
 return {charged:charged.toFixed(2),paid:paid.toFixed(2),remaining:remaining.toFixed(2),accrued,paymentStatus:!accrued?'NOT_ACCRUED':remaining.lte(0)?'PAID':paid.gt(0)?'PARTIAL':o.dueDay||o.creditNote?'CREDIT':'OPEN',overdue:accrued&&remaining.gt(0)&&!!o.dueDay&&o.dueDay<today};
}
export function allocateOldest(amount:string,orders:{id:string;remaining:string}[]){
 let left=new Decimal(amount);if(left.lte(0))throw new AppError(422,'AMOUNT','Pozitif tahsilat tutarı girin.');const rows:{orderId:string;amount:string}[]=[];
 for(const o of orders){const available=new Decimal(o.remaining);if(available.lte(0))continue;const part=Decimal.min(left,available);if(part.gt(0))rows.push({orderId:o.id,amount:part.toFixed(2)});left=left.minus(part);if(left.isZero())break;}
 if(left.gt(0))throw new AppError(422,'OVERPAYMENT','Tahsilat müşterinin açık borcunu aşamaz.');return rows;
}

