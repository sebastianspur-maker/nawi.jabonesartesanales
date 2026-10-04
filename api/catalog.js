const fallbackConfig={
 nombre_marca:'Nawi Jabones Artesanales',
 bajada:'Jabones artesanales & cuidado personal',
 claim:'Volver a lo esencial. Cuidarte, disfrutar y elegir de manera más consciente.',
 whatsapp:'+5491165302984',
 instagram:'https://instagram.com/nawi.jabonesartesanales',
 email:'nawijabonesartesanales@gmail.com',
 mensaje_header:'',
 mostrar_mensaje_header:'No',
 mensaje_checkout:'Nos comunicaremos por WhatsApp para coordinar el pago y la entrega.',
 moneda:'ARS',
 dominio:'nawijabonesartesanales.com.ar'
};

const demoProducts=[
 {id:'DEMO-JAB',category:'Jabones',name:'Jabón de muestra',description1:'Producto de prueba',description2:'Se reemplaza al conectar Administración',price:7500,stock:20,available:true,photos:[],demo:true},
 {id:'DEMO-CAB',category:'Cuidado del cabello',name:'Shampoo sólido de muestra',description1:'Producto de prueba',description2:'Se reemplaza al conectar Administración',price:9800,stock:20,available:true,photos:[],demo:true},
 {id:'DEMO-REG',category:'Para regalar',name:'Box Nawi de muestra',description1:'Producto de prueba',description2:'Se reemplaza al conectar Administración',price:18500,stock:20,available:true,photos:[],demo:true}
];

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 const url=process.env.SHEETS_WEBHOOK_URL;
 if(!url){
   return res.status(200).json({source:'demo',products:demoProducts,config:fallbackConfig,message:'Falta publicar el Apps Script de Nawi - Administración.'});
 }
 try{
   const sep=url.includes('?')?'&':'?';
   const response=await fetch(url+sep+'action=catalog',{redirect:'follow',cache:'no-store'});
   const text=await response.text();
   let data={};
   try{data=JSON.parse(text)}catch{}
   if(!response.ok||!data.ok) throw new Error(data.error||('Apps Script '+response.status));
   const products=(data.products||[]).map(p=>({...p,category:String(p.sourceCategory||p.category||'').trim()})).filter(p=>p&&p.name&&p.category&&p.available!==false);
   return res.status(200).json({source:'administracion',products,config:{...fallbackConfig,...(data.config||{})}});
 }catch(error){
   return res.status(200).json({source:'demo',products:demoProducts,config:fallbackConfig,message:'No pudimos leer Nawi - Administración.',detail:String(error&&error.message||error)});
 }
}
