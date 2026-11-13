// Private Uncle Apple Store operations. All protected data lives in Firestore, never in this bundle.
// Firebase web configuration contains public identifiers, not passwords. Security is enforced by Firestore rules.
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, runTransaction,
  addDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

const $ = (selector) => document.querySelector(selector);
const money = (value) => 'D ' + new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(Number(value) || 0);
const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Banjul' });
const daysOld = (date) => Math.floor((Date.now() - new Date(String(date) + 'T12:00:00Z').getTime()) / 86400000);
const state = { products: [], sales: [], losses: [], expenses: [], payments: [], member: null, user: null, db: null, auth: null };
let noticeTimer;

function notice(message, error = false) {
  const element = $('#feedback');
  element.textContent = message;
  element.className = error ? 'error' : '';
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { element.textContent = ''; }, 6000);
}

function formValue(form, name) {
  return String(new FormData(form).get(name) || '').trim();
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

function drawOverview() {
  const revenue = state.sales.reduce((acc, item) => acc + Number(item.totalGmd || 0), 0);
  const collected = state.sales.reduce((acc, item) => acc + Number(item.paidGmd || 0), 0);
  const soldCost = state.sales.reduce((acc, item) => acc + Number(item.unitCostGmd || 0) * Number(item.quantity || 0), 0);
  const writeOff = state.losses.reduce((acc, item) => acc + Number(item.costGmd || 0), 0);
  const expenses = state.expenses.reduce((acc, item) => acc + Number(item.amountGmd || 0), 0);
  const stockValue = state.products.reduce((acc, item) => acc + Number(item.stockQty || 0) * Number(item.unitCostGmd || 0), 0);
  const inStock = state.products.filter((product) => product.stockQty > 0);
  const kpis = [
    ['Sales revenue', money(revenue), state.sales.length + ' recorded transactions'],
    ['Cash collected', money(collected), 'Includes later instalment payments'],
    ['Customer balances', money(revenue - collected), 'Sold but not yet collected'],
    ['Inventory at cost', money(stockValue), inStock.length + ' active product lines'],
    ['Gross profit', money(revenue - soldCost), 'Revenue minus cost of sold goods'],
    ['Recorded losses', money(writeOff), state.losses.length + ' write-offs'],
    ['Operating expenses', money(expenses), 'Only costs entered here'],
    ['Estimated result', money(revenue - soldCost - writeOff - expenses), 'Excludes costs not recorded']
  ];
  $('#metrics').innerHTML = kpis.map(([label, value, help], index) =>
    '<article class="metric' + (index === 7 ? ' highlight' : '') + '"><span class="label">' +
    escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong><small>' + escapeHtml(help) + '</small></article>'
  ).join('');
  const aged = inStock.filter((product) => product.receivedOn && daysOld(product.receivedOn) >= 45);
  const low = inStock.filter((product) => product.stockQty <= 1);
  const unpaid = state.sales.filter((sale) => remaining(sale) > 0);
  const overdue = unpaid.filter((sale) => sale.dueOn && sale.dueOn < today());
  const attention = [
    ['Aged unsold stock', aged.length + ' lines', 'Held for at least 45 days'],
    ['Low stock', low.length + ' lines', 'Only 1 unit left'],
    ['Outstanding payments', unpaid.length + ' sales', money(unpaid.reduce((sum, sale) => sum + remaining(sale), 0)) + ' due'],
    ['Past-due payments', overdue.length + ' sales', 'Due date has passed']
  ];
  $('#alerts').innerHTML = attention.map(([title, number, detail]) =>
    '<div class="alert"><strong>' + escapeHtml(title) + ': ' + escapeHtml(number) + '</strong><span>' +
    escapeHtml(detail) + '</span></div>').join('');
  $('#recent-sales').innerHTML = state.sales.length
    ? [...state.sales].sort(byLatest).slice(0, 6).map((sale) =>
      detailRow(sale.productName, sale.date + ' · ' + sale.quantity + ' unit(s)', money(sale.totalGmd))).join('')
    : '<p class="empty">No sales recorded yet.</p>';
}

function drawInventory() {
  const search = $('#inventory-search').value.toLowerCase().trim();
  const filter = $('#inventory-filter').value;
  const visible = state.products.filter((item) => {
    if (search && !(item.name + ' ' + item.sku + ' ' + item.category).toLowerCase().includes(search)) return false;
    if (filter === 'in-stock' && item.stockQty < 1) return false;
    if (filter === 'out' && item.stockQty > 0) return false;
    if (filter === 'aged' && !(item.stockQty > 0 && item.receivedOn && daysOld(item.receivedOn) >= 45)) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
  $('#inventory-rows').innerHTML = visible.length ? visible.map((p) =>
    '<tr><td><strong>' + escapeHtml(p.name) + '</strong><small>' + escapeHtml(p.sku) +
    (p.notes ? ' · ' + escapeHtml(p.notes) : '') + '</small></td><td>' + rowText(p.category) +
    '</td><td>' + p.stockQty + '</td><td>' + money(p.unitCostGmd) + '</td><td>' + money(p.unitPriceGmd) +
    '</td><td>' + rowText(p.receivedOn) + '</td></tr>').join('') : emptyRow(6, 'No products match this filter.');
  const available = state.products.filter((item) => item.stockQty > 0).sort((a, b) => a.name.localeCompare(b.name));
  options($('#sale-product'), available, productLabel, 'Choose a product');
  options($('#damage-product'), available, productLabel, 'Choose a product');
}

function drawSales() {
  const sales = [...state.sales].sort(byLatest);
  $('#sales-rows').innerHTML = sales.length ? sales.map((s) =>
    '<tr><td>' + rowText(s.date) + '</td><td><strong>' + rowText(s.productName) +
    '</strong><small>' + rowText(s.sku) + '</small></td><td>' + s.quantity +
    '</td><td>' + money(s.totalGmd) + '</td><td>' + money(s.paidGmd) +
    '</td><td>' + money(remaining(s)) + '</td><td>' + rowText(s.customer) + '</td></tr>').join('')
    : emptyRow(7);
  options($('#payment-sale'), sales.filter((s) => remaining(s) > 0),
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
  drawOverview(); drawInventory(); drawSales(); drawDamages(); drawExpenses();
  $('#last-updated').textContent = 'Updated ' + new Date().toLocaleString('en-GB');
  $('.owner-only') && document.querySelectorAll('.owner-only').forEach((node) => {
    node.hidden = state.member?.role !== 'owner';
  });
}
async function loadData() {
  const names = ['products', 'sales', 'losses', 'expenses', 'payments'];
  const snapshots = await Promise.all(names.map((name) => getDocs(collection(state.db, name))));
  snapshots.forEach((snapshot, index) => {
    state[names[index]] = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  });
  draw();
}
function view(name) {
  document.querySelectorAll('.view').forEach((node) => { node.hidden = node.id !== 'view-' + name; });
  document.querySelectorAll('[data-view]').forEach((node) => {
    node.classList.toggle('active', node.dataset.view === name);
  });
}
async function process(form, operation, successText) {
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    await operation();
    form.reset();
    setDates();
    await loadData();
    notice(successText);
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

function attachActions() {
  document.querySelectorAll('[data-view]').forEach((button) =>
    button.addEventListener('click', () => view(button.dataset.view)));
  $('#inventory-search').addEventListener('input', drawInventory);
  $('#inventory-filter').addEventListener('change', drawInventory);
  $('#export-products').addEventListener('click', () =>
    exportCsv('uncle-apple-inventory.csv', state.products.map((p) => ({
      sku: p.sku, name: p.name, category: p.category, remaining: p.stockQty,
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

  $('#product-form').addEventListener('submit', (event) => {
    event.preventDefault(); const form = event.currentTarget;
    process(form, async () => {
      if (state.member.role !== 'owner') throw new Error('Only the owner can add stock.');
      const sku = formValue(form, 'sku').toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{1,47}$/.test(sku)) throw new Error('Use 2–48 letters, numbers, hyphens or underscores for the SKU.');
      const record = {
        sku, name: formValue(form, 'name'), category: formValue(form, 'category'),
        stockQty: amount(form, 'quantity', { positive: true, integer: true }),
        unitCostGmd: amount(form, 'cost'), unitPriceGmd: amount(form, 'price'),
        receivedOn: formValue(form, 'receivedOn'), notes: formValue(form, 'notes'),
        createdBy: authenticatedUid(), createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      };
      if (!record.name) throw new Error('Enter a product name.');
      await runTransaction(state.db, async (transaction) => {
        const ref = doc(state.db, 'products', sku);
        if ((await transaction.get(ref)).exists()) throw new Error('That SKU already exists.');
        transaction.set(ref, record);
      });
    }, 'Stock saved successfully.');
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
        if (product.stockQty < quantity) throw new Error('Not enough stock remaining.');
        transaction.update(productRef, { stockQty: product.stockQty - quantity, updatedAt: serverTimestamp() });
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
      const saleId = formValue(form, 'saleId');
      const paid = amount(form, 'amount', { positive: true });
      if (!saleId) throw new Error('Choose an unpaid sale.');
      const uid = authenticatedUid();
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
        if (product.stockQty < quantity) throw new Error('Not enough stock remaining.');
        transaction.update(ref, { stockQty: product.stockQty - quantity, updatedAt: serverTimestamp() });
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
    $('#app').hidden = true;
    $('#login-panel').hidden = true;
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
      const membership = await getDoc(doc(state.db, 'users', user.uid));
      const profile = membership.exists() ? membership.data() : {};
      if (profile.active !== true || !['owner', 'staff'].includes(profile.role)) {
        await signOut(state.auth);
        notice('This account has not been approved for the dashboard.', true);
        return;
      }
      state.user = user;
      state.member = profile;
      $('#user-label').textContent = user.email || 'Signed in';
      $('#role-label').textContent = (profile.role === 'owner' ? 'Owner' : 'Staff') + ' access · Live store records';
      $('#app').hidden = false;
      $('#refresh').hidden = false;
      $('#logout').hidden = false;
      await loadData();
    } catch (error) {
      console.error('Dashboard failed to load', error);
      notice('Could not load shop records. Check Firebase setup and Firestore rules.', true);
      $('#app').hidden = true;
      $('#login-panel').hidden = false;
    }
  });
}
