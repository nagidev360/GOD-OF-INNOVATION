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
    if(!name||name.length>160)return NextResponse.json({error:"Workflow name is required and must be 160 characters or less."},{status:400});
    const {data,error}=await supabase.from("automation_workflows").insert({user_id:user.id,name,description:description||null,trigger_type}).select("id,name,description,trigger_type,enabled,created_at").single();
    if(error)return NextResponse.json({error:error.message},{status:500});
    await supabase.from("audit_logs").insert({user_id:user.id,action:"automation.created",metadata:{workflow_id:data.id}});
    return NextResponse.json({workflow:data},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invalid request."},{status:400});}
}