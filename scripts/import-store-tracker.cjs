// Run with the project owner's existing Firebase CLI login. Never prints credentials.
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const project = 'uncle-apple-store';
const records = JSON.parse(fs.readFileSync(process.argv[2] || 'tracker-records.json','utf8'));
function validate(rows) {
  if (!Array.isArray(rows) || rows.length !== 76) throw new Error('Expected the reviewed 76-row import.');
  const ids = new Set();
  for (const r of rows) {
    if (!/^TR[23]-R\d{3}$/.test(r.id) || ids.has(r.id)) throw new Error('Invalid or duplicate source ID.');
    ids.add(r.id);
    if (!r.name || !['sold','review','transit','refunded'].includes(r.status)) throw new Error('Invalid product record.');
    for (const k of ['costGmd','saleGmd','costEur']) if (r[k] !== null && (typeof r[k] !== 'number' || !Number.isFinite(r[k]) || r[k]<0)) throw new Error('Invalid amount.');
  }
}
validate(records);
if(process.argv.includes('--validate-only')) { console.log('Validated 76 records with unique IDs; missing amounts preserved as unknown.'); process.exit(0); }
function field(v) {
  if (v === null) return {nullValue:null};
  if (typeof v === 'number') return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
  return {stringValue:String(v)};
}
(async()=>{
  const root=process.env.FIREBASE_TOOLS_MODULE || path.join(execSync('npm root -g',{encoding:'utf8'}).trim(),'firebase-tools');
  const auth=require(path.join(root,'lib/auth.js'));
  const {requireAuth}=require(path.join(root,'lib/requireAuth.js'));
  const {Client}=require(path.join(root,'lib/apiv2.js'));
  const account=auth.getGlobalDefaultAccount();
  if(!account) throw new Error('Run firebase login with your business Google account first.');
  await requireAuth({project,...account});
  const client=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
  const base=`projects/${project}/databases/(default)/documents`;
  const owner=await client.get(`${base}/users/dGj4IKmKakX0yYhLaDqEob72l053`);
  if(owner.body.fields?.role?.stringValue!=='owner' || owner.body.fields?.active?.booleanValue!==true) throw new Error('Approved owner record was not found. Nothing imported.');
  const writes=[];
  for(const r of records) {
    const name=`${base}/trackerRecords/${r.id}`;
    const fields=Object.fromEntries(Object.entries(r).map(([k,v])=>[k,field(v)]));
    const existing=await client.get(name,{resolveOnHTTPError:true});
    if(existing.status===200) {
      if(JSON.stringify(Object.keys(fields).sort().map(k=>[k,fields[k]]))!==JSON.stringify(Object.keys(fields).sort().map(k=>[k,existing.body.fields[k]]))) throw new Error(`Source record ${r.id} differs from existing data; stopped without overwriting.`);
      continue;
    }
    if(existing.status!==404) throw new Error(`Cannot check source record ${r.id} (HTTP ${existing.status}).`);
    writes.push({update:{name,fields},currentDocument:{exists:false}});
  }
  if(writes.length) await client.post(`${base}:commit`,{writes});
  const result=await client.post(`${base}:batchGet`,{documents:records.map(r=>`${base}/trackerRecords/${r.id}`)});
  const items=typeof result.body==='string'?JSON.parse(result.body):result.body;
  if(!Array.isArray(items) || items.filter(x=>x.found).length!==76) throw new Error('Import verification incomplete; rerun is safe.');
  console.log(`Verified 76 tracker records. Created ${writes.length}; existing records preserved.`);
})().catch(e=>{console.error('Import stopped:',e.message);process.exitCode=1;});
