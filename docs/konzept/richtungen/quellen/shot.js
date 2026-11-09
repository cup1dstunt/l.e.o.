const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const f=process.argv[2];
const p=await b.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:1.5});
await p.goto('file://'+process.cwd()+'/'+f+'.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
const ids=await p.$$eval('.shot',e=>e.map(x=>x.id));
require('fs').mkdirSync('out',{recursive:true});
for(const id of ids){await (await p.$('#'+id)).screenshot({path:'out/'+id+'.png'});}
console.log(ids);await b.close()})();
