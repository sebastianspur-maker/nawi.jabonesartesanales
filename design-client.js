import {typographyCSS,typographyDefaults} from '/lib/typography.js';
let currentDesign=null;
window.applyDesign=function(d){if(!d)return;d={...typographyDefaults,...d};currentDesign=d;window.currentDesign=d;
 let textStyle=document.getElementById('designTextStyles');if(!textStyle){textStyle=document.createElement('style');textStyle.id='designTextStyles';document.head.append(textStyle);}textStyle.textContent=typographyCSS(d);
 const root=document.documentElement;for(const key of ['paper','ivory','ink','sage'])root.style.setProperty('--'+key,d[key]);
 root.style.setProperty('--serif',`'${d.headingFont}',Georgia,serif`);root.style.setProperty('--sans',`'${d.bodyFont}',Arial,sans-serif`);root.style.setProperty('--button-radius',d.buttonRadius+'px');
 let fonts=document.getElementById('designFonts');if(!fonts){fonts=document.createElement('link');fonts.id='designFonts';fonts.rel='stylesheet';document.head.append(fonts);}fonts.href='https://fonts.googleapis.com/css2?'+[...new Set([d.headingFont,d.bodyFont])].filter(f=>!['Arial','Georgia'].includes(f)).map(f=>'family='+encodeURIComponent(f)+(f==='Italiana'?':wght@400':':ital,wght@0,400;0,500;0,600;0,700;1,400;1,700')).join('&')+'&display=swap';
 const q=s=>document.querySelector(s);q('.site-header').style.background=d.headerColor;q('footer').style.background=d.footerColor;q('footer').style.color=d.footerTextColor;
 function image(parent,src,cls){let el=parent.querySelector('.'+cls);if(src){if(!el){el=document.createElement('img');el.className=cls;el.alt='Nawi';parent.prepend(el);}el.src=src;el.style.width=d.logoWidth+'px';}else el?.remove();}
 image(q('.brand'),d.logo,'custom-logo');q('.brand-main').hidden=!!d.logo;q('.brand-sub').hidden=!!d.logo;
 image(q('.footer-brand'),d.footerLogo,'custom-footer-logo');q('.footer-brand span').hidden=!!d.footerLogo;q('.footer-brand small').hidden=!!d.footerLogo;
 const hero=q('.hero');hero.hidden=!d.bannerVisible;hero.style.backgroundImage=d.bannerImage?`url("${d.bannerImage}")`:'';hero.classList.toggle('has-banner-image',!!d.bannerImage);
 q('#heroTitle').textContent=d.bannerTitle||((typeof state!=='undefined'?state.config.nombre_marca:'')||'Nawi').replace(/ Jabones Artesanales/i,'');q('#heroClaim').textContent=d.bannerText||(typeof state!=='undefined'?state.config.claim:'')||'';q('.hero .eyebrow').textContent=d.bannerEyebrow;q('.hero-cta').textContent=d.bannerButton+' ↓';
 q('footer').hidden=!d.footerVisible;let ft=q('#designFooterText');if(!ft){ft=document.createElement('p');ft.id='designFooterText';q('footer').append(ft);}ft.textContent=d.footerText;ft.hidden=!d.footerText;
 q('.brand-story').hidden=!d.storyVisible;q('.brand-story h2').textContent=d.storyTitle;q('.brand-story>div:last-child>p:last-child').textContent=d.storyText;
 if(d.instagram)['#instagramLink','#mobileInstagram','#footerInstagram'].forEach(s=>{const a=q(s);if(a)a.href=d.instagram;});
 if(d.whatsapp){if(typeof state!=='undefined')state.config.whatsapp=d.whatsapp;['#whatsappLink','#mobileWhatsapp','#footerWhatsapp'].forEach(s=>{const a=q(s);if(a)a.href='https://wa.me/'+d.whatsapp.replace(/\D/g,'');});}
 if(d.email)q('#footerEmail').href='mailto:'+d.email;
};
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||parent===window||!new URLSearchParams(location.search).has('designPreview'))return;if(e.data?.type==='nawi-design')window.applyDesign(e.data.design);});
fetch('/api/design',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(!currentDesign)window.applyDesign(d.design);}).catch(()=>{});
