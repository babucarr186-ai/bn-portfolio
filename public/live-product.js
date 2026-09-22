const endpoint='https://uncle-apple-stock.jameel186.chatgpt.site/api/public-catalog';
const legacy=location.pathname.match(/\/p\/([^/]+)\/[^/]+-(\d+)\/?$/);
if(legacy){
  const slug=location.pathname.split('/').filter(Boolean).pop().replace(/-\d+$/,'');
  const slugify=value=>String(value||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(({catalogs})=>{
    const match=(catalogs[legacy[1]]||[]).find(p=>slugify(p.productTitle||p.title)===slug);
    if(!match)throw new Error();
    location.replace('/product.html?id='+encodeURIComponent(match.inventoryId));
  }).catch(()=>{document.querySelectorAll('.product-purchase-card').forEach(el=>{el.textContent='Please check the shop for the current price and availability.';});});
}
const id=new URLSearchParams(location.search).get('id');
const text=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value||'';};
async function render(){try{const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error();const {catalogs}=await response.json();const p=Object.values(catalogs).flat().find(p=>p.inventoryId===id);if(!p)throw new Error();document.title=p.title+' · Uncle Apple Store';text('#title',p.title);text('#subtitle',[p.storage,p.color,p.condition].filter(Boolean).join(' · '));text('#price',p.sold?'':p.price===null?'Price on request':`GMD ${Number(p.price).toLocaleString('en-US')}`);text('#status',p.sold?'Sold out':`Available · ${p.stockRemaining} in stock`);document.querySelector('#status').classList.toggle('sold',p.sold);text('#description',p.description||p.shortDescription||p.subtitle);
const specs=document.querySelector('#specs');specs.replaceChildren();for(const [label,value] of [['Storage',p.storage],['Colour',p.color],['Condition',p.condition],['Battery',p.batteryHealth],['RAM',p.ram],['Chip',p.cpu]]){if(!value)continue;const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;specs.append(dt,dd);}
const details=document.querySelector('#details');details.replaceChildren();for(const value of [...(p.specs||[]),...(p.productHighlights||[]),...(p.conditionReport||[])]){const li=document.createElement('li');li.textContent=value;details.append(li);}
const main=document.querySelector('#main-photo');const images=(p.images||[]).map(path=>new URL(path,location.origin+'/').href).filter(url=>url.startsWith('https:'));main.hidden=!images.length;if(images.length){main.src=images[0];main.alt=p.title;}const thumbs=document.querySelector('#thumbs');thumbs.replaceChildren();images.forEach((src,i)=>{const btn=document.createElement('button');btn.setAttribute('aria-label',`View photo ${i+1}`);const img=document.createElement('img');img.src=src;img.alt='';btn.append(img);btn.onclick=()=>{main.src=src;};thumbs.append(btn);});
const contact=document.querySelector('#contact');contact.hidden=p.sold;const message=`Hi Uncle Apple! Please confirm availability for: ${p.title} ${p.storage||''} ${p.color||''}. ${p.price===null?'':`Price GMD ${p.price}.`}`;let href='https://wa.me/4915679652076?text='+encodeURIComponent(message);if(window.uaReferral)href=window.uaReferral.decorate(href);contact.href=href;
document.querySelector('#loading').hidden=true;document.querySelector('#error').hidden=true;document.querySelector('#product').hidden=false;}catch{document.querySelector('#loading').hidden=true;document.querySelector('#error').hidden=false;document.querySelector('#product').hidden=true;}}
if(!legacy){void render();setInterval(()=>{if(document.visibilityState==='visible')void render();},15000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void render();});}
