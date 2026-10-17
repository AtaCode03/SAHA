import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {DailyRunSheet} from '../src/DailyRunSheet';
it('iş çıktısı sırayı ve iletişimi verir; ham hava/finans dökümü içermez',()=>{
 const plan={day:'2026-10-20',status:'DRAFT',result:{stops:[{requestId:'job',profileId:'crew',sequence:1,start:'2026-10-20T06:00:00Z',end:'2026-10-20T07:00:00Z',serviceMinutes:60,travelMinutes:15}]},input:{snapshots:[{requestId:'job',estimate:{dekar:'20.500'},request:{service:'İlaçlama',agreedPrice:'SECRET_PRICE',field:{name:'<Test tarla>',district:'Seydişehir',customer:{name:'Test müşteri',phone:'TEST_PHONE'},accessNotes:'Batı girişi'}},weather:{payload:{secret:'RAW_WEATHER'}}}]}};
 const html=renderToStaticMarkup(<DailyRunSheet plan={plan} profiles={[{id:'crew',name:'Tek ekip'}]}/>);
 expect(html).toContain('Taslak');expect(html).toContain('TEST_PHONE');expect(html).toContain('Batı girişi');expect(html).toContain('&lt;Test tarla&gt;');expect(html).not.toContain('SECRET_PRICE');expect(html).not.toContain('RAW_WEATHER');expect(html).toContain('Yazdır / PDF kaydet');
});
