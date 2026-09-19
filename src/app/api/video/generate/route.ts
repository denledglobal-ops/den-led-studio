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
    .select("id,organization_id,prompt,width,height,duration_seconds,status,provider,provider_job_id,output_url,generation_error")
    .eq("id", projectId).single();
  if (error || !project) return NextResponse.json({ error: "Proje bulunamadı." }, { status: 404 });
  if (!project.prompt) return NextResponse.json({ error: "Proje promptu bulunmuyor." }, { status: 400 });

  // Paid providers must never receive a duplicate generation request for the same project.
  if (project.provider_job_id && ["queued", "rendering", "ready"].includes(project.status)) {
    return NextResponse.json({
      provider: project.provider,
      jobId: project.provider_job_id,
      status: project.status,
      outputUrl: project.output_url,
      error: project.generation_error,
      reused: true,
    });
  }

  const { error: creditError } = await supabase.rpc("spend_video_credit", {
    target_org: project.organization_id, target_project: project.id, cost: 1,
  });
  if (creditError) {
    const insufficient = creditError.message.includes("insufficient_credits");
    return NextResponse.json({ error: insufficient ? "Video krediniz kalmadı." : "Kredi doğrulanamadı." }, { status: insufficient ? 402 : 500 });
  }

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
    await supabase.from("credit_ledger").insert({ organization_id: project.organization_id, amount: 1, reason: "generation_refund", project_id: project.id });
    const message = cause instanceof Error ? cause.message : "Video üretimi başlatılamadı.";
    await supabase.from("projects").update({ status: "failed", generation_error: message }).eq("id", project.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
