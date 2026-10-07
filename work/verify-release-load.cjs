const {chromium}=require('./onlyoffice-browser/node_modules/@playwright/test');
const path=require('path'),fs=require('fs'),os=require('os');
(async()=>{
 const root=path.resolve(process.argv[2]);
 if(!fs.existsSync(path.join(root,'manifest.json')))throw Error('Selected extension folder has no manifest.json: '+root);
 const executablePath=process.env.CHROME_EXECUTABLE || chromium.executablePath();
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'office-release-check-'));
 const ctx=await chromium.launchPersistentContext(profile,{executablePath,headless:true,ignoreDefaultArgs:['--disable-extensions'],args:['--disable-extensions-except='+root,'--load-extension='+root]});
 try{
 const sw=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker',{timeout:15000});
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route(/https?:\/\//,r=>r.abort());
 await p.goto('chrome-extension://'+new URL(sw.url()).hostname+'/extension.html');
 await p.locator('#home').waitFor();
 await p.locator('#font-files').setInputFiles((process.env.TEST_FONT_FILES ? JSON.parse(process.env.TEST_FONT_FILES) : ['Serif.ttf','Serif-Bold.ttf','Serif-Italic.ttf','Serif-BoldItalic.ttf'].map(n=>'work/test-fonts/'+n)));
 await p.waitForFunction(()=>!document.querySelector('[data-type=docx]').disabled);
 await p.locator('[data-type=docx]').click();
 await p.waitForFunction(()=>window.__offlineEditor?.getState().status==='ready',null,{timeout:90000});
 if(errors.length)throw Error(errors.join('\n'));
 const report={manifestLoaded:true,serviceWorker:true,hub:true,fontImport:true,documentEditor:true,errors};
 fs.writeFileSync('outputs/release-load-validation.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
 }finally{await ctx.close();fs.rmSync(profile,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exit(1)});
