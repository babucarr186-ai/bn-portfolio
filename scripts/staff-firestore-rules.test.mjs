// Use an isolated emulator. All users, products, and transactions are synthetic.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, writeBatch,
  runTransaction, increment, serverTimestamp
} from 'firebase/firestore';
import { staffCatalogRecord, withStaffCosts, recordStaffSale, recordStaffPayment } from '../public/admin/staff-data.js';
import { calculateInsights } from '../public/admin/insights.js';

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Start the Firestore emulator before running this test.');
const testEnv = await initializeTestEnvironment({
  projectId: 'demo-uas-staff-permissions',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') }
});
const sku = 'UA-TEST-001';
const device = 'UA-TEST-002';
const privateData = {
  sku, name: 'Test case', category: 'Accessories', stockQty: 4, unitCostGmd: 1000,
  unitPriceGmd: 2200, receivedOn: '2026-11-15', notes: 'Source receipt 1000 GMD', createdBy: 'owner'
};
const date = '2026-11-15';
const customer = 'Test customer';
const ops = { doc, collection, runTransaction, increment, serverTimestamp };

function writeCatalog(batch, db, product, id, costVersion) {
  batch.set(doc(db, 'staffCatalog', id), {
    ...staffCatalogRecord(product, id, costVersion), updatedAt: serverTimestamp()
  });
}
function writeCost(batch, db, id, productId, unitCostGmd) {
  batch.set(doc(db, 'productCosts', id), { productId, unitCostGmd });
}
function staffSale(overrides = {}) {
  return { sku, quantity: 1, paidGmd: 100, method: 'Cash', customer, date, dueOn: '', uid: 'staffA', ...overrides };
}
async function forgedSale(db, id, overrides = {}) {
  const batch = writeBatch(db);
  const changes = { stockQty: increment(-1), lastSaleId: id, updatedAt: serverTimestamp() };
  batch.update(doc(db, 'products', sku), changes);
  batch.update(doc(db, 'staffCatalog', sku), changes);
  batch.set(doc(db, 'staffSales', id), {
    sku, productId: sku, productName: privateData.name, quantity: 1,
    unitPriceGmd: 2200, totalGmd: 2200, paidGmd: 0, method: 'Cash', customer, date, dueOn: '',
    costVersion: 'original', createdBy: 'staffA', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    ...overrides
  });
  return batch.commit();
}

try {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const batch = writeBatch(db);
    for (const [uid, role, active] of [
      ['owner', 'owner', true], ['staffA', 'staff', true], ['staffB', 'staff', true], ['inactive', 'staff', false]
    ]) batch.set(doc(db, 'users', uid), { role, active });
    batch.set(doc(db, 'products', sku), privateData);
    batch.set(doc(db, 'sales', 'legacy-sale'), { productId: sku, unitCostGmd: 1000, totalGmd: 2200, paidGmd: 2200 });
    batch.set(doc(db, 'payments', 'legacy-payment'), { saleId: 'legacy-sale', amountGmd: 2200 });
    batch.set(doc(db, 'expenses', 'overheads'), { amountGmd: 700 });
    batch.set(doc(db, 'trackerRecords', 'legacy-tracker'), { investment: 100000 });
    batch.set(doc(db, 'staffInventory', sku), { notes: 'Prototype note that staff must not see' });
    await batch.commit();
  });
  const owner = testEnv.authenticatedContext('owner').firestore();
  const staff = testEnv.authenticatedContext('staffA').firestore();
  const other = testEnv.authenticatedContext('staffB').firestore();
  const inactive = testEnv.authenticatedContext('inactive').firestore();
  const unapproved = testEnv.authenticatedContext('unapproved').firestore();
  const anonymous = testEnv.unauthenticatedContext().firestore();

  // Published stock comes from existing product records. A private note may never be published.
  const initial = writeBatch(owner);
  writeCost(initial, owner, 'original', sku, 1000);
  writeCatalog(initial, owner, privateData, sku, 'original');
  await assertSucceeds(initial.commit());
  const catalog = (await getDoc(doc(staff, 'staffCatalog', sku))).data();
  assert.equal(catalog.stockQty, 4);
  assert.equal(catalog.unitPriceGmd, 2200);
  for (const field of ['notes', 'unitCostGmd', 'supplier']) assert.equal(Object.hasOwn(catalog, field), false);
  for (const db of [anonymous, inactive, unapproved]) {
    await assertFails(getDocs(collection(db, 'staffCatalog')));
  }
  await assertFails(setDoc(doc(owner, 'staffCatalog', sku), {
    ...catalog, notes: privateData.notes, updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(staff, 'users', 'staffA'), { role: 'owner' }));
  await assertFails(updateDoc(doc(owner, 'products', sku), { stockQty: 3 }));
  await assertFails(updateDoc(doc(staff, 'staffCatalog', sku), { unitPriceGmd: 1 }));
  await assertFails(updateDoc(doc(staff, 'products', sku), { stockQty: 3 }));
  await assertFails(updateDoc(doc(staff, 'products', sku), { unitCostGmd: 1 }));

  // Normal owner workflow with a draft and serial/IMEI claims, followed by an identifier edit.
  const draft = doc(owner, 'productDrafts', 'owner-draft');
  const draftData = {
    name: 'iPhone Test', category: 'iPhone', storage: '128 GB', colour: 'Black', battery: '90',
    serialNumber: 'ABC12345', imei: '490154203237518', quantity: '1', cost: '1300', price: '2500',
    receivedOn: date, notes: 'Private owner note', sku: device, sourceId: '', revision: 'original',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: 'owner', updatedBy: 'owner'
  };
  await assertSucceeds(setDoc(draft, draftData));
  await assertSucceeds(updateDoc(draft, { revision: 'second', updatedAt: serverTimestamp() }));
  await assertFails(getDoc(doc(staff, 'productDrafts', draft.id)));
  await assertFails(deleteDoc(doc(staff, 'productDrafts', draft.id)));
  const product = {
    ...privateData, sku: device, name: 'iPhone Test', category: 'iPhone', storage: '128 GB',
    colour: 'Black', stockQty: 1, batteryHealth: 90, unitCostGmd: 1300, unitPriceGmd: 2500,
    serialNumber: 'ABC12345', imei: '490154203237518'
  };
  const add = writeBatch(owner);
  add.set(doc(owner, 'products', device), product);
  add.set(doc(owner, 'productIdentifiers', 'serial-ABC12345'), { productId: device });
  add.set(doc(owner, 'productIdentifiers', 'imei-490154203237518'), { productId: device });
  writeCost(add, owner, 'device-version', device, 1300);
  writeCatalog(add, owner, product, device, 'device-version');
  add.delete(draft);
  await assertSucceeds(add.commit());
  const edit = writeBatch(owner);
  edit.update(doc(owner, 'products', device), { serialNumber: 'ABC54321' });
  edit.set(doc(owner, 'productIdentifiers', 'serial-ABC54321'), { productId: device });
  edit.delete(doc(owner, 'productIdentifiers', 'serial-ABC12345'));
  writeCatalog(edit, owner, { ...product, serialNumber: 'ABC54321' }, device, 'device-version');
  await assertSucceeds(edit.commit());
  const publishedDevice = (await getDoc(doc(staff, 'staffCatalog', device))).data();
  assert.equal(publishedDevice.serialNumber, 'ABC54321');
  assert.equal(publishedDevice.imei, '490154203237518');
  await assertFails(setDoc(doc(staff, 'productIdentifiers', 'serial-NEW'), { productId: device }));
  for (const [name, id] of [
    ['products', sku], ['sales', 'legacy-sale'], ['payments', 'legacy-payment'],
    ['expenses', 'overheads'], ['trackerRecords', 'legacy-tracker'], ['productCosts', 'original'],
    ['productIdentifiers', 'serial-ABC54321'], ['staffInventory', sku], ['users', 'owner']
  ]) await assertFails(getDoc(doc(staff, name, id)));

  // Staff cannot spoof price, choose a cost version, or enter an initial payment with no receipt.
  await assertFails(forgedSale(staff, 'wrong-price', { unitPriceGmd: 1, totalGmd: 1 }));
  await assertFails(forgedSale(staff, 'wrong-cost', { costVersion: 'device-version' }));
  await assertFails(forgedSale(staff, 'missing-receipt', { paidGmd: 100 }));
  const saleId = await assertSucceeds(recordStaffSale(staff, staffSale(), ops));
  assert.equal((await getDoc(doc(owner, 'products', sku))).data().stockQty, 3);
  assert.equal((await getDoc(doc(staff, 'staffCatalog', sku))).data().stockQty, 3);
  assert.equal((await getDoc(doc(staff, 'staffPayments', saleId))).data().amountGmd, 100);
  const saleRef = doc(staff, 'staffSales', saleId);
  const sale = (await getDoc(saleRef)).data();
  assert.equal(Object.hasOwn(sale, 'unitCostGmd'), false);
  await assertFails(getDoc(doc(other, 'staffSales', saleId)));
  await assertFails(getDoc(doc(other, 'staffPayments', saleId)));
  await assertFails(getDocs(collection(staff, 'staffSales')));
  await assertSucceeds(getDocs(query(collection(staff, 'staffSales'), where('createdBy', '==', 'staffA'))));
  await assertFails(updateDoc(saleRef, { paidGmd: 101 }));
  await assertSucceeds(recordStaffPayment(staff, { id: saleId, amount: 100, method: 'Wave', uid: 'staffA' }, ops));
  await assertSucceeds(recordStaffPayment(owner, { id: saleId, amount: 2000, method: 'Cash', uid: 'owner' }, ops));
  assert.equal((await getDoc(saleRef)).data().paidGmd, 2200);

  // Changing today's purchase cost must not change the profit on the earlier sale.
  const correction = writeBatch(owner);
  correction.update(doc(owner, 'products', sku), { unitCostGmd: 1800 });
  writeCost(correction, owner, 'corrected', sku, 1800);
  writeCatalog(correction, owner, { ...privateData, stockQty: 3, unitCostGmd: 1800 }, sku, 'corrected');
  await assertSucceeds(correction.commit());
  await assertFails(updateDoc(doc(owner, 'productCosts', 'original'), { unitCostGmd: 1800 }));
  const costVersions = (await getDocs(collection(owner, 'productCosts'))).docs.map(d => ({ id: d.id, ...d.data() }));
  const ownerSales = (await getDocs(collection(owner, 'staffSales'))).docs.map(d => ({ id: d.id, ...d.data() }));
  const sales = withStaffCosts(ownerSales, costVersions);
  assert.equal(sales[0].unitCostGmd, 1000);
  const november = calculateInsights({ sales, products: [privateData], expenses: [] }, '2026-11', '2026-11-16').months.at(-1);
  assert.equal(november.profit, 1200);

  // The owner can use normal sales against the same catalog, and last-item races allow only one sale.
  const ownerSale = writeBatch(owner);
  ownerSale.update(doc(owner, 'products', sku), { stockQty: 1, updatedAt: serverTimestamp() });
  writeCatalog(ownerSale, owner, { ...privateData, stockQty: 1, unitCostGmd: 1800 }, sku, 'corrected');
  ownerSale.set(doc(owner, 'sales', 'owner-sale'), {
    productId: sku, sku, productName: privateData.name, quantity: 2, unitCostGmd: 1800,
    unitPriceGmd: 2200, totalGmd: 4400, paidGmd: 0, createdBy: 'owner', date
  });
  await assertSucceeds(ownerSale.commit());
  const race = await Promise.allSettled([
    recordStaffSale(staff, staffSale({ paidGmd: 0 }), ops),
    recordStaffSale(other, staffSale({ paidGmd: 0, uid: 'staffB' }), ops)
  ]);
  assert.equal(race.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await getDoc(doc(owner, 'products', sku))).data().stockQty, 0);
  assert.equal((await getDoc(doc(owner, 'staffCatalog', sku))).data().stockQty, 0);
  console.log('PASS: owner drafts and serial/IMEI editing; private cost isolation; stock sync; staff sales and receipts; owner charts; concurrent sales');
} finally {
  await testEnv.cleanup();
}
