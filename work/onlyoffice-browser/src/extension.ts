import {useSystemFonts,useImportedFonts,savedImportedFonts,rememberImportedFonts,clearImportedFonts,releaseFonts} from './lib/local-fonts';
import { createOfficeEditor, type OfficeEditorInstance } from './lib/office-editor-runtime';
import './extension.css';

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
  document.querySelectorAll<HTMLButtonElement>('#open,[data-type]').forEach(button=>button.disabled=!enabled);
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

async function open(file?: File, emptyType?: EmptyType): Promise<void> {
  if (opening || editor || preparingFonts) return;
  if (!window.__officeFonts) {updateFontStatus('Choose computer fonts or import font files first.');return;}
  if (file && !/\.(docx|xlsx|pptx)$/i.test(file.name)) {
    showError(new Error('Open a DOCX, XLSX, or PPTX file.'));
    return;
  }
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
      saveBehavior: 'download',
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
  if(!editor||printing)return;
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
