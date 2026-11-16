const {chromium}=require('playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
fs.mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const source=fs.readFileSync('public/admin/app.js','utf8').replace(/import \{ firebaseConfig \}[^;]+;/,'const firebaseConfig = null;').replace(/^import [^;]*from 'https:\/\/www.gstatic.com[^;]+;/gm,'');
await page.clock.setFixedTime(new Date('2026-11-16T12:00:00Z'));
// Only synthetic fixtures; all database operations are disabled by the null config.
await page.route('**/app.js?*',r=>r.fulfill({contentType:'text/javascript',body:source+`\nwindow.testApp={state,draw,openEditor,openProduct,readProductForm};state.member={role:'owner'};state.products=[{id:'DEMO-1',sku:'DEMO-1',name:'iPhone 14 Pro',category:'iPhone',storage:'128 GB',colour:'Deep Purple',batteryHealth:90,serialNumber:'ABC1234567',imei:'490154203237518',stockQty:1,unitCostGmd:20000,unitPriceGmd:30000,receivedOn:'2026-08-01'}];state.sales=[{id:'DEMO-S1',productId:'DEMO-1',productName:'iPhone 14 Pro',sku:'DEMO-1',quantity:1,totalGmd:30000,unitCostGmd:20000,paidGmd:28000,date:'2026-10-10'},{id:'DEMO-S2',productId:'DEMO-1',productName:'iPhone 14 Pro',sku:'DEMO-1',quantity:1,totalGmd:35000,unitCostGmd:20000,paidGmd:35000,date:'2026-11-10'}];state.expenses=[{date:'2026-10-01',category:'Rent',amountGmd:1000}];draw();document.querySelector('#setup').hidden=true;document.querySelector('#app').hidden=false;`}));
await page.goto('http://127.0.0.1:4173/');await page.getByRole('heading',{name:'Store performance',exact:true}).waitFor();
assert.equal(await page.locator('#store-insights .trend-chart').count(),2);
assert.equal(await page.locator('#store-insights').getByText('Not enough comparable data',{exact:true}).count(),3);
await page.selectOption('#insights-month','2026-10');assert.match(await page.locator('#store-insights').innerText(),/D 30,000/);
await page.getByRole('button',{name:'Add product',exact:true}).click();
await page.locator('#product-dialog [name=name]').fill('iPhone 14 Pro');await page.getByRole('button',{name:'iPhone 14 Pro',exact:true}).click();
assert.deepEqual(await page.locator('#storage-values option').evaluateAll(ns=>ns.map(n=>n.value)),['128 GB','256 GB','512 GB','1 TB']);
await page.locator('#product-dialog [name=serialNumber]').fill('abc1234567');assert.match(await page.locator('#identifier-duplicate').innerText(),/already used/);
await page.locator('#product-dialog [name=name]').fill('Custom device');assert.equal(await page.locator('#product-dialog [name=name]').inputValue(),'Custom device');
await page.locator('#product-dialog [name=category]').selectOption('iPad');await page.locator('#product-dialog [name=name]').fill('Air');assert.ok((await page.locator('#model-choices').innerText()).includes('iPad Air'));
// Simulate denied camera permission, while loading the real vendored decoder.
await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError');};});
await page.getByRole('button',{name:'Scan IMEI barcode'}).click();await page.getByText(/Camera permission was denied/).waitFor();await page.getByRole('button',{name:'Close scanner'}).click();
// Simulate a successful barcode result and ensure tracks stop and number requires confirmation.
await page.evaluate(()=>{window.stopped=0;navigator.mediaDevices.getUserMedia=async()=>({getTracks:()=>[{stop:()=>window.stopped++}]});window.ZXingBrowser={BrowserMultiFormatReader:class{async decodeFromStream(s,v,cb){const controls={stop(){}};queueMicrotask(()=>cb({getText:()=> '490154203237518'},null,controls));return controls;}}};});
await page.getByRole('button',{name:'Scan IMEI barcode'}).click();await page.getByRole('button',{name:'Use this number'}).waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#use-scan').disabled);
assert.equal(await page.locator('#product-dialog [name=imei]').inputValue(),'');await page.getByRole('button',{name:'Use this number'}).click();assert.equal(await page.locator('#product-dialog [name=imei]').inputValue(),'490154203237518');assert.ok(await page.evaluate(()=>window.stopped>0));
await page.getByRole('button',{name:'Close product form'}).click();
await page.screenshot({path:'test-results/dashboard-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.screenshot({path:'test-results/dashboard-mobile.png',fullPage:true});
await page.getByRole('button',{name:'Add product',exact:true}).click();assert.ok(await page.evaluate(()=>document.querySelector('#product-dialog').scrollWidth<=document.querySelector('#product-dialog').clientWidth));
await page.screenshot({path:'test-results/product-mobile.png',fullPage:true});await page.getByRole('button',{name:'Close product form'}).click();
await page.evaluate(()=>{window.testApp.state.member={role:'staff'};window.testApp.draw();});assert.equal(await page.locator('#store-insights').isVisible(),false);assert.equal(await page.locator('#store-insights').innerText(),'');
assert.deepEqual(errors,[]);console.log('PASS: desktop/mobile layouts; charts and month filter; model/storage suggestions; duplicate warning; editable models; denied/successful camera flow; stop tracks; explicit scan confirmation; owner-only charts.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
