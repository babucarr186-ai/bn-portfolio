import {modelFor,suggestions} from './models.js';
export function normaliseScan(raw,type){
  let text=String(raw).trim().toUpperCase();
  text=text.replace(type==='imei'?/^IMEI(?:[12])?\s*[:=]?\s*/:/^(?:SERIAL(?:\s*NUMBER)?|S\/N)\s*[:=]?\s*/,'').replace(/[\s-]/g,'');
  if(type==='imei'&&!/^\d{15}$/.test(text))return null;
  // Do not mistake the box's numeric EAN/UPC or IMEI for a serial number.
  if(type==='serialNumber'&&(!/^[A-Z0-9]{8,32}$/.test(text)||!/[A-Z]/.test(text)))return null;
  return text;
}
export function initProductAssist({form,getProducts,getCurrentId,openExisting}){
  const names=document.querySelector('#model-options'), choices=document.querySelector('#model-choices');
  const storage=document.querySelector('#storage-values'), colours=document.querySelector('#colour-values');
  const duplicate=document.querySelector('#identifier-duplicate');
  function update(){
    const category=form.elements.category.value,query=form.elements.name.value;
    names.replaceChildren(...suggestions(category).map(m=>new Option(m.name)));
    choices.replaceChildren();
    for(const model of suggestions(category,query).slice(0,6)){
      const b=document.createElement('button');b.type='button';b.className='model-chip';b.textContent=model.name;
      b.addEventListener('click',()=>{form.elements.name.value=model.name;update();(document.querySelector('#field-storage').hidden ? form.elements.colour : form.elements.storage).focus();});choices.append(b);
    }
    choices.hidden=form.elements.name.disabled||!choices.children.length;
    const model=modelFor(category,query);
    const sizes=model?.storage.length?model.storage:['32 GB','64 GB','128 GB','256 GB','512 GB','1 TB','2 TB'];
    storage.replaceChildren(...sizes.map(v=>new Option(v)));
    const options=model?.colours.length?model.colours:['Black','White','Silver','Space Grey','Gold','Blue','Green','Red'];
    colours.replaceChildren(...options.map(v=>new Option(v)));
    document.querySelector('#model-help').textContent=model?.storage.length?'Storage and colour suggestions match this model. Confirm against the device.':'Choose a suggestion or enter another model. Include the year or chip where needed.';
    checkDuplicate();
  }
  function checkDuplicate(){
    duplicate.replaceChildren();const norm=s=>String(s||'').toUpperCase().replace(/[\s-]/g,'');
    const match=getProducts().find(p=>p.id!==getCurrentId()&&['serialNumber','imei'].some(key=>norm(form.elements[key].value)&&norm(form.elements[key].value)===norm(p[key])));
    duplicate.hidden=!match;
    if(match){const p=document.createElement('p');p.textContent='This identifier is already used by '+match.name+' ('+match.sku+').';const b=document.createElement('button');b.type='button';b.className='text-button';b.textContent='Open existing product';b.addEventListener('click',()=>{if(window.confirm('Open the existing product? Unsaved changes in this form will be discarded.'))openExisting(match);});duplicate.append(p,b);}
  }
  form.elements.name.addEventListener('input',update);
  form.elements.name.addEventListener('change',update);
  for(const key of ['serialNumber','imei'])form.elements[key].addEventListener('input',checkDuplicate);
  const dialog=document.querySelector('#scan-dialog'),video=document.querySelector('#scan-video'),status=document.querySelector('#scan-status'),candidate=document.querySelector('#scan-value');
  let session=0,stream,controls,target,readerLoad;
  function stop(){session++;controls?.stop();controls=null;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;}
  function close(){stop();if(dialog.open)dialog.close();}
  async function reader(){
    if(window.ZXingBrowser)return window.ZXingBrowser;
    if(!readerLoad)readerLoad=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./vendor/zxing-browser-0.1.5.min.js',import.meta.url).href;script.onload=()=>resolve(window.ZXingBrowser);script.onerror=()=>{readerLoad=null;script.remove();reject(new Error('Scanner could not load. Check your connection or type the number.'));};document.head.append(script);});
    return readerLoad;
  }
  async function start(field){
    stop();target=field;candidate.value='';document.querySelector('#use-scan').disabled=true;
    document.querySelector('#scan-title').textContent=field==='imei'?'Scan IMEI barcode':'Scan serial-number barcode';
    status.textContent='Opening camera…';dialog.showModal();const token=session;
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera scanning is unavailable here. Open the dashboard over HTTPS on your phone, or type the number.');
      const zxing=await reader();if(token!==session)return;
      const camera=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});
      if(token!==session){camera.getTracks().forEach(t=>t.stop());return;}stream=camera;
      status.textContent='Point at the '+(field==='imei'?'IMEI':'serial-number')+' barcode on the box. Keep it steady in good light.';
      const scanner=new zxing.BrowserMultiFormatReader();
      const active=await scanner.decodeFromStream(camera,video,(result,_error,ctrl)=>{
        if(token!==session){ctrl.stop();return;}if(!result)return;
        const value=normaliseScan(result.getText(),field);
        if(!value){status.textContent='That barcode does not look like a '+(field==='imei'?'15-digit IMEI':'serial number')+'. Try the labelled barcode.';return;}
        candidate.value=value;document.querySelector('#use-scan').disabled=false;
        status.textContent='Number captured. Compare it with the printed number before using it.';ctrl.stop();stop();
      });
      if(token!==session)active.stop();else controls=active;
    }catch(error){if(token!==session)return;stop();status.textContent=error.name==='NotAllowedError'?'Camera permission was denied. Allow it in your browser settings, or close this and type the number.':error.name==='NotFoundError'?'No camera found. Close this and type or paste the number.':error.message||'Could not open camera. Type or paste the number instead.';}
  }
  document.querySelectorAll('[data-scan]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.scan)));
  document.querySelector('#close-scan').addEventListener('click',close);
  dialog.addEventListener('cancel',stop);dialog.addEventListener('close',stop);
  document.querySelector('#use-scan').addEventListener('click',()=>{if(!normaliseScan(candidate.value,target))return;form.elements[target].value=candidate.value;close();checkDuplicate();form.elements[target].focus();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
  window.addEventListener('pagehide',stop);
  document.querySelector('#product-dialog').addEventListener('close',close);
  return {update,stop:close};
}
