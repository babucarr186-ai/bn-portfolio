// Exercise the real staff and owner pages against local Auth/Firestore emulators.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

const projectId = 'demo-uas-staff-permissions';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
assert.ok(authHost && firestoreHost, 'Start both emulators before running this test.');
for (const host of [authHost, firestoreHost]) assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/);
const [dbHost, dbPort] = firestoreHost.split(':');
const testEnv = await initializeTestEnvironment({ projectId });
const password = 'sample-emulator-only-password';
const origin = 'http://127.0.0.1:4173';
const sdk = await build({
  bundle: true, write: false, format: 'esm',
  stdin: { resolveDir: process.cwd(), contents: `
    import { getAuth as rawAuth, connectAuthEmulator } from 'firebase/auth';
    import { getFirestore as rawFirestore, connectFirestoreEmulator } from 'firebase/firestore';
    export * from 'firebase/app';
    export * from 'firebase/auth';
    export * from 'firebase/firestore';
    const connected = new WeakSet();
    export function getAuth(app) {
      const auth = rawAuth(app);
      if (!connected.has(auth)) {
        connectAuthEmulator(auth, 'http://${authHost}', { disableWarnings: true });
        connected.add(auth);
      }
      return auth;
    }
    export function getFirestore(app) {
      const db = rawFirestore(app);
      if (!connected.has(db)) {
        connectFirestoreEmulator(db, '${dbHost}', ${Number(dbPort)});
        connected.add(db);
      }
      return db;
    }
  ` }
});
const fakeConfig = { apiKey: 'test-emulator-key', projectId, appId: '1:123:web:456' };

async function createEmulatorUser(email, role) {
  const res = await fetch('http://' + authHost + '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-emulator-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  assert.equal(res.status, 200);
  const { localId } = await res.json();
  if (role) await testEnv.withSecurityRulesDisabled((context) =>
    setDoc(doc(context.firestore(), 'users', localId), { role, active: true }));
}
async function stubSdk(page) {
  await page.route('**/emulator-sdk.js', (route) => route.fulfill({
    contentType: 'text/javascript', body: sdk.outputFiles[0].text
  }));
  await page.route('**/firebase-config.js', (route) => route.fulfill({
    contentType: 'text/javascript', body: 'export const firebaseConfig = ' + JSON.stringify(fakeConfig)
  }));
  await page.route(/\/(app|staff)\.js\?/, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const source = await readFile('public/admin' + path, 'utf8');
    await route.fulfill({
      contentType: 'text/javascript',
      body: source.replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/firebase-(app|auth|firestore)\.js/g, './emulator-sdk.js')
    });
  });
}
async function signIn(page, email) {
  const login = page.locator('#login-form');
  await login.locator('[name=email]').fill(email);
  await login.locator('[name=password]').fill(password);
  await login.locator('button[type=submit], button:not([type])').click();
}

const browser = await chromium.launch();
try {
  await testEnv.clearFirestore();
  await createEmulatorUser('owner@example.test', 'owner');
  await createEmulatorUser('staff@example.test', 'staff');
  await createEmulatorUser('unapproved@example.test');
  const sku = 'TEST-DEVICE';
  await testEnv.withSecurityRulesDisabled((context) =>
    setDoc(doc(context.firestore(), 'products', sku), {
      sku, name: 'Sample iPhone', category: 'iPhone', stockQty: 1, serialNumber: 'TEST12345',
      imei: '490154203237518', unitCostGmd: 1000, unitPriceGmd: 2200, notes: 'Owner-only fixture'
    }));
  const owner = await browser.newPage();
  const staff = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const page of [owner, staff]) await stubSdk(page);
  await owner.goto(origin);
  await signIn(owner, 'owner@example.test');
  await owner.getByRole('heading', { name: 'Store performance' }).waitFor();
  await owner.getByRole('button', { name: 'Products', exact: true }).click();
  await owner.getByRole('button', { name: 'Publish existing stock for staff' }).click();
  await owner.getByText('1 product lines published for staff.').waitFor();

  await staff.goto(origin);
  await signIn(staff, 'unapproved@example.test');
  await staff.locator('#approval-panel').waitFor({ state: 'visible' });
  await staff.locator('#approval-logout').click();
  await signIn(staff, 'staff@example.test');
  await staff.getByRole('heading', { name: 'Staff dashboard' }).waitFor();
  assert.match(staff.url(), /\/staff\.html$/);
  const search = staff.locator('#search');
  await search.fill('unknown');
  await staff.locator('#empty-stock').waitFor();
  for (const identifier of ['test-12345', '490154203237518']) {
    await search.fill(identifier);
    await staff.getByText('Sample iPhone', { exact: true }).waitFor();
  }
  assert.equal(await staff.getByText('Owner-only fixture').count(), 0);
  await staff.getByRole('button', { name: 'Sell', exact: true }).click();
  assert.equal(await staff.locator('#sale-product').inputValue(), sku);
  await staff.locator('#sale-form [name=paid]').fill('200');
  await staff.locator('#sale-form [name=customer]').fill('Customer test');
  await staff.getByRole('button', { name: 'Save sale and reduce stock' }).click();
  await staff.getByText('Sale saved. Stock updated.', { exact: true }).waitFor();
  await staff.getByRole('button', { name: 'Customer payments', exact: true }).click();
  const outstanding = staff.locator('#payment-sale');
  const saleId = await outstanding.locator('option').nth(1).getAttribute('value');
  await outstanding.selectOption(saleId);
  await staff.locator('#payment-form [name=amount]').fill('300');
  await staff.getByRole('button', { name: 'Save payment' }).click();
  await staff.getByText('Payment recorded.', { exact: true }).waitFor();
  await staff.getByText('Balance: D 1,700', { exact: true }).waitFor();

  await owner.getByRole('button', { name: 'Refresh', exact: true }).click();
  await owner.getByText('Records refreshed.', { exact: true }).waitFor();
  await owner.getByRole('button', { name: 'Sales', exact: true }).click();
  assert.match(await owner.locator('#sales-rows').innerText(), /Staff sale[\s\S]*D 500[\s\S]*D 1,700/);
  await owner.locator('#payment-sale').selectOption('staff/' + saleId);
  await owner.locator('#payment-form [name=amount]').fill('1700');
  await owner.locator('#payment-form button[type=submit]').click();
  await owner.getByText('Payment recorded.', { exact: true }).waitFor();
  assert.match(await owner.locator('#sales-rows').innerText(), /D 2,200\s+D 2,200\s+D 0/);
  await owner.getByRole('button', { name: 'Home', exact: true }).click();
  await owner.locator('#store-insights').getByText('D 1,200', { exact: true }).waitFor();
  console.log('PASS: owner sign-in and publication; unapproved account denied; staff sign-in, identifier search, sale and payment; owner payment and profit chart.');
} finally {
  await browser.close();
  await testEnv.cleanup();
}
