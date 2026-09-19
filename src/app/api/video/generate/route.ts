import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVideoProvider } from "@/lib/video/provider";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const body = await request.json();
  const projectId = String(body.projectId ?? "");
  const { data: project, error } = await supabase.from("projects")
    .select("id,prompt,width,height,duration_seconds,status")
    .eq("id", projectId).single();
  if (error || !project) return NextResponse.json({ error: "Proje bulunamadı." }, { status: 404 });
  if (!project.prompt) return NextResponse.json({ error: "Proje promptu bulunmuyor." }, { status: 400 });

  try {
    const result = await getVideoProvider().create({
      projectId: project.id, prompt: project.prompt, width: project.width,
      height: project.height, durationSeconds: project.duration_seconds,
    });
    await supabase.from("projects").update({
      status: result.status === "failed" ? "failed" : "rendering",
      provider: result.provider, provider_job_id: result.jobId,
      generation_error: result.error ?? null,
    }).eq("id", project.id);
    return NextResponse.json(result);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Video üretimi başlatılamadı.";
    await supabase.from("projects").update({ status: "failed", generation_error: message }).eq("id", project.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
