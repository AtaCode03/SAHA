import {expect,it} from 'vitest';
import {apiErrorMessage,editableFieldPayload} from '../src/form-errors';
it('tarla düzenlerken sunucu metaverilerini göndermez',()=>{expect(editableFieldPayload({id:'x',name:'Tarla',customerId:'c',roadAccess:{confirmed:true},researchId:'private',source:'REAL',customer:{phone:'private'},createdAt:'date'},null)).toEqual({name:'Tarla',customerId:'c',boundary:null});});
it('alan hatasını adıyla Türkçe gösterir',()=>{expect(apiErrorMessage({code:'VALIDATION',message:'Alanları kontrol edin.',details:[{path:['name'],message:'Too small: expected string to have >=2 characters'}]})).toBe('Ad / tarla adı: En az 2 karakter girin.');});
it('sunucunun özel hata gerekçesini korur',()=>{expect(apiErrorMessage({code:'VALIDATION',details:[{path:['windows'],message:'Saatler çakışıyor.'}]})).toBe('Uygun saatler: Saatler çakışıyor.');expect(apiErrorMessage({code:'PRICE_CHANGED',message:'Tarife değişti.'})).toBe('Tarife değişti.');});
