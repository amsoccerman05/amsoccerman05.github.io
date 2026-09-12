import { useEffect,useState } from 'react';
import { repository as local, type Database } from '../data';
import type { InventoryRepository,InventoryEvent,UserProfile } from './types';
import { friendlyError } from './supabase';
export function Activity({repository,profiles,itemId,areaId,revision}:{repository:InventoryRepository;profiles:UserProfile[];itemId?:string;areaId?:string;revision?:string}){
 const [events,setEvents]=useState<InventoryEvent[]>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;void repository.history(itemId,areaId).then(data=>{if(active){setEvents(data);setError('');}}).catch(e=>{if(active)setError(friendlyError(e));});return()=>{active=false;};},[repository,itemId,areaId,revision]);
 return <section className="activity"><h2>Recent activity</h2>{error&&<p role="status">{error}</p>}{!events.length&&!error&&<small>No recorded changes yet.</small>}{events.slice(0,8).map(e=><div key={e.id}><p><b>{profiles.find(p=>p.id===e.userId)?.displayName||'Team member'}</b> {e.eventType==='quantity_changed'?`changed ${e.itemName} from ${e.quantityBefore} → ${e.quantityAfter}`:e.eventType==='item_verified'||e.eventType==='drawer_verified'?`verified ${e.itemName}`:`${e.eventType.replaceAll('_',' ')} · ${e.itemName}`}</p><small>{new Date(e.createdAt).toLocaleString()}</small></div>)}</section>;
}
export function UsersPanel(){
 return <section className="panel settings-panel"><h2>Team Management</h2><p>Manage shared member profiles, roles, areas, registration, and positions in Team Hub.</p><a className="primary" href="https://team.frc4418.org/#team-management">Open Team Management →</a></section>;
}
export function MigrationPanel({migrate}:{migrate:(db:Database)=>Promise<boolean>}){
 const [preview,setPreview]=useState<Database|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 return <section className="panel settings-panel"><h2>Migrate local V0 data to Supabase</h2><p>Reads this browser’s local inventory. Existing shared IDs are preserved; only missing records are added.</p><button className="secondary" disabled={busy} onClick={()=>{try{const db=local.existing();setPreview(db);setMessage(db?'':'No saved V0 data was found in this browser.');}catch(e){setMessage(friendlyError(e));}}}>Preview local data</button>{preview&&<div className="migration-preview"><p>{preview.items.length} inventory items · {preview.locations.length} locations · {preview.areas.length} areas</p><button className="primary" disabled={busy} onClick={async()=>{if(!confirm(`Migrate ${preview.items.length} local inventory items, ${preview.locations.length} locations and ${preview.areas.length} areas to the shared workspace? Existing shared records will be kept.`))return;setBusy(true);const ok=await migrate(preview);if(ok){setMessage('Migration complete. Local V0 data has been kept as a backup.');setPreview(null);}setBusy(false);}}>Confirm migration</button></div>}{message&&<p role="status">{message}</p>}</section>;
}
