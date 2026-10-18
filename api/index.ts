import {app} from '../server/app.js';
import {validateDeployment} from '../server/deployment.js';

// Vercel owns the listener and lifecycle; do not import server/index.ts here.
validateDeployment(process.env);
export default app;
