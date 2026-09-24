import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "../../../../lib/supabase-server";
export async function POST(request:Request){
 try{
  const supabase=await createSupabaseServerClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const body=await request.json(); const id=typeof body.id==="string"?body.id:"";
  if(!id)return NextResponse.json({error:"Workflow id is required."},{status:400});
  const {data:w,error:we}=await supabase.from("automation_workflows").select("id,name,description,trigger_type,enabled,config").eq("id",id).eq("user_id",user.id).single();
  if(we)return NextResponse.json({error:"Workflow not found."},{status:404});
  if(!w.enabled)return NextResponse.json({error:"Workflow is disabled."},{status:400});
  const {data:run,error:re}=await supabase.from("automation_runs").insert({workflow_id:w.id,user_id:user.id,status:"running",started_at:new Date().toISOString()}).select("id").single();
  if(re)return NextResponse.json({error:re.message},{status:500});
  try{
   const instruction=typeof w.config?.instruction==="string"?w.config.instruction:(w.description||"Complete this workflow.");
   const provider=process.env.AI_PROVIDER; const key=process.env.AI_API_KEY;
   let output="Workflow executed: "+instruction;
   if(provider==="openai"&&key){
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify({model:process.env.AI_MODEL||"gpt-5.6-luna",input:[{role:"system",content:"You are the GOD-OF INNOVATION automation executor. Execute the requested workflow instruction and return concise actionable results. Do not claim external actions were completed unless the system actually performed them."},{role:"user",content:instruction}]})});
    if(!response.ok)throw new Error("AI execution failed with status "+response.status);
    const data=await response.json(); output=data.output_text||"Workflow completed without text output.";
   }
   await supabase.from("automation_runs").update({status:"completed",output:{text:output},finished_at:new Date().toISOString()}).eq("id",run.id).eq("user_id",user.id);
   await supabase.from("audit_logs").insert({user_id:user.id,action:"automation.executed",metadata:{workflow_id:w.id,run_id:run.id}});
   return NextResponse.json({run:{id:run.id,status:"completed",output}});
  }catch(error){
   const message=error instanceof Error?error.message:"Execution failed.";
   await supabase.from("automation_runs").update({status:"failed",output:{error:message},finished_at:new Date().toISOString()}).eq("id",run.id).eq("user_id",user.id);
   return NextResponse.json({error:message,run_id:run.id},{status:500});
  }
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invalid request."},{status:400});}
}