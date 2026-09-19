"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ListVideo, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Project = { id:string; title:string; width:number; height:number };
type Playlist = { id:string; name:string; playlist_items:Array<{id:string;position:number;projects:Project|null}> };

export default function PlaylistsPage() {
  const router=useRouter();
  const [organizationId,setOrganizationId]=useState<string|null>(null);
  const [name,setName]=useState("");
  const [playlists,setPlaylists]=useState<Playlist[]>([]);
  const [projects,setProjects]=useState<Project[]>([]);
  const [error,setError]=useState<string|null>(null);

  async function load() {
    const supabase=createClient();
    const {data:org}=await supabase.from("organizations").select("id").limit(1).maybeSingle();
    if(!org) return;
    setOrganizationId(org.id);
    const [pl,pr]=await Promise.all([
      supabase.from("playlists").select("id,name,playlist_items(id,position,projects(id,title,width,height))").eq("organization_id",org.id).order("created_at",{ascending:false}),
      supabase.from("projects").select("id,title,width,height").eq("organization_id",org.id).eq("status","ready").order("created_at",{ascending:false})
    ]);
    if(pl.error) setError(pl.error.message);
    setPlaylists((pl.data??[]) as unknown as Playlist[]);
    setProjects(pr.data??[]);
  }
  useEffect(()=>{load();},[]);

  async function createPlaylist(){
    if(!organizationId||!name.trim()) return;
    const {error}=await createClient().from("playlists").insert({organization_id:organizationId,name:name.trim()});
    if(error){setError(error.message);return;} setName(""); await load();
  }
  async function addProject(playlistId:string,projectId:string){
    if(!projectId) return;
    const playlist=playlists.find(p=>p.id===playlistId);
    const position=playlist?.playlist_items.length??0;
    const {error}=await createClient().from("playlist_items").insert({playlist_id:playlistId,project_id:projectId,position});
    if(error){setError(error.message);return;} await load();
  }
  async function removeItem(id:string){
    await createClient().from("playlist_items").delete().eq("id",id); await load();
  }
  async function removePlaylist(id:string){
    await createClient().from("playlists").delete().eq("id",id); await load();
  }

  return <main className="min-h-screen bg-[#07090d] p-5 text-white sm:p-8">
    <div className="mx-auto max-w-5xl">
      <button onClick={()=>router.push("/")} className="mb-7 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/>Panele dön</button>
      <div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold tracking-[.18em] text-cyan-400">YAYIN YÖNETİMİ</p><h1 className="mt-2 text-3xl font-semibold">Playlistler</h1><p className="mt-2 text-sm text-zinc-500">LED ekranlarda sırayla yayınlanacak hazır videoları yönetin.</p></div></div>
      {error&&<div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">{error}</div>}
      <div className="mb-7 flex gap-3 rounded-2xl border border-white/[.07] bg-[#0c0f14] p-4">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Örn. Akşam Kampanyaları" className="h-11 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 text-sm outline-none focus:border-cyan-400/40"/>
        <button onClick={createPlaylist} className="flex h-11 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-black"><Plus size={16}/>Playlist oluştur</button>
      </div>
      <div className="space-y-5">{playlists.map(pl=><section key={pl.id} className="rounded-3xl border border-white/[.07] bg-[#0c0f14] p-5">
        <div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><ListVideo size={19}/></div><div className="flex-1"><h2 className="font-medium">{pl.name}</h2><p className="text-xs text-zinc-600">{pl.playlist_items.length} video</p></div><button onClick={()=>removePlaylist(pl.id)} className="rounded-lg p-2 text-zinc-600 hover:text-red-300"><Trash2 size={16}/></button></div>
        <div className="space-y-2">{[...pl.playlist_items].sort((a,b)=>a.position-b.position).map((item,i)=><div key={item.id} className="flex items-center rounded-xl border border-white/[.05] px-3 py-3 text-sm"><span className="mr-3 text-xs text-zinc-600">{i+1}</span><span className="flex-1">{item.projects?.title||"Video"}</span><span className="mr-3 text-xs text-zinc-600">{item.projects?.width}×{item.projects?.height}</span><button onClick={()=>removeItem(item.id)} className="text-zinc-600 hover:text-red-300"><Trash2 size={14}/></button></div>)}</div>
        <select defaultValue="" onChange={e=>{addProject(pl.id,e.target.value);e.currentTarget.value="";}} className="mt-4 h-10 w-full rounded-xl border border-white/10 bg-[#11151c] px-3 text-sm text-zinc-300"><option value="" disabled>Hazır video ekle…</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title} · {p.width}×{p.height}</option>)}</select>
      </section>)}
      {!playlists.length&&<div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">Henüz playlist yok. İlk playlistinizi oluşturun.</div>}
      </div>
    </div>
  </main>;
}
