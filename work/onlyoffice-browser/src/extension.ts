import {useSystemFonts,useImportedFonts,savedImportedFonts,rememberImportedFonts,clearImportedFonts,releaseFonts} from './lib/local-fonts';
import { createOfficeEditor, type OfficeEditorInstance } from './lib/office-editor-runtime';
import './extension.css';
import {recentDocuments,rememberDocument,removeRecentDocument,clearRecentDocuments} from './lib/recent-documents';

const home = document.querySelector<HTMLElement>('#home')!;
const slot = document.querySelector<HTMLElement>('#editor')!;
const input = document.querySelector<HTMLInputElement>('#file')!;
const status = document.querySelector<HTMLElement>('#status')!;
let editor: OfficeEditorInstance | null = null;
let opening = false;
let preparingFonts = false;
const fontStatus = document.querySelector<HTMLElement>('#font-status')!;
const fontInput = document.querySelector<HTMLInputElement>('#font-files')!;
const updateFontStatus = (message: string) => {fontStatus.textContent=message;};
function enableOffice(enabled: boolean): void {
  document.querySelectorAll<HTMLButtonElement>('#open,[data-type],.recent-open').forEach(button=>button.disabled=!enabled);
}
async function prepareFonts(source: 'system'|'import', files?: File[],refresh=false): Promise<void> {
  if(preparingFonts || opening || editor)return;
  preparingFonts=true;enableOffice(false);
  document.querySelectorAll<HTMLButtonElement>('[data-font-action]').forEach(button=>button.disabled=true);
  try {
    const fonts=source==='system'?await useSystemFonts(updateFontStatus,refresh):await useImportedFonts(files||[],updateFontStatus);
    updateFontStatus(`${fonts.catalog.__fonts_visible_names.length} font families ready from ${source==='system'?'this computer':'imported files'}.`+(fonts.skipped.length?` ${fonts.skipped.length} unsupported faces skipped.`:''));
    document.querySelector<HTMLElement>('#font-details')!.textContent=fonts.skipped.join('\n');
    if(source==='import' && files?.length){try{await rememberImportedFonts(files);}catch{updateFontStatus(fontStatus.textContent+' Imported fonts work in this tab, but could not be remembered.');}}
  } catch(error) {updateFontStatus((error instanceof Error?error.message:String(error))+' Use Import font files if computer font access is unavailable.');}
  finally {
    preparingFonts=false;enableOffice(Boolean(window.__officeFonts));
    document.querySelectorAll<HTMLButtonElement>('[data-font-action]').forEach(button=>button.disabled=false);
  }
}
document.querySelector('#computer-fonts')!.addEventListener('click',()=>void prepareFonts('system',undefined,true));
document.querySelector('#import-fonts')!.addEventListener('click',()=>{fontInput.value='';fontInput.click();});
fontInput.addEventListener('change',()=>{if(fontInput.files?.length)void prepareFonts('import',Array.from(fontInput.files));});
document.querySelector('#clear-fonts')!.addEventListener('click',async()=>{
  if(preparingFonts||opening||editor)return;
  releaseFonts();enableOffice(false);
  try{await clearImportedFonts();updateFontStatus('Imported fonts cleared. Choose computer fonts or import font files.');}
  catch{updateFontStatus('Could not clear remembered fonts. Try again.');}
});
enableOffice(false);
// Permission is never requested automatically. Existing permission can be reused.
void (async()=>{
  try {
    const permission=await navigator.permissions.query({name:'local-fonts' as PermissionName});
    if(permission.state==='granted' && window.queryLocalFonts){await prepareFonts('system');return;}
  } catch {/* Older browsers can use imported fonts. */}
  try {const files=await savedImportedFonts();if(files.length)await prepareFonts('import',files);}
  catch {updateFontStatus('Choose computer fonts or import font files to start.');}
})();
type EmptyType = 'docx' | 'xlsx' | 'pptx';

function showError(error: Error): void {
  status.textContent = error.message;
  if (home.hidden) window.alert(`ONLYOFFICE could not complete the operation.\n\n${error.message}`);
}

let recentId:string = crypto.randomUUID();
let recentWarning='';
async function open(file?: File, emptyType?: EmptyType, id?:string): Promise<void> {
  if (opening || editor || preparingFonts) return;
  if (!window.__officeFonts) {updateFontStatus('Choose computer fonts or import font files first.');return;}
  if (file && !/\.(docx|xlsx|pptx|odt|ods|odp|rtf)$/i.test(file.name)) {
    showError(new Error('Open an Office, OpenDocument or RTF file.'));
    return;
  }
  recentId=id||crypto.randomUUID();recentWarning='';
  opening = true;
  status.textContent = 'Opening…';
  home.hidden = true;
  slot.hidden = false;
  try {
    editor = await createOfficeEditor(slot, {
      file,
      emptyType,
      fileName: file?.name || `Untitled.${emptyType}`,
      mode: 'edit',
      lang: 'en',
      saveBehavior: 'callback',
      onSave: async saved=>{download(saved);await remember(saved,recentId);return true;},
      onReady: ()=>{if(file)void remember(file,recentId);},
      onError: showError,
    });
    // Integration hook also used by the offline round-trip validation script.
    (window as Window & { __offlineEditor?: OfficeEditorInstance }).__offlineEditor = editor;
  } catch (error) {
    slot.replaceChildren();
    slot.hidden = true;
    home.hidden = false;
    showError(error instanceof Error ? error : new Error(String(error)));
  } finally {
    opening = false;
  }
}

document.querySelector('#open')!.addEventListener('click', () => {
  input.value = '';
  input.click();
});
input.addEventListener('change', () => {
  const file = input.files?.[0];
  if (file) void open(file);
});
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-type]')) {
  button.addEventListener('click', () => {
    const type = button.dataset.type;
    if (type === 'docx' || type === 'xlsx' || type === 'pptx') void open(undefined, type);
  });
}
window.addEventListener('beforeunload', event => {
  if (opening || editor?.getState().dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});

let printing=false;
(window as Window & {__officePrint?:()=>void}).__officePrint=()=>{
  if(!editor||printing||exporting||leaving)return;
  const preview=window.open('about:blank','_blank');
  if(!preview){showError(new Error('Allow a popup to open the print preview.'));return;}
  preview.document.title='ONLYOFFICE — Preparing print preview';
  preview.document.body.textContent='Preparing printable pages…';printing=true;
  void editor.printPdf().then(file=>{
    const url=URL.createObjectURL(file);preview.location.replace(url);
    const cleanup=window.setInterval(()=>{if(preview.closed){URL.revokeObjectURL(url);window.clearInterval(cleanup);}},1000);
  }).catch(error=>{preview.close();showError(error instanceof Error?error:new Error(String(error)));}).finally(()=>{printing=false;});
};
window.addEventListener('keydown',event=>{
  if(editor&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='p'){
    event.preventDefault();(window as Window & {__officePrint?:()=>void}).__officePrint?.();
  }
});

function download(file:File):void{const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function remember(file:File,id:string):Promise<void>{try{await rememberDocument(file,id);}catch{recentWarning='The latest document copy could not be stored in Recent documents. Use the downloaded file to reopen saved changes.';status.textContent=recentWarning;}}
async function renderRecents():Promise<void>{
 const list=document.querySelector<HTMLUListElement>('#recent-list')!;list.replaceChildren();
 try{const rows=await recentDocuments();document.querySelector<HTMLElement>('#recent-empty')!.hidden=rows.length>0;
 for(const row of rows){const item=document.createElement('li'),button=document.createElement('button'),icon=document.createElement('img'),label=document.createElement('span'),date=document.createElement('small'),remove=document.createElement('button');button.className='recent-open';button.disabled=!window.__officeFonts;icon.src='/web-apps/apps/common/main/resources/img/doc-formats/'+(['xlsx','ods','csv'].includes(row.type)?'xlsx':['pptx','odp'].includes(row.type)?'pptx':'docx')+'.svg';icon.alt='';label.textContent=row.name;date.textContent=new Date(row.updated).toLocaleString();label.append(date);button.append(icon,label);button.addEventListener('click',()=>void open(new File([row.file],row.name,{type:row.file.type}),undefined,row.id));remove.className='recent-remove';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+row.name+' from recent documents');remove.addEventListener('click',()=>{void removeRecentDocument(row.id).then(renderRecents).catch(showError);});item.append(button,remove);list.append(item);}}
 catch{document.querySelector<HTMLElement>('#recent-empty')!.textContent='Recent documents are unavailable because local storage could not be opened.';}
}
document.querySelector('#clear-recents')!.addEventListener('click',()=>void clearRecentDocuments().then(renderRecents).catch(showError));
void renderRecents();
let leaving=false;
async function returnHome(save=false):Promise<void>{
 if(!editor||opening||printing||exporting||leaving)return;leaving=true;document.querySelectorAll<HTMLButtonElement>('#leave-dialog button').forEach(button=>button.disabled=true);
 try{if(save)await editor.save();await editor.destroy();editor=null;window.__officeFonts?.used.clear();delete (window as Window & {__offlineEditor?:OfficeEditorInstance}).__offlineEditor;slot.hidden=true;home.hidden=false;status.textContent=recentWarning;await renderRecents();document.querySelector<HTMLDialogElement>('#leave-dialog')!.close();}
 catch(error){showError(error instanceof Error?error:new Error(String(error)));}finally{leaving=false;document.querySelectorAll<HTMLButtonElement>('#leave-dialog button').forEach(button=>button.disabled=false);}
}
(window as Window & {__officeHome?:()=>void}).__officeHome=()=>{
 if(!editor||opening||printing||exporting||leaving)return;
 if(editor.getState().dirty)document.querySelector<HTMLDialogElement>('#leave-dialog')!.showModal();else void returnHome();
};
document.querySelector('#leave-save')!.addEventListener('click',()=>void returnHome(true));
document.querySelector('#leave-discard')!.addEventListener('click',()=>void returnHome());
document.querySelector('#leave-cancel')!.addEventListener('click',()=>document.querySelector<HTMLDialogElement>('#leave-dialog')!.close());
let exporting=false;
(window as Window & {__officeExportPdf?:()=>void}).__officeExportPdf=()=>{
 if(!editor||printing||exporting||leaving)return;exporting=true;
 void editor.printPdf().then(download).catch(showError).finally(()=>{exporting=false;});
};
