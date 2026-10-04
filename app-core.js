const state={products:[],config:{},source:'demo',category:'Todos los productos',cart:new Map(),cardQty:new Map(),modalPhotos:[],modalPhotoIndex:0,lastOrder:null};
let categoryOrder=[];
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(n)||0);
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function driveImage(value){const s=String(value||'').trim();if(!s)return'';if(/^https?:\/\//i.test(s)){const m=s.match(/\/d\/([\w-]+)/)||s.match(/[?&]id=([\w-]+)/);if(m)return`https://drive.google.com/thumbnail?id=${m[1]}&sz=w1400`;return s}return`https://drive.google.com/thumbnail?id=${encodeURIComponent(s)}&sz=w1400`}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
function setModal(id,open){const el=$(`#${id}`);el.classList.toggle('open',open);el.setAttribute('aria-hidden',String(!open));document.body.style.overflow=open?'hidden':''}
function openCart(){renderCart();$('#cartDrawer').classList.add('open');$('#cartDrawer').setAttribute('aria-hidden','false');$('#backdrop').classList.add('open');document.body.style.overflow='hidden'}
function closeCart(){ $('#cartDrawer').classList.remove('open');$('#cartDrawer').setAttribute('aria-hidden','true');$('#backdrop').classList.remove('open');document.body.style.overflow=''}
function applyConfig(){const c=state.config;$('#heroTitle').textContent=(c.nombre_marca||'Nawi').replace(/ Jabones Artesanales/i,'');$('#heroClaim').textContent=c.claim||'';const wa=String(c.whatsapp||'+5491165302984').replace(/\D/g,'');const waUrl=`https://wa.me/${wa}`;['#whatsappLink','#mobileWhatsapp','#footerWhatsapp'].forEach(s=>$(s).href=waUrl);['#instagramLink','#mobileInstagram','#footerInstagram'].forEach(s=>$(s).href=c.instagram||'#');$('#footerEmail').href=`mailto:${c.email||''}`;$('#footerDomain').textContent=c.dominio||'';$('#checkoutMessage').textContent=`No se realizará ningún pago en esta página. ${c.mensaje_checkout||'Nos comunicaremos por WhatsApp para coordinar el pago y la entrega.'}`;const show=fold(c.mostrar_mensaje_header)==='si'&&c.mensaje_header;$('#announcement').classList.toggle('hidden',!show);if(show)$('#announcement').textContent=c.mensaje_header}
function refreshCategoryOrder(){
  categoryOrder=[...new Set(state.products.map(p=>String(p.category||'').trim()).filter(Boolean))];
}
function renderCategoryNavigation(){
  const all='Todos los productos';
  const desktop=$('.desktop-nav');
  const pills=$('.category-pills');
  const mobile=$('#mobileMenu');
  if(desktop){
    desktop.innerHTML=[all,...categoryOrder].map((cat,i)=>`<button data-category="${attr(cat)}" class="nav-link ${i===0?'active':''}">${esc(cat)}</button>`).join('');
  }
  if(pills){
    pills.innerHTML=[all,...categoryOrder].map((cat,i)=>`<button data-category="${attr(cat)}" class="pill ${i===0?'active':''}">${esc(cat)}</button>`).join('');
  }
  if(mobile){
    mobile.innerHTML=[all,...categoryOrder].map(cat=>`<button data-category="${attr(cat)}">${esc(cat)}</button>`).join('')+
      '<div class="mobile-socials"><a id="mobileInstagram" target="_blank">Instagram</a><a id="mobileWhatsapp" target="_blank">WhatsApp</a></div>';
  }
  document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>selectCategory(b.dataset.category)));
}
function groupProducts(){const visible=state.category==='Todos los productos'?state.products:state.products.filter(p=>p.category===state.category);return categoryOrder.map(cat=>[cat,visible.filter(p=>p.category===cat).sort((a,b)=>fold(a.name).localeCompare(fold(b.name),'es'))]).filter(([,arr])=>arr.length)}
function productCard(p){const q=state.cardQty.get(p.id)||1;const photo=p.photos?.[0]?driveImage(p.photos[0]):'';const stock=Number(p.stock);const inStock=Number.isFinite(stock)&&stock>0;return `<article class="product-card" data-id="${esc(p.id)}"><div class="product-image">${p.demo?'<span class="demo-badge">MUESTRA</span>':''}${!inStock&&!p.demo?'<span class="stock-badge">SIN STOCK</span>':''}${photo?`<img src="${attr(photo)}" alt="${attr(p.name)}" loading="lazy" onerror="this.remove()">`:'<div class="placeholder-art"></div>'}</div><div class="product-info"><h4>${esc(p.name)}</h4><p class="description">${esc(p.description1)}${p.description2?`<br>${esc(p.description2)}`:''}</p><p class="price">${money(p.price)}</p>${inStock||p.demo?`<div class="buy-row"><div class="quantity-control"><button class="card-minus" aria-label="Reducir cantidad">−</button><span class="card-qty">${q}</span><button class="card-plus" aria-label="Aumentar cantidad">+</button></div><button class="add-btn">Agregar al carrito</button></div>`:'<div class="sold-out">SIN STOCK</div>'}</div></article>`}
function renderProducts(){const groups=groupProducts();$('#catalogTitle').textContent=state.category;const count=groups.reduce((n,[,a])=>n+a.length,0);$('#catalogMeta').textContent=`${count} ${count===1?'producto':'productos'}`;$('#productSections').innerHTML=groups.length?groups.map(([cat,arr])=>`<section class="category-block"><div class="category-title"><h3>${esc(cat)}</h3></div><div class="product-grid">${arr.map(productCard).join('')}</div></section>`).join(''):'<p class="empty-cart">Todavía no hay productos disponibles en esta categoría.</p>';bindProductCards()}
function selectCategory(cat){state.category=cat;$$('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category===cat|| (b.classList.contains('pill')&&b.textContent.trim()==='Todos'&&cat==='Todos los productos')));renderProducts();$('#mobileMenu').classList.remove('open');document.querySelector('#catalogo').scrollIntoView({behavior:'smooth',block:'start'})}
function bindProductCards(){$$('.product-card').forEach(card=>{const id=card.dataset.id,p=state.products.find(x=>x.id===id);card.querySelector('.card-minus')?.addEventListener('click',()=>{const n=Math.max(1,(state.cardQty.get(id)||1)-1);state.cardQty.set(id,n);card.querySelector('.card-qty').textContent=n});card.querySelector('.card-plus')?.addEventListener('click',()=>{const max=p.demo?99:Math.max(1,Number(p.stock)||1);const n=Math.min(max,(state.cardQty.get(id)||1)+1);state.cardQty.set(id,n);card.querySelector('.card-qty').textContent=n});card.querySelector('.add-btn')?.addEventListener('click',()=>addToCart(p,state.cardQty.get(id)||1));card.querySelector('.product-image')?.addEventListener('click',()=>openImage(p))})}
function addToCart(p,qty){const current=state.cart.get(p.id)?.quantity||0;const max=p.demo?99:Number(p.stock)||0;const next=Math.min(max,current+qty);state.cart.set(p.id,{product:p,quantity:next});updateCartCount();toast(`${p.name} agregado al carrito`)}
function updateCartCount(){const n=[...state.cart.values()].reduce((s,x)=>s+x.quantity,0);$('#cartCount').textContent=n}
function cartTotal(){return[...state.cart.values()].reduce((s,x)=>s+x.product.price*x.quantity,0)}
function thumb(p){const u=p.photos?.[0]?driveImage(p.photos[0]):'';return u?`<img class="cart-thumb" src="${attr(u)}" alt="">`:'<div class="cart-thumb placeholder-art"></div>'}
