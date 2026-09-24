import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "../../../lib/supabase-server";

export async function GET(){
  const supabase=await createSupabaseServerClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const {data,error}=await supabase.from("automation_workflows").select("id,name,description,trigger_type,enabled,created_at").eq("user_id",user.id).order("created_at",{ascending:false});
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({workflows:data||[]});
}
export async function POST(request:Request){
  try{
    const supabase=await createSupabaseServerClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const body=await request.json();
    const name=typeof body.name==="string"?body.name.trim():"";
    const description=typeof body.description==="string"?body.description.trim():"";
    const trigger_type=["manual","schedule","event"].includes(body.trigger_type)?body.trigger_type:"manual";
    const instruction=typeof body.instruction==="string"?body.instruction.trim():description;
    if(instruction.length>4000)return NextResponse.json({error:"Workflow instruction must be 4000 characters or less."},{status:400});
    if(!name||name.length>160)return NextResponse.json({error:"Workflow name is required and must be 160 characters or less."},{status:400});
    const {data,error}=await supabase.from("automation_workflows").insert({user_id:user.id,name,description:description||null,trigger_type,config:{instruction}}).select("id,name,description,trigger_type,enabled,created_at").single();
    if(error)return NextResponse.json({error:error.message},{status:500});
    await supabase.from("audit_logs").insert({user_id:user.id,action:"automation.created",metadata:{workflow_id:data.id}});
    return NextResponse.json({workflow:data},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invalid request."},{status:400});}
}

export async function PATCH(request:Request){
 try{
  const supabase=await createSupabaseServerClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const body=await request.json(); const id=typeof body.id==="string"?body.id:""; const enabled=typeof body.enabled==="boolean"?body.enabled:null;
  if(!id||enabled===null)return NextResponse.json({error:"Workflow id and enabled are required."},{status:400});
  const {data,error}=await supabase.from("automation_workflows").update({enabled}).eq("id",id).eq("user_id",user.id).select("id,enabled").single();
  if(error)return NextResponse.json({error:error.message},{status:500});
  await supabase.from("audit_logs").insert({user_id:user.id,action:"automation.toggled",metadata:{workflow_id:id,enabled}});
  return NextResponse.json({workflow:data});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invalid request."},{status:400});}
}