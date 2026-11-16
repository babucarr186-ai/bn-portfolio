import { staffIdentifier, recordStaffSale, recordStaffPayment } from './staff-data.js';
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import {
  getFirestore, collection, doc, getDocFromServer, getDocsFromServer, query, where,
  runTransaction, increment, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);
const amount = (v) => Number(v);
const gmd = (x) => 'D ' + (Number(x) || 0).toLocaleString('en-US',{maximumFractionDigits:2});
const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Banjul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const state = { user:null, inventory:[], sales:[], db:null, auth:null };
let noticeTimer;
function notice(message,error=false) {
  const el = $('#feedback');
  el.textContent = String(message || '');
  el.classList.toggle('error',error);
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(()=>{el.textContent='';},7000);
}
function formField(form,key){return String(new FormData(form).get(key)||'').trim();}
function available(){return state.inventory.filter(p=>p.stockQty>0);}
function balance(s){return Math.max(0,Number((Number(s.totalGmd)-Number(s.paidGmd)).toFixed(2)));}
function setOptions(el,items,render,placeholder) {
  const prior=el.value;
  el.replaceChildren(new Option(placeholder,''));
  items.forEach(item=>el.add(new Option(render(item),item.id)));
  if(items.some(i=>i.id===prior))el.value=prior;
}
function showTab(name){
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===name));
  document.querySelectorAll('.tab-content').forEach(el=>{el.hidden=el.id!=='tab-'+name;});
}
function drawInventory(){
  const term=$('#search').value.toLowerCase().trim();
  const identifier = staffIdentifier(term);
  const items = (term ? state.inventory : available()).filter((p) =>
    [p.name, p.sku, p.category].some((value) => String(value || '').toLowerCase().includes(term)) ||
    (identifier && [p.serialNumber, p.imei].includes(identifier)));

  $('#available-count').textContent=available().length.toLocaleString('en-US');
  $('#empty-stock').hidden=items.length>0;
  $('#inventory-list').innerHTML=items.map(p=>
    '<tr><td><strong>'+escapeHtml(p.name)+'</strong><small>'+escapeHtml(p.sku)+' · '+escapeHtml(p.category)+'</small></td>'+
    '<td>'+escapeHtml([p.storage, p.colour, p.batteryHealth && p.batteryHealth + '% battery'].filter(Boolean).join(' · ') || '—')+
    '</td><td>'+escapeHtml(p.stockQty)+'</td><td>'+(p.unitPriceGmd > 0 ? gmd(p.unitPriceGmd) : 'Ask owner') +
    (p.stockQty > 0 && p.unitPriceGmd > 0
      ? '<br><button type="button" class="secondary" data-sell-product="' + escapeHtml(p.id) + '">Sell</button>' : '') + '</td></tr>'
  ).join('');
  setOptions($('#sale-product'),available().filter(p => p.unitPriceGmd > 0),p=>p.name+' · '+p.sku+' ('+p.stockQty+' left)','Select an available product');
  updateSalePrice();
}
function updateSalePrice(){
  const p=state.inventory.find(x=>x.id===$('#sale-product').value);
  const qty=Math.max(0,Number($('#sale-form [name="quantity"]').value)||0);
  $('#unit-price').value=p?gmd(p.unitPriceGmd):'';
  $('#sale-total').textContent=p?'Sale total: '+gmd(qty*p.unitPriceGmd)+' · Price set by owner':'Choose an item to view the sale total.';
}
function drawSales(){
  const date=today();
  $('#shift-count').textContent=state.sales.filter(s=>s.date===date).length.toLocaleString('en-US');
  const sales=[...state.sales].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  $('#my-sales').innerHTML=sales.length?sales.slice(0,50).map(s=>
    '<div class="entry"><div><strong>'+escapeHtml(s.customer||'Customer')+'</strong>'+
    '<small>'+escapeHtml(s.date)+' · '+escapeHtml(s.productName)+' × '+s.quantity+'</small></div>'+
    '<div><strong>'+gmd(s.totalGmd)+'</strong><small>Balance: '+gmd(balance(s))+'</small></div></div>'
  ).join(''):'<p class="minor">No sales under your account yet.</p>';
  setOptions($('#payment-sale'),sales.filter(s=>balance(s)>0),
    s=>(s.customer||'Customer')+' · '+s.productName+' · '+gmd(balance(s))+' outstanding','Choose an unpaid sale');
}
async function load(){
  const user = state.user;
  if (!user) return;
  const [products, sales] = await Promise.all([
    getDocsFromServer(collection(state.db, 'staffCatalog')),
    getDocsFromServer(query(collection(state.db, 'staffSales'), where('createdBy', '==', user.uid)))
  ]);
  if (state.user !== user) return;
  state.inventory=products.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>a.name.localeCompare(b.name));
  state.sales=sales.docs.map(d=>({id:d.id,...d.data()}));
  drawInventory();drawSales();
  $('#last-updated').textContent='Updated '+new Date().toLocaleTimeString('en-GB');
}
async function withForm(form,work,label){
  const button=form.querySelector('button[type="submit"]');
  button.disabled=true;
  try {
    await work();
    form.reset();
    $('#sale-form [name="date"]').value=today();
    try {
      await load();
      notice(label);
    } catch (error) {
      console.error('Staff refresh failed', error);
      notice(label + ' Use Refresh to reload your list.', true);
    }
  } catch(e){
    console.error('Staff operation failed',e);
    notice(e?.message||'Could not save changes',true);
  } finally{button.disabled=false;}
}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
$('#sale-product').addEventListener('change',updateSalePrice);
$('#sale-form [name="quantity"]').addEventListener('input',updateSalePrice);
$('#search').addEventListener('input',drawInventory);
$('#inventory-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-sell-product]');
  if (!button) return;
  showTab('sale');
  $('#sale-product').value = button.dataset.sellProduct;
  updateSalePrice();
  $('#sale-form [name="quantity"]').focus();
});
$('#refresh').addEventListener('click',async()=>{try{await load();notice('Stock refreshed.');}catch(e){notice(e.message,true);}});
$('#sign-out').addEventListener('click',()=>signOut(state.auth));
$('#switch-account').addEventListener('click',()=>signOut(state.auth));
$('#sale-form [name="date"]').value=today();

$('#login-form').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const f=event.currentTarget;
  const btn=f.querySelector('button[type="submit"]');
  btn.disabled=true;
  try {
    await signInWithEmailAndPassword(state.auth,formField(f,'email'),formField(f,'password'));
    f.reset();
  }catch(e){notice('Sign-in failed. Check your email, password, and access approval.',true);}
  finally{btn.disabled=false;}
});

$('#sale-form').addEventListener('submit',(event)=>{
  event.preventDefault();
  const form=event.currentTarget;
  withForm(form,async()=>{
    if(!state.user)throw Error('Sign in first.');
    const sku=formField(form,'productId');
    const quantity=amount(formField(form,'quantity'));
    const paidGmd=amount(formField(form,'paid'));
    const method=formField(form,'method');
    const customer=formField(form,'customer');
    if(!sku||!Number.isSafeInteger(quantity)||quantity<1||quantity>1000000)throw Error('Choose a product and a valid whole-number quantity.');
    if(!Number.isFinite(paidGmd)||paidGmd<0||paidGmd>1000000000)throw Error('Enter a valid payment amount.');
    if(!customer||customer.length>100)throw Error('Enter a customer name or reference (up to 100 characters).');
    const uid = state.user.uid;
    const date = formField(form, 'date');
    const dueOn = formField(form, 'dueOn');
    if (!date || date > today()) throw new Error('Choose today or an earlier sale date.');
    await recordStaffSale(state.db, { sku, quantity, paidGmd, method, customer, date, dueOn, uid },
      { doc, collection, runTransaction, increment, serverTimestamp });
  },'Sale saved. Stock updated.');
});

$('#payment-form').addEventListener('submit',(event)=>{
  event.preventDefault();
  const form=event.currentTarget;
  withForm(form,async()=>{
    if(!state.user)throw Error('Sign in first.');
    const id=formField(form,'saleId');
    const payment=amount(formField(form,'amount'));
    if(!id||!Number.isFinite(payment)||payment<=0||payment>1000000000)throw Error('Choose a sale and valid payment.');
    await recordStaffPayment(state.db, {
      id, amount: payment, method: formField(form, 'method'), uid: state.user.uid
    }, { doc, collection, runTransaction, serverTimestamp });
  },'Payment recorded.');
});

if(!firebaseConfig?.apiKey||!firebaseConfig?.projectId){
  $('#login-panel').hidden=false;
  notice('Firebase configuration is missing.',true);
}else{
  const firebaseApp=initializeApp(firebaseConfig);
  state.auth=getAuth(firebaseApp);
  state.db=getFirestore(firebaseApp);
  let authSession = 0;
  onAuthStateChanged(state.auth,async(user)=>{
    const session = ++authSession;
    $('#workspace').hidden=true;
    $('#unauthorized').hidden=true;
    $('#login-panel').hidden=true;
    $('#sign-out').hidden=!user;
    state.user = null;
    state.inventory = [];
    state.sales = [];
    $('#account').textContent = '';
    $('#search').value = '';
    $('#inventory-list').replaceChildren();
    $('#my-sales').replaceChildren();
    $('#sale-product').replaceChildren();
    $('#payment-sale').replaceChildren();
    $('#sale-form').reset();
    $('#payment-form').reset();
    $('#sale-form [name="date"]').value = today();
    showTab('inventory');
    if(!user){$('#login-panel').hidden=false;$('#account').textContent='';return;}
    try{
      const userRef=doc(state.db,'users',user.uid);
      const snap=await getDocFromServer(userRef);
      if (session !== authSession) return;
      const p=snap.exists()?snap.data():null;
      if (p?.active === true && p.role === 'owner') {
        window.location.replace('./');
        return;
      }
      if(!p||p.active!==true||p.role!=='staff'){
        $('#unauthorized').hidden=false;
        return;
      }
      state.user = user;
      $('#account').textContent=user.email||'Authorized user';
      await load();
      if (session === authSession) $('#workspace').hidden = false;
    }catch(e){
      if (session !== authSession) return;
      console.error('Staff access failed',e);
      notice('Could not load staff records. Contact the owner.',true);
      $('#unauthorized').hidden=false;
    }
  });
}
