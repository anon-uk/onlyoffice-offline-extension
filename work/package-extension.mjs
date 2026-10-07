import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { getRuntimeAssetPack } from './onlyoffice-browser/scripts/build-onlyoffice-runtime-assets.mjs';
const require = createRequire(import.meta.url);
const { parse } = require('./onlyoffice-browser/node_modules/@babel/parser');
const sharp = require('./onlyoffice-browser/node_modules/sharp');
const root = path.resolve('work/onlyoffice-browser/extension-build-v0.6');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
// Keep the original editor shells and all their UI languages/help. Drop unused editors,
// duplicate HTTP compression payloads and dictionaries not used by this build.
for (const file of walk(root)) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  if (/\.(br|map)$/.test(file) || relative.startsWith('fixtures/') ||
      (/^(web-apps|sdkjs|dictionaries|wasm|libs)\//.test(relative) &&
       !getRuntimeAssetPack(relative, { keepHelp: true, dictionaries: ['en_US'], types: ['word', 'cell', 'slide'] }))) {
    fs.rmSync(file);
  }
}
// Document fonts now come from Chrome Local Font Access or user imports.
fs.rmSync(root + '/fonts', { recursive: true, force: true });
fs.mkdirSync(root + '/server/FileConverter/bin', { recursive: true });
const bootstrap = `(() => { const fonts = window.top.__officeFonts; if (!fonts) throw new Error('Choose computer fonts or import font files first.'); Object.assign(window, fonts.catalog); })();`;
fs.writeFileSync(root + '/sdkjs/common/AllFonts.js', bootstrap);
fs.writeFileSync(root + '/server/FileConverter/bin/AllFonts.js', bootstrap);
const repair = spawnSync('python3', ['work/repair-assets.py'], { stdio: 'inherit' });
if (repair.status !== 0) throw new Error('Asset repair failed');
fs.copyFileSync('work/onlyoffice-browser/node_modules/sval/dist/sval.umd.cjs', root + '/sval.js');
fs.copyFileSync('work/template-fallback.js', root + '/template-fallback.js');
fs.copyFileSync('work/core-ui.js', root + '/core-ui.js');
const bodies = JSON.parse(fs.readFileSync('work/captured-bodies.json', 'utf8'));
const table = bodies.map(body => JSON.stringify(body) + ':function(obj,_){' + body + '}').join(',\n');
fs.writeFileSync(root + '/csp-templates.js', 'var __officeFunctionBodies={' + table + '};\nfunction __officeCompiledFunction(body){var fn=__officeFunctionBodies[body];if(fn)return fn;throw new Error("Template requires interpreter");}\n');
let inlineCount = 0;
for (const file of walk(root)) {
  if (!file.endsWith('.html')) continue;
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (all, attrs, code) => {
    if (/\bsrc\s*=|type\s*=\s*["'](?:text\/template|application\/json)/i.test(attrs) || !code.trim()) return all;
    const name = 'inline-' + (++inlineCount) + '.js';
    fs.writeFileSync(path.join(path.dirname(file), name), code);
    return '<script' + attrs + ' src="' + name + '"></script>';
  });
  html = html.replace(/\s+onload="this.media='all'"/g, '').replace(/media="print"/g, 'media="all"');
  html = html.replace(/<head>/i, '<head><script src="/sval.js"></script><script src="/csp-templates.js"></script><script src="/template-fallback.js"></script><script src="/core-ui.js"></script>');
  fs.writeFileSync(file, html);
}
for (const file of walk(root)) {
  if (!file.endsWith('.js') || /\/(?:sval|csp-templates|template-fallback)\.js$/.test(file)) continue;
  let js = fs.readFileSync(file, 'utf8');
  js = js.replace(/new Function\([A-Za-z_$][\w$]*,"_",([A-Za-z_$][\w$]*)\)/g, '__officeCompiledFunction($1)');
  // Native FreeType needs bytes, not CSS names. Read the tab's Blob URLs.
  js = js.replace('CFontFileLoader.prototype.LoadFontArrayBuffer=function(basePath){var xhr', 'CFontFileLoader.prototype.LoadFontArrayBuffer=async function(basePath){var url;try{url=await window.top.__officeFonts.resolveUrl(this.Id)}catch(error){this.Status=2;window.Asc.editor.sendEvent("asc_onError",Asc.c_oAscError.ID.LoadingFontError,Asc.c_oAscError.Level.Critical);return}var xhr');
  js = js.replace('xhr.open("GET",basePath+this.Id,true)', 'xhr.open("GET",url,true)');
  js = js.replace('this.image.src=s[a].path', 'this.image.src=window.top.__officeFonts?.thumbnails[a]||s[a].path');
  // Extension pages cannot register the web editor's HTTP service worker.
  js = js.replace(/if\("serviceWorker"in navigator&&/g, 'if(window.location.protocol!=="chrome-extension:"&&"serviceWorker"in navigator&&');
  if (js.includes('new Function(')) {
    const ast = parse(js, { sourceType: 'unambiguous', errorRecovery: true });
    const edits = [];
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'NewExpression' && node.callee?.name === 'Function' && node.arguments.every(a => a.type === 'StringLiteral')) {
        const args = node.arguments.map(a => a.value);
        const body = args.pop();
        edits.push([node.start, node.end, '(function(' + args.join(',') + '){' + body + '})']);
      }
      for (const [key, value] of Object.entries(node)) {
        if (key === 'loc' || key === 'comments') continue;
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    };
    visit(ast);
    for (const [start, end, replacement] of edits.sort((a,b) => b[0]-a[0])) js = js.slice(0,start) + replacement + js.slice(end);
  }
  fs.writeFileSync(file, js);
}
const logo = fs.readFileSync(root + '/web-apps/apps/common/main/resources/img/about/logo_s.svg', 'utf8');
fs.copyFileSync(root + '/web-apps/apps/common/main/resources/img/about/logo_s.svg', root + '/onlyoffice-logo.svg');
const mark = logo.replace('width="245" height="45"', 'width="128" height="128" viewBox="-5 -7 59 59"');
fs.mkdirSync(root + '/icons', { recursive: true });
for (const size of [16, 32, 48, 128]) await sharp(Buffer.from(mark)).resize(size,size).png().toFile(root + '/icons/onlyoffice-' + size + '.png');
const icons = Object.fromEntries([16,32,48,128].map(size => [size, 'icons/onlyoffice-' + size + '.png']));
fs.writeFileSync(root + '/manifest.json', JSON.stringify({
  manifest_version: 3, name: 'ONLYOFFICE Offline (Unofficial)', version: '0.6.1',
  description: 'Unofficial offline ONLYOFFICE document, spreadsheet and presentation editors. Use computer fonts and save local files.',
  icons, action: { default_title: 'Open ONLYOFFICE Offline', default_icon: icons },
  background: { service_worker: 'background.js' },
  content_security_policy: { extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' blob: data:; img-src 'self' blob: data:;" }
}, null, 2));
fs.writeFileSync(root + '/background.js', "chrome.action.onClicked.addListener(() => chrome.tabs.create({url: chrome.runtime.getURL('extension.html')}));\n");
fs.copyFileSync('work/onlyoffice-browser/LICENSE', root + '/LICENSE');
fs.copyFileSync('work/NOTICE.md', root + '/NOTICE.md');
fs.writeFileSync(root + '/FONT-NOTICE.md', 'No redistributable document font library is bundled. Fonts are read from Chrome Local Font Access or user-selected files. Computer font bytes remain in the tab; imported files can be remembered locally. Font files are never uploaded. Original engine/UI assets retain their own notices.\n');
fs.copyFileSync('work/onlyoffice-browser/node_modules/sval/LICENSE', root + '/SVAL-LICENSE');
console.log({ templates: bodies.length, inlineScripts: inlineCount, root });
