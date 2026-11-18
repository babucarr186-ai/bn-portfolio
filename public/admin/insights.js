import { renderPerformance } from './performance.js';
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
export const renderInsights = renderPerformance;
