import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const allowed = new Set(["downloading", "live", "failed"]);

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
    const { deploymentId, status, playerVersion } = await request.json();
    if (!deploymentId || !allowed.has(status)) return NextResponse.json({ error: "Geçersiz yayın durumu." }, { status: 400 });

    const supabase = adminClient();
    const { data: screen } = await supabase.from("screens").select("id").eq("device_token", token).single();
    if (!screen) return NextResponse.json({ error: "Cihaz tanınmadı." }, { status: 401 });

    const { data: deployment } = await supabase.from("deployments").select("id").eq("id", deploymentId).eq("screen_id", screen.id).single();
    if (!deployment) return NextResponse.json({ error: "Yayın görevi bulunamadı." }, { status: 404 });

    const deviceStatus = status === "live" ? "playing" : status === "failed" ? "error" : "online";
    await Promise.all([
      supabase.from("deployments").update({ status }).eq("id", deployment.id),
      supabase.from("screens").update({
        last_seen_at: new Date().toISOString(),
        device_status: deviceStatus,
        ...(playerVersion ? { player_version: String(playerVersion) } : {}),
      }).eq("id", screen.id),
    ]);

    return NextResponse.json({ ok: true, deploymentId: deployment.id, status });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Cihaz durumu güncellenemedi." }, { status: 500 });
  }
}
