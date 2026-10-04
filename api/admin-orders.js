import { list, get } from '@vercel/blob';

function authorized(req){
  const expected=process.env.ADMIN_PASSWORD||'';
  const header=String(req.headers['x-admin-key']||'');
  return expected && header===expected;
}

async function streamToText(stream){
  return await new Response(stream).text();
}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Método no permitido'});
  if(!authorized(req)) return res.status(401).json({error:'No autorizado'});
  try{
    let cursor;
    const orders=[];
    do{
      const page=await list({prefix:'orders/',limit:250,cursor});
      for(const blob of page.blobs){
        const result=await get(blob.pathname,{access:'private',useCache:false});
        if(!result||result.statusCode!==200) continue;
        const text=await streamToText(result.stream);
        try{orders.push(JSON.parse(text))}catch{}
      }
      cursor=page.cursor;
    }while(cursor);
    orders.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
    return res.status(200).json({orders});
  }catch(error){
    console.error('admin_orders_error',error);
    return res.status(500).json({error:'No pudimos cargar los pedidos.'});
  }
}
