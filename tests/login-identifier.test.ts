import {expect,it} from 'vitest';
import {loginIdentifier} from '../server/login-identifier';
it('e-posta ve kullanıcı adını tekil giriş kimliği olarak normalleştirir',()=>{
 expect(loginIdentifier.parse(' Burak_Demirel_42 ')).toBe('burak_demirel_42');
 expect(loginIdentifier.parse('ADMIN@EXAMPLE.COM')).toBe('admin@example.com');
 for(const value of ['ab','a b c','<script>','@invalid','a'.repeat(201)])expect(loginIdentifier.safeParse(value).success).toBe(false);
});
