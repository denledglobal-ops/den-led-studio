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
  if (!workerUrl || !workerSecret) throw new Error("Video worker is not configured.");

  let lastError = "Video worker failed.";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${workerUrl}/transcode`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${workerSecret}` },
        body: JSON.stringify({ ...input, fit: "contain" }),
        cache: "no-store",
        signal: AbortSignal.timeout(120_000),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.outputUrl) {
        return data as { outputUrl: string; width: number; height: number };
      }
      lastError = data.error || `Video worker failed: ${response.status}`;
      if (response.status >= 400 && response.status < 500) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Video worker request failed.";
    }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1500));
  }
  throw new Error(lastError);
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
      const { data: claimed, error: claimError } = await supabase.rpc("claim_video_processing", {
        p_project_id: project.id,
        p_source_output_url: result.outputUrl,
      });
      if (claimError) throw claimError;

      if (!claimed) {
        return NextResponse.json({ status: "rendering", processing: true, reused: true });
      }

      try {
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
          processing_started_at: null,
        }).eq("id", project.id);

        return NextResponse.json({
          ...result,
          outputUrl: processed.outputUrl,
          width: processed.width,
          height: processed.height,
        });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "LED video işleme başarısız.";
        await supabase.from("projects").update({
          generation_error: message,
          processing_started_at: null,
          status: "failed",
        }).eq("id", project.id);
        return NextResponse.json({ status: "failed", error: message }, { status: 502 });
      }
    }

    await supabase.from("projects").update({
      status: result.status,
      generation_error: result.error ?? null,
    }).eq("id", project.id);
    return NextResponse.json(result);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Durum alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
