import { renderInsights } from './insights.js';
import { initProductAssist } from './product-assist.js';
import { recordedCost, staffCatalogRecord, withStaffCosts, recordStaffPayment } from './staff-data.js';
// Private Uncle Apple Store operations. All protected data lives in Firestore, never in this bundle.
// Firebase web configuration contains public identifiers, not passwords. Security is enforced by Firestore rules.
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import {
  getFirestore, collection, doc, getDocFromServer, getDocs, runTransaction,
  addDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const $ = (selector) => document.querySelector(selector);
const money = (value) => 'D ' + new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(Number(value) || 0);
const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Banjul' });
const daysOld = (date) => Math.floor((Date.now() - new Date(String(date) + 'T12:00:00Z').getTime()) / 86400000);
const state = { trackerRecords: [], products: [], drafts: [], sales: [], losses: [], expenses: [], member: null, user: null, db: null, auth: null };
let noticeTimer;
let productAssist;
let activeView = 'overview';
let editor = {};
let selectedProduct;
let authCheck = 0;

function notice(message, error = false) {
  const element = $('#feedback');
  element.textContent = message;
  element.className = error ? 'error' : '';
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { element.textContent = ''; }, 6000);
}

function formValue(form, name) {
  return String(form.elements.namedItem(name)?.value ?? '').trim();
}
function amount(form, field, { positive = false, integer = false } = {}) {
  const raw = formValue(form, field);
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value < 0 || value > 1000000000 ||
      (positive && value <= 0) || (integer && !Number.isSafeInteger(value))) {
    throw new Error('Check ' + field + '. Enter a valid ' + (integer ? 'whole number' : 'amount') + '.');
  }
  return value;
}
function rowText(text, fallback = '—') { return text ? escapeHtml(text) : fallback; }
function emptyRow(cols, message = 'No records yet.') {
  return '<tr><td colspan="' + cols + '" class="empty">' + escapeHtml(message) + '</td></tr>';
}
function byLatest(a, b) { return String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')); }
function remaining(sale) { return Math.max(0, (Number(sale.totalGmd) || 0) - (Number(sale.paidGmd) || 0)); }
function productLabel(product) {
  return product.name + ' · ' + product.sku + ' · ' + product.stockQty + ' remaining';
}
function options(select, records, getText, placeholder) {
  const old = select.value;
  select.replaceChildren(new Option(placeholder, ''));
  records.forEach((item) => select.add(new Option(getText(item), item.id)));
  if (records.some((item) => item.id === old)) select.value = old;
}
function detailRow(name, info, value) {
  return '<div class="record"><div><strong>' + escapeHtml(name) + '</strong><span>' + escapeHtml(info) +
    '</span></div><b>' + escapeHtml(value) + '</b></div>';
}

function metricCards(metrics, highlight = -1) {
  return metrics.map(([label, value, help], index) =>
    '<article class="metric' + (index === highlight ? ' highlight' : '') + '"><span class="label">' +
    escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong><small>' + escapeHtml(help) + '</small></article>'
  ).join('');
}

function drawTrackerPerformance() {
  const sold = state.trackerRecords.filter((record) => record.status === 'sold');
  const priced = sold.filter((record) => Number.isFinite(record.saleGmd));
  const costed = priced.filter((record) => Number.isFinite(record.costGmd) && record.costEur !== 1);
  const salesValue = priced.reduce((sum, record) => sum + Math.round(record.saleGmd * 100), 0) / 100;
  const grossProfit = costed.reduce((sum, record) =>
    sum + Math.round(record.saleGmd * 100) - Math.round(record.costGmd * 100), 0) / 100;
  $('#tracker-metrics').innerHTML = metricCards([
    ['Marked sold', String(sold.length), 'Devices marked sold in the sheets'],
    ['Recorded sale value', priced.length ? money(salesValue) : '—', priced.length + ' sales with a recorded price'],
    ['Estimated gross profit', costed.length ? money(grossProfit) : '—', costed.length + ' sales with a usable price and cost']
  ]);
  const excluded = sold.length - costed.length;
  const note = ['Historical amounts come from the sheets. Gross profit is before expenses.'];
  if (excluded) note.push(excluded + ' sold ' + (excluded === 1 ? 'record needs' : 'records need') + ' a price or buying cost check before profit can be calculated.');
  $('#tracker-performance-note').textContent = note.join(' ');
  $('#tracker-performance').hidden = state.member?.role !== 'owner' || sold.length === 0;
}

function drawTracker() {
  const search = $('#tracker-search').value.toLowerCase().trim();
  const filter = $('#tracker-filter').value;
  const stocked = new Set(state.products.map((item) => item.sku));
  const records = state.trackerRecords.filter(r => (!search || [r.name,r.sourceSheet,r.notes,r.colour,r.storage,r.id].join(' ').toLowerCase().includes(search)) && (filter === 'all' || r.status === filter) && (filter !== 'review' || !stocked.has(r.id)));
  $('#tracker-summary').textContent = state.trackerRecords.length + ' imported records · ' +
    state.trackerRecords.filter((record) => record.status === 'sold').length + ' marked sold · ' +
    state.trackerRecords.filter((record) => record.status === 'review' && !stocked.has(record.id)).length +
    ' need stock confirmation.';
  const value = (amount) => typeof amount === 'number' ? money(amount) : 'Not recorded';
  const statusLabels = { sold: 'Marked sold', review: 'Needs stock review', transit: 'Not delivered', refunded: 'Refunded' };
  $('#tracker-rows').innerHTML = records.length ? records.map((record) => {
    const imported = stocked.has(record.id);
    const reviewAction = record.status !== 'review' ? '' : imported ? '<small>Added to inventory</small>'
      : '<button type="button" class="subtle" data-review="' + escapeHtml(record.id) + '">Review stock</button>';
    const details = [record.storage, record.colour, record.battery].filter(Boolean).join(' · ');
    return '<tr><td><strong>' + escapeHtml(record.name) + '</strong><small>' +
      escapeHtml(record.sourceSheet + ' · row ' + record.sourceRow) + '</small></td><td>' + rowText(details) +
      '</td><td><span class="badge plain">' + rowText(statusLabels[record.status] || record.status) +
      '</span></td><td data-label="Buying cost">' + value(record.costGmd) +
      '</td><td data-label="Recorded sale">' + value(record.saleGmd) +
      '</td><td>' + (record.notes ? '<small>' + escapeHtml(record.notes) + '</small>' : '') + reviewAction + '</td></tr>';
  }).join('') : emptyRow(6);

}

function drawOverview() {
  const revenue = state.sales.reduce((acc, item) => acc + Number(item.totalGmd || 0), 0);
  const collected = state.sales.reduce((acc, item) => acc + Number(item.paidGmd || 0), 0);
  const costsKnown = state.sales.every((sale) => recordedCost(sale) !== null);
  const soldCost = state.sales.reduce((acc, item) => acc + (recordedCost(item) ?? 0) * Number(item.quantity || 0), 0);
  const writeOff = state.losses.reduce((acc, item) => acc + Number(item.costGmd || 0), 0);
  const expenses = state.expenses.reduce((acc, item) => acc + Number(item.amountGmd || 0), 0);
  const stockValue = state.products.reduce((acc, item) => acc + Number(item.stockQty || 0) * Number(item.unitCostGmd || 0), 0);
  const inStock = state.products.filter((product) => product.stockQty > 0);
  const kpis = [
    ['Sales revenue', money(revenue), state.sales.length + ' recorded transactions'],
    ['Cash collected', money(collected), 'Includes later instalment payments'],
    ['Customer balances', money(revenue - collected), 'Sold but not yet collected'],
    ['Inventory at cost', money(stockValue), inStock.length + ' active product lines'],
    ['Gross profit', costsKnown ? money(revenue - soldCost) : '—', costsKnown ? 'Revenue minus cost of sold goods' : 'Some sales have no recorded buying cost'],
    ['Recorded losses', money(writeOff), state.losses.length + ' write-offs'],
    ['Operating expenses', money(expenses), 'Only costs entered here'],
    ['Estimated result', costsKnown ? money(revenue - soldCost - writeOff - expenses) : '—', costsKnown ? 'Gross profit minus entered losses and expenses' : 'Some sales have no recorded buying cost']
  ];
  $('#metrics').innerHTML = metricCards(kpis, 7);
  drawTrackerPerformance();
  renderInsights($('#store-insights'), state, today());
  $('#stock-count').textContent = inStock.reduce((total, product) => total + Number(product.stockQty), 0);
  $('#draft-count').textContent = state.drafts.length;
  const stockToCheck = inStock.filter((product) => product.category === 'iPhone' && !product.serialNumber);
  const aged = inStock.filter((product) => product.receivedOn && daysOld(product.receivedOn) >= 45);
  const low = inStock.filter((product) => product.category === 'Accessories' && product.stockQty === 1);
  const unpaid = state.sales.filter((sale) => remaining(sale) > 0);
  const overdue = unpaid.filter((sale) => sale.dueOn && sale.dueOn < today());
  const importedSkus = new Set(state.products.map((product) => product.sku));
  const toReview = state.trackerRecords.filter((record) => record.status === 'review' && !importedSkus.has(record.id));
  const attention = [
    ['iPhones missing a serial number', stockToCheck.length, 'Open a product to add its serial number.', 'serial'],
    ['Unpaid sales', unpaid.length, money(unpaid.reduce((sum, sale) => sum + remaining(sale), 0)) + ' outstanding' + (overdue.length ? ' · ' + overdue.length + ' overdue' : ''), 'unpaid'],
    ['Older stock', aged.length, 'In stock for at least 45 days.', 'aged'],
    ['Low stock', low.length, 'Accessory lines with one unit left.', 'low'],
    ['Tracker stock to confirm', toReview.length, 'Check which imported items are still in the shop.', 'tracker']
  ].filter(([, count]) => count > 0);
  $('#attention-count').textContent = attention.length;
  $('#alerts').innerHTML = attention.length ? attention.map(([title, count, detail, action]) =>
    '<button type="button" class="alert" data-attention="' + action + '"><div><strong>' + escapeHtml(title) +
    '</strong><small>' + escapeHtml(detail) + '</small></div><span class="alert-number">' + count +
    '<span aria-hidden="true"> ›</span></span></button>').join('') : '<p class="empty">You’re all caught up.</p>';
  $('#recent-sales').innerHTML = state.sales.length
    ? [...state.sales].sort(byLatest).slice(0, 5).map((sale) =>
      detailRow(sale.productName, sale.date + ' · Qty ' + sale.quantity, money(sale.totalGmd))).join('')
    : '<p class="empty">New sales recorded in this dashboard appear here.</p>';
}

const normalizeIdentifier = (value) => String(value ?? '').toUpperCase().replace(/[\s-]+/g, '');
const productOrder = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });
const deviceSpecs = (item) =>
  [item.storage, item.colour, item.batteryHealth == null ? '' : item.batteryHealth + '% battery'].filter(Boolean).join(' · ');
const productStatus = (product) => product.stockQty > 0
  ? ['In stock', 'green']
  : (state.sales.some((sale) => sale.productId === product.id) ? ['Sold out', 'plain'] : ['Out of stock', 'plain']);

function drawInventory() {
  const rawQuery = $('#inventory-search').value.trim();
  const query = rawQuery.toLowerCase();
  const idQuery = normalizeIdentifier(rawQuery);
  const filter = $('#inventory-filter').value;
  const eligible = state.products.filter((item) => {
    if (filter === 'in-stock') return item.stockQty > 0;
    if (filter === 'out') return item.stockQty <= 0;
    if (filter === 'aged') return item.stockQty > 0 && item.receivedOn && daysOld(item.receivedOn) >= 45;
    if (filter === 'serial') return item.stockQty > 0 && item.category === 'iPhone' && !item.serialNumber;
    if (filter === 'low') return item.stockQty === 1 && item.category === 'Accessories';
    return true;
  });
  const exact = query ? eligible.filter((item) => [item.serialNumber, item.imei].some((value) =>
    value && normalizeIdentifier(value) === idQuery)) : [];
  const visible = (exact.length ? exact : eligible.filter((item) => !query ||
    [item.name, item.sku, item.category, item.colour, item.storage].join(' ').toLowerCase().includes(query))).sort(productOrder);
  $('#inventory-summary').textContent = visible.length + (visible.length === 1 ? ' product' : ' products');
  $('#inventory-rows').innerHTML = visible.length ? visible.map((product) => {
    const [status, tone] = productStatus(product);
    const subtitle = deviceSpecs(product) || product.category;
    return '<button class="product-row" type="button" data-product="' + escapeHtml(product.id) +
      '"><span class="row-icon" aria-hidden="true">' + (product.category === 'iPhone' ? '▯' : '▤') +
      '</span><span class="row-main"><strong>' + escapeHtml(product.name) + '</strong><small>' + escapeHtml(subtitle) +
      '</small><small class="sku">' + escapeHtml(product.sku) + '</small></span><span class="row-side"><span class="badge ' +
      tone + '">' + status + '</span><strong>' + money(product.unitPriceGmd) + '</strong></span><span class="chevron" aria-hidden="true">›</span></button>';
  }).join('') : '<p class="empty">' + (query ? 'No matching product. Check the full serial number or IMEI.' : 'No products in this view.') + '</p>';
}

function drawDrafts() {
  const list = [...state.drafts].sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  $('#draft-list').innerHTML = list.length ? list.map((draft) =>
    '<button class="product-row" type="button" data-draft="' + escapeHtml(draft.id) +
    '"><span class="row-icon" aria-hidden="true">▤</span><span class="row-main"><strong>' + escapeHtml(draft.name || 'Untitled product') +
    '</strong><small>' + escapeHtml(deviceSpecs({ ...draft, batteryHealth: draft.battery || null }) || draft.category) +
    '</small></span><span class="row-side"><span class="badge plain">Draft</span></span><span class="chevron" aria-hidden="true">›</span></button>'
  ).join('') : '<p class="empty">No drafts yet. Use “Save draft” while adding a product.</p>';
}

function drawProductOptions() {
  const available = state.products.filter((item) => item.stockQty > 0).sort(productOrder);
  options($('#sale-product'), available, productLabel, 'Choose a product');
  options($('#damage-product'), available, productLabel, 'Choose a product');
}

function drawSales() {
  const sales = [...state.sales].sort(byLatest);
  $('#sales-rows').innerHTML = sales.length ? sales.map((s) =>
    '<tr><td>' + rowText(s.date) + '</td><td><strong>' + rowText(s.productName) +
    '</strong><small>' + rowText(s.sku) + (s.staffSale ? ' · Staff sale' : '') + '</small></td><td>' + s.quantity +
    '</td><td>' + money(s.totalGmd) + '</td><td>' + money(s.paidGmd) +
    '</td><td>' + money(remaining(s)) + '</td><td>' + rowText(s.customer) + '</td></tr>').join('')
    : emptyRow(7);
  const unpaid = sales.filter((s) => remaining(s) > 0).map((sale) => ({
    ...sale, id: (sale.staffSale ? 'staff/' : 'owner/') + sale.id
  }));
  options($('#payment-sale'), unpaid,
    (s) => s.productName + ' · ' + (s.customer || s.date) + ' · ' + money(remaining(s)) + ' remaining',
    'Choose an unpaid sale');
}

function drawDamages() {
  const losses = [...state.losses].sort(byLatest);
  $('#damage-rows').innerHTML = losses.length ? losses.map((l) =>
    '<tr><td>' + rowText(l.date) + '</td><td>' + rowText(l.productName) + '</td><td>' + l.quantity +
    '</td><td>' + money(l.costGmd) + '</td><td>' + rowText(l.reason) +
    (l.notes ? '<small>' + escapeHtml(l.notes) + '</small>' : '') + '</td></tr>').join('') : emptyRow(5);
}

function drawExpenses() {
  const expenses = [...state.expenses].sort(byLatest);
  $('#expense-rows').innerHTML = expenses.length ? expenses.map((e) =>
    '<tr><td>' + rowText(e.date) + '</td><td>' + rowText(e.category) + '</td><td>' +
    money(e.amountGmd) + '</td><td>' + rowText(e.note) + '</td></tr>').join('') : emptyRow(4);
}
function draw() {
  drawTracker();
  drawOverview();
  drawInventory();
  drawDrafts();
  drawProductOptions();
  drawSales();
  drawDamages();
  drawExpenses();
  $('#last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  document.querySelectorAll('.owner-only:not(.view)').forEach((node) => {
    node.hidden = state.member?.role !== 'owner';
  });
}

async function loadData() {
  const session = authCheck;
  const names = ['products', 'productDrafts', 'sales', 'losses', 'trackerRecords', 'expenses', 'staffSales', 'productCosts'];
  const snapshots = await Promise.all(names.map((name) => getDocs(collection(state.db, name))));
  if (session !== authCheck) return;
  const records = Object.fromEntries(names.map((name, index) => [
    name, snapshots[index].docs.map((item) => ({ ...item.data(), id: item.id }))
  ]));
  for (const name of ['products', 'losses', 'trackerRecords', 'expenses']) state[name] = records[name];
  state.drafts = records.productDrafts;
  state.sales = records.sales.concat(withStaffCosts(records.staffSales, records.productCosts));

  draw();
}

function view(name, focus = true) {
  const target = $('#view-' + name);
  if (!target || (target.classList.contains('owner-only') && state.member?.role !== 'owner')) return;
  activeView = name;
  document.querySelectorAll('.view').forEach((node) => { node.hidden = node !== target; });
  document.querySelectorAll('[data-view]').forEach((node) => {
    const selected = node.dataset.view === name;
    node.classList.toggle('active', selected);
    if (selected && node.closest('nav')) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  });
  const more = $('.more-menu');
  more.open = false;
  more.classList.toggle('active', Boolean(more.querySelector('[aria-current="page"]')));
  if (focus) {
    target.querySelector('h1')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

async function refreshAfterSave(message) {
  notice(message);
  try {
    await loadData();
  } catch (err) {
    console.error('Could not refresh after save', err);
    notice(message + ' Use Refresh to reload the list.', true);
  }
}

async function process(form, operation, successText) {
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    await operation();
    form.reset();
    setDates();
    await refreshAfterSave(successText);
  } catch (err) {
    console.error('Dashboard operation failed', err);
    notice(err.message || 'Unable to save the record.', true);
  } finally { submit.disabled = false; }
}
function setDates() {
  document.querySelectorAll('input[type=date][required]').forEach((el) => { if (!el.value) el.value = today(); });
}
function authenticatedUid() {
  if (!state.user || !state.member) throw new Error('Sign in to continue.');
  return state.user.uid;
}

function exportCsv(file, rows) {
  if (!rows.length) { notice('There is nothing to export.', true); return; }
  const fields = Object.keys(rows[0]);
  const csvCell = (value) => {
    let text = String(value ?? '');
    // Prevent spreadsheet formula injection when staff open the CSV file.
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const csv = [fields.map(csvCell).join(','), ...rows.map((row) => fields.map((key) => csvCell(row[key])).join(','))].join('\r\n');
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  link.href = url; link.download = file; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function showProducts(filter, query = '', openExact = false) {
  $('#inventory-filter').value = filter;
  $('#inventory-search').value = query;
  drawInventory();
  view('inventory');
  const matches = [...$('#inventory-rows').querySelectorAll('[data-product]')];
  if (!openExact || matches.length !== 1) return;
  const product = state.products.find((item) => item.id === matches[0].dataset.product);
  if ([product.serialNumber, product.imei].some((value) => value && normalizeIdentifier(value) === normalizeIdentifier(query))) {
    openProduct(product);
  }
}

function openProduct(product) {
  selectedProduct = product;
  const [status, tone] = productStatus(product);
  const details = [
    ['Stock ID (SKU)', product.sku],
    ['Category', product.category],
    ['Storage', product.storage],
    ['Colour', product.colour],
    ['Battery health', product.batteryHealth == null ? '' : product.batteryHealth + '%'],
    ['Serial number', product.serialNumber],
    ['IMEI', product.imei],
    ['Quantity in stock', product.stockQty],
    ['Selling price', money(product.unitPriceGmd)],
    ...(state.member?.role === 'owner' ? [['Buying cost', money(product.unitCostGmd)]] : []),
    ['Received date', product.receivedOn],
    ['Notes', product.notes]
  ];
  $('#detail-title').textContent = product.name;
  $('#detail-body').innerHTML = '<p class="detail-status"><span class="badge ' + tone + '">' + status +
    '</span></p><dl class="detail-grid">' + details.map(([label, value]) =>
      '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value ?? '—') +
      (value === '' ? '—' : '') + '</dd></div>').join('') + '</dl>';
  $('#detail-sale').hidden = product.stockQty <= 0;
  $('#detail-dialog').showModal();
}

const productFields = ['name', 'category', 'storage', 'colour', 'battery', 'serialNumber', 'imei', 'quantity', 'cost', 'price', 'receivedOn', 'notes', 'sku'];
const isSingleDevice = (category) => !['Accessories', 'Other'].includes(category);

function syncCategory() {
  const form = $('#product-form');
  const category = form.elements.category.value;
  const iphone = category === 'iPhone';
  const mobile = iphone || category === 'iPad' || category === 'Apple Watch';
  const device = isSingleDevice(category);
  $('#product-name-label').textContent = iphone ? 'iPhone model' : 'Product name / model';
  form.elements.name.placeholder = iphone ? 'e.g. iPhone 14 Pro' : 'Enter product name';
  $('#identifier-hint').hidden = !iphone;
  $('#field-storage').hidden = !['iPhone', 'iPad', 'MacBook / iMac'].includes(category);
  $('#field-battery').hidden = !device || category === 'AirPods';
  $('#field-serial').hidden = !device && !form.elements.serialNumber.value;
  $('#field-imei').hidden = !mobile && !form.elements.imei.value;
  $('#field-quantity').hidden = editor.product || device;
  if (device && !editor.product) form.elements.quantity.value = '1';
  productAssist?.update();
}

function stockId() {
  return 'UA-' + crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
}

function openEditor({ product, draft, record } = {}) {
  const form = $('#product-form');
  const dialog = $('#product-dialog');
  form.reset();
  editor = {
    product, draft, sourceId: record?.id || draft?.sourceId || '',
    newSku: draft?.sku || record?.id || stockId(), revision: draft?.revision
  };
  const values = draft || (product ? {
    ...product, battery: product.batteryHealth, cost: product.unitCostGmd, price: product.unitPriceGmd
  } : record ? {
    name: record.name, category: record.category, storage: record.storage, colour: record.colour,
    battery: /^\d{1,3}(?:\.0+)?%?$/.test(record.battery) ? Number(String(record.battery).replace('%', '')) : '',
    cost: record.costGmd, sku: record.id,
    notes: (record.sourceSheet + ' row ' + record.sourceRow + '; ' + (record.notes || '')).slice(0, 300)
  } : {});
  for (const field of productFields) {
    if (values[field] != null) form.elements[field].value = values[field];
  }
  const ownerEditing = product && state.member?.role === 'owner';
  if (!form.elements.category.value) form.elements.category.value = 'Other';
  if (!draft && !product && !record) form.elements.receivedOn.value = today();
  form.elements.category.disabled = Boolean(product);
  form.elements.name.disabled = Boolean(product && !ownerEditing);
  form.elements.sku.readOnly = Boolean(editor.sourceId);
  $('#stock-fields').hidden = Boolean(product && !ownerEditing);
  $('#sku-settings').hidden = Boolean(product);
  $('#sku-settings').open = false;
  $('#product-dialog-title').textContent = product ? 'Edit product details' : draft ? 'Finish draft' : 'Add product';
  $('#product-form-intro').textContent = product ? 'Stock quantity updates when sales or losses are recorded.'
    : editor.sourceId ? 'Confirm physical stock, price and received date.' : 'Add one record for each device.';
  $('#save-product').textContent = product ? 'Save changes' : 'Add to stock';
  $('#save-draft').hidden = Boolean(product);
  $('#delete-draft').hidden = !draft;
  $('#product-form-error').hidden = true;
  syncCategory();
  dialog.showModal();
  (product && !ownerEditing ? form.elements.serialNumber : form.elements.name).focus();
}

function deviceIdentifiers(record) {
  return [record.serialNumber && ['serial', normalizeIdentifier(record.serialNumber)], record.imei && ['imei', normalizeIdentifier(record.imei)]]
    .filter(Boolean).map(([type, value]) => type + '-' + value);
}

function readProductForm(form, action) {
  const values = Object.fromEntries(productFields.map((field) => [field, formValue(form, field)]));
  if (editor.product && !values.name) values.name = editor.product.name;
  if (editor.product) values.category = editor.product.category;
  values.sku = editor.product?.id || editor.sourceId || values.sku.toUpperCase() || editor.newSku;
  values.serialNumber = normalizeIdentifier(values.serialNumber);
  values.imei = normalizeIdentifier(values.imei);
  if (!values.name) throw new Error('Enter the product name or iPhone model.');
  if (action === 'draft') return values;
  if (!editor.product && !/^[A-Z0-9][A-Z0-9_-]{1,47}$/.test(values.sku)) {
    throw new Error('Use 2–48 letters, numbers, hyphens or underscores for the SKU.');
  }
  if (values.serialNumber && !/^[A-Z0-9]{3,32}$/.test(values.serialNumber)) {
    throw new Error('Enter a serial number with 3–32 letters or digits.');
  }
  if (values.imei && !/^\d{15}$/.test(values.imei)) throw new Error('Enter a 15-digit IMEI.');
  if (form.elements.battery.validity.badInput) throw new Error('Enter battery health as a whole number from 1 to 100.');
  const battery = values.battery === '' ? null : Number(values.battery);
  if (battery !== null && (!Number.isInteger(battery) || battery < 1 || battery > 100)) {
    throw new Error('Enter battery health as a whole number from 1 to 100.');
  }
  const details = {
    storage: values.storage, colour: values.colour, batteryHealth: battery,
    serialNumber: values.serialNumber, imei: values.imei, notes: values.notes
  };
  if (editor.product && state.member.role !== 'owner') return details;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.receivedOn)) throw new Error('Choose the received date.');
  const stock = {
    name: values.name, unitCostGmd: amount(form, 'cost'), unitPriceGmd: amount(form, 'price'),
    receivedOn: values.receivedOn
  };
  if (editor.product) return { ...details, ...stock };
  const stockQty = isSingleDevice(values.category) ? 1 : amount(form, 'quantity', { positive: true, integer: true });
  if (stockQty > 1000000) throw new Error('Enter a quantity of 1,000,000 or less.');
  if ((values.serialNumber || values.imei) && stockQty > 1) throw new Error('Enter one record per serial number or IMEI.');
  return { ...details, ...stock, stockQty, category: values.category, sku: values.sku };
}

// A sale keeps the cost version in use when it was recorded. This value is
// readable only by the owner, even though staff can reference its random ID.
function writeStaffCatalog(transaction, catalogSnapshot, product, sku, previous) {
  const existingVersion = catalogSnapshot.data()?.costVersion;
  const unitCostGmd = recordedCost(product);
  const costRef = existingVersion && unitCostGmd === recordedCost(previous)
    ? null : doc(collection(state.db, 'productCosts'));
  const catalog = staffCatalogRecord(product, sku, costRef?.id || existingVersion);
  if (!catalog) return false;
  if (costRef) transaction.set(costRef, { productId: sku, unitCostGmd });
  transaction.set(catalogSnapshot.ref, { ...catalog, updatedAt: serverTimestamp() });
  return true;
}

async function publishStaffStock() {
  const button = $('#publish-staff-stock');
  button.disabled = true;
  let published = 0;
  let skipped = 0;
  try {
    const snapshots = await getDocs(collection(state.db, 'products'));
    for (const item of snapshots.docs) {
      authenticatedUid();
      const outcome = await runTransaction(state.db, async (transaction) => {
        const product = await transaction.get(item.ref);
        const catalog = await transaction.get(doc(state.db, 'staffCatalog', item.id));
        if (catalog.exists()) return 'existing';
        if (!product.exists()) return 'skipped';
        return writeStaffCatalog(transaction, catalog, product.data(), item.id, product.data()) ? 'new' : 'skipped';
      });
      if (outcome === 'new') published++;
      if (outcome === 'skipped') skipped++;
    }
    notice(published + ' product lines published for staff.' + (skipped ? ' ' + skipped + ' need a valid name, price or quantity.' : ''));
  } catch (error) {
    console.error('Staff stock publication failed', error);
    notice('Published ' + published + ' product lines before the update stopped. Try again to resume.', true);
  } finally {
    button.disabled = false;
  }
}

async function saveEditorAction(action, values, current) {
  const uid = authenticatedUid();
  const draftRef = current.draft ? doc(state.db, 'productDrafts', current.draft.id)
    : action === 'draft' ? doc(collection(state.db, 'productDrafts')) : null;
  await runTransaction(state.db, async (transaction) => {
    const draftSnapshot = current.draft ? await transaction.get(draftRef) : null;
    if (draftSnapshot && (!draftSnapshot.exists() || draftSnapshot.data().revision !== current.revision)) {
      throw new Error('This draft changed on another device. Close it and use Refresh before trying again.');
    }
    if (action === 'delete') {
      transaction.delete(draftRef);
      return;
    }
    if (action === 'draft') {
      const draft = {
        ...values, sourceId: current.sourceId, revision: crypto.randomUUID(),
        updatedAt: serverTimestamp(), updatedBy: uid
      };
      if (!draftSnapshot) {
        draft.createdAt = serverTimestamp();
        draft.createdBy = uid;
      }
      transaction.set(draftRef, draft, { merge: true });
      return;
    }
    const productRef = doc(state.db, 'products', current.product?.id || values.sku);
    const productSnapshot = await transaction.get(productRef);
    if (productSnapshot.exists() && !current.product) throw new Error('That SKU already exists. Choose another SKU or open the existing product.');
    if (!productSnapshot.exists() && current.product) throw new Error('This product could not be found. Refresh the product list.');
    const previous = productSnapshot.exists() ? productSnapshot.data() : {};
    const catalog = await transaction.get(doc(state.db, 'staffCatalog', productRef.id));
    if (current.product && Object.keys(values).some((field) => (previous[field] ?? '') !== (current.product[field] ?? ''))) {
      throw new Error('This product changed on another device. Close it and use Refresh before editing again.');
    }
    if (previous.stockQty > 1 && (values.serialNumber || values.imei)) {
      throw new Error('This stock line has several units. Add a separate record for each device with its own identifier.');
    }
    const newIds = deviceIdentifiers(values);
    const oldIds = deviceIdentifiers(previous);
    const duplicate = state.products.some((product) => product.id !== productRef.id &&
      deviceIdentifiers(product).some((id) => newIds.includes(id)));
    if (duplicate) throw new Error('A product already uses this serial number or IMEI.');
    const refs = [...new Set([...newIds, ...oldIds])].map((id) => doc(state.db, 'productIdentifiers', id));
    const entries = await Promise.all(refs.map((ref) => transaction.get(ref)));
    entries.forEach((entry, index) => {
      const ref = refs[index];
      const assignedHere = entry.exists() && entry.data().productId === productRef.id;
      if (newIds.includes(ref.id)) {
        if (entry.exists() && !assignedHere) throw new Error('A product already uses this serial number or IMEI.');
        if (!assignedHere) transaction.set(ref, { productId: productRef.id });
      } else if (assignedHere) transaction.delete(ref);
    });
    writeStaffCatalog(transaction, catalog, { ...previous, ...values }, productRef.id, previous);
    if (current.product) transaction.update(productRef, { ...values, updatedAt: serverTimestamp() });
    else transaction.set(productRef, {
      ...values, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    if (current.draft) transaction.delete(draftRef);
  });
}

async function runEditorAction(action) {
  const current = editor;
  if (current.busy) return;
  const session = authCheck;
  const form = $('#product-form');
  const errorBox = $('#product-form-error');
  const buttons = [...form.querySelectorAll('button')];
  current.busy = true;
  buttons.forEach((button) => { button.disabled = true; });
  errorBox.hidden = true;
  try {
    const values = action === 'delete' ? {} : readProductForm(form, action);
    await saveEditorAction(action, values, current);
    if (session !== authCheck) return;
    $('#product-dialog').close();
    const message = action === 'draft' ? 'Draft saved.' : action === 'delete' ? 'Draft deleted.'
      : current.product ? 'Product details updated.' : 'Product added to stock.';
    await refreshAfterSave(message);
    if (session !== authCheck) return;
    if (action === 'draft' || action === 'delete') view('drafts');
    else if (!current.product) showProducts('all', values.sku);
    else {
      const updated = state.products.find((p) => p.id === current.product.id);
      if (updated) openProduct(updated);
    }
  } catch (err) {
    if (session !== authCheck) return;
    errorBox.textContent = err.code === 'permission-denied' ? 'Your account could not save this entry. Ask the shop owner to check dashboard access.' : err.message;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ block: 'nearest' });
  } finally {
    current.busy = false;
    buttons.forEach((button) => { button.disabled = false; });
  }
}

function attachActions() {
  productAssist = initProductAssist({
    form: $('#product-form'), getProducts: () => state.products,
    getCurrentId: () => editor.product?.id,
    openExisting: (product) => { $('#product-dialog').close(); openProduct(product); }
  });
  ['#overview-add-device', '#inventory-add', '#draft-add'].forEach((selector) =>
    $(selector).addEventListener('click', () => openEditor()));
  $('#quick-search').addEventListener('submit', (event) => {
    event.preventDefault();
    showProducts('all', formValue(event.currentTarget, 'query'), true);
  });
  $('#open-stock').addEventListener('click', () => showProducts('in-stock'));
  $('#open-attention').addEventListener('click', () => {
    $('#attention-title').focus({ preventScroll: true });
    $('#attention-panel').scrollIntoView({ block: 'start' });
  });
  $('#alerts').addEventListener('click', (event) => {
    const action = event.target.closest('[data-attention]')?.dataset.attention;
    if (action === 'unpaid') {
      view('sales');
      $('#payment-sale').focus();
    } else if (action === 'tracker') {
      $('#tracker-search').value = '';
      $('#tracker-filter').value = 'review';
      drawTracker();
      view('tracker');
    } else if (action) {
      showProducts(action);
    }
  });
  $('#view-tracker-sales').addEventListener('click', () => {
    $('#tracker-search').value = '';
    $('#tracker-filter').value = 'sold';
    drawTracker();
    view('tracker');
  });
  $('#product-form').elements.category.addEventListener('change', syncCategory);
  $('#product-form').addEventListener('submit', (event) => {
    event.preventDefault();
    runEditorAction('product');
  });
  $('#save-draft').addEventListener('click', () => runEditorAction('draft'));
  $('#delete-draft').addEventListener('click', () => {
    if (window.confirm('Delete this draft?')) runEditorAction('delete');
  });
  document.querySelectorAll('[data-close-dialog]').forEach((button) =>
    button.addEventListener('click', () => button.closest('dialog').close()));
  $('#product-dialog').addEventListener('cancel', (event) => {
    if (editor.busy) event.preventDefault();
  });
  $('#draft-list').addEventListener('click', (event) => {
    const item = event.target.closest('[data-draft]');
    const draft = item && state.drafts.find((record) => record.id === item.dataset.draft);
    if (draft) openEditor({ draft });
  });
  $('#inventory-rows').addEventListener('click', (event) => {
    const item = event.target.closest('[data-product]');
    const product = item && state.products.find((record) => record.id === item.dataset.product);
    if (product) openProduct(product);
  });
  $('#detail-edit').addEventListener('click', () => {
    $('#detail-dialog').close();
    openEditor({ product: selectedProduct });
  });
  $('#detail-sale').addEventListener('click', () => {
    $('#detail-dialog').close();
    view('sales');
    $('#sale-product').value = selectedProduct.id;
    $('#sale-product').dispatchEvent(new Event('change'));
    $('#sale-form [name="quantity"]').value = 1;
    $('#sale-form [name="paid"]').focus();
  });
  $('#tracker-search').addEventListener('input', drawTracker);
  $('#tracker-filter').addEventListener('change', drawTracker);
  $('#tracker-export').addEventListener('click', () => exportCsv('tracker-2-3.csv', state.trackerRecords));
  $('#tracker-rows').addEventListener('click', event => {
    const button = event.target.closest('[data-review]');
    if (!button || state.member?.role !== 'owner') return;
    const record = state.trackerRecords.find(r=>r.id===button.dataset.review);
    if (!record) return;
    if (state.products.some((product) => product.sku === record.id)) {
      notice('This source row already has an inventory entry.', true);
      return;
    }
    const draft = state.drafts.find((item) => item.sourceId === record.id);
    openEditor(draft ? { draft } : { record });
  });
  document.querySelectorAll('[data-view]').forEach((button) =>
    button.addEventListener('click', () => {
      if (button.dataset.view === 'inventory' && activeView !== 'inventory') showProducts('all');
      else view(button.dataset.view);
    }));
  $('#inventory-search').addEventListener('input', drawInventory);
  $('#inventory-filter').addEventListener('change', drawInventory);
  $('#publish-staff-stock').addEventListener('click', publishStaffStock);
  $('#export-products').addEventListener('click', () =>
    exportCsv('uncle-apple-inventory.csv', state.products.map((p) => ({
      sku: p.sku, name: p.name, category: p.category, remaining: p.stockQty,
      storage: p.storage || '', colour: p.colour || '', batteryHealth: p.batteryHealth ?? '',
      serialNumber: p.serialNumber || '', imei: p.imei || '',
      costGmd: p.unitCostGmd, priceGmd: p.unitPriceGmd, receivedOn: p.receivedOn, notes: p.notes || ''
    }))));
  $('#export-sales').addEventListener('click', () =>
    exportCsv('uncle-apple-sales.csv', state.sales.map((s) => ({
      date: s.date, sku: s.sku, product: s.productName, quantity: s.quantity, totalGmd: s.totalGmd,
      paidGmd: s.paidGmd, outstandingGmd: remaining(s), customer: s.customer || '', dueOn: s.dueOn || ''
    }))));
  $('#refresh').addEventListener('click', async () => {
    try { await loadData(); notice('Records refreshed.'); } catch (err) { notice(err.message, true); }
  });
  $('#logout').addEventListener('click', () => signOut(state.auth));
  $('#reload-dashboard').addEventListener('click', () => window.location.reload());
  $('#error-logout').addEventListener('click', () => signOut(state.auth));
  $('#approval-logout').addEventListener('click', () => signOut(state.auth));
  $('#approval-recheck').addEventListener('click', () => window.location.reload());
  $('#approval-compare').addEventListener('click', () => {
    const fromAuth = $('#approval-uid').value;
    const fromConsole = $('#approval-firestore-id').value;
    const result = $('#approval-compare-result');
    result.hidden = false;
    if (!fromConsole) {
      result.textContent = 'Paste the exact document ID from the Firebase Console. Do not type it from memory or a screenshot.';
      return;
    }
    if (fromAuth === fromConsole) {
      result.textContent = 'The IDs match exactly (' + fromAuth.length + ' characters). The dashboard still cannot find that document, so the next check must focus on the Firestore project and database, not your password or field order.';
      return;
    }
    let mismatch = 0;
    while (mismatch < fromAuth.length && mismatch < fromConsole.length &&
      fromAuth[mismatch] === fromConsole[mismatch]) mismatch++;
    const actualChar = fromAuth[mismatch] === undefined ? '(end)' : JSON.stringify(fromAuth[mismatch]);
    const pastedChar = fromConsole[mismatch] === undefined ? '(end)' : JSON.stringify(fromConsole[mismatch]);
    result.textContent = 'Different IDs. First mismatch at character ' + (mismatch + 1) +
      ': authentication has ' + actualChar + ', Firestore ID has ' + pastedChar +
      '. Lengths: auth ' + fromAuth.length + ', Firestore ' + fromConsole.length +
      '. The Firestore users document must use the exact Authentication UID.';
  });
  $('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    try { await signInWithEmailAndPassword(state.auth, formValue(form, 'email'), formValue(form, 'password')); form.reset(); }
    catch (_err) { notice('Login failed. Check your email, password or account access.', true); }
    finally { button.disabled = false; }
  });

  $('#sale-product').addEventListener('change', () => {
    const product = state.products.find((p) => p.id === $('#sale-product').value);
    if (product) $('#sale-form [name="price"]').value = product.unitPriceGmd;
  });

  $('#sale-form').addEventListener('submit', (event) => {
    event.preventDefault(); const form = event.currentTarget;
    process(form, async () => {
      const productId = formValue(form, 'productId');
      const quantity = amount(form, 'quantity', { positive: true, integer: true });
      const unitPriceGmd = amount(form, 'price');
      const paidGmd = amount(form, 'paid');
      const totalGmd = Number((quantity * unitPriceGmd).toFixed(2));
      if (totalGmd > 1000000000 || paidGmd > totalGmd) throw new Error('Paid amount cannot exceed the sale total.');
      if (!productId) throw new Error('Choose a product.');
      const userId = authenticatedUid();
      await runTransaction(state.db, async (transaction) => {
        const productRef = doc(state.db, 'products', productId);
        const snap = await transaction.get(productRef);
        if (!snap.exists()) throw new Error('Product not found.');
        const product = snap.data();
        const catalog = await transaction.get(doc(state.db, 'staffCatalog', productId));
        if (product.stockQty < quantity) throw new Error('Not enough stock remaining.');
        const stockQty = product.stockQty - quantity;
        writeStaffCatalog(transaction, catalog, { ...product, stockQty }, productId, product);
        transaction.update(productRef, { stockQty, updatedAt: serverTimestamp() });
        const saleRef = doc(collection(state.db, 'sales'));
        transaction.set(saleRef, {
          productId, productName: product.name, sku: product.sku, quantity, unitPriceGmd, totalGmd,
          unitCostGmd: product.unitCostGmd, paidGmd,
          method: formValue(form, 'method'), date: formValue(form, 'date'),
          dueOn: formValue(form, 'dueOn'), customer: formValue(form, 'customer'),
          createdAt: serverTimestamp(), createdBy: userId, updatedAt: serverTimestamp()
        });
        if (paidGmd > 0) transaction.set(doc(collection(state.db, 'payments')), {
          saleId: saleRef.id, amountGmd: paidGmd, method: formValue(form, 'method'),
          createdAt: serverTimestamp(), createdBy: userId
        });
      });
    }, 'Sale recorded and stock reduced.');
  });

  $('#payment-form').addEventListener('submit', (event) => {
    event.preventDefault(); const form = event.currentTarget;
    process(form, async () => {
      const selection = formValue(form, 'saleId');
      const paid = amount(form, 'amount', { positive: true });
      if (!selection) throw new Error('Choose an unpaid sale.');
      const uid = authenticatedUid();
      const saleId = selection.split('/')[1];
      if (selection.startsWith('staff/')) {
        await recordStaffPayment(state.db, { id: saleId, amount: paid, method: formValue(form, 'method'), uid },
          { doc, collection, runTransaction, serverTimestamp });
        return;
      }
      await runTransaction(state.db, async (transaction) => {
        const ref = doc(state.db, 'sales', saleId);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new Error('Sale not found.');
        const sale = snapshot.data();
        if (Number(sale.paidGmd) + paid > Number(sale.totalGmd) + 0.001) throw new Error('Payment exceeds the outstanding balance.');
        transaction.update(ref, { paidGmd: Number((Number(sale.paidGmd) + paid).toFixed(2)), updatedAt: serverTimestamp() });
        transaction.set(doc(collection(state.db, 'payments')), {
          saleId, amountGmd: paid, method: formValue(form, 'method'),
          createdAt: serverTimestamp(), createdBy: uid
        });
      });
    }, 'Payment recorded.');
  });

  $('#damage-form').addEventListener('submit', (event) => {
    event.preventDefault(); const form = event.currentTarget;
    process(form, async () => {
      const productId = formValue(form, 'productId');
      const quantity = amount(form, 'quantity', { positive: true, integer: true });
      if (!productId) throw new Error('Choose a product.');
      const uid = authenticatedUid();
      await runTransaction(state.db, async (transaction) => {
        const ref = doc(state.db, 'products', productId);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new Error('Product not found.');
        const product = snapshot.data();
        const catalog = await transaction.get(doc(state.db, 'staffCatalog', productId));
        if (product.stockQty < quantity) throw new Error('Not enough stock remaining.');
        const stockQty = product.stockQty - quantity;
        writeStaffCatalog(transaction, catalog, { ...product, stockQty }, productId, product);
        transaction.update(ref, { stockQty, updatedAt: serverTimestamp() });
        transaction.set(doc(collection(state.db, 'losses')), {
          productId, productName: product.name, sku: product.sku, quantity,
          costGmd: Number((quantity * Number(product.unitCostGmd)).toFixed(2)),
          reason: formValue(form, 'reason'), notes: formValue(form, 'notes'),
          date: formValue(form, 'date'), createdBy: uid, createdAt: serverTimestamp()
        });
      });
    }, 'Damage or loss recorded and stock reduced.');
  });

  $('#expense-form').addEventListener('submit', (event) => {
    event.preventDefault(); const form = event.currentTarget;
    process(form, async () => {
      if (state.member.role !== 'owner') throw new Error('Only the owner can enter expenses.');
      await addDoc(collection(state.db, 'expenses'), {
        category: formValue(form, 'category'), amountGmd: amount(form, 'amount', { positive: true }),
        date: formValue(form, 'date'), note: formValue(form, 'note'),
        createdBy: authenticatedUid(), createdAt: serverTimestamp()
      });
    }, 'Expense recorded.');
  });
}

attachActions();
setDates();
if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  $('#setup').hidden = false;
} else {
  const firebaseApp = initializeApp(firebaseConfig);
  state.auth = getAuth(firebaseApp);
  state.db = getFirestore(firebaseApp);
  onAuthStateChanged(state.auth, async (user) => {
    const session = ++authCheck;
    productAssist.stop();
    $('#store-insights').replaceChildren();
    $('#store-insights').hidden = true;
    $('#app').hidden = true;
    $('#load-error').hidden = true;
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
    ['trackerRecords', 'products', 'drafts', 'sales', 'losses', 'expenses'].forEach((name) => { state[name] = []; });
    $('#inventory-search').value = '';
    $('#quick-search').reset();
    $('#tracker-search').value = '';
    $('#login-panel').hidden = true;
    $('#approval-panel').hidden = true;
    $('#refresh').hidden = true;
    $('#logout').hidden = true;
    state.user = null;
    state.member = null;
    if (!user) {
      $('#login-panel').hidden = false;
      $('#user-label').textContent = '';
      return;
    }
    try {
      // Always query the server for access approval, rather than any stale local cache.
      const approvalPath = doc(state.db, 'users', user.uid);
      const membership = await getDocFromServer(approvalPath);
      if (session !== authCheck) return;
      console.info('Store approval check', {
        projectId: state.db.app.options.projectId,
        databaseId: state.db._databaseId?.database || '(default)',
        uidLength: user.uid.length,
        approvedDocumentFound: membership.exists()
      });
      const profile = membership.exists() ? membership.data() : {};
      if (profile.active !== true || !['owner', 'staff'].includes(profile.role)) {
        const reason = !membership.exists()
          ? 'No matching user approval document was found in this Firebase project.'
          : (typeof profile.active !== 'boolean' || profile.active !== true)
            ? 'The approval document exists, but the active field is not a boolean true.'
            : 'The approval document exists, but the role must be exactly owner or staff.';
        $('#approval-reason').textContent = reason;
        $('#approval-email').value = user.email || '';
        $('#approval-uid').value = user.uid;
        $('#approval-project').value = firebaseConfig.projectId;
        $('#approval-panel').hidden = false;
        notice('Your credentials worked. Check the approval information shown.', true);
        return;
      }
      if (profile.role === 'staff') {
        window.location.replace('./staff.html');
        return;
      }
      state.user = user;
      state.member = profile;
      $('#user-label').textContent = user.email || 'Signed in';
      $('#role-label').textContent = profile.role === 'owner' ? 'Owner access' : 'Staff access';
      await loadData();
      if (session !== authCheck) return;
      view('overview', false);
      $('#app').hidden = false;
      $('#refresh').hidden = false;
      $('#logout').hidden = false;
    } catch (error) {
      if (session !== authCheck) return;
      console.error('Dashboard failed to load', error);
      notice('Could not load shop records. Check Firebase setup and Firestore rules.', true);
      $('#app').hidden = true;
      $('#login-panel').hidden = true;
      $('#load-error').hidden = false;
    }
  });
}
