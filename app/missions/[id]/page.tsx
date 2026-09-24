"use client";
import {useEffect,useMemo,useState} from "react";
import {ArrowLeft,CheckCircle2,Circle,Target,Clock3} from "lucide-react";
type Task={id:string;title:string;description?:string|null;status:string;position:number;due_at?:string|null};
type Milestone={id:string;title:string;description?:string|null;status:string;position:number;mission_tasks:Task[]};
type Mission={id:string;title:string;description?:string|null;status:string;mission_milestones:Milestone[]};
export default function MissionDetail({params}:{params:Promise<{id:string}>}){
 const [mission,setMission]=useState<Mission|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [id,setId]=useState("");
 useEffect(()=>{params.then(p=>setId(p.id))},[params]);
 useEffect(()=>{if(!id)return;fetch("/api/missions").then(r=>r.json()).then(d=>{if(d.error)setError(d.error);else setMission((d.missions||[]).find((m:Mission)=>m.id===id)||null)}).catch(()=>setError("Failed to load mission.")).finally(()=>setLoading(false))},[id]);
 const all=useMemo(()=>mission?.mission_milestones.flatMap(m=>m.mission_tasks)||[],[mission]);const done=all.filter(t=>t.status==="completed").length;const pct=all.length?Math.round(done/all.length*100):0;
 async function updateTask(task:Task){const next=task.status==="completed"?"pending":"completed";const r=await fetch("/api/missions/"+id+"/tasks",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({task_id:task.id,status:next})});const d=await r.json();if(!r.ok){setError(d.error||"Task update failed.");return}setMission(m=>m?{...m,mission_milestones:m.mission_milestones.map(ms=>({...ms,mission_tasks:ms.mission_tasks.map(t=>t.id===task.id?d.task:t)}))}:m)}
 if(loading)return <main className="ai-page mission-detail"><p>Loading mission…</p></main>;
 if(!mission)return <main className="ai-page mission-detail"><a className="back-link" href="/missions"><ArrowLeft size={16}/> Missions</a><p className="mission-error">{error||"Mission not found."}</p></main>;
 return <main className="ai-page mission-detail"><header className="ai-head"><div><small>MISSION EXECUTION</small><h1>{mission.title}</h1><p>{mission.description||"Execution workspace for this mission."}</p></div><a className="back-link" href="/missions"><ArrowLeft size={16}/> Missions</a></header>
 <section className="progress-shell"><div className="progress-row"><div><small>OVERALL PROGRESS</small><h2>{pct}%</h2></div><div>{done}/{all.length} TASKS COMPLETE</div></div><div className="progress-track"><div className="progress-fill" style={{width:pct+"%"}}/></div></section>
 {error&&<p className="mission-error">{error}</p>}
 <section>{mission.mission_milestones.sort((a,b)=>a.position-b.position).map(ms=>{const total=ms.mission_tasks.length;const completed=ms.mission_tasks.filter(t=>t.status==="completed").length;const mp=total?Math.round(completed/total*100):0;return <article className="milestone" key={ms.id}><div className="milestone-head"><div><small>MILESTONE {ms.position+1}</small><h3>{ms.title}</h3><p>{ms.description||""}</p></div><strong>{mp}%</strong></div><div className="progress-track"><div className="progress-fill" style={{width:mp+"%"}}/></div><div className="task-list">{ms.mission_tasks.sort((a,b)=>a.position-b.position).map(task=><div className="task" key={task.id}><button className={task.status==="completed"?"done":""} onClick={()=>updateTask(task)}>{task.status==="completed"?<CheckCircle2 size={16}/>:<Circle size={16}/>}</button><span>{task.title}</span>{task.due_at&&<small><Clock3 size={12}/> {new Date(task.due_at).toLocaleDateString()}</small>}</div>)}</div></article>})}</section>
 </main>
}