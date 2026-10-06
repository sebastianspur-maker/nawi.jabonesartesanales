import {typographyDefaults,textStyles} from './typography.js';
export const defaults={paper:'#fbf8f2',ivory:'#f3eee4',ink:'#373a33',sage:'#68745e',headerColor:'#fbf8f2',footerColor:'#fbf8f2',footerTextColor:'#373a33',headingFont:'Italiana',bodyFont:'DM Sans',logo:'',logoWidth:130,bannerImage:'',bannerVisible:true,bannerTitle:'',bannerText:'',bannerEyebrow:'HECHO A MANO · PEQUEÑOS LOTES',bannerButton:'Descubrir productos',footerLogo:'',footerText:'',footerVisible:true,storyVisible:true,storyTitle:'Cuidado simple, consciente y especial.',storyText:'Productos artesanales pensados para transformar las rutinas cotidianas en pequeños momentos para disfrutar.',instagram:'',whatsapp:'',email:'',buttonRadius:0,...typographyDefaults};
export const fonts=['Italiana','DM Sans','Georgia','Arial','Playfair Display','Lora','Montserrat','Nunito'];
export function sanitizeDesign(input){
 const out={...defaults};
 for(const key of Object.keys(defaults)){
  const value=input?.[key];if(value===undefined)continue;
  if(typeof defaults[key]==='boolean'){if(typeof value!=='boolean')throw Error('Valor inválido');out[key]=value;}
  else if(typeof defaults[key]==='number'){const n=Number(value);if(!Number.isFinite(n))throw Error('Número inválido');const style=textStyles.find(t=>key===t.key+'Size');out[key]=style?(n===0?0:Math.max(8,Math.min(style.max,Math.round(n)))):Math.max(0,Math.min(key==='logoWidth'?240:40,n));}
  else if(/Color$|^(paper|ivory|ink|sage)$/.test(key)){if(!/^#[0-9a-f]{6}$/i.test(value))throw Error('Color inválido');out[key]=value;}
  else if(/Font$/.test(key)){if(!fonts.includes(value))throw Error('Tipografía inválida');out[key]=value;}
  else if(['logo','bannerImage','footerLogo'].includes(key)){const s=String(value);if(s&&!/^\/api\/design-image\?id=[a-f0-9-]+$/.test(s))throw Error('Imagen inválida');out[key]=s;}
  else if(key==='instagram'){const s=String(value).slice(0,300);if(s&&!/^https:\/\/(www\.)?instagram\.com\//i.test(s))throw Error('Usá un enlace de Instagram');out[key]=s;}
  else if(key==='email'){const s=String(value).slice(0,160);if(s&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw Error('Email inválido');out[key]=s;}
  else if(key==='whatsapp'){out[key]=String(value).replace(/[^+0-9]/g,'').slice(0,20);}
  else out[key]=String(value).slice(0,1000);
 }
 return out;
}
