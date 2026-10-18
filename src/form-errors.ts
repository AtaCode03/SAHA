const labels:Record<string,string>={method:'Ödeme yöntemi',dueDay:'Vade',allocations:'Ödeme dağılımı',version:'Kayıt sürümü',name:'Ad / tarla adı',phone:'Telefon',customerId:'Müşteri',fieldId:'Tarla',province:'İl',district:'İlçe',neighborhood:'Mahalle / köy',block:'Ada',parcel:'Parsel',boundary:'Parsel sınırı',area:'Alan',plannedArea:'Planlanan alan',agreedPrice:'Hizmet bedeli',unitCost:'Birim maliyet',markupPercent:'Kâr yüzdesi',quantity:'Toplam miktar',lines:'Maliyet kalemleri',service:'Hizmet',requestedDay:'İstenen gün',earliestDay:'En erken gün',latestDay:'En geç gün',windows:'Uygun saatler',start:'Başlangıç',end:'Bitiş',operatorId:'Çalışacak kişi',droneId:'Drone',model:'Drone modeli',tankLiters:'Tank kapasitesi',preparationMinutes:'Hazırlık süresi',minutesPerDekar:'Dakika/dekar',closingMinutes:'Kapanış süresi',coefficientSource:'Süre hesabının dayanağı',shiftStart:'Mesai başlangıcı',shiftEnd:'Mesai bitişi',baseName:'Depo adı',at:'İşlem zamanı',reason:'Gerekçe',email:'E-posta',password:'Parola'};
export function apiErrorMessage(error:any){
 if(error?.code!=='VALIDATION'||!Array.isArray(error.details))return error?.message??'İşlem kaydedilemedi.';
 const messages=error.details.slice(0,5).map((issue:any)=>{const path=Array.isArray(issue.path)?issue.path:[];const label=path.filter((x:any)=>labels[x]||typeof x==='number').map((x:any)=>typeof x==='number'?`${x+1}. satır`:labels[x]).join(' / ')||'Form';let message=String(issue.message??'');
 if(message.startsWith('Too small:')){const count=message.match(/>=([\d.]+)/)?.[1];message=count?`En az ${count}${message.includes('characters')?' karakter girin.':' olmalı.'}`:'Bu alanı doldurun.';}
 else if(message.startsWith('Too big:')){const count=message.match(/<=([\d.]+)/)?.[1];message=count?`En fazla ${count}${message.includes('characters')?' karakter girin.':' olmalı.'}`:'Girilen değer çok büyük.';}
 else if(message.startsWith('Invalid input:'))message='Bu alanı doldurun veya geçerli bir seçim yapın.';
 else if(message.startsWith('Invalid string:')||message.startsWith('Invalid UUID')||message.startsWith('Invalid option:'))message='Geçerli bir değer veya seçim girin.';
 else if(message.startsWith('Unrecognized key'))message='Formda desteklenmeyen bilgiler var. Sayfayı yenileyip tekrar deneyin.';
 else if(message.startsWith('Invalid'))message='Geçerli bir değer girin. Sayılarda ondalık basamağı kontrol edin.';
 return `${label}: ${message||'Geçerli bir değer girin.'}`;});return messages.length?[...new Set(messages)].join(' '):'Form bilgilerini kontrol edin.';
}
// Server-owned metadata must never be sent back as editable field attributes.
export function editableFieldPayload(form:Record<string,any>,boundary:unknown){
 const keys=['customerId','name','province','district','neighborhood','block','parcel','area','areaOrigin','crop','latitude','longitude','accessNotes','active'];
 return {...Object.fromEntries(keys.filter(k=>k in form).map(k=>[k,form[k]])),boundary};
}

