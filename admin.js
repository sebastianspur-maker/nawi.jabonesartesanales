const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(n)||0);
const dateFmt=v=>{try{return new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch{return v||''}};
let key=sessionStorage.getItem('nawi_admin_key')||'';

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function loadOrders(){
  $('#orders').innerHTML='<div class="empty">Cargando pedidos…</div>';
  const r=await fetch('/api/admin-orders',{headers:{'x-admin-key':key},cache:'no-store'});
  const d=await r.json();
  if(r.status===401) throw new Error('Clave incorrecta.');
  if(!r.ok) throw new Error(d.error||'No pudimos cargar los pedidos.');
  $('#meta').textContent=`${d.orders.length} ${d.orders.length===1?'pedido':'pedidos'}`;
  $('#orders').innerHTML=d.orders.length?d.orders.map(renderOrder).join(''):'<div class="empty">Todavía no hay pedidos registrados.</div>';
  document.querySelectorAll('.order-head').forEach(h=>h.onclick=()=>h.parentElement.classList.toggle('open'));
}
function renderOrder(o){
 const items=Array.isArray(o.items)?o.items:[];
 return `<article class="order"><div class="order-head"><div><div class="order-id">${esc(o.id)}</div><div class="status">NUEVO</div></div><div class="order-customer">${esc(o.name||'')}</div><div class="order-date">${esc(dateFmt(o.createdAt))}</div><div class="order-total">${money(o.total)}</div></div><div class="details"><div class="contact"><div><b>EMAIL</b>${esc(o.email||'')}</div><div><b>WHATSAPP</b>${esc(o.whatsapp||'')}</div><div><b>ORIGEN</b>${esc(o.source||'web')}</div></div><div class="items">${items.map(i=>`<div class="item"><span>${esc(i.name)} × ${Number(i.quantity)||0}</span><span>${money(i.unitPrice)} c/u</span><strong>${money(i.subtotal)}</strong></div>`).join('')}</div></div></article>`
}
async function enter(){
  const candidate=$('#password').value.trim();
  if(candidate) key=candidate;
  try{
    await loadOrders();
    sessionStorage.setItem('nawi_admin_key',key);
    $('#login').classList.add('hidden');$('#dashboard').classList.remove('hidden');$('#logout').classList.remove('hidden');
    $('#loginError').classList.add('hidden');
  }catch(e){$('#loginError').textContent=e.message;$('#loginError').classList.remove('hidden')}
}
$('#loginBtn').onclick=enter;$('#password').addEventListener('keydown',e=>{if(e.key==='Enter')enter()});
$('#refresh').onclick=()=>loadOrders().catch(e=>alert(e.message));
$('#logout').onclick=()=>{sessionStorage.removeItem('nawi_admin_key');location.reload()};
if(key) enter();
