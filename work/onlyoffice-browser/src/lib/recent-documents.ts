// Local document snapshots, never filesystem paths or font files.
export interface RecentDocument {id:string;name:string;type:string;updated:number;size:number;file:File}
const DATABASE='onlyoffice-recent-documents-v1';
export async function recentDocuments():Promise<RecentDocument[]>{return transact('readonly',store=>store.getAll()).then(rows=>(rows as RecentDocument[]).sort((a,b)=>b.updated-a.updated));}
function transact<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 return new Promise((resolve,reject)=>{const request=indexedDB.open(DATABASE,1);request.onupgradeneeded=()=>request.result.createObjectStore('documents',{keyPath:'id'});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result;const tx=db.transaction('documents',mode);let value:T;const operation=action(tx.objectStore('documents'));operation.onsuccess=()=>{value=operation.result;};tx.oncomplete=()=>{db.close();resolve(value);};tx.onabort=()=>{db.close();reject(tx.error||new Error('Local document storage failed'));};tx.onerror=()=>{/* onabort reports the failure */};};});
}
export async function rememberDocument(file:File,id:string):Promise<void>{
 if(file.size>50*1024*1024)throw new Error('Files over 50 MB are not kept in Recent documents.');
 // Prune in the same transaction as the write; concurrent tabs cannot exceed the limits.
 return new Promise((resolve,reject)=>{const request=indexedDB.open(DATABASE,1);request.onupgradeneeded=()=>request.result.createObjectStore('documents',{keyPath:'id'});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('documents','readwrite'),store=tx.objectStore('documents');store.put({id,name:file.name,type:file.name.split('.').pop()?.toLowerCase(),updated:Date.now(),size:file.size,file});const all=store.getAll();all.onsuccess=()=>{const rows=(all.result as RecentDocument[]).sort((a,b)=>b.updated-a.updated);let bytes=0;rows.forEach((row,index)=>{bytes+=row.size;if(index>=20||bytes>200*1024*1024)store.delete(row.id);});};tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>{db.close();reject(tx.error||new Error('Could not remember document'));};};});
}
export function removeRecentDocument(id:string):Promise<unknown>{return transact('readwrite',store=>store.delete(id));}
export function clearRecentDocuments():Promise<unknown>{return transact('readwrite',store=>store.clear());}
