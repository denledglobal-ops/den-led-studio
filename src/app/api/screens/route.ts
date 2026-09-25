import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json();
  const name=String(body.name||"").trim(), location=String(body.location||"").trim();
  const width=Number(body.width), height=Number(body.height);
  if(!name || !Number.isInteger(width) || !Number.isInteger(height) || width<64 || height<64 || width>8192 || height>8192)
    return NextResponse.json({error:"Geçersiz ekran bilgileri."},{status:400});
  const {data:org,error:orgError}=await supabase.from("organizations").select("id").eq("owner_id",user.id).limit(1).maybeSingle();
  if(orgError || !org) return NextResponse.json({error:orgError?.message||"Şirket bulunamadı."},{status:404});
  const {data,error}=await supabase.from("screens").insert({organization_id:org.id,name,location,width,height})
    .select("id,name,location,width,height,last_seen_at,device_status,player_version").single();
  if(error || !data) return NextResponse.json({error:error?.message||"Ekran oluşturulamadı."},{status:400});
  return NextResponse.json({screen:data});
}
