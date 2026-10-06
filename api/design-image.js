import {put,get} from '@vercel/blob';
import crypto from 'node:crypto';
import {authorized,sameOrigin} from '../lib/admin-auth.js';
export default async function handler(req,res){try{
 if(req.method==='GET'){
  const id=String(req.query?.id||'');if(!/^[a-f0-9-]{36}$/.test(id))return res.status(404).end();
  const b=await get(`design/images/${id}`,{access:'private'});if(!b)return res.status(404).end();
  res.setHeader('Content-Type',b.blob.contentType);res.setHeader('Cache-Control','public, max-age=31536000, immutable');
  res.end(Buffer.from(await new Response(b.stream).arrayBuffer()));return;
 }
 if(req.method!=='POST')return res.status(405).end();
 if(!authorized(req)||!sameOrigin(req))return res.status(401).json({error:'Ingresá nuevamente.'});
 const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
 const data=Buffer.from(String(body.data||''),'base64');
 if(!data.length||data.length>2*1024*1024)return res.status(400).json({error:'La imagen debe pesar menos de 2 MB.'});
 const png=data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const jpeg=data[0]===255&&data[1]===216&&data[2]===255;
 const webp=data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
 if(!png&&!jpeg&&!webp)return res.status(400).json({error:'Elegí una imagen PNG, JPG o WebP.'});
 const id=crypto.randomUUID();await put(`design/images/${id}`,data,{access:'private',contentType:png?'image/png':jpeg?'image/jpeg':'image/webp',addRandomSuffix:false});
 return res.json({url:`/api/design-image?id=${id}`});
 }catch(e){console.error('design_image_error',e);res.status(503).json({error:'No pudimos cargar la imagen.'});}}
