/** Real SFNT metadata consumed by the ONLYOFFICE renderer and converter. */
export interface FontFaceRecord {
  family: string; style: string; postscript: string; file: string; face: number;
  bold: boolean; italic: boolean; fields: number[]; coverage: number[];
}
const decoder = new TextDecoder();
function text(bytes: Uint8Array, unicode: boolean): string {
  if (!unicode) return new TextDecoder('macintosh').decode(bytes);
  let result = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) result += String.fromCharCode(bytes[i] * 256 + bytes[i + 1]);
  return result;
}
export function parseFont(data: ArrayBuffer, file: string, hint?: {family:string;style:string;postscriptName:string}): FontFaceRecord[] {
  const bytes = new Uint8Array(data), view = new DataView(data);
  const check = (offset:number,length:number) => {if(offset<0 || offset+length>bytes.length)throw new Error('Truncated font table');};
  const u16 = (offset:number) => {check(offset,2);return view.getUint16(offset);};
  const u32 = (offset:number) => {check(offset,4);return view.getUint32(offset);};
  const tag = (offset:number) => {check(offset,4);return decoder.decode(bytes.subarray(offset,offset+4));};
  const signature=tag(0);
  if (!['\x00\x01\x00\x00','OTTO','true','ttcf'].includes(signature)) throw new Error('Use a TTF, OTF or TTC font');
  const faceCount=signature==='ttcf'?u32(8):1;
  if(faceCount<1||faceCount>256)throw new Error('Invalid font collection face count');
  const offsets = signature==='ttcf' ? Array.from({length:faceCount},(_,i)=>u32(12+i*4)) : [0];
  const result:FontFaceRecord[]=[];
  for (let face=0;face<offsets.length;face++) {
    const offset=offsets[face], tables = new Map<string,DataView>(), names = new Map<number,string>(), ranks = new Map<number,number>();
    const count=u16(offset+4); if(count>256)throw new Error('Invalid font table count');
    for (let i=0;i<count;i++) {
      const base=offset+12+i*16, start=u32(base+8), length=u32(base+12);check(start,length);
      tables.set(tag(base),new DataView(data,start,length));
    }
    if(!tables.has('glyf')&&!tables.has('CFF ')&&!tables.has('CFF2'))continue; // Bitmap-only fonts need an outline fallback.
    const table=tables.get('name');if(!table)continue;
    const get=(v:DataView|undefined,at:number,kind:'u16'|'s16'|'u32',fallback=0) => {
      const size=kind==='u32'?4:2;if(!v||at+size>v.byteLength)return fallback;
      return kind==='u32'?v.getUint32(at):kind==='s16'?v.getInt16(at):v.getUint16(at);
    };
    const strings=get(table,4,'u16'), records=get(table,2,'u16');
    for(let i=0;i<records;i++) {
      const base=6+i*12;if(base+12>table.byteLength)throw new Error('Invalid font names');
      const platform=get(table,base,'u16'),lang=get(table,base+4,'u16'),id=get(table,base+6,'u16'),length=get(table,base+8,'u16'),start=strings+get(table,base+10,'u16');
      if(start+length>table.byteLength||![0,1,3].includes(platform))continue;
      const rank=platform===3?(lang===1033?5:2):platform===0?3:lang===0?4:0;
      if(rank<=(ranks.get(id)??-1))continue;
      names.set(id,text(new Uint8Array(data,table.byteOffset+start,length),platform===0||platform===3).replace(/\0/g,''));ranks.set(id,rank);
    }
    let family=names.get(1)||names.get(16),style=names.get(2)||'Regular',postscript=names.get(6)||'';
    if(!family)continue;
    let selectedFace=face;
    if(hint) {
      // A variable named instance is addressed with FreeType's high face-index bits.
      if(postscript!==hint.postscriptName && tables.has('fvar')) {
        const fvar=tables.get('fvar')!,axisCount=get(fvar,8,'u16'),axisSize=get(fvar,10,'u16'),instances=get(fvar,12,'u16'),instanceSize=get(fvar,14,'u16');
        const start=get(fvar,4,'u16')+axisCount*axisSize;let found=false;
        for(let i=0;i<instances;i++) {
          const at=start+i*instanceSize,psId=instanceSize>=6+axisCount*4?get(fvar,at+4+axisCount*4,'u16'):0xffff;
          const normalize=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
          const instanceStyle=names.get(get(fvar,at,'u16'))||'';
          if(names.get(psId)===hint.postscriptName || (normalize(instanceStyle)===normalize(hint.style) && normalize(family)===normalize(hint.family))){selectedFace=face+((i+1)<<16);found=true;break;}
        }
        if(!found)continue;
      } else if(postscript!==hint.postscriptName)continue;
      family=hint.family;style=hint.style;postscript=hint.postscriptName;
    }
    const os2=tables.get('OS/2'),head=tables.get('head'),post=tables.get('post'),hhea=tables.get('hhea'),units=get(head,18,'u16',1000)||1000,flags=get(os2,62,'u16');
    const bold=Boolean(flags&32)||/bold|heavy|black|demi/i.test(style),italic=Boolean(flags&1)||/italic|oblique/i.test(style);
    const metric=(at:number,fallback=0)=>Math.round(get(os2,at,'s16',fallback)*1000/units);
    const fields:number[]=[];
    const write=(value:number,size:number)=>{for(let i=0;i<size;i++)fields.push((value>>>(8*i))&255);};
    write(selectedFace,4);write(+italic,4);write(+bold,4);write(+Boolean(get(post,12,'u32')),4);write(10,4);
    for(let i=0;i<10;i++)fields.push(os2&&32+i<os2.byteLength?os2.getUint8(32+i):0);
    for(const at of [42,46,50,54,78,82])write(get(os2,at,'u32'),4);
    for(const value of [get(os2,4,'u16',bold?700:400),get(os2,6,'u16',5),get(os2,30,'s16'),tables.has('CFF ')||tables.has('CFF2')?2:1,metric(2),metric(68,get(hhea,4,'s16')),metric(70,get(hhea,6,'s16')),metric(72,get(hhea,8,'s16')),metric(86),metric(88),get(os2,8,'u16')])write(value,2);
    const cmap=tables.get('cmap'),codes=new Set<number>(),seen=new Set<number>();let examined=0;
    const budget=(count:number)=>{examined+=count;if(examined>4000000)throw new Error('Invalid overlapping Unicode cmap');};
    if(cmap)for(let i=0;i<get(cmap,2,'u16');i++) {
      const at=4+i*8,platform=get(cmap,at,'u16'),encoding=get(cmap,at+2,'u16'),start=get(cmap,at+4,'u32');
      if(!(platform===0||platform===3&&[1,10].includes(encoding))||seen.has(start))continue;seen.add(start);
      const format=get(cmap,start,'u16');
      if(format===12) {
        const groups=get(cmap,start+12,'u32');if(groups>100000||start+16+groups*12>cmap.byteLength)throw new Error('Invalid Unicode cmap');
        for(let j=0;j<groups;j++) {
          const base=start+16+j*12,a=get(cmap,base,'u32'),b=get(cmap,base+4,'u32'),glyph=get(cmap,base+8,'u32');
          if(a>b||b>0x10ffff)throw new Error('Invalid Unicode cmap range');budget(b-a+1);
          for(let code=a+(glyph===0?1:0);code<=b;code++)codes.add(code);
        }
      } else if(format===4) {
        const segments=get(cmap,start+6,'u16')/2;
        for(let j=0;j<segments;j++) {
          const end=get(cmap,start+14+j*2,'u16'),a=get(cmap,start+16+segments*2+j*2,'u16'),delta=get(cmap,start+16+segments*4+j*2,'s16'),address=start+16+segments*6+j*2,range=get(cmap,address,'u16');
          budget(Math.max(0,end-a+1));
          for(let code=a;code<=Math.min(end,0xfffe);code++) {
            let glyph=range?get(cmap,address+range+2*(code-a),'u16'):(code+delta)&0xffff;
            if(range&&glyph)glyph=(glyph+delta)&0xffff;if(glyph)codes.add(code);
          }
        }
      }
    }
    const sorted=[...codes].sort((a,b)=>a-b),coverage:number[]=[];
    for(const code of sorted) {
      if(coverage.length&&code===coverage[coverage.length-1]+1)coverage[coverage.length-1]=code;
      else coverage.push(code,code);
    }
    result.push({family,style,postscript,file,face:selectedFace,bold,italic,fields,coverage});
  }
  if(!result.length)throw new Error('No supported outline font face or named instance');
  return result;
}

/** Read only names, metrics and cmap. Never copy glyph outlines into JS to list fonts. */
export async function fontMetadata(blob:Blob):Promise<ArrayBuffer> {
  const read=async(at:number,size:number)=>{
    if(at<0||size<0||at+size>blob.size)throw new Error('Truncated font metadata');
    return new Uint8Array(await blob.slice(at,at+size).arrayBuffer());
  };
  const first=await read(0,Math.min(12,blob.size)),v=new DataView(first.buffer);
  const collection=decoder.decode(first.subarray(0,4))==='ttcf';
  const count=collection?v.getUint32(8):1;
  if(count<1||count>256)throw new Error('Invalid font collection face count');
  const offsets=collection?new DataView((await read(12,count*4)).buffer):null;
  const chunks:Uint8Array[]=[];let length=collection?12+count*4:0;
  const header=collection?new Uint8Array(length):null;
  if(header){header.set(first);chunks.push(header);}
  const keep=new Set(['name','OS/2','head','post','hhea','cmap','fvar']);
  for(let i=0;i<count;i++) {
    const at=offsets?offsets.getUint32(i*4):0,face=await read(at,12),n=new DataView(face.buffer).getUint16(4);
    if(n>256)throw new Error('Invalid font table count');
    const directory=await read(at+12,n*16),dv=new DataView(directory.buffer),records:{tag:Uint8Array;data:Uint8Array}[]=[];
    for(let j=0;j<n;j++) {
      const pos=j*16,tag=decoder.decode(directory.subarray(pos,pos+4)),start=dv.getUint32(pos+8),size=dv.getUint32(pos+12);
      if(start+size>blob.size)throw new Error('Truncated font table');
      if(keep.has(tag)){if(size>4*1024*1024)throw new Error('Font metadata table is too large');records.push({tag:directory.slice(pos,pos+4),data:await read(start,size)});}
      else if(['glyf','CFF ','CFF2'].includes(tag))records.push({tag:directory.slice(pos,pos+4),data:new Uint8Array(1)});
    }
    const faceStart=length,table=new Uint8Array(12+records.length*16),tv=new DataView(table.buffer);table.set(face);tv.setUint16(4,records.length);
    if(header)new DataView(header.buffer).setUint32(12+i*4,faceStart);
    chunks.push(table);length+=table.length;
    for(let j=0;j<records.length;j++){const record=records[j],pos=12+j*16;table.set(record.tag,pos);tv.setUint32(pos+8,length);tv.setUint32(pos+12,record.data.length);chunks.push(record.data);length+=record.data.length;}
  }
  const data=new Uint8Array(length);let at=0;for(const chunk of chunks){data.set(chunk,at);at+=chunk.length;}return data.buffer;
}

/** Table checksums detect font updates without rereading names/cmaps/outlines. */
export async function fontFingerprint(blob:Blob):Promise<string> {
  const first=new Uint8Array(await blob.slice(0,12).arrayBuffer());
  if(first.length<12)throw new Error('Truncated font header');
  const collection=decoder.decode(first.subarray(0,4))==='ttcf',count=collection?new DataView(first.buffer).getUint32(8):1;
  if(count<1||count>256)throw new Error('Invalid font collection face count');
  const offsets=collection?new DataView(await blob.slice(12,12+count*4).arrayBuffer()):null;
  const parts:BlobPart[]=[first,String(blob.size)];
  for(let i=0;i<count;i++){
    const at=offsets?offsets.getUint32(i*4):0,header=await blob.slice(at,at+12).arrayBuffer();
    if(header.byteLength<12)throw new Error('Truncated font header');
    const tables=new DataView(header).getUint16(4);if(tables>256||at+12+tables*16>blob.size)throw new Error('Invalid font directory');
    parts.push(header,await blob.slice(at+12,at+12+tables*16).arrayBuffer());
  }
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',await new Blob(parts).arrayBuffer()));
  return Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');
}
