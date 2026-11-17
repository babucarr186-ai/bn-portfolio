// Owner-only, read-only browser export for the current Uncle Apple Store collections.
// This does not write to Firestore or upload customer data anywhere.
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import {
  getFirestore, collection, doc, getDocFromServer, getDocsFromServer, query, orderBy, documentId, limit, startAfter
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const $ = (s) => document.querySelector(s);
const feedback = (message) => { $('#feedback').textContent = message; };
const names = [
  'products', 'productDrafts', 'sales', 'payments', 'losses', 'expenses',
  'trackerRecords', 'users', 'staffInventory', 'staffSales', 'staffPayments'
];
// Optional collections are not yet permitted under the CURRENT live rules.
// Their access will only be enabled after the new staff-safe rules are deployed.
const optionalCollections = new Set(['staffInventory', 'staffSales', 'staffPayments']);
const auth = getAuth(initializeApp(firebaseConfig));
const db = getFirestore(auth.app);
let owner = null;

function encode(value) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return { __firestoreType: 'date', iso: value.toISOString() };
  if (typeof value.toDate === 'function' && Number.isInteger(value.seconds)) {
    return { __firestoreType: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (typeof value.path === 'string' && value.firestore && typeof value.id === 'string') {
    return { __firestoreType: 'reference', path: value.path };
  }
  if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
    return { __firestoreType: 'geoPoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (typeof value.toBase64 === 'function') return { __firestoreType: 'bytes', base64: value.toBase64() };
  if (Array.isArray(value)) return value.map(encode);
  const result = {};
  for (const [key, entry] of Object.entries(value)) result[key] = encode(entry);
  return result;
}

async function collect(name) {
  const entries = [];
  let last = null;
  for (;;) {
    const parts = [collection(db, name), orderBy(documentId()), limit(300)];
    if (last) parts.push(startAfter(last));
    const snap = await getDocsFromServer(query(...parts));
    entries.push(...snap.docs.map((d) => ({ path: d.ref.path, data: encode(d.data()) })));
    if (snap.docs.length < 300) break;
    last = snap.docs[snap.docs.length - 1];
  }
  return entries;
}
async function collectKnownIdentifiers(products) {
  const ids = new Set();
  for (const product of products) {
    const serial = product.data.serialNumber;
    const imei = product.data.imei;
    if (typeof serial === 'string' && serial) ids.add('serial-' + serial);
    if (typeof imei === 'string' && imei) ids.add('imei-' + imei);
  }
  const results = [];
  for (const id of ids) {
    const ref = doc(db, 'productIdentifiers', id);
    const snap = await getDocFromServer(ref);
    if (snap.exists()) results.push({ path: ref.path, data: encode(snap.data()) });
  }
  return { entries: results, knownIndexIDs: ids.size };
}
function saveAsJson(data) {
  const name = 'uncle-apple-store-records-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}
$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  try {
    await signInWithEmailAndPassword(auth, String(data.get('email')), String(data.get('password')));
    form.reset();
  } catch {
    feedback('Sign-in failed. Check credentials and owner approval.');
  }
});
$('#sign-out').addEventListener('click', () => signOut(auth));
onAuthStateChanged(auth, async (user) => {
  owner = null;
  $('#login-panel').hidden = !!user;
  $('#owner-panel').hidden = true;
  if (!user) { feedback('Sign in with your owner account.'); return; }
  try {
    const profile = await getDocFromServer(doc(db, 'users', user.uid));
    if (!profile.exists() || profile.data().role !== 'owner' || profile.data().active !== true) {
      feedback('Owner access required. Sign out to switch accounts.');
      $('#login-panel').hidden = true;
      $('#owner-panel').hidden = false;
      $('#export').disabled = true;
      $('#account').textContent = user.email || '';
      return;
    }
    owner = user;
    $('#account').textContent = user.email || '';
    $('#owner-panel').hidden = false;
    $('#export').disabled = false;
    feedback('Ready to create a read-only local record export.');
  } catch {
    feedback('Could not verify owner role. Nothing was exported.');
  }
});
$('#export').addEventListener('click', async () => {
  if (!owner || auth.currentUser?.uid !== owner.uid) return;
  const button = $('#export');
  button.disabled = true;
  try {
    const password = $('#verify-password').value;
    $('#verify-password').value = '';
    if (!password || !owner.email) throw new Error('Enter your owner password to verify this sensitive export.');
    await reauthenticateWithCredential(owner, EmailAuthProvider.credential(owner.email, password));
    const profile = await getDocFromServer(doc(db, 'users', owner.uid));
    if (profile.data()?.role !== 'owner' || profile.data()?.active !== true) throw new Error('Active owner access required.');
    const collections = {};
    const skippedCollections = [];
    for (const name of names) {
      feedback('Reading ' + name + '…');
      try {
        collections[name] = await collect(name);
      } catch (error) {
        if (optionalCollections.has(name) && error?.code === 'permission-denied') {
          skippedCollections.push(name);
          continue;
        }
        throw error;
      }
    }
    feedback('Checking known serial and IMEI index documents…');
    const identifiers = await collectKnownIdentifiers(collections.products);
    collections.productIdentifiers = identifiers.entries;
    const exportedAt = new Date().toISOString();
    const counts = Object.fromEntries(Object.entries(collections).map(([name, entries]) => [name, entries.length]));
    const payload = {
      format: 'uncle-apple-store-owner-records-v1',
      projectId: firebaseConfig.projectId,
      databaseId: '(default)',
      exportedAt,
      signedInUid: owner.uid,
      counts,
      skippedCollections,
      limitations: [
        'NOT a managed Firestore backup or atomic point-in-time snapshot',
        'Only explicitly listed root collections were exported; no unknown collections or subcollections',
        'productIdentifiers collection list is forbidden: only IDs derived from exported product fields were read',
        'Verify counts and restore procedures independently before modifying production data'
      ],
      knownIdentifierCount: identifiers.knownIndexIDs,
      collections
    };
    if (auth.currentUser?.uid !== payload.signedInUid) throw new Error('Your session changed; export cancelled.');
    saveAsJson(payload);
    feedback('Download requested. Verify the JSON file before changing live rules. ' +
      Object.values(counts).reduce((a, b) => a + b, 0) + ' document records were read.' +
      (skippedCollections.length ? ' Not accessible under current rules: ' + skippedCollections.join(', ') + '.' : ''));
  } catch (error) {
    console.error('Read-only backup failed', error);
    feedback('Export aborted; no partial file was downloaded. ' + (error?.message || 'Review Firestore permissions.'));
  } finally {
    button.disabled = false;
  }
});
