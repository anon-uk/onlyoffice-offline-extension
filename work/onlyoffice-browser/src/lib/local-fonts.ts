import { parseFont,fontMetadata,fontFingerprint,type FontFaceRecord } from './local-font-sfnt';
import {buildCatalog,catalogAssets,type FontCatalog} from './local-font-catalog';
import type {ConversionWorkerOperation} from './conversion-worker-protocol';
interface BrowserFont {family:string;style:string;postscriptName:string;blob():Promise<Blob>}
declare global {
  interface Window {
    queryLocalFonts?:()=>Promise<BrowserFont[]>;
    __officeFonts?:LocalFontSet;
  }
  var __officeFontAssets:Record<string,Blob>|undefined;
}
export interface LocalFontSet {
  catalog:FontCatalog;files:Record<string,Blob>;faces:FontFaceRecord[];urls:Record<string,string>;
  resolveUrl:(file:string)=>Promise<string>;readFile:(file:string)=>Promise<Blob>;cacheBytes:()=>number;diagnostics:{metadataCacheHits:number;metadataReads:number;previewCacheHit:boolean;prepareMs:number};previewFaces:FontFace[];thumbnails:string[];assets:Record<string,Blob>;used:Set<string>;source:'system'|'import';skipped:string[];
}
const importedDatabase='onlyoffice-imported-fonts-v2';
export async function savedImportedFonts():Promise<File[]> {
  const db=await database();try{return await new Promise((resolve,reject)=>{const r=db.transaction('files').objectStore('files').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}
}
function database():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{const r=indexedDB.open(importedDatabase,1);r.onupgradeneeded=()=>r.result.createObjectStore('files',{autoIncrement:true});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
export async function rememberImportedFonts(files:File[]):Promise<void> {
  const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite'),store=tx.objectStore('files');store.clear();for(const file of files)store.put(file);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
export async function clearImportedFonts():Promise<void>{await rememberImportedFonts([]);}
export function releaseFonts():void {
  const old=window.__officeFonts;if(!old)return;
  for(const url of [...Object.values(old.urls),...old.thumbnails])URL.revokeObjectURL(url);
  for(const face of old.previewFaces)document.fonts.delete(face);
  window.__officeFonts=undefined;globalThis.__officeFontAssets=undefined;
}
async function install(sources:{blob:()=>Promise<Blob>;hint?:BrowserFont;label:string}[],source:'system'|'import',progress:(message:string)=>void,refresh=false):Promise<LocalFontSet> {
  const started=performance.now(),diagnostics={metadataCacheHits:0,metadataReads:0,previewCacheHit:false,prepareMs:0};
  const metadataCache=source==='system'?await openMetadataCache():null;
  const cached=new Map<string,CachedFont>();
  if(metadataCache)try{for(const entry of await readMetadataCache(metadataCache))cached.set(entry.key,entry);}catch{/* Rebuild after a cache read failure. */}
  const updates:CachedFont[]=[];
  const readers:Record<string,()=>Promise<Blob>>={},files:Record<string,Blob>={},faces:FontFaceRecord[]=[],hashes=new Map<string,string>(),skipped:string[]=[];
  for(let i=0;i<sources.length;i++) {
    const input=sources[i];progress(`Reading fonts ${i+1} of ${sources.length}…`);
    try {
      if(/last.?resort/i.test(input.label))throw new Error('Last-resort box font');
      const key=input.hint?JSON.stringify([input.hint.postscriptName,input.hint.family,input.hint.style]):input.label;
      const entry=cached.get(key);let hash:string,parsed:FontFaceRecord[];
      if(entry&&!refresh){diagnostics.metadataCacheHits++;if(entry.error)throw new Error(entry.error);hash=entry.hash;parsed=entry.faces;}
      else {
        const blob=await input.blob();
        if(blob.size>100*1024*1024){if(metadataCache)updates.push({key,stamp:'oversize:'+blob.size,hash:'',faces:[],error:'Font file exceeds 100 MB'});throw new Error('Font file exceeds 100 MB');}
        const stamp=metadataCache?await fontFingerprint(blob):'';
        if(entry&&entry.stamp===stamp){diagnostics.metadataCacheHits++;if(entry.error)throw new Error(entry.error);hash=entry.hash;parsed=entry.faces;}
        else {
          diagnostics.metadataReads++;
          const data=await fontMetadata(blob),digest=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
          hash=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
          try{parsed=parseFont(data,'',input.hint);}catch(error){if(metadataCache)updates.push({key,stamp,hash,faces:[],error:error instanceof Error?error.message:String(error)});throw error;}
          if(metadataCache)updates.push({key,stamp,hash,faces:parsed});
        }
      }
      let file=hashes.get(hash);if(!file)file=`local-${String(hashes.size).padStart(4,'0')}.ttf`;
      parsed=parsed.map(face=>({...face,file}));
      if(!hashes.has(hash)){hashes.set(hash,file);readers[file]=input.blob;}
      for(const face of parsed)if(!faces.some(f=>f.file===face.file&&f.face===face.face&&f.family===face.family&&f.style===face.style))faces.push(face);
    } catch(error) {skipped.push(input.label+': '+(error instanceof Error?error.message:String(error)));}
  }
  if(metadataCache){try{await writeMetadataCache(metadataCache,updates);}catch{/* Caching is optional. */}finally{metadataCache.close();}}
  if(!faces.length)throw new Error('No usable fonts were read. Import a regular TTF/OTF font or enable computer font access.');
  progress('Building the font picker and character fallback…');await new Promise(resolve=>setTimeout(resolve,0));
  const catalog=buildCatalog(faces),urls:Record<string,string>={},thumbnails:string[]=[],previewFaces:FontFace[]=[];
  const previewKey=JSON.stringify([Array.from(hashes.keys()),catalog.__fonts_infos]),previewBlobs:Blob[]=[];
  const savedPreviews=await readPreviews(previewKey);
  try {
    if(savedPreviews){diagnostics.previewCacheHit=true;for(const blob of savedPreviews)thumbnails.push(URL.createObjectURL(blob));}
    else {
    // System previews use CSS local fonts. Imported preview faces exist only
    // while drawing one label, then are removed instead of retaining a library.
    for(const ratio of [1,1.25,1.5,1.75,2]) {
      const canvas=document.createElement('canvas');canvas.width=300*ratio;canvas.height=28*ratio*catalog.__fonts_infos.length;
      const context=canvas.getContext('2d')!;context.fillStyle='#000';context.textBaseline='top';
      for(let i=0;i<catalog.__fonts_infos.length;i++) {
        const row=catalog.__fonts_infos[i],name=String(row[0]),previewFamily=catalog.__fonts_visible_names.includes(name)?name:String(catalog.__fonts_infos.find(r=>r[1]===row[1]&&catalog.__fonts_visible_names.includes(String(r[0])))?.[0]||name);
        let preview:FontFace|undefined,previewUrl:string|undefined;
        try {
          if(source==='import') {
            const face=faces.find(face=>face.family===previewFamily&&!face.bold&&!face.italic)||faces.find(face=>face.family===previewFamily);
            if(face){previewUrl=URL.createObjectURL(await readers[face.file]());preview=new FontFace(previewFamily,`url(${JSON.stringify(previewUrl)})`);await preview.load();document.fonts.add(preview);}
          }
          context.font=`${18*ratio}px ${JSON.stringify(previewFamily)}, sans-serif`;context.fillText(name,3*ratio,(i*28+3)*ratio,294*ratio);
        } catch {
          context.font=`${18*ratio}px sans-serif`;context.fillText(name,3*ratio,(i*28+3)*ratio,294*ratio);
        } finally {if(preview)document.fonts.delete(preview);if(previewUrl)URL.revokeObjectURL(previewUrl);}
      }
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not create font previews'))));previewBlobs.push(blob);thumbnails.push(URL.createObjectURL(blob));canvas.width=canvas.height=0;
    }
    }
    if(previewBlobs.length)await rememberPreviews(previewKey,previewBlobs);
  } catch(error){Object.values(urls).forEach(url=>URL.revokeObjectURL(url));thumbnails.forEach(url=>URL.revokeObjectURL(url));previewFaces.forEach(face=>document.fonts.delete(face));throw error;}
  const pending=new Map<string,Promise<Blob>>(),lru=new Map<string,number>();const limit=32*1024*1024;
  const cacheBytes=()=>Object.values(files).reduce((sum,blob)=>sum+blob.size,0);
  const readFile=async(file:string):Promise<Blob>=>{
    if(files[file]){lru.delete(file);lru.set(file,Date.now());return files[file];}
    if(pending.has(file))return pending.get(file)!;
    if(!readers[file])throw new Error('Unknown local font');
    const request=readers[file]().then(blob=>{
      files[file]=blob;lru.set(file,Date.now());
      while(cacheBytes()>limit&&lru.size>1){const oldest=lru.keys().next().value!;lru.delete(oldest);delete files[oldest];if(urls[oldest]){URL.revokeObjectURL(urls[oldest]);delete urls[oldest];}}
      return blob;
    }).finally(()=>pending.delete(file));pending.set(file,request);return request;
  };
  const resolveUrl=async(file:string)=>{
    const blob=await readFile(file);set.used.add(file);
    return urls[file]||(urls[file]=URL.createObjectURL(blob));
  };
  const assets=catalogAssets(catalog,{}),set:LocalFontSet={catalog,files,faces,urls,resolveUrl,readFile,cacheBytes,diagnostics,previewFaces,thumbnails,assets,used:new Set(),source,skipped};
  diagnostics.prepareMs=performance.now()-started;
  releaseFonts();window.__officeFonts=set;globalThis.__officeFontAssets=assets;
  return set;
}
export async function useSystemFonts(progress:(message:string)=>void,refresh=false):Promise<LocalFontSet> {
  if(!window.queryLocalFonts)throw new Error('This browser cannot read computer fonts. Use Import font files instead.');
  // Call directly from the user's click, before any asynchronous work, so the
  // permission request has the required activation.
  const fonts=await window.queryLocalFonts();
  if(!fonts.length)throw new Error('Chrome returned no fonts. Use Import font files instead.');
  return install(fonts.map(font=>({blob:()=>font.blob(),hint:font,label:font.postscriptName})),'system',progress,refresh);
}
export async function useImportedFonts(files:File[],progress:(message:string)=>void):Promise<LocalFontSet> {
  return install(files.map(file=>({blob:async()=>file,label:file.name})),'import',progress);
}
/** Prevent the converter from loading the entire computer's font library. */
export async function fontsForConversion(operation:ConversionWorkerOperation):Promise<Record<string,Blob>|undefined> {
  const set=window.__officeFonts;if(!set)return undefined;
  const wanted=new Set(set.used);
  const defaults=['Arial','Times New Roman','Courier New','Calibri','Cambria','Aptos','Helvetica','Times','Courier','Geeza Pro','Noto Naskh Arabic','Apple Symbols','DejaVu Sans'];
  const names=new Set(defaults.map(name=>name.toLowerCase()));
  if(operation.kind==='convert-document') {
    const data=await operation.file.arrayBuffer(),view=new DataView(data),bytes=new Uint8Array(data);
    // Read only OOXML metadata, never media. The central directory works with
    // ZIPs using data descriptors, unlike a scan of local headers.
    let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
    if(end>=0) {
      let at=view.getUint32(end+16,true);const count=view.getUint16(end+10,true);let scanned=0;
      for(let i=0;i<count&&at+46<=bytes.length;i++) {
        if(view.getUint32(at,true)!==0x02014b50)break;
        const compressed=view.getUint32(at+20,true),expanded=view.getUint32(at+24,true),nameLength=view.getUint16(at+28,true),extra=view.getUint16(at+30,true),comment=view.getUint16(at+32,true),offset=view.getUint32(at+42,true),method=view.getUint16(at+10,true);
        const name=new TextDecoder().decode(bytes.subarray(at+46,at+46+nameLength));at+=46+nameLength+extra+comment;
        if(!/^(word|xl|ppt)\/.*\.xml$/.test(name)||expanded>16*1024*1024||scanned+expanded>64*1024*1024)continue;
        if(offset+30>bytes.length||view.getUint32(offset,true)!==0x04034b50)throw new Error('Invalid office ZIP entry');
        const start=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);if(start+compressed>bytes.length)throw new Error('Truncated office ZIP entry');
        const blob=new Blob([bytes.slice(start,start+compressed)]);
        const xml=method===0?await boundedText(blob.stream(),16*1024*1024):method===8?await boundedText(blob.stream().pipeThrough(new DecompressionStream('deflate-raw')),16*1024*1024):'';
        scanned+=new TextEncoder().encode(xml).byteLength;
        if(scanned>64*1024*1024)throw new Error('Office font metadata is too large');
        for(const match of xml.matchAll(/\b(?:w:ascii|w:hAnsi|w:eastAsia|w:cs|typeface|val)="([^"]+)"/g))names.add(match[1].replace(/&amp;/g,'&').replace(/&quot;/g,'"').toLowerCase());
      }
    }
  }
  for(const row of set.catalog.__fonts_infos)if(names.has(String(row[0]).toLowerCase()))for(const slot of [1,3,5,7])if(Number(row[slot])>=0)wanted.add(set.catalog.__fonts_files[Number(row[slot])]);
  if(!wanted.size)wanted.add(set.catalog.__fonts_files[0]);
  const faces=set.faces.filter(face=>wanted.has(face.file));
  const files:Record<string,Blob>={};for(const file of new Set(faces.map(face=>face.file)))files[file]=await set.readFile(file);
  return catalogAssets(buildCatalog(faces),files);
}

async function boundedText(stream:ReadableStream<Uint8Array>,limit:number):Promise<string> {
  const reader=stream.getReader(),chunks:Uint8Array[]=[];let size=0;
  try {for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new Error('Office font metadata is too large');chunks.push(value);}}
  finally {await reader.cancel();reader.releaseLock();}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return new TextDecoder().decode(bytes);
}

interface CachedFont {key:string;stamp:string;hash:string;faces:FontFaceRecord[];error?:string}
async function openMetadataCache():Promise<IDBDatabase|null>{
  try{return await new Promise((resolve,reject)=>{const r=indexedDB.open('onlyoffice-font-metadata-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('metadata',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}catch{return null;}
}
function readMetadataCache(db:IDBDatabase):Promise<CachedFont[]>{
  return new Promise((resolve,reject)=>{const r=db.transaction('metadata').objectStore('metadata').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
function writeMetadataCache(db:IDBDatabase,entries:CachedFont[]):Promise<void>{
  if(!entries.length)return Promise.resolve();
  return new Promise((resolve,reject)=>{const tx=db.transaction('metadata','readwrite');for(const entry of entries)tx.objectStore('metadata').put(entry);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}

async function previewDatabase():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{const r=indexedDB.open('onlyoffice-font-previews-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('preview');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
async function readPreviews(key:string):Promise<Blob[]|null>{
  let db:IDBDatabase|undefined;
  try{db=await previewDatabase();const row=await new Promise<{key:string;blobs:Blob[]}|undefined>((resolve,reject)=>{const r=db!.transaction('preview').objectStore('preview').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return row?.key===key&&row.blobs.length===5?row.blobs:null;}catch{return null;}finally{db?.close();}
}
async function rememberPreviews(key:string,blobs:Blob[]):Promise<void>{
  let db:IDBDatabase|undefined;
  try{db=await previewDatabase();await new Promise<void>((resolve,reject)=>{const tx=db!.transaction('preview','readwrite');tx.objectStore('preview').put({key,blobs},'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}catch{/* Preview caching is optional. */}finally{db?.close();}
}
