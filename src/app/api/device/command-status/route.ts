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
    const { commandId, status } = await request.json();
    if (!commandId || !["completed", "failed"].includes(status)) {
      return NextResponse.json({ error: "Geçersiz komut durumu." }, { status: 400 });
    }
    const supabase = adminClient();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const { data: screen } = await supabase.from("screens").select("id").eq("device_token_hash", tokenHash).single();
    if (!screen) return NextResponse.json({ error: "Cihaz tanınmadı." }, { status: 401 });

    const { data: command } = await supabase.from("device_commands").select("id").eq("id", commandId).eq("screen_id", screen.id).single();
    if (!command) return NextResponse.json({ error: "Komut bulunamadı." }, { status: 404 });

    await supabase.from("device_commands").update({
      status,
      received_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }).eq("id", commandId);
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Komut durumu güncellenemedi." }, { status: 500 });
  }
}
