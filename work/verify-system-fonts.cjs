const {chromium}=require('./onlyoffice-browser/node_modules/@playwright/test');
const fs=require('fs'),path=require('path');
(async()=>{
 const root=path.resolve('work/onlyoffice-browser/extension-build-v0.6');
 const ctx=await chromium.launchPersistentContext('/tmp/onlyoffice-system-fonts-v3d',{executablePath:path.resolve('work/browsers/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,viewport:{width:1440,height:1000},args:['--disable-extensions-except='+root,'--load-extension='+root]});
 try {
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'),origin='chrome-extension://'+new URL(worker.url()).hostname,results=[];
  fs.mkdirSync('work/system-saved',{recursive:true});
  const grant=await ctx.newPage();const permissionSession=await ctx.newCDPSession(grant);await permissionSession.send('Browser.grantPermissions',{origin,permissions:['localFonts']});
  for(const [type,ext] of [['Document','docx'],['Spreadsheet','xlsx'],['Presentation','pptx']]) {
   const p=await ctx.newPage(),errors=[];p.on('console',message=>{if(message.type()==='error')console.log('CONSOLE',message.text());});p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>errors.push(r.url()+': '+r.failure().errorText));p.on('dialog',d=>{console.log('DIALOG',d.message());d.dismiss();});
   await p.route(/https?:\/\//,r=>r.abort());await p.goto(origin+'/extension.html');
console.log('FONT INIT',await p.evaluate(async()=>({status:document.querySelector('#font-status').textContent,supported:!!window.queryLocalFonts,permission:await navigator.permissions.query({name:'local-fonts'}).then(p=>p.state).catch(e=>e.message)})));
if(!await p.locator('#computer-fonts').isDisabled())await p.locator('#computer-fonts').click();
   await p.waitForFunction(()=>Boolean(window.__officeFonts)||document.querySelector('#font-status')?.textContent.includes('Use Import font files'),null,{timeout:120000});
if(!await p.evaluate(()=>Boolean(window.__officeFonts)))throw new Error(await p.locator('#font-status').innerText());
await p.waitForFunction(()=>!document.querySelector('[data-type=docx]').disabled);
   const catalog=await p.evaluate(()=>({families:window.__officeFonts.catalog.__fonts_visible_names,faces:window.__officeFonts.faces.length,files:Object.keys(window.__officeFonts.files).length,bytes:Object.values(window.__officeFonts.files).reduce((n,b)=>n+b.size,0),skipped:window.__officeFonts.skipped}));console.log(type,'system fonts',catalog.faces,catalog.families.length,catalog.bytes,catalog.skipped);
   if(!catalog.families.includes('Arial')||!catalog.families.includes('Times New Roman'))throw new Error('Core installed fonts missing');
   await p.getByRole('button',{name:type,exact:true}).click();await p.waitForFunction(()=>window.__offlineEditor?.getState().status==='ready',null,{timeout:90000});
   const f=p.frames().find(f=>f.url().includes('/main/index.html'));console.log(type,'ready');
   const mismatches=await f.evaluate(()=>window.__fonts_visible_names.filter(name=>window.AscFonts.g_fontApplication.GetFontInfo(name).Name!==name));if(mismatches.length)throw new Error('Font resolver mismatch: '+mismatches);
   if(type==='Document'){await f.evaluate(()=>window.Asc.editor.pluginMethod_PasteText('System font validation — Ελληνικά Русский العربية 中文'));await f.locator('#id-toolbar-btn-select-all').click();}
   else if(type==='Spreadsheet'){await p.mouse.click(200,320);await p.keyboard.type('System font validation');await p.keyboard.press('Enter');await p.mouse.click(200,320);}
   else {await f.evaluate(()=>window.Asc.editor.AddSlide());await p.mouse.dblclick(460,360);await p.keyboard.type('System font validation');await p.keyboard.press('ControlOrMeta+A');}
   const font=f.locator('.combobox.fonts input').first();await font.fill('Times New Roman');await font.press('Enter');await p.waitForTimeout(1000);
   if(await f.locator('.modal:visible').count())throw new Error('Unexpected font warning');
   if(type==='Document'){await f.locator('#id-toolbar-btn-bold').click();await f.locator('#id-toolbar-btn-italic').click();await f.locator('.combobox.fonts button').first().click();await p.waitForTimeout(500);await p.screenshot({path:'work/system-saved/font-picker.png'});await font.press('Escape');}
   await f.getByText('File',{exact:true}).first().click();const formats=await f.locator('.btn-doc-format[format]:visible').evaluateAll(es=>es.map(e=>e.getAttribute('format')));if(formats.some(x=>!({Document:['65','67','68','513'],Spreadsheet:['257','259','513'],Presentation:['129','131','513']})[type].includes(x)))throw new Error('Unsupported export visible');await f.locator('#fm-btn-return').click();
   const downloaded=p.waitForEvent('download',{timeout:90000});await f.getByRole('button',{name:/^Save \(/}).first().click();const download=await downloaded;await download.saveAs('work/system-saved/validation.'+ext);await p.waitForFunction(()=>!window.__offlineEditor.getState().dirty);await p.screenshot({path:'work/system-saved/'+ext+'.png'});
   const used=await p.evaluate(()=>Array.from(window.__officeFonts.used));console.log(type,'saved',used.length,'used font files');if(errors.length)throw new Error(errors.join('\n'));
   results.push({type,catalog,used,formats,errors,file:{name:download.suggestedFilename(),size:fs.statSync('work/system-saved/validation.'+ext).size}});await p.close();
   const reopened=await ctx.newPage();await reopened.route(/https?:\/\//,r=>r.abort());await reopened.goto(origin+'/extension.html');if(!await reopened.locator('#computer-fonts').isDisabled())await reopened.locator('#computer-fonts').click();await reopened.waitForFunction(()=>Boolean(window.__officeFonts)&&!document.querySelector('#open').disabled,null,{timeout:180000});await reopened.locator('#file').setInputFiles('work/system-saved/validation.'+ext);await reopened.waitForFunction(()=>window.__offlineEditor?.getState().status==='ready',null,{timeout:90000});console.log(type,'reopened');
   if(type==='Document'){const rf=reopened.frames().find(f=>f.url().includes('/main/index.html'));await rf.locator('#id-toolbar-btn-select-all').click();const actual=await rf.locator('.combobox.fonts input').first().inputValue();if(actual!=='Times New Roman')throw new Error('Font lost: '+actual);}
   await reopened.close();
  }
  fs.writeFileSync('work/system-validation.json',JSON.stringify(results,null,2));
 } finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exit(1)});
