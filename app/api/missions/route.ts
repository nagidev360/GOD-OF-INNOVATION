import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "../../../lib/supabase-server";

export async function GET(){
  const supabase=await createSupabaseServerClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const {data,error}=await supabase.from("missions").select("id,title,description,status,created_at,mission_milestones(id,title,status,position,mission_tasks(id,title,status,position,due_at))").eq("user_id",user.id).order("created_at",{ascending:false});
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({missions:data||[]});
}

export async function POST(request:Request){
  try{
    const supabase=await createSupabaseServerClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const body=await request.json();
    const title=typeof body.title==="string"?body.title.trim():"";
    const description=typeof body.description==="string"?body.description.trim():"";
    if(!title||title.length>160)return NextResponse.json({error:"Mission title is required and must be 160 characters or less."},{status:400});
    const {data,error}=await supabase.from("missions").insert({user_id:user.id,title,description:description||null}).select("id,title,description,status,created_at").single();
    if(error)return NextResponse.json({error:error.message},{status:500});
    await supabase.from("audit_logs").insert({user_id:user.id,action:"mission.created",metadata:{mission_id:data.id}});
    return NextResponse.json({mission:data},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invalid request."},{status:400});}
}

export async function PATCH(request:Request){
  try{
    const supabase=await createSupabaseServerClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const body=await request.json();
    const id=typeof body.id==="string"?body.id:"";
    const status=body.status;
    if(!id||!["active","completed","archived"].includes(status))return NextResponse.json({error:"Valid mission id and status are required."},{status:400});
    const {data,error}=await supabase.from("missions").update({status}).eq("id",id).eq("user_id",user.id).select("id,status").single();
    if(error)return NextResponse.json({error:error.message},{status:500});
    await supabase.from("audit_logs").insert({user_id:user.id,action:"mission.status_changed",metadata:{mission_id:id,status}});
    return NextResponse.json({mission:data});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invalid request."},{status:400});}
}
