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
  try {
    const { code, playerVersion } = await request.json();
    const pairingCode = String(code ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(pairingCode)) return NextResponse.json({ error: "Geçersiz eşleştirme kodu." }, { status: 400 });

    const supabase = adminClient();
    const { data: screen } = await supabase.from("screens")
      .select("id,name,pairing_expires_at")
      .eq("pairing_code", pairingCode).single();

    if (!screen) return NextResponse.json({ error: "Eşleştirme kodu bulunamadı." }, { status: 404 });
    if (!screen.pairing_expires_at || new Date(screen.pairing_expires_at).getTime() < Date.now())
      return NextResponse.json({ error: "Eşleştirme kodunun süresi dolmuş." }, { status: 410 });

    const deviceToken = crypto.randomBytes(32).toString("hex");
    const { error } = await supabase.from("screens").update({
      device_token: null,
      device_token_hash: crypto.createHash("sha256").update(deviceToken).digest("hex"),
      pairing_code: null,
      pairing_expires_at: null,
      device_status: "online",
      last_seen_at: new Date().toISOString(),
      player_version: playerVersion ? String(playerVersion) : null,
    }).eq("id", screen.id);
    if (error) throw error;

    return NextResponse.json({ deviceToken, screen: { id: screen.id, name: screen.name } });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Cihaz eşleştirilemedi." }, { status: 500 });
  }
}
