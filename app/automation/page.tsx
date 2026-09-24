"use client";
import {useEffect,useState} from "react";
import {ArrowLeft,Workflow,Plus,Zap} from "lucide-react";
type W={id:string;name:string;description:string|null;trigger_type:string;enabled:boolean};
export default function AutomationPage(){
 const [items,setItems]=useState<W[]>([]),[name,setName]=useState(""),[description,setDescription]=useState(""),[trigger,setTrigger]=useState("manual"),[saving,setSaving]=useState(false),[error,setError]=useState("");
 useEffect(()=>{fetch("/api/automation").then(r=>r.json()).then(d=>{if(d.workflows)setItems(d.workflows);else setError(d.error||"Unable to load workflows.")})},[]);
 async function create(e:React.FormEvent){e.preventDefault();setSaving(true);setError("");const r=await fetch("/api/automation",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,description,trigger_type:trigger})});const d=await r.json();if(!r.ok)setError(d.error||"Failed.");else{setItems(x=>[d.workflow,...x]);setName("");setDescription("")}setSaving(false)}
 return <main className="ai-page"><header className="ai-head"><div><small>AUTOMATION ENGINE</small><h1>Make execution repeatable.</h1><p>Create workflow definitions for manual, scheduled and event-driven automation.</p></div><a href="/dashboard"><ArrowLeft size={16}/> Dashboard</a></header>
 <section className="ai-box"><form onSubmit={create}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Workflow name" maxLength={160} required/><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe what this workflow should do."/><select value={trigger} onChange={e=>setTrigger(e.target.value)}><option value="manual">Manual trigger</option><option value="schedule">Schedule trigger</option><option value="event">Event trigger</option></select><button disabled={saving}><Plus size={17}/>{saving?"Creating…":"Create Workflow"}</button></form>{error&&<p className="ai-error">{error}</p>}</section>
 <section className="module-grid">{items.map(w=><article key={w.id}><div className="icon"><Workflow size={22}/></div><h3>{w.name}</h3><p>{w.description||"No description."}</p><small><Zap size={13}/> {w.trigger_type.toUpperCase()} · {w.enabled?"ENABLED":"DISABLED"}</small></article>)}</section>
 </main>
}