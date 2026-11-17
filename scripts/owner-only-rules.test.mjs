// Local emulator only. Install @firebase/rules-unit-testing@5 and firebase@12 for this suite.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,setDoc,updateDoc,collection,runTransaction,serverTimestamp} from 'firebase/firestore';
if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Set FIRESTORE_EMULATOR_HOST to a local emulator; never run against production.');
const env=await initializeTestEnvironment({projectId:'demo-uas-owner-isolation',firestore:{rules:fs.readFileSync('firestore.owner-only.rules','utf8')}});
try {
 await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();for(const [uid,role,active] of [['owner','owner',true],['staff','staff',true],['inactive','owner',false]])await setDoc(doc(db,'users',uid),{role,active});
 for(const name of ['sales','payments','expenses','losses','productDrafts','productIdentifiers','trackerRecords'])await setDoc(doc(db,name,'private'),{unitCostGmd:100});});
 const owner=env.authenticatedContext('owner').firestore(),staff=env.authenticatedContext('staff').firestore();
 const product={sku:'TEST',name:'Synthetic device',category:'iPhone',stockQty:1,unitCostGmd:100,unitPriceGmd:150,receivedOn:'2026-11-17',createdBy:'owner'};
 await assertSucceeds(setDoc(doc(owner,'products','TEST'),product));
 for(const name of ['products','sales','payments','expenses','losses','productDrafts','productIdentifiers','trackerRecords']){
  const id=name==='products'?'TEST':'private';await assertSucceeds(getDoc(doc(owner,name,id)));
  await assertFails(getDoc(doc(staff,name,id)));await assertFails(getDocs(collection(staff,name)));
  await assertFails(setDoc(doc(staff,name,'forbidden'),product));await assertFails(updateDoc(doc(staff,name,id),{unitCostGmd:0}));
 }
 for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('inactive').firestore()])await assertFails(getDocs(collection(db,'products')));
 await assertFails(updateDoc(doc(staff,'users','staff'),{role:'owner'}));await assertFails(setDoc(doc(staff,'users','new-owner'),{role:'owner',active:true}));
 await assertSucceeds(runTransaction(owner,async tx=>{const ref=doc(owner,'products','TEST');const snap=await tx.get(ref);tx.update(ref,{stockQty:snap.data().stockQty-1,updatedAt:serverTimestamp()});tx.set(doc(owner,'sales','new-sale'),{productId:'TEST',productName:product.name,sku:'TEST',quantity:1,unitCostGmd:100,unitPriceGmd:150,totalGmd:150,paidGmd:50,createdBy:'owner',date:'2026-11-17'});tx.set(doc(owner,'payments','new-payment'),{saleId:'new-sale',amountGmd:50,method:'Cash',createdBy:'owner'});}));
 assert.equal((await getDoc(doc(owner,'products','TEST'))).data().stockQty,0);
 console.log('PASS: owner reads and atomic sale; staff get/list/create/update denied across eight collections; anonymous/inactive denied; role promotion denied.');
}finally{await env.cleanup();}
