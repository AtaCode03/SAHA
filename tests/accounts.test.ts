import {expect,it} from 'vitest';
import {allocateOldest,orderAccount} from '../server/accounts-domain';
it('kuruşları en eski açık işlere dağıtır',()=>{expect(allocateOldest('120.30',[{id:'1',remaining:'100.10'},{id:'2',remaining:'50.20'}])).toEqual([{orderId:'1',amount:'100.10'},{orderId:'2',amount:'20.20'}]);});
it('fazla ve sıfır ödeme kabul etmez',()=>{expect(()=>allocateOldest('150.31',[{id:'1',remaining:'100.10'},{id:'2',remaining:'50.20'}])).toThrow();expect(()=>allocateOldest('0',[])).toThrow();});
it('tamamlanmamış işi borç saymaz; vadesiz borcu gecikmiş göstermez',()=>{const o={agreedPrice:'100',adjustment:'0',payments:[],status:'PLANNED'};expect(orderAccount(o,'2026-10-18').accrued).toBe(false);expect(orderAccount({...o,status:'COMPLETED'},'2026-10-18').overdue).toBe(false);expect(orderAccount({...o,status:'COMPLETED',dueDay:'2026-10-17'},'2026-10-18').overdue).toBe(true);});
it('kısmi ve tam ödeme durumlarını hesaplar',()=>{const o={agreedPrice:'100.10',adjustment:'0.20',status:'COMPLETED',payments:[{amount:'100'}]};expect(orderAccount(o,'2026-10-18').remaining).toBe('0.30');expect(orderAccount(o,'2026-10-18').paymentStatus).toBe('PARTIAL');expect(orderAccount({...o,payments:[{amount:'100.30'}]},'2026-10-18').paymentStatus).toBe('PAID');});

it('randevuya bağlı işi programda alacak sayar, iptal edileni dışlar',()=>{const o={agreedPrice:'75.25',adjustment:'0',payments:[],status:'PLANNED',appointment:{id:'a'}};expect(orderAccount(o,'2026-10-18').accrued).toBe(true);expect(orderAccount({...o,status:'CANCELLED'},'2026-10-18').accrued).toBe(false);});
