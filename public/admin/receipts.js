const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash = v => 'GMD '+Number(v).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
// Whitelist receipt fields: never spread a private sales/product object into printable HTML.
export function receiptHtml(s) {
  if(!s || !Number.isFinite(s.totalGmd) || !Number.isFinite(s.paidGmd))throw new Error('This sale needs valid payment amounts before a receipt can be printed.');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Uncle Apple Store receipt</title><style>body{font:15px system-ui;color:#17141e;max-width:680px;margin:40px auto;padding:20px}header{border-bottom:2px solid #7755a2;padding-bottom:20px}h1{font-size:25px}dl{display:grid;grid-template-columns:1fr 1fr;gap:12px}dt{color:#555}dd{margin:0;text-align:right;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin:30px 0}th,td{text-align:left;padding:12px 4px;border-bottom:1px solid #ddd}footer{border-top:1px solid #ddd;margin-top:30px;padding-top:20px;font-size:12px}button{padding:12px 20px;background:#30203f;color:white;border:0;border-radius:8px}@media print{button{display:none}body{margin:0;max-width:none}}</style></head><body><header><h1>Uncle Apple Store</h1><p>Sales receipt · '+esc(s.paidGmd>=s.totalGmd?'Paid in full':'Partial payment')+'</p></header><dl><dt>Receipt reference</dt><dd>'+esc(s.id)+'</dd><dt>Sale date</dt><dd>'+esc(s.date)+'</dd><dt>Customer</dt><dd>'+esc(s.customer||'Walk-in customer')+'</dd><dt>Initial payment method</dt><dd>'+esc(s.method||'Not recorded')+'</dd></dl><table><thead><tr><th>Product</th><th>Quantity</th><th>Total GMD</th></tr></thead><tbody><tr><td>'+esc(s.productName)+'<br><small>'+esc(s.sku)+'</small></td><td>'+esc(s.quantity)+'</td><td>'+cash(s.totalGmd)+'</td></tr></tbody></table><dl><dt>Sale total</dt><dd>'+cash(s.totalGmd)+'</dd><dt>Total collected to date</dt><dd>'+cash(s.paidGmd)+'</dd><dt>Outstanding</dt><dd>'+cash(Math.max(0,s.totalGmd-s.paidGmd))+'</dd></dl><footer>Thank you for shopping with Uncle Apple Store. This receipt shows the current recorded balance; it is not an itemized payment history.</footer><p><button id="print-receipt" type="button">Print / save PDF</button></p></body></html>';
}
export function openReceipt(s) {
  const html=receiptHtml(s),win=window.open('about:blank','_blank');
  if(!win)throw new Error('Allow pop-ups to open the printable receipt.');
  win.opener=null;
  win.document.open();win.document.write(html);win.document.close();
  win.document.querySelector('#print-receipt').addEventListener('click',()=>win.print());
}
