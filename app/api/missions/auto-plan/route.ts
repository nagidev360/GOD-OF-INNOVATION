import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "../../../../lib/supabase-server";

type Plan={title:string;description:string;milestones:{title:string;description:string;tasks:{title:string;description:string}[]}[]};

export async function POST(request:Request){
  try{
    const supabase=await createSupabaseServerClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});

    const body=await request.json();
    const idea=typeof body.idea==="string"?body.idea.trim():"";
    if(!idea||idea.length>12000)return NextResponse.json({error:"Idea must be between 1 and 12000 characters."},{status:400});

    const provider=process.env.AI_PROVIDER, apiKey=process.env.AI_API_KEY;
    if(provider!=="openai"||!apiKey)return NextResponse.json({error:"OpenAI AI provider is not configured."},{status:503});

    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:process.env.AI_MODEL||"gpt-5.6-luna",
        input:[
          {role:"system",content:"Create an executable mission plan. Return ONLY valid JSON matching this shape: {title:string,description:string,milestones:[{title:string,description:string,tasks:[{title:string,description:string}]}]}. Create 3-7 milestones and 2-6 concrete tasks per milestone. No markdown. Keep tasks actionable and ordered."},
          {role:"user",content:idea}
        ],
        text:{format:{type:"json_schema",name:"mission_plan",strict:true,schema:{type:"object",additionalProperties:false,properties:{title:{type:"string"},description:{type:"string"},milestones:{type:"array",items:{type:"object",additionalProperties:false,properties:{title:{type:"string"},description:{type:"string"},tasks:{type:"array",items:{type:"object",additionalProperties:false,properties:{title:{type:"string"},description:{type:"string"}},required:["title","description"]}}},required:["title","description","tasks"]}}},required:["title","description","milestones"]}}}
      })
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data?.error?.message||"AI planning request failed.");
    const raw=data.output_text||"";
    const plan:Plan=JSON.parse(raw);
    if(!plan.title||!Array.isArray(plan.milestones)||plan.milestones.length<1)throw new Error("AI returned an invalid mission plan.");

    const {data:mission,error:missionError}=await supabase.from("missions").insert({user_id:user.id,title:plan.title.slice(0,160),description:plan.description.slice(0,2000)}).select("id,title,description,status,created_at").single();
    if(missionError)throw missionError;

    for(let mi=0;mi<plan.milestones.length;mi++){
      const m=plan.milestones[mi];
      const {data:milestone,error:milestoneError}=await supabase.from("mission_milestones").insert({mission_id:mission.id,title:m.title.slice(0,160),description:m.description.slice(0,2000),position:mi}).select("id").single();
      if(milestoneError)throw milestoneError;
      const tasks=m.tasks.slice(0,6).map((t,ti)=>({milestone_id:milestone.id,mission_id:mission.id,title:t.title.slice(0,200),description:t.description.slice(0,2000),position:ti}));
      if(tasks.length){const {error}=await supabase.from("mission_tasks").insert(tasks);if(error)throw error;}
    }
    await supabase.from("ai_runs").insert({user_id:user.id,provider,model:process.env.AI_MODEL||null,status:"completed"});
    await supabase.from("audit_logs").insert({user_id:user.id,action:"mission.auto_planned",metadata:{mission_id:mission.id,milestones:plan.milestones.length}});
    return NextResponse.json({mission,plan});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Auto-planning failed."},{status:500});}
}
