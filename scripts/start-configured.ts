import 'dotenv/config';
// Keep the local web command stable while respecting the selected database.
if(process.env.DATABASE_MODE==='SUPABASE') await import('./supabase-start.js');
else await import('./local-start.js');
