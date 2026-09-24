import {NextResponse} from "next/server";
import {createAutomationAdminClient,executeAutomationWorkflow} from "../../../lib/automation-executor";
import {nextCronRun} from "../../../lib/automation-schedule";
export const dynamic="force-dynamic";
export async function POST(request:Request){
  const secret=process.env.AUTOMATION_CRON_SECRET; if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized."},{status:401});
  try{
    const supabase=createAutomationAdminClient(); const now=new Date().toISOString();
    const {data:items,error}=await supabase.from("automation_workflows").select("id,user_id,name,description,trigger_type,enabled,config,next_run_at").eq("enabled",true).eq("trigger_type","schedule").lte("next_run_at",now).limit(50);
    if(error)throw new Error(error.message); let executed=0,skipped=0;
    for(const w of items||[]){
      const cron=typeof w.config?.cron==="string"?w.config.cron:""; if(!cron){skipped++;continue;} const timezone=typeof w.config?.timezone==="string"?w.config.timezone:"UTC";
      const next=nextCronRun(cron,new Date(),timezone);
      const {data:claimed}=await supabase.from("automation_workflows").update({next_run_at:next}).eq("id",w.id).eq("next_run_at",w.next_run_at).select("id").maybeSingle();
      if(!claimed){skipped++;continue;}
      try{await executeAutomationWorkflow(supabase,w,w.user_id,"schedule",{scheduled_for:w.next_run_at});executed++;}catch{skipped++;}
    }
    return NextResponse.json({ok:true,checked:(items||[]).length,executed,skipped});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Scheduler failed."},{status:500});}
}