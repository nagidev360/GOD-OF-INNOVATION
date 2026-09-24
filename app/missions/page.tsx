"use client";
import {useEffect,useState} from "react";
import {ArrowLeft,CheckCircle2,Plus,Target,Clock3} from "lucide-react";

type Mission={id:string;title:string;description:string|null;status:string;created_at:string};
export default function MissionsPage(){
  const [missions,setMissions]=useState<Mission[]>([]);
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [idea,setIdea]=useState(""); const [planning,setPlanning]=useState(false); const [plan,setPlan]=useState<any>(null);

  async function load(){setLoading(true);const r=await fetch("/api/missions");const d=await r.json();if(!r.ok)setError(d.error||"Failed to load missions.");else setMissions(d.missions||[]);setLoading(false)}
  useEffect(()=>{load()},[]);
  async function createMission(e:React.FormEvent){e.preventDefault();setSaving(true);setError("");const r=await fetch("/api/missions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,description})});const d=await r.json();if(!r.ok)setError(d.error||"Failed to create mission.");else{setMissions(x=>[d.mission,...x]);setTitle("");setDescription("")}setSaving(false)}
  async function autoPlan(e:React.FormEvent){e.preventDefault();setPlanning(true);setError("");setPlan(null);const r=await fetch("/api/missions/auto-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idea})});const d=await r.json();if(!r.ok)setError(d.error||"Auto-planning failed.");else{setPlan(d.plan);setMissions(x=>[d.mission,...x]);setIdea("")}setPlanning(false)}
  async function complete(id:string){const r=await fetch("/api/missions",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:"completed"})});if(r.ok)setMissions(x=>x.map(m=>m.id===id?{...m,status:"completed"}:m))}
  return <main className="ai-page"><header className="ai-head"><div><small>MISSION ENGINE</small><h1>Turn plans into missions.</h1><p>Create, track and complete execution goals.</p></div><a href="/dashboard"><ArrowLeft size={16}/> Dashboard</a></header>
    <section className="ai-box"><form onSubmit={autoPlan}><textarea value={idea} onChange={e=>setIdea(e.target.value)} maxLength={12000} placeholder="Describe your idea. AI will turn it into a mission, milestones and tasks." required/><button disabled={planning}><Target size={17}/>{planning?"Planning…":"AI Auto-Plan Mission"}</button></form><hr/><form onSubmit={createMission}><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160} placeholder="Mission title — e.g. Launch my first product" required/><textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={2000} placeholder="What does success look like?"/><button disabled={saving}><Plus size={17}/>{saving?"Creating…":"Create Mission"}</button></form>{error&&<p className="ai-error">{error}</p>}</section>
    <section className="module-grid">{loading?<article><p>Loading missions…</p></article>:missions.length===0?<article><div className="icon"><Target size={22}/></div><h3>No missions yet</h3><p>Create your first mission above.</p></article>:missions.map(m=><article key={m.id}><div className="icon">{m.status==="completed"?<CheckCircle2 size={22}/>:<Target size={22}/>}</div><h3><a href={"/missions/"+m.id}>{m.title}</a></h3><p>{m.description||"No description provided."}</p><a className="back-link" href={"/missions/"+m.id}>Open mission <Target size={14}/></a><small><Clock3 size={13}/> {m.status.toUpperCase()}</small>{m.status==="active"&&<button onClick={()=>complete(m.id)}>Mark complete</button>}</article>)}</section>
  </main>
}