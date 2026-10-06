import {sanitizeDesign,defaults} from '../lib/design.js';
import {readJSON,writeJSON} from '../lib/design-store.js';
import {authorized,passwordOK,sessionCookie,sameOrigin} from '../lib/admin-auth.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  if(req.method==='GET'){
   if(req.query?.admin==='1'){if(!authorized(req))return res.status(401).json({error:'Ingresá con la clave de administración.'});return res.json({draft:await readJSON('design/draft.json'),published:await readJSON('design/published.json'),defaults});}
   return res.json({design:await readJSON('design/published.json')});
  }
  if(req.method!=='POST')return res.status(405).end();
  if(!sameOrigin(req))return res.status(403).json({error:'Origen inválido.'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(body.action==='login'){
   if(!passwordOK(body.password))return res.status(401).json({error:'Clave incorrecta.'});
   res.setHeader('Set-Cookie',sessionCookie());return res.json({ok:true});
  }
  if(!authorized(req))return res.status(401).json({error:'La sesión venció. Volvé a ingresar.'});
  if(body.action==='logout'){res.setHeader('Set-Cookie','nawi_design=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0');return res.json({ok:true});}
  if(!['draft','publish'].includes(body.action))return res.status(400).json({error:'Acción inválida.'});
  const design=sanitizeDesign(body.design);
  await writeJSON(body.action==='publish'?'design/published.json':'design/draft.json',design);
  return res.json({ok:true,design});
 }catch(e){console.error('design_error',e);return res.status(503).json({error:'No pudimos guardar o leer el diseño. Intentá nuevamente.'});}
}
