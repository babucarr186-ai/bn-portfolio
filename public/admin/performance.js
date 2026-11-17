// Read-only reporting over records already loaded by the dashboard. No extra Firestore reads.
const day = 86400000;
const date = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s || '') && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
const iso = t => new Date(t).toISOString().slice(0,10);
const monthStart = (s, offset=0) => {const [y,m]=s.split('-').map(Number);return iso(Date.UTC(y,m-1+offset,1));};
const money = n => 'GMD ' + new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(n);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const cents = n => Math.round(n*100);
export function periodRange(preset, today, start, end) {
  if(!date(today))throw new Error('Invalid reporting date.');
  let from, to=today, previousFrom, previousTo;
  if(['3','6','12'].includes(preset)) {
    from=monthStart(today,-Number(preset));to=iso(Date.parse(monthStart(today))-day);
    previousFrom=monthStart(from,-Number(preset));previousTo=iso(Date.parse(from)-day);
  } else {
    if(preset==='today')from=today;
    else if(preset==='week')from=iso(Date.parse(today)-((new Date(today).getUTCDay()+6)%7)*day);
    else if(preset==='month')from=monthStart(today);
    else if(preset==='custom' && date(start) && date(end) && start<=end && end<=today){from=start;to=end;}
    else throw new Error('Choose a valid date range ending today or earlier.');
    if(preset==='month') {
      previousFrom=monthStart(today,-1);
      const last=iso(Date.parse(monthStart(today))-day);
      previousTo=iso(Math.min(Date.parse(previousFrom)+(Number(today.slice(8))-1)*day,Date.parse(last)));
    } else {const length=Date.parse(to)-Date.parse(from)+day;previousTo=iso(Date.parse(from)-day);previousFrom=iso(Date.parse(from)-length);}
  }
  if((Date.parse(to)-Date.parse(from))/day>3660)throw new Error('Select ten years or less.');
  return {from,to,previousFrom,previousTo};
}
export function summarize(state, from, to) {
  const products=new Map(state.products.map(p=>[p.id,p]));
  let revenue=0, profit=0, units=0, count=0, missing=0, expenses=0, losses=0, invalid=0, missingLossCost=0;
  const categories=new Map(), top=new Map(), buckets=new Map();
  const daily=Date.parse(to)-Date.parse(from)<35*day;
  for(let t=Date.parse(from);t<=Date.parse(to);t+=day){const key=daily?iso(t):iso(t).slice(0,7);if(!buckets.has(key))buckets.set(key,{key,revenue:0,profit:0,units:0,count:0,missing:0});}
  for(const s of state.sales){
    if(!date(s.date)||!valid(s.totalGmd)||!Number.isSafeInteger(s.quantity)||s.quantity<1){invalid++;continue;}
    if(s.date<from||s.date>to)continue;
    const b=buckets.get(daily?s.date:s.date.slice(0,7)), value=cents(s.totalGmd);
    revenue+=value;units+=s.quantity;count++;b.revenue+=value;b.units+=s.quantity;b.count++;
    if(valid(s.unitCostGmd)){const v=value-cents(s.unitCostGmd)*s.quantity;profit+=v;b.profit+=v;}else{missing++;b.missing++;}
    const category=products.get(s.productId)?.category||'Uncategorised';categories.set(category,(categories.get(category)||0)+s.quantity);
    const name=s.productName||'Unnamed product';top.set(name,(top.get(name)||0)+s.quantity);
  }
  for(const e of state.expenses){if(!date(e.date)||!valid(e.amountGmd)){invalid++;continue;}if(e.date>=from&&e.date<=to)expenses+=cents(e.amountGmd);}
  for(const l of state.losses||[]){if(!date(l.date)){invalid++;continue;}if(l.date<from||l.date>to)continue;if(valid(l.costGmd))losses+=cents(l.costGmd);else missingLossCost++;}
  return {revenue:revenue/100,profit:missing?null:profit/100,margin:missing||!revenue?null:profit/revenue*100,units,count,missing,expenses:expenses/100,losses:losses/100,net:missing||missingLossCost?null:(profit-expenses-losses)/100,invalid,missingLossCost,
    categories:[...categories],top:[...top].sort((a,b)=>b[1]-a[1]).slice(0,5),buckets:[...buckets.values()].map(b=>({...b,revenue:b.revenue/100,profit:b.missing?null:b.profit/100}))};
}
function growth(n,p,eligible){return eligible && p>0 && n!==null && p!==null ? '<small class="trend '+(n>=p?'positive':'negative')+'">'+(n>=p?'↗ ':'↘ ')+((n-p)/p*100).toFixed(1)+'% vs preceding period</small>':'<small class="trend neutral">Comparison unavailable</small>';}
function card(label,value,note,trend=''){return '<article class="metric depth-card"><span class="label">'+esc(label)+'</span><strong>'+esc(value)+'</strong>'+trend+'<small>'+esc(note)+'</small></article>';}
function bars(rows){const max=Math.max(1,...rows.map(r=>r[1]));return rows.length?rows.map(([name,n])=>'<div class="bar-row"><div><span>'+esc(name)+'</span><strong>'+n+' units</strong></div><div class="bar-track"><span class="purple" style="width:'+n/max*100+'%"></span></div></div>').join(''):'<p class="chart-empty">No records in this period.</p>';}
function chart(rows,unit=false){
  const keys=unit?[['units','Units sold','#bba0ff']]:[['revenue','Revenue','#bba0ff'],['profit','Gross profit','#6de0bc']];
  const values=rows.flatMap(r=>keys.map(k=>r[k[0]])).filter(Number.isFinite),min=Math.min(0,...values),max=Math.max(1,...values),span=max-min;
  const x=i=>65+i*620/Math.max(1,rows.length-1), y=v=>210-(v-min)/span*170;
  let html='<svg class="trend-chart" viewBox="0 0 730 250" role="img" aria-label="'+(unit?'Units sold':'Revenue and gross profit')+'; expand exact figures for values"><title>Recorded performance over selected period</title>';
  for(const v of [min,min+span/2,max])html+='<line class="chart-grid" x1="65" x2="685" y1="'+y(v)+'" y2="'+y(v)+'"/><text x="55" y="'+(y(v)+4)+'" text-anchor="end">'+esc(new Intl.NumberFormat('en',{notation:'compact'}).format(v))+'</text>';
  rows.forEach((r,i)=>{if(i===0||i===rows.length-1||i%Math.ceil(rows.length/6)===0)html+='<text x="'+x(i)+'" y="240" text-anchor="middle">'+esc(r.key)+'</text>';});
  for(const [key,label,color] of keys){let prev=null;rows.forEach((r,i)=>{const v=r.count?r[key]:null;if(v===null){prev=null;return;}if(prev)html+='<line x1="'+prev[0]+'" y1="'+prev[1]+'" x2="'+x(i)+'" y2="'+y(v)+'" stroke="'+color+'" stroke-width="3"/>';html+='<circle cx="'+x(i)+'" cy="'+y(v)+'" r="4" fill="'+color+'"><title>'+esc(r.key+' · '+label+': '+(unit?v:money(v)))+'</title></circle>';prev=[x(i),y(v)];});}
  return html+'</svg><div class="chart-legend">'+keys.map(k=>'<span><i style="background:'+k[2]+'"></i>'+k[1]+'</span>').join('')+'</div>';
}
export function renderPerformance(root,state,today){
  if(state.member?.role!=='owner'){root.replaceChildren();root.hidden=true;return;}
  const preset=root.querySelector('#period-preset')?.value||'6',start=root.querySelector('#period-from')?.value,end=root.querySelector('#period-to')?.value;
  let range;try{range=periodRange(preset,today,start,end);}catch(e){root.querySelector('#period-error').textContent=e.message;return;}
  const r=summarize(state,range.from,range.to),p=summarize(state,range.previousFrom,range.previousTo),eligible=r.count>0&&p.count>0;
  const stock=state.products.filter(p=>p.stockQty>0);let investment=0,unknownCost=0,balance=0;
  for(const p of stock){if(valid(p.unitCostGmd))investment+=cents(p.unitCostGmd)*p.stockQty;else unknownCost++;}
  for(const s of state.sales)if(valid(s.totalGmd)&&valid(s.paidGmd))balance+=Math.max(0,cents(s.totalGmd)-cents(s.paidGmd));
  const ages=[['0–30 days',0],['31–60 days',0],['61–90 days',0],['90+ days',0],['Date unknown',0]];
  for(const p of stock){const age=date(p.receivedOn)?(Date.parse(today)-Date.parse(p.receivedOn))/day:-1;ages[age<0?4:age<=30?0:age<=60?1:age<=90?2:3][1]+=p.stockQty;}
  root.hidden=false;
  root.innerHTML='<div class="section-heading insights-heading"><div><p class="eyebrow">Business intelligence · GMD</p><h2>Store performance</h2></div><label>Reporting period<select id="period-preset">'+[['today','Today'],['week','This week'],['month','This month'],['3','Last 3 completed months'],['6','Last 6 completed months'],['12','Last 12 completed months'],['custom','Custom date range']].map(([v,t])=>'<option value="'+v+'" '+(v===preset?'selected':'')+'>'+t+'</option>').join('')+'</select></label></div><div class="period-custom" '+(preset==='custom'?'':'hidden')+'><label>From<input type="date" id="period-from" value="'+range.from+'" max="'+today+'"></label><label>To<input type="date" id="period-to" value="'+range.to+'" max="'+today+'"></label></div><p id="period-error" class="danger-text" role="alert"></p><p class="fine period-caption">'+range.from+' — '+range.to+' · Compared with '+range.previousFrom+' — '+range.previousTo+'</p>'+
  '<div class="metrics insight-metrics">'+card('Total Sales',r.count?money(r.revenue):'—','Recorded revenue',growth(r.revenue,p.revenue,eligible))+card('Units Sold',r.count?r.units:'—','Devices & accessories',growth(r.units,p.units,eligible))+card('Gross Profit',r.count&&r.profit!==null?money(r.profit):'—',r.missing?r.missing+' sales missing buying costs':'Before expenses',growth(r.profit,p.profit,eligible))+card('Gross Profit Margin',r.margin===null||!r.count?'—':r.margin.toFixed(1)+'%','Gross profit ÷ revenue × 100')+'</div>'+
  '<p class="fine chart-source">Actual dashboard records only. Missing periods are gaps, not verified zero activity. Tracker history is separate; completeness has not been verified. Comparisons use recorded totals and require records in both periods and a positive baseline. Current periods are in progress.</p>'+
  '<div class="insights-grid"><section class="panel depth-card chart-wide"><h3>Revenue &amp; profit</h3><p class="fine">'+(r.buckets[0]?.key.length===10?'Daily':'Monthly')+' trend · GMD</p>'+chart(r.buckets)+'<details class="chart-data"><summary>View exact figures</summary><div class="table-wrap"><table><thead><tr><th>Period</th><th>Revenue GMD</th><th>Profit GMD</th><th>Units</th></tr></thead><tbody>'+r.buckets.map(b=>'<tr><td>'+b.key+'</td><td>'+(b.count?money(b.revenue):'No records')+'</td><td>'+(b.count?(b.profit===null?'Cost missing':money(b.profit)):'No records')+'</td><td>'+(b.count?b.units:'—')+'</td></tr>').join('')+'</tbody></table></div></details></section><section class="panel depth-card"><h3>Category performance</h3>'+bars(r.categories)+'</section><section class="panel depth-card"><h3>Units sold</h3>'+chart(r.buckets,true)+'</section><section class="panel depth-card"><h3>Top-selling products</h3>'+bars(r.top)+'</section><section class="panel depth-card"><h3>Stock aging · current inventory</h3>'+bars(ages)+'</section><section class="panel depth-card financial-position"><h3>Financial position</h3>'+card('Operating expenses',money(r.expenses),'Selected period')+card('Estimated operating result',r.net===null||!r.count?'—':money(r.net),'Gross profit − recorded expenses − recorded stock losses')+card('Inventory investment',unknownCost?'Incomplete':money(investment/100),'Current stock at recorded purchase cost')+card('Outstanding customer payments',money(balance/100),'All-time current unpaid balances')+'</section></div>'+
  '<details class="panel formulas"><summary>How these figures are calculated</summary><p>Revenue = sum of sale totals on their sale dates. Units = sum of sale quantities. Gross profit = revenue minus captured unit buying cost × quantity; any missing cost makes profit unknown. Margin = gross profit ÷ revenue × 100. Expenses and losses use their recorded dates. Estimated result excludes taxes, unrecorded expenses and unrecorded losses. Inventory investment = current quantity × purchase cost. Balances = sum of max(sale total − paid, 0); this is not monthly cash flow. Categories use current product classifications. Weeks start Monday. Month-to-date compares with the same elapsed dates of the prior month; completed month filters compare with the preceding calendar months.</p></details>'+
  (r.invalid||r.missingLossCost?'<p class="notice">Data quality: '+r.invalid+' invalid sale/expense/loss records excluded; '+r.missingLossCost+' losses in this period have unknown costs. No estimates were substituted.</p>':'');
  root.querySelector('#period-preset').addEventListener('change',()=>renderPerformance(root,state,today));
  for(const id of ['#period-from','#period-to'])root.querySelector(id).addEventListener('change',()=>renderPerformance(root,state,today));
}
