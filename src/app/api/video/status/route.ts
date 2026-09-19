import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVideoProvider } from "@/lib/video/provider";

async function normalizeForLed(input: {
  inputUrl: string;
  width: number;
  height: number;
  organizationId: string;
  projectId: string;
}) {
  const workerUrl = process.env.VIDEO_WORKER_URL?.replace(/\/$/, "");
  const workerSecret = process.env.VIDEO_WORKER_SECRET;
  if (!workerUrl || !workerSecret) {
    throw new Error("Video worker is not configured.");
  }

  const response = await fetch(`${workerUrl}/transcode`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${workerSecret}`,
    },
    body: JSON.stringify({ ...input, fit: "contain" }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.outputUrl) {
    throw new Error(data.error || `Video worker failed: ${response.status}`);
  }
  return data as { outputUrl: string; width: number; height: number };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const { projectId } = await request.json();
  const { data: project } = await supabase.from("projects")
    .select("id,provider_job_id,width,height,organization_id,status,output_url")
    .eq("id", String(projectId ?? "")).single();

  if (!project?.provider_job_id) {
    return NextResponse.json({ error: "Üretim işi bulunamadı." }, { status: 404 });
  }

  try {
    if (project.status === "ready" && project.output_url) {
      return NextResponse.json({ status: "ready", outputUrl: project.output_url, reused: true });
    }

    const result = await getVideoProvider().get(project.provider_job_id);

    if (result.status === "ready" && result.outputUrl) {
      const processed = await normalizeForLed({
        inputUrl: result.outputUrl,
        width: project.width,
        height: project.height,
        organizationId: project.organization_id,
        projectId: project.id,
      });

      await supabase.from("projects").update({
        status: "ready",
        output_url: processed.outputUrl,
        generation_error: null,
      }).eq("id", project.id);

      return NextResponse.json({
        ...result,
        outputUrl: processed.outputUrl,
        width: processed.width,
        height: processed.height,
      });
    }

    const update: Record<string, string | null> = {
      status: result.status,
      generation_error: result.error ?? null,
    };
    await supabase.from("projects").update(update).eq("id", project.id);
    return NextResponse.json(result);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Durum alınamadı.";
    await supabase.from("projects").update({ generation_error: message }).eq("id", project.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
