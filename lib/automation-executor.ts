import {createClient} from "@supabase/supabase-js";

export function createAutomationAdminClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)throw new Error("Missing Supabase server environment variables.");
  return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}

export async function executeAutomationWorkflow(supabase:any,w:any,userId:string,trigger:string,payload:any={}){
  const {data:run,error:re}=await supabase.from("automation_runs").insert({workflow_id:w.id,user_id:userId,status:"running",started_at:new Date().toISOString(),output:{trigger,payload}}).select("id").single();
  if(re)throw new Error(re.message);
  try{
    const instruction=typeof w.config?.instruction==="string"?w.config.instruction:(w.description||"Complete this workflow.");
    const provider=process.env.AI_PROVIDER; const key=process.env.AI_API_KEY; let output="Workflow executed: "+instruction;
    if(provider==="openai"&&key){
      const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model:process.env.AI_MODEL||"gpt-5.6-luna",input:[{role:"system",content:"You are the GOD-OF INNOVATION automation executor. Execute the requested workflow instruction and return concise actionable results. Never claim an external action was completed unless the system actually performed it. Event payload: "+JSON.stringify(payload)},{role:"user",content:instruction}]})});
      if(!response.ok)throw new Error("AI execution failed with status "+response.status); const data=await response.json(); output=data.output_text||"Workflow completed without text output.";
    }
    await supabase.from("automation_runs").update({status:"completed",output:{text:output,trigger,payload},finished_at:new Date().toISOString()}).eq("id",run.id);
    await supabase.from("audit_logs").insert({user_id:userId,action:"automation.executed",metadata:{workflow_id:w.id,run_id:run.id,trigger}});
    return {id:run.id,status:"completed",output};
  }catch(error){const message=error instanceof Error?error.message:"Execution failed."; await supabase.from("automation_runs").update({status:"failed",output:{error:message,trigger},finished_at:new Date().toISOString()}).eq("id",run.id); throw error;}
}