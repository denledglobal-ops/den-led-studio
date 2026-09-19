"use client";

import { ArrowLeft, ChevronRight, Film } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Project = { id:string; title:string; width:number; height:number; status:string; created_at:string };

export default function ProjectsPage() {
  const router = useRouter();
  const [projects,setProjects] = useState<Project[]>([]);
  const [loading,setLoading] = useState(true);
  useEffect(() => {
    createClient().from("projects").select("id,title,width,height,status,created_at").order("created_at",{ascending:false})
      .then(({data}) => { setProjects(data ?? []); setLoading(false); });
  },[]);
  return <main className="min-h-screen bg-[#07090d] p-4 text-white sm:p-8"><div className="mx-auto max-w-5xl">
    <button onClick={()=>router.push("/")} className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={17}/> Panele dön</button>
    <p className="text-xs font-semibold tracking-widest text-cyan-400">DEN LED · PROJELER</p><h1 className="mt-2 text-3xl font-semibold">Projelerim</h1><p className="mt-2 text-sm text-zinc-500">Tüm LED video projeleriniz.</p>
    <div className="mt-7 space-y-3">{loading ? <p className="text-zinc-500">Projeler yükleniyor...</p> : projects.length ? projects.map(p =>
      <button key={p.id} onClick={()=>router.push(`/projeler/${p.id}`)} className="group flex w-full items-center gap-4 rounded-2xl border border-white/[.07] bg-[#0c0f14] p-4 text-left hover:border-cyan-400/20">
        <span className="grid h-12 w-16 place-items-center rounded-xl bg-cyan-400/[.08] text-cyan-400"><Film size={20}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{p.title}</span><span className="mt-1 block text-xs text-zinc-600">{p.width} × {p.height}</span></span><span className="text-xs text-cyan-300">{p.status === "ready" ? "Hazır" : p.status === "failed" ? "Hata" : "Üretiliyor"}</span><ChevronRight size={18} className="text-zinc-600 group-hover:text-white"/>
      </button>) : <div className="rounded-2xl border border-dashed border-white/[.08] p-10 text-center text-sm text-zinc-500">Henüz proje yok.</div>}</div>
  </div></main>;
}
