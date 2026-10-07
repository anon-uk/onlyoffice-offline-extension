import type { FontFaceRecord } from './local-font-sfnt';
export interface FontCatalog {
  __all_fonts_js_version__:number; __fonts_files:string[]; __fonts_infos:(string|number)[][];
  __fonts_ranges:number[]; g_fonts_selection_bin:string; __fonts_visible_names:string[];
}
const encoder=new TextEncoder();
export function selectionBytes(catalog:FontCatalog):Uint8Array {
  return Uint8Array.from(atob(catalog.g_fonts_selection_bin),c=>c.charCodeAt(0));
}
export function buildCatalog(faces:FontFaceRecord[]):FontCatalog {
  if(!faces.length)throw new Error('Choose at least one supported font');
  const files=[...new Set(faces.map(f=>f.file))].sort(), families=new Map<string,FontFaceRecord[]>();
  for(const face of faces)families.set(face.family,[...(families.get(face.family)||[]),face]);
  const infos:(string|number)[][]=[],chosen=new Map<string,FontFaceRecord[]>();
  for(const family of [...families.keys()].sort((a,b)=>a.localeCompare(b,'en'))) {
    const row:(string|number)[]=[family,-1,-1,-1,-1,-1,-1,-1,-1],styles:FontFaceRecord[]=[];
    const quality=(f:FontFaceRecord)=>{
      const style=f.style.toLowerCase().replace(/[-_]/g,' ').replace(/\s+/g,' ').trim();
      // Medium is a distinct weight, not an equal substitute for Regular.
      if(/^(regular|normal|plain|roman|italic|oblique|bold|bold italic|bold oblique)$/.test(style))return 400;
      if(/^book(?: italic| oblique)?$/.test(style))return 300;
      if(/^medium(?: italic| oblique)?$/.test(style))return 200;
      if(/semi ?bold|demi ?bold/.test(style))return 100;
      return 0;
    };
    for(const face of families.get(family)!.sort((a,b)=>quality(b)-quality(a))) {
      const index=+face.italic+2*(+face.bold),slot=1+index*2;
      if(row[slot]===-1){row[slot]=files.indexOf(face.file);row[slot+1]=face.face;styles.push(face);}
    }
    infos.push(row);chosen.set(family,styles);
  }
  const visibleNames=infos.map(row=>String(row[0]));
  const preferred=(names:string[])=>names.find(name=>chosen.has(name))||visibleNames[0];
  const sans=preferred(['Arial','Helvetica','Liberation Sans','DejaVu Sans','Noto Sans','Calibri','Carlito']);
  const serif=preferred(['Times New Roman','Times','Liberation Serif','DejaVu Serif','Georgia',sans]);
  const mono=preferred(['Courier New','Courier','Liberation Mono','DejaVu Sans Mono','Menlo',sans]);
  for(const [alias,target] of Object.entries({Arial:sans,Calibri:preferred(['Calibri','Carlito',sans]),Aptos:sans,'Times New Roman':serif,Cambria:preferred(['Cambria','Caladea',serif]),'Courier New':mono,Symbol:preferred(['Symbol','Apple Symbols','OpenSymbol',sans]),Wingdings:preferred(['Wingdings','Apple Symbols','OpenSymbol',sans])})) {
    if(!chosen.has(alias)) {const row=infos.find(row=>row[0]===target)!;infos.push([alias,...row.slice(1)]);chosen.set(alias,chosen.get(target)!);}
  }
  const bytes:number[]=[];
  const long=(target:number[],value:number)=>{for(let i=0;i<4;i++)target.push((value>>>(i*8))&255);};
  const string=(target:number[],value:string)=>{const data=encoder.encode(value);long(target,data.length);target.push(...data);};
  const records:number[][]=[];
  for(const row of infos)for(const face of chosen.get(String(row[0]))!) {
    const record:number[]=[];string(record,String(row[0]));long(record,0);string(record,'/working/fonts/'+face.file);record.push(...face.fields);
    const complete:number[]=[];long(complete,record.length+4);complete.push(...record);records.push(complete);
  }
  long(bytes,records.length);for(const record of records)bytes.push(...record);
  let base64='';for(let i=0;i<bytes.length;i+=16384)base64+=String.fromCharCode(...bytes.slice(i,i+16384));
  const priority=[sans,'Arial Unicode MS','Helvetica','DejaVu Sans',serif,'Droid Sans Fallback','Geeza Pro','Noto Naskh Arabic','Noto Sans Hebrew','Apple Symbols'];
  const ordered=[...new Set([...priority,...visibleNames])].filter(name=>visibleNames.includes(name));
  const coverage=new Int32Array(0x110000).fill(-1);
  for(const family of ordered) {
    // Fallback must be present in every available real style, including italic.
    const styles=chosen.get(family)!;let shared=styles[0].coverage;
    for(const style of styles.slice(1)) {
      const next:number[]=[];let a=0,b=0;
      while(a<shared.length&&b<style.coverage.length){
        const start=Math.max(shared[a],style.coverage[b]),end=Math.min(shared[a+1],style.coverage[b+1]);
        if(start<=end)next.push(start,end);
        if(shared[a+1]<style.coverage[b+1])a+=2;else b+=2;
      }
      shared=next;
    }
    const index=infos.findIndex(row=>row[0]===family);
    for(let at=0;at<shared.length;at+=2)for(let code=shared[at];code<=shared[at+1];code++)if(coverage[code]===-1)coverage[code]=index;
  }
  const ranges:number[]=[];let start=0,previous=coverage[0];
  for(let i=1;i<=coverage.length;i++) {
    const current=i<coverage.length?coverage[i]:-2;
    if(current!==previous){if(previous>=0)ranges.push(start,i-1,previous);start=i;previous=current;}
  }
  return {__all_fonts_js_version__:2,__fonts_files:files,__fonts_infos:infos,__fonts_ranges:ranges,g_fonts_selection_bin:btoa(base64),__fonts_visible_names:visibleNames};
}
export function catalogAssets(catalog:FontCatalog,files:Record<string,Blob>):Record<string,Blob> {
  const json=(value:unknown)=>new Blob([JSON.stringify(value)],{type:'application/json'});
  const allFonts=Object.entries(catalog).map(([key,value])=>'window['+JSON.stringify(key)+']='+JSON.stringify(value)+';').join('\n');
  const paths=catalog.__fonts_files.map(file=>'fonts/'+file);
  const assets:Record<string,Blob>={
    'onlyoffice-browser-font-assets.json':json({version:1,allFonts:'sdkjs/common/AllFonts.js',fontSelection:'server/FileConverter/bin/font_selection.bin',fontThumbnails:['sdkjs/common/Images/fonts_thumbnail.png'],fonts:paths,fontSourceMap:'onlyoffice-browser-font-source-map.json'}),
    'onlyoffice-browser-font-source-map.json':json({fonts:catalog.__fonts_files.map(file=>({file:'fonts/'+file,source:'/working/fonts/'+file}))}),
    'sdkjs/common/AllFonts.js':new Blob([allFonts],{type:'text/javascript'}),
    'server/FileConverter/bin/AllFonts.js':new Blob([allFonts],{type:'text/javascript'}),
    'server/FileConverter/bin/font_selection.bin':new Blob([selectionBytes(catalog) as Uint8Array<ArrayBuffer>]),
    // Only used for availability checks; real picker previews are generated separately.
    'sdkjs/common/Images/fonts_thumbnail.png':new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='),c=>c.charCodeAt(0))],{type:'image/png'}),
  };
  for(const file of catalog.__fonts_files)if(files[file])assets['fonts/'+file]=files[file];
  return assets;
}
