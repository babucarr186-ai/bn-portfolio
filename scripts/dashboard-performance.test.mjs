import test from 'node:test';
import assert from 'node:assert/strict';
import {periodRange,summarize} from '../public/admin/performance.js';
import {receiptHtml} from '../public/admin/receipts.js';
const state=()=>({products:[],sales:[],expenses:[],losses:[]});
test('Default six completed months and preceding six are calendar aligned',()=>{
 assert.deepEqual(periodRange('6','2026-11-16'),{from:'2026-05-01',to:'2026-10-31',previousFrom:'2025-11-01',previousTo:'2026-04-30'});
 assert.equal(periodRange('6','2026-01-01').from,'2025-07-01');
});
test('Week starts Monday; month-to-date clamps short comparison months',()=>{
 assert.equal(periodRange('week','2026-11-16').from,'2026-11-16');
 assert.equal(periodRange('week','2026-11-22').from,'2026-11-16');
 assert.equal(periodRange('month','2024-03-31').previousTo,'2024-02-29');
 assert.equal(periodRange('today','2026-11-16').previousFrom,'2026-11-15');
});
test('Custom range is inclusive; rejects impossible/future/reversed dates',()=>{
 const r=periodRange('custom','2026-11-16','2026-10-01','2026-10-03');assert.equal(r.previousFrom,'2026-09-28');assert.equal(r.previousTo,'2026-09-30');
 for(const [from,to] of [['2026-02-30','2026-03-01'],['2026-11-17','2026-11-18'],['2026-10-02','2026-10-01']])assert.throws(()=>periodRange('custom','2026-11-16',from,to));
});
test('Actual sale costs, cents, boundaries, units, expenses and losses',()=>{
 const s=state();s.products=[{id:'p',category:'iPhone',unitCostGmd:999}];s.sales=[{productId:'p',productName:'iPhone',date:'2026-10-01',quantity:2,totalGmd:100.30,unitCostGmd:30.10},{date:'2026-11-01',quantity:1,totalGmd:999,unitCostGmd:0}];s.expenses=[{date:'2026-10-03',amountGmd:0.1},{date:'2026-10-03',amountGmd:0.2}];s.losses=[{date:'2026-10-05',costGmd:10}];
 const r=summarize(s,'2026-10-01','2026-10-31');assert.equal(r.revenue,100.3);assert.equal(r.profit,40.1);assert.equal(r.expenses,.3);assert.equal(r.net,29.8);assert.equal(r.units,2);assert.deepEqual(r.categories,[['iPhone',2]]);assert.equal(r.margin,40.1/100.3*100);
});
test('Missing costs suppress profit; no-record buckets stay identifiable; invalid records excluded',()=>{
 const s=state();s.sales=[{date:'2026-10-01',quantity:1,totalGmd:10},{date:'2026-02-30',quantity:1,totalGmd:100}];const r=summarize(s,'2026-09-01','2026-10-31');assert.equal(r.profit,null);assert.equal(r.margin,null);assert.equal(r.net,null);assert.equal(r.buckets[0].count,0);assert.equal(r.buckets[1].profit,null);assert.equal(r.invalid,1);
});
test('Receipt escapes customer text and excludes purchase costs and private notes',()=>{
 const html=receiptHtml({id:'sale-1',customer:'<img src=x onerror=alert(1)>',productName:'iPhone',quantity:1,sku:'p',totalGmd:100,paidGmd:40,unitCostGmd:123456,notes:'SECRET'});assert.ok(!html.includes('<img'));assert.ok(!html.includes('123456'));assert.ok(!html.includes('SECRET'));assert.ok(html.includes('GMD 60.00'));assert.ok(html.includes('Partial payment'));assert.throws(()=>receiptHtml({totalGmd:NaN}));
});
