import {z} from 'zod';
// Existing email column remains the unique login identifier for both formats.
export const loginIdentifier=z.string().trim().max(200).transform(v=>v.toLowerCase()).pipe(z.union([z.email(),z.string().regex(/^[a-z0-9_]{3,64}$/, 'Geçerli e-posta veya kullanıcı adı girin.')]));
