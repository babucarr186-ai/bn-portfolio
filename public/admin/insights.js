// Pure calculations: no database writes, no imported tracker rows, no inferred sale dates.
export const cash = n => 'D ' + new Intl.NumberFormat('en-GB', {maximumFractionDigits:2}).format(n);
const cents = n => Math.round(n * 100);
const validAmount = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export function validDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
}
export function monthKeys(end, count=6) {
  const [y,m]=end.split('-').map(Number);
  return Array.from({length:count},(_,i)=>new Date(Date.UTC(y,m-count+i,1)).toISOString().slice(0,7));
}
export function change(current, previous, eligible) {
  if (!eligible || !Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return (current-previous)/previous*100;
}
export function calculateInsights(state, end, today) {
  const months=monthKeys(end).map(key=>({key,sales:0,revenue:0,profit:0,costMissing:0,expenses:0,expenseCount:0}));
  const byMonth=new Map(months.map(m=>[m.key,m]));
  const products=new Map(state.products.map(p=>[p.id,p]));
  const categories=new Map();let invalidSales=0, invalidExpenses=0, collected=0, balance=0;
  for(const s of state.sales){
    if(validAmount(s.totalGmd)&&validAmount(s.paidGmd)){collected+=cents(s.paidGmd);balance+=Math.max(0,cents(s.totalGmd)-cents(s.paidGmd));}
    if(!validDate(s.date)||s.date>today||!validAmount(s.totalGmd)||!Number.isInteger(s.quantity)||s.quantity<=0){invalidSales++;continue;}
    const m=byMonth.get(s.date.slice(0,7));if(!m)continue;
    m.sales++;m.revenue+=cents(s.totalGmd);
    if(validAmount(s.unitCostGmd))m.profit+=cents(s.totalGmd)-cents(s.unitCostGmd)*s.quantity;
    else m.costMissing++;
    if(m.key===end){const category=products.get(s.productId)?.category||'Uncategorised';categories.set(category,(categories.get(category)||0)+s.quantity);}
  }
  for(const e of state.expenses){
    if(!validDate(e.date)||e.date>today||!validAmount(e.amountGmd)){invalidExpenses++;continue;}
    const m=byMonth.get(e.date.slice(0,7));if(m){m.expenses+=cents(e.amountGmd);m.expenseCount++;}
  }
  for(const m of months){m.revenue/=100;m.profit=m.costMissing?null:m.profit/100;m.expenses/=100;}
  const age=[{label:'0–30 days',value:0},{label:'31–60 days',value:0},{label:'61–90 days',value:0},{label:'90+ days',value:0},{label:'Date needs checking',value:0}];
  for(const p of state.products){if(!Number.isInteger(p.stockQty)||p.stockQty<=0)continue;
    const days=validDate(p.receivedOn)?Math.floor((Date.parse(today)-Date.parse(p.receivedOn))/86400000):NaN;
    const index=!Number.isFinite(days)||days<0?4:days<=30?0:days<=60?1:days<=90?2:3;age[index].value+=p.stockQty;
  }
  return {months,categories:[...categories].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value),age,collected:collected/100,balance:balance/100,invalidSales,invalidExpenses};
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const monthLabel=s=>new Date(s+'-01T00:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'});
function delta(n, reverse=false){if(n===null)return '<small class="trend neutral">Not enough comparable data</small>';const good=reverse?n<0:n>0;return '<small class="trend '+(n===0?'neutral':good?'positive':'negative')+'">'+(n>0?'↑ ':n<0?'↓ ':'→ ')+Math.abs(n).toFixed(1)+'% vs previous month</small>';}
function metric(label,value,note,trend=''){return '<article class="metric depth-card"><span class="label">'+esc(label)+'</span><strong>'+esc(value)+'</strong>'+trend+'<small>'+esc(note)+'</small></article>';}
function bars(rows,colour='purple'){
  const max=Math.max(1,...rows.map(r=>r.value));
  return rows.map(r=>'<div class="bar-row"><div><span>'+esc(r.label)+'</span><strong>'+r.value+' units</strong></div><div class="bar-track"><span class="'+colour+'" style="width:'+r.value/max*100+'%"></span></div></div>').join('');
}
function plot(months,series,title){
  const vals=months.flatMap(m=>series.map(s=>m[s.key])).filter(Number.isFinite);
  const min=Math.min(0,...vals),max=Math.max(1,...vals),span=max-min;
  const x=i=>62+i*91, y=v=>190-(v-min)/span*150;
  const ticks=[min,min+span/2,max];
  let svg='<svg class="trend-chart" viewBox="0 0 560 230" role="img" aria-label="'+esc(title)+'; exact values are in the table below"><title>'+esc(title)+'</title>';
  for(const v of ticks)svg+='<line x1="62" x2="530" y1="'+y(v)+'" y2="'+y(v)+'" class="chart-grid"/><text x="54" y="'+(y(v)+4)+'" text-anchor="end">'+esc(new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(v))+'</text>';
  months.forEach((m,i)=>{svg+='<text x="'+x(i)+'" y="218" text-anchor="middle">'+esc(monthLabel(m.key))+'</text>';});
  for(const s of series){let previous=null;months.forEach((m,i)=>{const present=s.key==='expenses'?m.expenseCount>0:m.sales>0;const v=present?m[s.key]:null;if(v===null){previous=null;return;}if(previous)svg+='<line x1="'+previous.x+'" y1="'+previous.y+'" x2="'+x(i)+'" y2="'+y(v)+'" stroke="'+s.colour+'" stroke-width="3"/>';svg+='<circle cx="'+x(i)+'" cy="'+y(v)+'" r="5" fill="'+s.colour+'"><title>'+esc(monthLabel(m.key)+': '+s.label+' '+cash(v))+'</title></circle>';previous={x:x(i),y:y(v)};});}
  svg+='</svg><div class="chart-legend">'+series.map(s=>'<span><i style="background:'+s.colour+'"></i>'+esc(s.label)+'</span>').join('')+'</div>';
  svg+='<details class="chart-data"><summary>View exact figures</summary><div class="table-wrap"><table><thead><tr><th>Month</th>'+series.map(s=>'<th>'+esc(s.label)+'</th>').join('')+'</tr></thead><tbody>'+months.map(m=>'<tr><td>'+esc(monthLabel(m.key))+'</td>'+series.map(s=>'<td>'+((s.key==='expenses'?m.expenseCount:m.sales)===0?'No records':m[s.key]===null?'Cost missing':esc(cash(m[s.key])))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>';
  return svg;
}
export function renderInsights(root,state,today){
  if(state.member?.role!=='owner'){root.replaceChildren();root.hidden=true;return;}
  root.hidden=false;
  const current=today.slice(0,7);const selected=root.querySelector('#insights-month')?.value||current;
  const result=calculateInsights(state,selected,today);const last=result.months.at(-1),previous=result.months.at(-2);
  const complete=selected<current && last.sales>0 && previous.sales>0;
  const metricDate=monthLabel(selected)+(selected===current?' · month in progress':'');
  root.innerHTML='<div class="section-heading insights-heading"><div><p class="eyebrow">Your business at a glance</p><h2>Store performance</h2></div><label>Month<select id="insights-month">'+monthKeys(current,12).reverse().map(m=>'<option value="'+m+'" '+(m===selected?'selected':'')+'>'+esc(monthLabel(m))+'</option>').join('')+'</select></label></div>'+ 
    '<div class="metrics insight-metrics">'+metric('Sales',last.sales?cash(last.revenue):'—',metricDate,delta(change(last.revenue,previous.revenue,complete)))+metric('Gross profit',last.sales&&last.profit!==null?cash(last.profit):'—',last.costMissing?'Missing buying costs':metricDate,delta(change(last.profit,previous.profit,complete)))+metric('Cash collected',cash(result.collected),'All dashboard sales · includes later payments')+metric('Unpaid balances',cash(result.balance),'Current balance · all dashboard sales')+'</div>'+
    '<p class="fine chart-source">Dashboard records only. Tracker 2 &amp; 3 history stays separate in Reports. Gaps mean no records, not confirmed zero sales. Comparisons need two completed months with records.</p>'+
    '<div class="insights-grid"><section class="panel depth-card"><h3>Sales &amp; gross profit</h3><p class="fine">Six months · GMD · profit before expenses</p>'+plot(result.months,[{key:'revenue',label:'Sales',colour:'#ba91ff'},{key:'profit',label:'Gross profit',colour:'#65d6bd'}],'Monthly sales and gross profit')+'</section>'+
    '<section class="panel depth-card"><h3>Best-selling categories</h3><p class="fine">'+esc(metricDate)+' · units sold</p>'+(result.categories.length?bars(result.categories):'<p class="chart-empty">No sales recorded for this month.</p>')+'</section>'+
    '<section class="panel depth-card"><h3>Recorded expenses</h3><p class="fine">Six months · GMD · full amounts on their entered dates</p>'+delta(change(last.expenses,previous.expenses,selected<current&&last.expenseCount>0&&previous.expenseCount>0),true)+plot(result.months,[{key:'expenses',label:'Expenses',colour:'#f3b77d'}],'Monthly recorded expenses')+'</section>'+
    '<section class="panel depth-card"><h3>How long stock has been waiting</h3><p class="fine">Stock on hand today · units by received date</p>'+bars(result.age,'amber')+'</section></div>'+
    (result.invalidSales||result.invalidExpenses?'<p class="notice">Some records have missing, invalid or future dates/amounts and are excluded from the monthly charts: '+result.invalidSales+' sales, '+result.invalidExpenses+' expenses.</p>':'');
  root.querySelector('#insights-month').addEventListener('change',()=>renderInsights(root,state,today));
}
