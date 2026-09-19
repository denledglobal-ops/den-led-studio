import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Cihaz API yapılandırması eksik.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  const token = request.headers.get("x-device-token");
  if (!token) return NextResponse.json({ error: "Cihaz anahtarı gerekli." }, { status: 401 });
  try {
    const supabase = adminClient();
    const { data: screen } = await supabase.from("screens").select("id,name").eq("device_token", token).single();
    if (!screen) return NextResponse.json({ error: "Cihaz tanınmadı." }, { status: 401 });

    await supabase.from("screens").update({ last_seen_at: new Date().toISOString(), device_status: "online" }).eq("id", screen.id);

    const { data: deployment } = await supabase.from("deployments")
      .select("id,status,projects(id,title,output_url,width,height)")
      .eq("screen_id", screen.id).eq("status", "queued")
      .order("created_at", { ascending: true }).limit(1).maybeSingle();

    return NextResponse.json({ screen: { id: screen.id, name: screen.name }, deployment: deployment ?? null });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Cihaz görevi alınamadı." }, { status: 500 });
  }
}
