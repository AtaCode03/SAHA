vi.mock('../src/Map',()=>({FieldMap:()=>null}));
import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {NextJob} from '../src/NextJob';
const job=(id:string,status:string,start:string)=>({id,status,plannedStart:start,plannedArea:'12',service:'İlaçlama',field:{name:id,neighborhood:'Test',district:'Seydişehir'},customer:{name:'Test müşteri',phone:'TEST_PHONE'},agreedPrice:'PRIVATE_PRICE'});
it('devam eden işi planlanan işten önce gösterir ve finansı göstermez',()=>{const html=renderToStaticMarkup(<NextJob orders={[job('Erken iş','PLANNED','2026-10-20T06:00:00Z'),job('Devam eden','RUNNING','2026-10-20T07:00:00Z')]} onOpen={()=>{}}/>);expect(html).toContain('Devam eden');expect(html).not.toContain('Erken iş');expect(html).toContain('tel:TEST_PHONE');expect(html).not.toContain('PRIVATE_PRICE');});
it('tamamlanmış işi sıradaki iş olarak göstermez',()=>expect(renderToStaticMarkup(<NextJob orders={[job('Bitti','COMPLETED','2026-10-20T06:00:00Z')]} onOpen={()=>{}}/>)).toBe(''));

