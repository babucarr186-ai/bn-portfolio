// Permission tests run ONLY against a local emulator with fake data.
// They never read or alter a live Firebase project.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where,
  runTransaction, increment, serverTimestamp
} from 'firebase/firestore';

const projectId = 'demo-uas-staff-permissions';
const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { rules: fs.readFileSync('firestore.rules','utf8') }
});
const safeSku = 'UA-TEST-001';
const privateData = {
  sku:safeSku,name:'iPhone Test',category:'iPhone',
  stockQty:3,unitCostGmd:1000,unitPriceGmd:2200,receivedOn:'2026-11-15',
  notes:'Source receipt 1000 GMD',createdBy:'owner'
};
const staffData = {
  sku:safeSku,name:'iPhone Test',category:'iPhone',
  stockQty:3,unitPriceGmd:2200,receivedOn:'2026-11-15',storage:'', colour:'', batteryHealth:null, serialNumber:'', imei:''
};
try {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db=context.firestore();
    await Promise.all([
      setDoc(doc(db,'users','owner'),{role:'owner',active:true}),
      setDoc(doc(db,'users','staffA'),{role:'staff',active:true}),
      setDoc(doc(db,'users','staffB'),{role:'staff',active:true}),
      setDoc(doc(db,'users','inactive'),{role:'staff',active:false}),
      setDoc(doc(db,'products',safeSku),privateData),
      setDoc(doc(db,'staffInventory',safeSku),staffData),
      setDoc(doc(db,'sales','legacy1'),{
        productId:safeSku,unitCostGmd:1000,totalGmd:2200,paidGmd:2200
      }),
      setDoc(doc(db,'payments','privatePayment'),{saleId:'legacy1',amountGmd:2200}),
      setDoc(doc(db,'expenses','privateExpense'),{amountGmd:700}),
      setDoc(doc(db,'productDrafts','privateDraft'),{
        name:'iPhone Test',category:'iPhone',cost:'1000',
        createdBy:'owner',createdAt:new Date('2026-11-15'),updatedAt:new Date('2026-11-15'),
        updatedBy:'owner'
      }),
      setDoc(doc(db,'productIdentifiers','serial-ABCD123'),{productId:safeSku}),
      setDoc(doc(db,'trackerRecords','privateTracker'),{investment:100000})
    ]);
  });
  const owner=testEnv.authenticatedContext('owner').firestore();
  const staff=testEnv.authenticatedContext('staffA').firestore();
  const another=testEnv.authenticatedContext('staffB').firestore();
  const inactive=testEnv.authenticatedContext('inactive').firestore();
  const anonymous=testEnv.unauthenticatedContext().firestore();
  for (const [label,db] of [['anonymous',anonymous],['inactive',inactive],['staffB',another]]) {
    if(label!=='staffB')await assertFails(getDoc(doc(db,'staffInventory',safeSku)));
  }
  await assertSucceeds(getDoc(doc(staff,'staffInventory',safeSku)));
  await assertSucceeds(getDoc(doc(owner,'products',safeSku)));
  // Preserve production draft and identifier collections without exposing cost data.
  await assertSucceeds(getDoc(doc(owner,'productDrafts','privateDraft')));
  await assertSucceeds(getDoc(doc(owner,'productIdentifiers','serial-ABCD123')));
  await assertFails(getDoc(doc(staff,'productDrafts','privateDraft')));
  await assertFails(getDoc(doc(staff,'productIdentifiers','serial-ABCD123')));
  await assertFails(setDoc(doc(staff,'productDrafts','badDraft'),{name:'Leaked cost',cost:'1'}));
  await assertFails(setDoc(doc(staff,'productIdentifiers','serial-NEW'),{productId:safeSku}));
  await assertFails(updateDoc(doc(staff,'productDrafts','privateDraft'),{cost:'0'}));

  for (const path of [
    ['products',safeSku],['sales','legacy1'],['payments','privatePayment'],
    ['expenses','privateExpense'],['trackerRecords','privateTracker']
  ]) {
    await assertFails(getDoc(doc(staff,...path)));
  }
  await assertFails(updateDoc(doc(staff,'staffInventory',safeSku),{unitPriceGmd:1}));
  await assertFails(updateDoc(doc(staff,'products',safeSku),{unitCostGmd:1}));
  await assertFails(setDoc(doc(staff,'expenses','bad'),{amountGmd:20}));
  await assertFails(setDoc(doc(staff,'staffSales','unlinked'),{
    productId:safeSku,sku:safeSku,productName:'iPhone Test',quantity:1,
    unitPriceGmd:2200,totalGmd:2200,paidGmd:0,method:'Cash',
    date:'2026-11-15',createdBy:'staffA'
  }));
  const saleRef=doc(collection(staff,'staffSales'));
  const safeRef=doc(staff,'staffInventory',safeSku);
  const privateRef=doc(staff,'products',safeSku);
  await assertSucceeds(runTransaction(staff,async tx=>{
    const safe=await tx.get(safeRef);
    assert.equal(safe.data().stockQty,3);
    tx.update(safeRef,{stockQty:2,lastSaleId:saleRef.id,updatedAt:serverTimestamp()});
    tx.update(privateRef,{stockQty:increment(-1),lastSaleId:saleRef.id,updatedAt:serverTimestamp()});
    tx.set(saleRef,{
      productId:safeSku,sku:safeSku,productName:'iPhone Test',quantity:1,
      unitPriceGmd:2200,totalGmd:2200,paidGmd:2000,method:'Cash',
      date:'2026-11-15',dueOn:'2026-11-21',customer:'Test customer',
      createdBy:'staffA',createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    });
  }));
  assert.equal((await getDoc(doc(owner,'staffInventory',safeSku))).data().stockQty,2);
  assert.equal((await getDoc(doc(owner,'products',safeSku))).data().stockQty,2);
  const sale=(await getDoc(doc(owner,'staffSales',saleRef.id))).data();
  assert.equal(Object.hasOwn(sale,'unitCostGmd'),false);
  await assertSucceeds(getDoc(doc(staff,'staffSales',saleRef.id)));
  await assertFails(getDoc(doc(another,'staffSales',saleRef.id)));
  await assertFails(getDocs(collection(staff,'staffSales')));
  const mySales=await assertSucceeds(getDocs(query(collection(staff,'staffSales'),where('createdBy','==','staffA'))));
  assert.equal(mySales.docs.length,1);
  await assertSucceeds(getDocs(collection(owner,'staffSales')));
  // Payment must create a linked append-only receipt and increase paidGmd atomically.
  const payRef=doc(collection(staff,'staffPayments'));
  await assertSucceeds(runTransaction(staff,async tx=>{
    const saleDoc=await tx.get(saleRef);
    tx.update(saleRef,{
      paidGmd:Number(saleDoc.data().paidGmd)+200,
      lastPaymentId:payRef.id,updatedAt:serverTimestamp()
    });
    tx.set(payRef,{saleId:saleRef.id,amountGmd:200,method:'Wave',createdBy:'staffA',createdAt:serverTimestamp()});
  }));
  assert.equal((await getDoc(doc(owner,'staffSales',saleRef.id))).data().paidGmd,2200);
  await assertFails(getDoc(doc(another,'staffPayments',payRef.id)));
  await assertFails(updateDoc(doc(staff,'staffSales',saleRef.id),{totalGmd:1}));
  await assertFails(updateDoc(doc(staff,'staffSales',saleRef.id),{paidGmd:2001}));
  await assertFails(updateDoc(doc(staff,'staffInventory',safeSku),{stockQty:0}));
  await assertFails(setDoc(doc(staff,'staffInventory','UA-FAKE'),staffData));
  const ownerProduct = doc(owner, 'products', safeSku);
  const ownerCatalog = doc(owner, 'staffInventory', safeSku);
  await assertFails(updateDoc(ownerProduct, { unitPriceGmd: 2300 }));
  await assertFails(setDoc(ownerCatalog, {
    ...staffData, stockQty: 2, unitCostGmd: 1000, updatedAt: serverTimestamp()
  }));
  await assertSucceeds(runTransaction(owner, async (tx) => {
    tx.update(ownerProduct, { unitPriceGmd: 2300 });
    tx.set(ownerCatalog, {
      ...staffData, stockQty: 2, unitPriceGmd: 2300, updatedAt: serverTimestamp()
    });
  }));
  const staffProduct = (await getDoc(doc(staff, 'staffInventory', safeSku))).data();
  assert.equal(staffProduct.unitPriceGmd, 2300);
  assert.equal(staffProduct.unitCostGmd, undefined);
  assert.equal(staffProduct.notes, undefined);
  const workerCancel = (db, saleId, uid, productId = safeSku, restore = 1) => runTransaction(db, async (tx) => {
    const stockUpdate = { stockQty: increment(restore), lastCancellationId: saleId, updatedAt: serverTimestamp() };
    tx.update(doc(db, 'staffInventory', productId), stockUpdate);
    tx.update(doc(db, 'products', productId), stockUpdate);
    tx.update(doc(db, 'staffSales', saleId), {
      cancelledAt: serverTimestamp(), cancelledBy: uid, refundedGmd: 0
    });
  });
  await assertFails(workerCancel(staff, saleRef.id, 'staffA'));
  const staffSale = doc(owner, 'staffSales', saleRef.id);
  const cancellation = {
    cancelledAt: serverTimestamp(), cancelledBy: 'owner', refundedGmd: 2200
  };
  await assertFails(updateDoc(doc(staff, 'staffSales', saleRef.id), {
    ...cancellation, cancelledBy: 'staffA'
  }));
  await assertFails(updateDoc(staffSale, cancellation));
  const restock = (saleDocument, saleKey, stockQty, fields) => runTransaction(owner, async (tx) => {
    tx.update(ownerProduct, {
      stockQty, lastCancellationId: saleKey, updatedAt: serverTimestamp()
    });
    tx.set(ownerCatalog, {
      ...staffData, stockQty, unitPriceGmd: 2300, updatedAt: serverTimestamp()
    });
    tx.update(saleDocument, fields);
  });
  await assertFails(restock(staffSale, 'staffSales/' + saleRef.id, 3, {
    ...cancellation, refundedGmd: 0
  }));
  await assertSucceeds(restock(staffSale, 'staffSales/' + saleRef.id, 3, cancellation));
  await assertFails(restock(staffSale, 'staffSales/' + saleRef.id, 4, cancellation));
  assert.equal((await getDoc(ownerProduct)).data().stockQty, 3);
  assert.equal((await getDoc(ownerCatalog)).data().stockQty, 3);
  assert.equal((await getDoc(staffSale)).data().refundedGmd, 2200);
  assert.equal((await getDoc(staffSale)).data().paidGmd, 2200);

  const ownerSale = doc(owner, 'sales', 'owner-cancellation-test');
  await assertSucceeds(runTransaction(owner, async (tx) => {
    tx.update(ownerProduct, { stockQty: 2, updatedAt: serverTimestamp() });
    tx.set(ownerCatalog, {
      ...staffData, stockQty: 2, unitPriceGmd: 2300, updatedAt: serverTimestamp()
    });
    tx.set(ownerSale, {
      productId: safeSku, sku: safeSku, productName: 'iPhone Test', quantity: 1,
      unitPriceGmd: 2300, unitCostGmd: 1000, totalGmd: 2300, paidGmd: 0,
      date: '2026-11-15', createdBy: 'owner'
    });
  }));
  await assertSucceeds(restock(ownerSale, 'sales/' + ownerSale.id, 3, {
    ...cancellation, refundedGmd: 0
  }));
  await assertFails(updateDoc(ownerSale, { paidGmd: 100, updatedAt: serverTimestamp() }));
  assert.equal((await getDoc(ownerProduct)).data().stockQty, 3);
  assert.equal((await getDoc(ownerCatalog)).data().stockQty, 3);
  const unpaidSaleRef = doc(collection(staff, 'staffSales'));
  await assertSucceeds(runTransaction(staff, async (tx) => {
    const sold = { stockQty: increment(-1), lastSaleId: unpaidSaleRef.id, updatedAt: serverTimestamp() };
    tx.update(safeRef, sold);
    tx.update(privateRef, sold);
    tx.set(unpaidSaleRef, {
      productId: safeSku, sku: safeSku, productName: 'iPhone Test', quantity: 1,
      unitPriceGmd: 2300, totalGmd: 2300, paidGmd: 0, method: 'Cash',
      date: '2026-11-15', createdBy: 'staffA'
    });
  }));
  await assertFails(workerCancel(another, unpaidSaleRef.id, 'staffB'));
  await assertFails(workerCancel(staff, unpaidSaleRef.id, 'staffA', safeSku, 2));
  await assertFails(updateDoc(unpaidSaleRef, {
    cancelledAt: serverTimestamp(), cancelledBy: 'staffA', refundedGmd: 0
  }));
  await assertSucceeds(workerCancel(staff, unpaidSaleRef.id, 'staffA'));
  await assertFails(workerCancel(staff, unpaidSaleRef.id, 'staffA'));
  assert.equal((await getDoc(ownerProduct)).data().stockQty, 3);
  assert.equal((await getDoc(ownerCatalog)).data().stockQty, 3);
  console.log('PASS: owner-only finances, safe inventory, atomic staff sales, payments, and denied unauthorized writes');
} finally {
  await testEnv.cleanup();
}
