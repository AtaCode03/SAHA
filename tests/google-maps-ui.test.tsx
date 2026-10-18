import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {GoogleMapsStops} from '../src/GoogleMapsStops';
it('ilk açılışta onay verilmeden dış bağlantı etkin değildir',()=>{const html=renderToStaticMarkup(<GoogleMapsStops origin={{latitude:37.419,longitude:31.849}} rows={[{id:'a',field:{name:'Test tarla'},representativePoint:[31.85,37.42]}]}/>);expect(html).toContain('Test tarla');expect(html).toContain('Google Maps');expect(html).toContain('aria-disabled="true"');expect(html).not.toContain('href="https://www.google.com');expect(html).not.toContain('iframe');});
