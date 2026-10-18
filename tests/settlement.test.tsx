import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {Settlement} from '../src/Accounts';
const base={id:'test',customerId:'test-customer',agreedPrice:'100.10',adjustment:'0',balance:'100.10',payments:[]};
it('iş sonunda tam, kısmi ve veresiye seçenekleri sunar',()=>{const html=renderToStaticMarkup(<Settlement order={{...base,status:'COMPLETED'}} onSaved={()=>{}}/>);expect(html).toContain('Tamamı ödendi');expect(html).toContain('Kısmi ödeme al');expect(html).toContain('Veresiye / vade');});
it('planlanan veya ödenmiş işe yeniden ödeme seçeneği sunmaz',()=>{for(const order of [{...base,status:'PLANNED'},{...base,status:'COMPLETED',balance:'0.00'}]){const html=renderToStaticMarkup(<Settlement order={order} onSaved={()=>{}}/>);expect(html).not.toContain('Tamamı ödendi');expect(html).not.toContain('Kısmi ödeme al');}});
