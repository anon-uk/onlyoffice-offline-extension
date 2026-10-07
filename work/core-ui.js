/* Core-only UI policy for the offline, single-user derivative. */
(() => {
  if (!location.pathname.includes('/main/index.html')) return;
  const editor = location.pathname.includes('documenteditor') ? 'docx' : location.pathname.includes('spreadsheeteditor') ? 'xlsx' : 'pptx';
  const format = {docx:'65',xlsx:'257',pptx:'129'}[editor];
  const unavailable = [
    '#toolbar #review', '#toolbar #plugins', '#toolbar #forms', '#toolbar #ai',
    '#left-btn-comments', '#left-btn-chat', '#id-right-menu-mail-merge', '#id-right-menu-signature',
    '#slot-btn-edit-mode', '#tlb-box-users',
    '#fm-btn-create','#fm-btn-recent','#fm-btn-save-copy','#fm-btn-save-desktop',
    '#fm-btn-rename','#fm-btn-protect',
    '#fm-btn-history','#fm-btn-rights','#fm-btn-back','#fm-btn-suggest',
    '.btn-header-pdf-mode', '.toolbar__icon.btn-macros', '.toolbar__icon.btn-macros-record',
    '.toolbar__icon.btn-mailmerge', '.toolbar__icon.btn-compare', '.toolbar__icon.btn-combine',
    '.toolbar__icon.btn-ai', '.toolbar__icon.btn-plugins'
  ].join(',');
  const style = document.createElement('style');
  style.textContent = '[data-offline-unavailable]{display:none!important}';
  document.head.append(style);
  function hide(element) {
    if (element.closest('.format-item')) element = element.closest('.format-item');
    else if (element.tagName==='I') element = element.closest('button') || element;
    else if (element.parentElement?.tagName==='LI' && element.closest('#toolbar')) element=element.parentElement;
    if(element.hasAttribute('data-offline-unavailable'))return;
    element.setAttribute('data-offline-unavailable','');
    element.setAttribute('aria-hidden','true');
  }
  function apply() {
    const prototype=window.Common?.UI?.ComboBoxFonts?.prototype;
    if(prototype && !prototype.__offlineFontLookup){
      const original=prototype.onInputChanged;
      prototype.onInputChanged=function(event,options){
        const name=event.target.value;
        this._selectedItem=this.store.find(model=>model.get('name').toLowerCase()===name.toLowerCase()) || null;
        return original.call(this,event,options);
      };
      prototype.__offlineFontLookup=true;
    }
    document.querySelectorAll(unavailable).forEach(hide);
    document.querySelectorAll('.btn-doc-format[format]').forEach(element => {
      if (element.getAttribute('format')!==format) hide(element);
    });
  }
  // Canvas/ruler updates are frequent. Coalesce scans once per frame and
  // ignore mutations that cannot introduce a menu or control.
  let queued=false;
  const observer=new MutationObserver(records=>{
    if(queued||!records.some(record=>Array.from(record.addedNodes).some(node=>node.nodeType===1)))return;
    queued=true;requestAnimationFrame(()=>{queued=false;apply();});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#slot-hbtn-print,#slot-hbtn-print-quick,#fm-btn-print,#fm-btn-print-with-preview')){event.preventDefault();event.stopImmediatePropagation();window.top.__officePrint?.();return;}
    if(event.target.closest?.('[data-offline-unavailable]')){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  document.addEventListener('keydown',event=>{
    if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='p') {event.preventDefault();event.stopImmediatePropagation();window.top.__officePrint?.();}
  },true);
  apply();
})();
