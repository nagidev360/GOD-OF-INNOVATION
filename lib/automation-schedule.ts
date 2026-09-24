export type ScheduleConfig={cron:string;timezone?:string;next_run_at?:string|null;event_name?:string};

function fieldMatches(value:number,field:string,min:number,max:number){
  return field.split(",").some(part=>{part=part.trim(); if(!part)return false; const [base,stepText]=part.split("/"); const step=stepText?Number(stepText):1; if(!Number.isInteger(step)||step<1)return false;
    let start=min,end=max; if(base!=="*"){ if(base.includes("-")){const [a,b]=base.split("-").map(Number); if(!Number.isInteger(a)||!Number.isInteger(b))return false; start=a;end=b;} else {const n=Number(base); return Number.isInteger(n)&&value===n;}}
    return value>=start&&value<=end&&(value-start)%step===0;
  });
}
export function cronMatches(date:Date,cron:string,timezone="UTC"){
  const f=cron.trim().split(/\\s+/); if(f.length!==5)throw new Error("Cron must use 5 fields: minute hour day month weekday.");
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:timezone,minute:"numeric",hour:"numeric",day:"numeric",month:"numeric",weekday:"short",hourCycle:"h23"}).formatToParts(date);
  const get=(t:string)=>Number(parts.find(p=>p.type===t)?.value); const weekdayMap:{[k:string]:number}={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}; const wd=weekdayMap[parts.find(p=>p.type==="weekday")?.value||"Sun"];
  return fieldMatches(get("minute"),f[0],0,59)&&fieldMatches(get("hour"),f[1],0,23)&&fieldMatches(get("day"),f[2],1,31)&&fieldMatches(get("month"),f[3],1,12)&&fieldMatches(wd,f[4],0,6);
}
export function nextCronRun(cron:string,from=new Date(),timezone="UTC"){
  const probe=new Date(from); probe.setSeconds(0,0); probe.setMinutes(probe.getMinutes()+1);
  for(let i=0;i<525600;i++){if(cronMatches(probe,cron,timezone))return probe.toISOString(); probe.setMinutes(probe.getMinutes()+1);}
  throw new Error("No cron occurrence found within one year.");
}