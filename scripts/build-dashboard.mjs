import {cp,mkdir,readFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const files=['app.js','backup.js','insights.js','performance.js','receipts.js','product-assist.js','models.js','staff.js'];
for(const file of files){const r=spawnSync(process.execPath,['--check','public/admin/'+file],{stdio:'inherit'});if(r.status!==0)process.exit(1);}
const config=JSON.parse(await readFile('firebase.dashboard-ui.json','utf8'));
if(config.hosting.site!=='uncle-apple-store'||config.hosting.public!=='public/admin'||config.firestore)throw new Error('Unsafe dashboard deployment config');
await mkdir('.dashboard-build',{recursive:true});
await rm('.dashboard-build/admin',{recursive:true,force:true});
await cp('public/admin','.dashboard-build/admin',{recursive:true});
console.log('Dashboard static build ready in .dashboard-build/admin. No deployment or database writes performed.');
