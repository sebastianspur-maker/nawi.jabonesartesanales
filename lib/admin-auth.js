import crypto from 'node:crypto';
function equal(a,b){const aa=crypto.createHash('sha256').update(String(a)).digest(),bb=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(aa,bb);}
function sign(payload){return crypto.createHmac('sha256',process.env.ADMIN_PASSWORD).update(payload).digest('hex');}
export function sessionCookie(){const p=String(Date.now()+8*3600000);return `nawi_design=${p}.${sign(p)}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=28800`;}
export function authorized(req){if(!process.env.ADMIN_PASSWORD)return false;const m=String(req.headers.cookie||'').match(/(?:^|;\s*)nawi_design=(\d+)\.([a-f0-9]+)/);return !!m&&Number(m[1])>Date.now()&&equal(m[2],sign(m[1]));}
export function passwordOK(value){return !!process.env.ADMIN_PASSWORD&&equal(value,process.env.ADMIN_PASSWORD);}
export function sameOrigin(req){return req.headers.origin===`https://${req.headers.host}`||req.headers.origin===`http://${req.headers.host}`;}
