"use client";

import { ArrowLeft, Film, MonitorPlay, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string; title: string; prompt: string | null; width: number; height: number;
  duration_seconds: number; status: string; output_url: string | null; created_at: string;
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    createClient().from("projects")
      .select("id,title,prompt,width,height,duration_seconds,status,output_url,created_at")
      .eq("id", id).single()
      .then(({ data }) => { if (active) { setProject(data); setLoading(false); } });
    return () => { active = false; };
  }, [id]);

  const statusLabel = project?.status === "ready" ? "Hazır" : project?.status === "failed" ? "Hata" : project?.status === "draft" ? "Taslak" : "Üretiliyor";

  return <main className="min-h-screen bg-[#07090d] p-4 text-white sm:p-8">
    <div className="mx-auto max-w-6xl">
      <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={17}/> Projelere dön</button>
      {loading ? <div className="rounded-3xl border border-white/[.07] bg-[#0c0f14] p-8 text-zinc-500">Proje yükleniyor...</div> :
      !project ? <div className="rounded-3xl border border-white/[.07] bg-[#0c0f14] p-8">Proje bulunamadı.</div> :
      <>
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><p className="mb-2 text-xs font-semibold tracking-widest text-cyan-400">DEN LED · PROJE DETAYI</p><h1 className="text-2xl font-semibold sm:text-3xl">{project.title}</h1><p className="mt-2 text-sm text-zinc-500">{project.width} × {project.height} · {project.duration_seconds} saniye</p></div>
          <span className="w-fit rounded-full bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-300">{statusLabel}</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
          <section className="overflow-hidden rounded-3xl border border-white/[.07] bg-[#0c0f14] p-4 sm:p-6">
            <div className="grid aspect-video place-items-center overflow-hidden rounded-2xl border border-white/[.06] bg-gradient-to-br from-cyan-950/40 to-blue-950/30">
              {project.output_url ? <video src={project.output_url} controls className="h-full w-full object-contain"/> : <div className="text-center"><Film className="mx-auto text-cyan-400" size={42}/><p className="mt-4 text-sm">Video üretim sırasında</p><p className="mt-1 text-xs text-zinc-600">Tamamlandığında önizleme burada görünecek.</p></div>}
            </div>
          </section>
          <aside className="rounded-3xl border border-white/[.07] bg-[#0c0f14] p-5 sm:p-6">
            <h2 className="font-medium">Proje bilgileri</h2>
            <div className="mt-5 space-y-4 text-sm"><div><p className="text-xs text-zinc-600">Prompt</p><p className="mt-1 leading-6 text-zinc-300">{project.prompt || "Prompt bulunmuyor."}</p></div><div><p className="text-xs text-zinc-600">Çözünürlük</p><p className="mt-1">{project.width} × {project.height}</p></div><div><p className="text-xs text-zinc-600">Süre</p><p className="mt-1">{project.duration_seconds} saniye</p></div></div>
            <button disabled={project.status !== "ready"} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 font-semibold text-[#051017] disabled:cursor-not-allowed disabled:opacity-30"><Send size={17}/> LED ekrana gönder</button>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/[.025] p-3 text-[11px] leading-5 text-zinc-600"><MonitorPlay size={15} className="mt-0.5 shrink-0"/> Video hazır olduğunda bağlı LED ekranlardan birini seçerek uzaktan yayınlayabileceksiniz.</div>
          </aside>
        </div>
      </>}
    </div>
  </main>;
}
