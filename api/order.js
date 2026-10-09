import { put } from '@vercel/blob';
import crypto from 'node:crypto';

function clean(value,max=500){return String(value??'').trim().slice(0,max)}
function money(n){const value=Number(n);return Number.isFinite(value)&&value>=0?value:0}
function makeOrderId(){const d=new Date();const stamp=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('');return `NAWI-${stamp}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`}

async function backupOrder(order){
  await put(`orders/${order.id}.json`,JSON.stringify(order,null,2),{
    access:'private',
    contentType:'application/json',
    addRandomSuffix:false
  });
}

async function writeOrderToSheets(order){
  const url=process.env.SHEETS_WEBHOOK_URL;
  if(!url) return {configured:false};

  const response=await fetch(url,{
    method:'POST',
    redirect:'follow',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({
      secret:process.env.SHEETS_WEBHOOK_SECRET||'',
      order
    })
  });

  const text=await response.text();
  let data={};
  try{data=JSON.parse(text)}catch{}

  if(!response.ok){
    throw new Error(data.error||`Google Sheets respondió ${response.status}`);
  }

  // Si Apps Script ya guardó el pedido pero falló una notificación secundaria
  // (por ejemplo, permisos de MailApp), no bloqueamos al comprador.
  if(!data.ok && data.saved){
    return {
      configured:true,
      saved:true,
      emailsSent:false,
      warning:data.error||'Pedido guardado; notificación pendiente.',
      id:data.id||order.id
    };
  }

  if(!data.ok){
    throw new Error(data.error||'Google Sheets no confirmó el pedido.');
  }

  return {configured:true,...data};
}

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

  // Respaldo privado: evita perder un pedido aunque Google tenga una interrupción.
  try{await backupOrder(order)}catch(error){console.error('order_backup_error',error)}

  // Cuando el webhook está configurado, Sheets es condición obligatoria de confirmación.
  let sheets;
  try{
    sheets=await writeOrderToSheets(order);
  }catch(error){
    console.error('sheets_write_error',error);
    return res.status(503).json({error:'No pudimos registrar el pedido en administración. Intentá nuevamente.'});
  }

  // Modo transitorio hasta que publiquemos el Apps Script.
  if(!sheets.configured){
    return res.status(200).json({ok:true,id,total,persisted:true,storage:'vercel-blob',sheets:false});
  }

  return res.status(200).json({
    ok:true,
    id,
    total,
    persisted:true,
    storage:'sheets+backup',
    sheets:true,
    emailsSent:sheets.emailsSent!==false,
    warning:sheets.warning||null
  });
 }catch(error){
  console.error('order_error',error);
  return res.status(500).json({error:'No pudimos registrar el pedido. Intentá nuevamente.'});
 }
}
