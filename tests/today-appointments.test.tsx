import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppointmentTodayCard} from '../src/TodayAppointments';
it('bugünkü talebi program bekliyor olarak müşteri, tarla ve saatleriyle gösterir',()=>{
 const html=renderToStaticMarkup(<AppointmentTodayCard appointment={{field:{name:'Tarla A',customer:{name:'Müşteri A'}},service:'İlaçlama',windows:[{start:'09:00',end:'17:00'}],agreedPrice:'64',source:'SYNTHETIC'}} onOpen={()=>{}}/>);
 expect(html).toContain('Program bekliyor');expect(html).toContain('Müşteri A');expect(html).toContain('Tarla A');expect(html).toContain('09:00–17:00');expect(html).toContain('Randevuyu aç');expect(html).toContain('Sentetik');expect(html).not.toContain('İşi başlat');
});
