import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const { data: screen } = await supabase.from("screens").select("id,name,width,height").eq("device_token_hash", tokenHash).single();
    if (!screen) return NextResponse.json({ error: "Cihaz tanınmadı." }, { status: 401 });

    await supabase.from("screens").update({ last_seen_at: new Date().toISOString(), device_status: "online" }).eq("id", screen.id);

    const { data: command } = await supabase.from("device_commands")
      .select("id,command").eq("screen_id", screen.id).eq("status", "queued")
      .order("created_at", { ascending: true }).limit(1).maybeSingle();

    if (command) {
      await supabase.from("device_commands").update({ received_at: new Date().toISOString() }).eq("id", command.id);
    }

    const { data: deployment } = await supabase.from("deployments")
      .select("id,status,projects(id,title,output_url,width,height)")
      .eq("screen_id", screen.id).eq("status", "queued")
      .order("created_at", { ascending: true }).limit(1).maybeSingle();

    return NextResponse.json({ screen: { id: screen.id, name: screen.name, width: screen.width, height: screen.height }, command: command ?? null, deployment: deployment ?? null });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Cihaz görevi alınamadı." }, { status: 500 });
  }
}
