#!/usr/bin/env node
// Verify the private browser export locally. Never uploads or prints customer records.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function latestBackup() {
  const dirs = [path.join(os.homedir(), 'Downloads'), path.join(os.homedir(), 'OneDrive', 'Downloads')];
  const matches = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!/^uncle-apple-store-records-.*\.json$/i.test(name)) continue;
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isFile()) matches.push({ full, mtimeMs: stat.mtimeMs });
    }
  }
  matches.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return matches[0]?.full;
}
function main() {
  const selected = process.argv[2] ? path.resolve(process.argv[2]) : latestBackup();
  if (!selected) throw Error('No Uncle Apple Store backup JSON found in Downloads. Pass its full path as the first argument.');
  const stat = fs.statSync(selected);
  if (!stat.isFile() || stat.size === 0) throw Error('The selected backup file is empty or not a regular file.');
  const backup = JSON.parse(fs.readFileSync(selected, 'utf8'));
  const errors = [];
  const warnings = [];
  if (backup.format !== 'uncle-apple-store-owner-records-v1') errors.push('Unexpected backup file format.');
  if (backup.projectId !== 'uncle-apple-store') errors.push('Backup belongs to a different Firebase project.');
  if (backup.databaseId !== '(default)') errors.push('Backup is not from default database.');
  if (!Number.isFinite(Date.parse(backup.exportedAt))) errors.push('Missing or invalid export date.');
  if (!backup.collections || typeof backup.collections !== 'object') errors.push('Missing collections object.');
  const collections = backup.collections || {};
  const expected = ['products','productDrafts','sales','payments','losses','expenses','trackerRecords','users','productIdentifiers'];
  for (const name of expected) if (!Array.isArray(collections[name])) errors.push('Collection missing: ' + name);
  const skipped = new Set(Array.isArray(backup.skippedCollections) ? backup.skippedCollections : []);
  for (const name of ['staffInventory','staffSales','staffPayments']) {
    if (!Array.isArray(collections[name]) && !skipped.has(name)) warnings.push(name + ' was not exported or listed as skipped.');
  }
  let total = 0;
  const paths = new Set();
  const counts = {};
  for (const [name, entries] of Object.entries(collections)) {
    if (!Array.isArray(entries)) { errors.push('Non-array collection: ' + name); continue; }
    counts[name] = entries.length;
    total += entries.length;
    if (backup.counts?.[name] !== entries.length) errors.push('Count mismatch for ' + name);
    for (const entry of entries) {
      if (!entry || typeof entry.path !== 'string' || !entry.path.startsWith(name + '/') || typeof entry.data !== 'object' || entry.data === null) {
        errors.push('Malformed document in ' + name);
        continue;
      }
      if (paths.has(entry.path)) errors.push('Duplicate document path in ' + name);
      paths.add(entry.path);
    }
  }
  for (const [name, count] of Object.entries(backup.counts || {})) {
    if (counts[name] !== count) errors.push('Count references a missing collection: ' + name);
  }
  const products = collections.products || [];
  const knownIds = new Set();
  for (const item of products) {
    if (typeof item.data?.serialNumber === 'string' && item.data.serialNumber) knownIds.add('serial-' + item.data.serialNumber);
    if (typeof item.data?.imei === 'string' && item.data.imei) knownIds.add('imei-' + item.data.imei);
  }
  if (Number.isInteger(backup.knownIdentifierCount) && backup.knownIdentifierCount !== knownIds.size)
    errors.push('Identifier count disagrees with product fields.');
  for (const id of knownIds) {
    if (!paths.has('productIdentifiers/' + id)) warnings.push('A known serial/IMEI identifier document is missing from the export.');
  }
  const ownerAccounts = (collections.users || []).filter(x => x.data?.role === 'owner' && x.data?.active === true).length;
  if (ownerAccounts < 1) warnings.push('No active owner profile was found in exported users.');
  if (backup.limitations?.length) warnings.push('This export is not a complete managed backup or point-in-time snapshot.');
  console.log('Uncle Apple Store local backup verification (read-only)');
  console.log('Project:', backup.projectId, '| Database:', backup.databaseId);
  console.log('File:', path.basename(selected), '| Size:', stat.size, 'bytes');
  console.log('Exported:', backup.exportedAt);
  console.log('Record counts:');
  for (const name of Object.keys(counts).sort()) console.log('  ' + name + ': ' + counts[name]);
  console.log('  TOTAL: ' + total);
  console.log('Skipped under current permissions:', skipped.size ? [...skipped].join(', ') : 'none reported');
  console.log('Active owner profiles:', ownerAccounts);
  for (const issue of warnings) console.log('WARNING:', issue);
  for (const issue of errors) console.error('ERROR:', issue);
  if (errors.length) {
    console.error('RESULT: FAILED. Do not deploy new live Firestore rules.');
    process.exitCode = 1;
  } else {
    console.log('RESULT: STRUCTURE VERIFIED (not a full disaster-recovery or restore test).');
  }
}
try { main(); } catch (err) { console.error('Backup verification failed:', err.message); process.exitCode = 1; }
