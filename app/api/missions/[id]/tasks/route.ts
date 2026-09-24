import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "../../../../../lib/supabase-server";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const supabase=await createSupabaseServerClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const body=await request.json();
    const taskId=typeof body.task_id==="string"?body.task_id:"";
    const status=body.status;
    if(!taskId||!["pending","in_progress","completed","blocked"].includes(status))return NextResponse.json({error:"Valid task and status are required."},{status:400});
    const {data:task,error}=await supabase.from("mission_tasks").update({status}).eq("id",taskId).eq("mission_id",id).select("id,title,status,position,due_at").single();
    if(error)return NextResponse.json({error:error.message},{status:500});
    await supabase.from("audit_logs").insert({user_id:user.id,action:"mission.task_status_changed",metadata:{mission_id:id,task_id:taskId,status}});
    return NextResponse.json({task});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invalid request."},{status:400});}
}