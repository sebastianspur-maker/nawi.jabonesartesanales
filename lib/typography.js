export const textStyles=[
 {key:'bannerTitle',label:'Título del banner',selector:'#heroTitle',max:160},
 {key:'bannerText',label:'Subtítulo del banner',selector:'#heroClaim',max:64},
 {key:'bannerEyebrow',label:'Texto superior del banner',selector:'.hero .eyebrow',max:40},
 {key:'bannerButton',label:'Botón del banner',selector:'.hero-cta',max:40},
 {key:'catalogTitle',label:'Título del catálogo',selector:'#catalogTitle',max:80},
 {key:'categoryTitle',label:'Títulos de categorías',selector:'.category-title h3',max:64},
 {key:'productName',label:'Nombres de productos',selector:'.product-info h4',max:48},
 {key:'productDescription',label:'Descripciones de productos',selector:'.product-info .description',max:32},
 {key:'productPrice',label:'Precios',selector:'.product-info .price',max:40},
 {key:'productButton',label:'Botones del catálogo',selector:'.add-btn',max:32},
 {key:'storyTitle',label:'Título de Nuestra esencia',selector:'.brand-story h2',max:80},
 {key:'storyText',label:'Texto de Nuestra esencia',selector:'.brand-story>div:last-child>p:last-child',max:40},
 {key:'footerText',label:'Texto del footer',selector:'#designFooterText',max:40},
 {key:'footerLinks',label:'Enlaces del footer',selector:'.footer-links a',max:32}
];
export const typographyDefaults=Object.fromEntries(textStyles.flatMap(({key})=>[[key+'Size',0],[key+'Bold',false],[key+'Italic',false],[key+'Underline',false]]));
// Zero size and false toggles retain the original responsive theme.
export function typographyCSS(design){return textStyles.map(({key,selector,max})=>{
 const declarations=[];const size=Number(design[key+'Size']);
 if(Number.isFinite(size)&&size>=8&&size<=max)declarations.push(`font-size:clamp(8px,${size/12}vw + ${size*0.7}px,${size}px)`);
 if(design[key+'Bold']===true)declarations.push('font-weight:700');
 if(design[key+'Italic']===true)declarations.push('font-style:italic');
 if(design[key+'Underline']===true)declarations.push('text-decoration:underline');
 return declarations.length?`${selector}{${declarations.join(';')}}`:'';
}).filter(Boolean).join('\n');}
