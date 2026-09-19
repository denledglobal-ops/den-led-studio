import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVideoProvider } from "@/lib/video/provider";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { projectId } = await request.json();
  const { data: project } = await supabase.from("projects")
    .select("id,provider_job_id").eq("id", String(projectId ?? "")).single();
  if (!project?.provider_job_id) return NextResponse.json({ error: "Üretim işi bulunamadı." }, { status: 404 });
  try {
    const result = await getVideoProvider().get(project.provider_job_id);
    const update: Record<string, string | null> = {
      status: result.status, generation_error: result.error ?? null,
    };
    if (result.outputUrl) update.output_url = result.outputUrl;
    await supabase.from("projects").update(update).eq("id", project.id);
    return NextResponse.json(result);
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Durum alınamadı." }, { status: 500 });
  }
}
