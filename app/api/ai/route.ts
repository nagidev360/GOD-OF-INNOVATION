import {NextResponse} from 'next/server';
import {createSupabaseServerClient} from '../../../lib/supabase-server';

export async function POST(request:Request){
  try{
    const supabase=await createSupabaseServerClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const body=await request.json();
    const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
    if(!prompt||prompt.length>12000)return NextResponse.json({error:'Prompt must be between 1 and 12000 characters.'},{status:400});
    const provider=process.env.AI_PROVIDER;
    const apiKey=process.env.AI_API_KEY;
    if(!provider||!apiKey)return NextResponse.json({error:'AI provider is not configured yet.'},{status:503});
    const started=Date.now();
    let output='';
    if(provider==='openai'){
      const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.AI_MODEL||'gpt-5-mini',input:[{role:'system',content:'You are the GOD OF INNOVATION AI engine. Give practical, structured and safe answers. Help turn ideas into executable plans.'},{role:'user',content:prompt}]} )});
      const data=await response.json();
      if(!response.ok)throw new Error(data?.error?.message||'AI provider request failed.');
      output=data.output_text||data.output?.flatMap((x:any)=>x.content||[]).map((x:any)=>x.text||'').join('')||'';
    }else throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
    await supabase.from('ai_runs').insert({user_id:user.id,provider,model:process.env.AI_MODEL||null,status:'completed'});
    return NextResponse.json({output,duration_ms:Date.now()-started});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'AI request failed.'},{status:500});}
}
