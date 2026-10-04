import { put } from '@vercel/blob';
import crypto from 'node:crypto';

function clean(value,max=500){return String(value??'').trim().slice(0,max)}
function money(n){const value=Number(n);return Number.isFinite(value)&&value>=0?value:0}
function makeOrderId(){const d=new Date();const stamp=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('');return `NAWI-${stamp}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`}

export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
  const name=clean(body.name,120),email=clean(body.email,160),whatsapp=clean(body.whatsapp,40);
  const items=Array.isArray(body.items)?body.items.slice(0,50).map(item=>({
   id:clean(item.id,80),name:clean(item.name,160),category:clean(item.category,80),
   quantity:Math.max(1,Math.min(99,Number(item.quantity)||1)),
   unitPrice:money(item.unitPrice),subtotal:money(item.subtotal)
  })):[];
  if(!name||!email||!whatsapp||!items.length)return res.status(400).json({error:'Faltan datos obligatorios.'});
  const total=items.reduce((sum,item)=>sum+item.subtotal,0),id=makeOrderId();
  const order={id,createdAt:new Date().toISOString(),name,email,whatsapp,total,items,source:'nawi-webapp-v1'};
  try{
   await put(`orders/${id}.json`,JSON.stringify(order,null,2),{access:'private',contentType:'application/json',addRandomSuffix:false});
  }catch(error){
   console.error('order_persistence_error',error);
   return res.status(503).json({error:'No pudimos guardar el pedido. Intentá nuevamente.'});
  }
  return res.status(200).json({ok:true,id,total,persisted:true,storage:'vercel-blob'});
 }catch(error){
  console.error('order_error',error);
  return res.status(500).json({error:'No pudimos registrar el pedido. Intentá nuevamente.'});
 }
}
