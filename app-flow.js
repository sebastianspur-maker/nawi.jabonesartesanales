function renderCart(){const entries=[...state.cart.values()];$('#cartItems').innerHTML=entries.length?entries.map(({product:p,quantity:q})=>`<div class="cart-line" data-id="${esc(p.id)}">${thumb(p)}<div><h4>${esc(p.name)}</h4><span class="cart-unit">${money(p.price)} c/u</span><div><button class="remove-line">Eliminar</button></div></div><div class="cart-line-right"><strong>${money(p.price*q)}</strong><div class="cart-qty"><button class="cart-minus">−</button><span>${q}</span><button class="cart-plus">+</button></div></div></div>`).join(''):'<div class="empty-cart">Tu carrito está vacío.<br>Elegí tus productos para comenzar.</div>';$('#cartTotal').textContent=money(cartTotal());$('#checkoutBtn').disabled=!entries.length;$$('.cart-line').forEach(line=>{const id=line.dataset.id;line.querySelector('.cart-minus').onclick=()=>changeCart(id,-1);line.querySelector('.cart-plus').onclick=()=>changeCart(id,1);line.querySelector('.remove-line').onclick=()=>{state.cart.delete(id);updateCartCount();renderCart()}})}
function changeCart(id,delta){const x=state.cart.get(id);if(!x)return;const max=x.product.demo?99:Number(x.product.stock)||0;const next=x.quantity+delta;if(next<=0)state.cart.delete(id);else x.quantity=Math.min(max,next);updateCartCount();renderCart()}
function openImage(p){const photos=(p.photos||[]).map(driveImage).filter(Boolean);if(!photos.length)return;state.modalPhotos=photos;state.modalPhotoIndex=0;renderModalPhoto(p.name);setModal('imageModal',true)}
function renderModalPhoto(name='Producto'){const photos=state.modalPhotos,i=state.modalPhotoIndex;$('#modalImage').src=photos[i]||'';$('#modalImage').alt=name;$('#prevPhoto').classList.toggle('hidden',photos.length<2);$('#nextPhoto').classList.toggle('hidden',photos.length<2);$('#photoDots').innerHTML=photos.map((_,j)=>`<span class="${j===i?'active':''}"></span>`).join('')}
function checkoutLine({product:p,quantity:q}){return`<div class="checkout-line"><span>${esc(p.name)} <small>× ${q}</small></span><span class="unit-price">${money(p.price)} c/u</span><strong>${money(p.price*q)}</strong></div>`}
function openCheckout(){if(!state.cart.size)return;closeCart();$('#checkoutStep').classList.remove('hidden');const items=[...state.cart.values()];$('#checkoutItems').innerHTML=items.map(checkoutLine).join('');$('#checkoutTotal').textContent=money(cartTotal());setModal('checkoutModal',true)}
function validateForm(){const name=$('#customerName').value.trim(),email=$('#customerEmail').value.trim(),whatsapp=$('#customerWhatsapp').value.trim();if(name.length<2)return'Ingresá tu nombre.';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return'Ingresá un email válido.';if(whatsapp.replace(/\D/g,'').length<8)return'Ingresá un WhatsApp válido.';return''}
async function submitOrder(e){e.preventDefault();const err=validateForm();if(err){showFormError(err);return}const btn=$('#confirmBtn');btn.disabled=true;btn.textContent='Registrando pedido…';$('#formError').classList.add('hidden');const items=[...state.cart.values()].map(({product:p,quantity:q})=>({id:p.id,name:p.name,category:p.category,quantity:q,unitPrice:p.price,subtotal:p.price*q}));try{const response=await fetch('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('#customerName').value.trim(),email:$('#customerEmail').value.trim(),whatsapp:$('#customerWhatsapp').value.trim(),items})});const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo registrar el pedido.');completeOrder({...data,items,name:$('#customerName').value.trim()})}catch(error){showFormError(error.message||'No se pudo registrar el pedido. Intentá nuevamente.')}finally{btn.disabled=false;btn.textContent='Confirmar pedido'}}
function showFormError(msg){$('#formError').textContent=msg;$('#formError').classList.remove('hidden')}
function completeOrder(data){
  const total=data.items.reduce((s,x)=>s+x.subtotal,0);
  state.lastOrder={...data,total};
  const wa=String(state.config.whatsapp||'+5491165302984').replace(/\D/g,'');
  const lines=[
    `Hola, soy ${data.name}. Acabo de realizar el pedido ${data.id}.`,
    '',
    ...data.items.map(x=>`${x.quantity} × ${x.name} — ${money(x.subtotal)}`),
    '',
    `Total: ${money(total)}`,
    '',
    'Quisiera coordinar el pago y la entrega.'
  ];
  const url=`https://wa.me/${wa}?text=${encodeURIComponent(lines.join('\n'))}`;
  state.cart.clear();
  updateCartCount();
  setModal('checkoutModal',false);
  window.location.assign(url);
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function attr(s){return esc(s).replace(/`/g,'&#96;')}
async function init(){try{const r=await fetch('/api/catalog',{cache:'no-store'});const d=await r.json();state.products=d.products||[];state.config=d.config||{};state.source=d.source||'demo';refreshCategoryOrder();renderCategoryNavigation();applyConfig();if(d.message){$('#syncNotice').textContent=d.message;$('#syncNotice').classList.remove('hidden')}renderProducts()}catch(e){$('#syncNotice').textContent='No pudimos cargar el catálogo. Recargá la página.';$('#syncNotice').classList.remove('hidden')}}
$('#cartBtn').onclick=openCart;$('#closeCart').onclick=closeCart;$('#keepShopping').onclick=closeCart;$('#backdrop').onclick=closeCart;$('#checkoutBtn').onclick=openCheckout;$('#checkoutForm').onsubmit=submitOrder;$('#editCart').onclick=()=>{setModal('checkoutModal',false);openCart()};$('#menuBtn').onclick=()=>$('#mobileMenu').classList.toggle('open');$$('[data-category]').forEach(b=>b.addEventListener('click',()=>selectCategory(b.dataset.category)));$$('.modal-close').forEach(b=>b.onclick=()=>setModal(b.dataset.close,false));$('#prevPhoto').onclick=()=>{state.modalPhotoIndex=(state.modalPhotoIndex-1+state.modalPhotos.length)%state.modalPhotos.length;renderModalPhoto()};$('#nextPhoto').onclick=()=>{state.modalPhotoIndex=(state.modalPhotoIndex+1)%state.modalPhotos.length;renderModalPhoto()};document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCart();setModal('imageModal',false);setModal('checkoutModal',false)}});init();
