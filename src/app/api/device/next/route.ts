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

    let { data: deployment } = await supabase.from("deployments")
      .select("id,status,projects(id,title,output_url,width,height)")
      .eq("screen_id", screen.id).eq("status", "queued")
      .order("created_at", { ascending: true }).limit(1).maybeSingle();

    if (!deployment && command?.command === "redownload") {
      const latest = await supabase.from("deployments")
        .select("id,status,projects(id,title,output_url,width,height)")
        .eq("screen_id", screen.id).eq("status", "live")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      deployment = latest.data ?? null;
    }

    const now = new Date();
    const day = now.getUTCDay();
    const time = now.toISOString().slice(11, 19);
    const { data: schedules } = await supabase.from("screen_schedules")
      .select("id,priority,starts_at,ends_at,daily_start,daily_end,days_of_week,playlists(id,name,playlist_items(id,position,duration_seconds,projects(id,title,output_url,width,height,status)))")
      .eq("screen_id", screen.id).eq("is_active", true)
      .order("priority", { ascending: false });

    const activeSchedule = (schedules ?? []).find((item: any) => {
      const days = item.days_of_week ?? [0,1,2,3,4,5,6];
      return days.includes(day)
        && (!item.starts_at || now >= new Date(item.starts_at))
        && (!item.ends_at || now < new Date(item.ends_at))
        && (!item.daily_start || time >= item.daily_start)
        && (!item.daily_end || time < item.daily_end);
    }) ?? null;

    const playlistRaw: any = activeSchedule?.playlists ?? null;
    const playlist = playlistRaw ? {
      id: playlistRaw.id,
      name: playlistRaw.name,
      items: (playlistRaw.playlist_items ?? [])
        .filter((item: any) => item.projects?.status === "ready" && item.projects?.output_url)
        .sort((a: any, b: any) => a.position - b.position)
        .map((item: any) => ({ id: item.id, position: item.position, durationSeconds: item.duration_seconds, project: item.projects }))
    } : null;

    return NextResponse.json({ screen: { id: screen.id, name: screen.name, width: screen.width, height: screen.height }, command: command ?? null, deployment: deployment ?? null, playlist });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Cihaz görevi alınamadı." }, { status: 500 });
  }
}
