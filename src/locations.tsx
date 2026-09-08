import { createId } from './utils/id';
import { useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, MapPin, Minus, Plus, Search } from 'lucide-react';
import { inLocation, possibleDuplicates, itemTypes, ownerships, needsVerification, locationKinds, locationLabel, locationPath, locationTrail, missingTools, status, type Database, type Item, type Location } from './data';

export function ItemHealth({ item }: { item: Item }) {
 const stock=status(item);
 return <span className="health-badges">
  {item.itemType==='Tool'&&item.expectedQuantity!==null&&<span className={`badge ${missingTools(item)?'missing':'good'}`}><i/>{missingTools(item)?'Missing tools':'Complete'}</span>}
  {(stock!=='GOOD'||item.itemType!=='Tool'||item.expectedQuantity===null)&&<span className={`badge ${stock.toLowerCase()}`}><i/>{stock==='GOOD'?'In stock':stock==='LOW'?'Low stock':'Out of stock'}</span>}
 </span>;
}
export function LocationCards({ db, locations, go }: { db: Database; locations: Location[]; go: (path: string)=>void }) {
 return <div className="locations-grid">{locations.map(l=>{
  const items=db.items.filter(i=>inLocation(db.locations,i.locationId,l.id));
  const missing=items.filter(missingTools).length;
  return <button className="panel location-card" key={l.id} onClick={()=>go(`location/${l.id}`)}>
   <div><span className="area-icon tone-1"><MapPin size={21}/></span><ArrowUpRight size={18}/></div>
   <small>{l.parentId?locationPath(db.locations,l.parentId):l.room}</small>
   <h2>{l.name?locationLabel(l):l.storage}</h2>
   {l.description&&<small className="location-description">{l.description}</small>}
   <span className="bin">{l.kind||l.bin}</span>
   {missing>0&&<span className="badge missing location-missing">{missing} missing-tool {missing===1?'item':'items'}</span>}
   <p>{items.length} items stored here <ArrowRight size={15}/></p>
  </button>;
 })}</div>;
}
function AuditQuantity({ item, correct,disabled }: { item: Item; correct: (item: Item, quantity: number)=>Promise<boolean>;disabled:boolean }) {
 const [value,setValue]=useState(String(item.quantity));
 const save=async()=>{const n=Number(value);if(value.trim()&&Number.isFinite(n)&&n>=0){if(n!==item.quantity&&!await correct(item,n))setValue(String(item.quantity));}else setValue(String(item.quantity));};
 return <input className="audit-quantity" disabled={disabled} type="number" min="0" step="1" aria-label={`Current quantity for ${item.name}`} value={value} onChange={e=>setValue(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){e.preventDefault();setValue(String(item.quantity));}}}/>;
}
export function LocationDetail({ db, location, go, table, adjust, correct, verify, openItem,canWrite,busy }: {
 db:Database;location:Location;go:(path:string)=>void;table:(items:Item[])=>React.ReactNode;
 adjust:(item:Item,delta:number)=>void;correct:(item:Item,quantity:number)=>Promise<boolean>;verify:()=>Promise<void>;canWrite:boolean;busy:boolean;openItem:(item:Item)=>void;
}) {
 const [audit,setAudit]=useState(location.kind==='Drawer'&&canWrite);
 const rowsRef=useRef<HTMLDivElement>(null);
 const lastJump=useRef<string|null>(null);
 const nextMissing=()=>{
  const inputs=Array.from(rowsRef.current?.querySelectorAll<HTMLInputElement>('.audit-missing .audit-quantity')??[]);
  const last=inputs.findIndex(input=>input.getAttribute('aria-label')===lastJump.current);
  const next=inputs[(last+1)%inputs.length];if(!next)return;
  lastJump.current=next.getAttribute('aria-label');next.scrollIntoView({block:'center'});next.focus({preventScroll:true});next.select();
 };
 const [search,setSearch]=useState(''),[area,setArea]=useState(''),[category,setCategory]=useState(''),[stock,setStock]=useState(''),[itemType,setItemType]=useState(''),[ownership,setOwnership]=useState('');
 const direct=db.items.filter(i=>i.locationId===location.id);
 const all=db.items.filter(i=>inLocation(db.locations,i.locationId,location.id));
 const filtered=all.filter(i=>(!search||[i.name,i.partNumber,i.vendor,i.slot,locationPath(db.locations,i.locationId)].join(' ').toLowerCase().includes(search.toLowerCase()))&&(!area||i.areaId===area)&&(!category||i.category===category)&&(!itemType||i.itemType===itemType)&&(!ownership||i.ownership===ownership)&&(!stock||(stock==='VERIFY'?needsVerification(i):stock==='MISSING'?missingTools(i):stock==='COMPLETE'?i.itemType==='Tool'&&i.expectedQuantity!==null&&!missingTools(i):status(i)===stock)));
 const expected=direct.filter(i=>i.expectedQuantity!==null);
 const unconfigured=direct.filter(i=>i.expectedQuantity===null);
 const missing=expected.reduce((sum,i)=>sum+Math.max(0,i.expectedQuantity!-i.quantity),0);
 const children=db.locations.filter(l=>l.parentId===location.id);
 return <>
  <div className="location-navigation"><button className="text-button" onClick={()=>go('locations')}>All locations</button>{locationTrail(db.locations,location.id).map(l=><span key={l.id}> / <button className="text-button" onClick={()=>go(`location/${l.id}`)}>{locationLabel(l)}</button></span>)}</div>
  {children.length>0&&<LocationCards db={db} locations={children} go={go}/>}
  <section className={`panel location-detail ${audit?'audit-panel':''} ${direct.length>=15?'audit-dense':''}`}>
   <div className="panel-heading"><div><h2>{audit?'Drawer audit':'Location inventory'}</h2><p>{audit?'Count each labeled position. Correct a count with + / − or type it directly.':`${all.length} items assigned here${children.length?' or in its child locations':''}.`}</p></div>{location.kind==='Drawer'&&canWrite&&<button className="secondary" onClick={()=>setAudit(!audit)}>{audit?'View inventory':'Drawer audit'}</button>}</div>
   {audit?<>
    <div className="audit-summary"><div><strong>{!direct.length?'No items configured':missing===0&&unconfigured.length===0?'Complete':missing>0?`${missing} tools missing`:'Expected counts needed'}</strong><small>{expected.filter(i=>i.quantity>=i.expectedQuantity!).length} / {expected.length} expected item counts complete{unconfigured.length?` · ${unconfigured.length} without an expected count`:''}</small></div><div className="audit-actions">{direct.length>=15&&missing>0&&<button className="secondary" onClick={nextMissing}>Next missing</button>}<button className="primary" disabled={busy||!canWrite||!direct.length} onClick={verify}><Check size={16}/>Mark drawer verified</button></div></div>
    <div className="audit-rows" ref={rowsRef}>{[...expected,...unconfigured].map(item=><div className={`audit-row ${missingTools(item)?'audit-missing':''}`} key={item.id}>
     <div className="audit-item"><button className="item-link" onClick={()=>openItem(item)}>{item.name}</button><small>{item.slot?`Slot ${item.slot} · `:''}{item.ownership}</small><ItemHealth item={item}/>{possibleDuplicates(db.items,item).length>0&&<small className="duplicate-flag">Possible duplicate</small>}</div>
     <div className="audit-count"><span className="count-label">Current / Expected</span><div className="stepper"><button aria-label={`Remove one ${item.name}`} disabled={busy||!canWrite||item.quantity===0} onClick={()=>adjust(item,-1)}><Minus size={14}/></button><AuditQuantity key={`${item.id}-${item.quantity}`} item={item} correct={correct} disabled={busy||!canWrite}/><span className="expected-count">/ {item.expectedQuantity??'—'}</span><button aria-label={`Add one ${item.name}`} disabled={busy||!canWrite} onClick={()=>adjust(item,1)}><Plus size={14}/></button></div><small className="audit-target">Target (overall): {item.target}</small><small>{item.lastVerified?`Verified ${new Date(item.lastVerified).toLocaleString()}`:'Not verified'}{item.expectedQuantity===null&&' · Set expected in item details'}</small></div>
    </div>)}</div>
    {!direct.length&&<div className="empty"><h3>No items assigned to this drawer</h3><p>Add an item and set its expected quantity to start auditing.</p></div>}
    <div className="audit-note">Expected = what belongs in this drawer. Target = what the team wants to own overall. Verification records your count; it does not change expected counts or hide missing tools.</div>
   </>:<><div className="filters"><label className="search"><Search size={18}/><input aria-label="Search location inventory" placeholder="Search items in this location…" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="filter-row">
    <select aria-label="Filter by area" value={area} onChange={e=>setArea(e.target.value)}><option value="">All areas</option>{db.areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
    <select aria-label="Filter by category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{db.categories.map(c=><option key={c}>{c}</option>)}</select>
    <select aria-label="Filter by stock status" value={stock} onChange={e=>setStock(e.target.value)}><option value="">All stock statuses</option><option value="GOOD">In stock</option><option value="LOW">Low stock</option><option value="OUT">Out of stock</option><option value="MISSING">Missing tools</option><option value="COMPLETE">Complete tools</option><option value="VERIFY">Needs verification</option></select>
    <select aria-label="Filter by item type" value={itemType} onChange={e=>setItemType(e.target.value)}><option value="">All item types</option>{itemTypes.map(type=><option key={type}>{type}</option>)}</select>
    <select aria-label="Filter by ownership" value={ownership} onChange={e=>setOwnership(e.target.value)}><option value="">All ownership</option>{ownerships.map(owner=><option key={owner}>{owner}</option>)}</select>
    <button className="text-button" onClick={()=>{setSearch('');setArea('');setCategory('');setStock('');setItemType('');setOwnership('');}}>Clear filters</button>
   </div></div>{table(filtered)}</>}

  </section>
 </>;
}
export function AddLocation({ db, save }: { db: Database; save:(location:Location)=>Promise<boolean> }) {
 const [parentId,setParentId]=useState('');
 return <form className="form-grid" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);const name=String(f.get('name')).trim();if(!name)return;const parent=db.locations.find(l=>l.id===parentId);const kind=String(f.get('kind')) as Location['kind'];
  if(await save({id:createId(),name,parentId:parentId||null,kind,description:String(f.get('description')).trim(),room:parent?.room||String(f.get('room')).trim(),storage:parent?locationLabel(parent):name,bin:name})){form.reset();setParentId('');}
 }}>
  <label>Parent location<select value={parentId} onChange={e=>setParentId(e.target.value)}><option value="">Top-level location</option>{db.locations.filter(l=>l.kind!=='Drawer'&&l.kind!=='Bin').map(l=><option key={l.id} value={l.id}>{locationPath(db.locations,l.id)}</option>)}</select></label>
  <label>Location type<select name="kind">{locationKinds.map(kind=><option key={kind}>{kind}</option>)}</select></label>
  <label>Name / Code<input name="name" placeholder="Toolbox A or TA-01" required/></label>
  <label>Area / Room<input name="room" placeholder={parentId?'Inherited from parent':'Robotics Lab'} required={!parentId}/></label>
  <label className="full">Contents / Description<input name="description" placeholder="SAE Hex Keys"/></label>
  <button className="primary">Add location</button>
 </form>;
}
