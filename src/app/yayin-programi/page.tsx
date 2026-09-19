"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft,CalendarClock,Plus,Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
type Row={id:string;screen_id:string;playlist_id:string;daily_start:string|null;daily_end:string|null;days_of_week:number[];priority:number;is_active:boolean;screens:{name:string}|null;playlists:{name:string}|null};
const dayNames=["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
export default function SchedulesPage(){
 const router=useRouter(); const [screens,setScreens]=useState<any[]>([]); const [playlists,setPlaylists]=useState<any[]>([]); const [rows,setRows]=useState<Row[]>([]);
 const [screenId,setScreenId]=useState(""); const [playlistId,setPlaylistId]=useState(""); const [start,setStart]=useState("08:00"); const [end,setEnd]=useState("23:00"); const [days,setDays]=useState([1,2,3,4,5,6,0]); const [error,setError]=useState<string|null>(null);
 async function load(){const s=createClient(); const {data:o}=await s.from("organizations").select("id").limit(1).maybeSingle(); if(!o)return;
  const [a,b,c]=await Promise.all([s.from("screens").select("id,name").eq("organization_id",o.id).order("name"),s.from("playlists").select("id,name").eq("organization_id",o.id).eq("is_active",true).order("name"),s.from("screen_schedules").select("id,screen_id,playlist_id,daily_start,daily_end,days_of_week,priority,is_active,screens(name),playlists(name)").order("priority",{ascending:false}).order("created_at",{ascending:false})]);
  setScreens(a.data??[]);setPlaylists(b.data??[]);setRows((c.data??[]) as unknown as Row[]); if(a.data?.length&&!screenId)setScreenId(a.data[0].id); if(b.data?.length&&!playlistId)setPlaylistId(b.data[0].id);
 }
 useEffect(()=>{load();},[]);
 function toggleDay(d:number){setDays(x=>x.includes(d)?x.filter(v=>v!==d):[...x,d]);}
 async function add(){if(!screenId||!playlistId||!days.length)return; setError(null); const {error}=await createClient().from("screen_schedules").insert({screen_id:screenId,playlist_id:playlistId,daily_start:start,daily_end:end,days_of_week:days,priority:0,is_active:true}); if(error){setError(error.message);return;} await load();}
 async function remove(id:string){await createClient().from("screen_schedules").delete().eq("id",id);await load();}
 return <main className="min-h-screen bg-[#07090d] p-5 text-white sm:p-8"><div className="mx-auto max-w-5xl">
  <button onClick={()=>router.push("/")} className="mb-7 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/>Panele dön</button>
  <p className="text-xs font-semibold tracking-[.18em] text-cyan-400">OTOMATİK YAYIN</p><h1 className="mt-2 text-3xl font-semibold">Yayın Programı</h1><p className="mt-2 text-sm text-zinc-500">Hangi playlistin hangi LED ekranda, hangi gün ve saatlerde çalışacağını belirleyin.</p>
  {error&&<div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">{error}</div>}
  <section className="mt-7 rounded-3xl border border-white/[.07] bg-[#0c0f14] p-5">
   <div className="grid gap-3 md:grid-cols-2"><select value={screenId} onChange={e=>setScreenId(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#11151c] px-3 text-sm"><option value="">LED ekran seç</option>{screens.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={playlistId} onChange={e=>setPlaylistId(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#11151c] px-3 text-sm"><option value="">Playlist seç</option>{playlists.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
   <div className="mt-4 flex flex-wrap gap-2">{dayNames.map((n,d)=><button key={n} onClick={()=>toggleDay(d)} className={`rounded-lg border px-3 py-2 text-xs ${days.includes(d)?"border-cyan-400/40 bg-cyan-400/10 text-cyan-300":"border-white/10 text-zinc-500"}`}>{n}</button>)}</div>
   <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input type="time" value={start} onChange={e=>setStart(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#11151c] px-3"/><input type="time" value={end} onChange={e=>setEnd(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#11151c] px-3"/><button onClick={add} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-semibold text-black"><Plus size={16}/>Program ekle</button></div>
  </section>
  <div className="mt-6 space-y-3">{rows.map(r=><div key={r.id} className="flex items-center gap-4 rounded-2xl border border-white/[.07] bg-[#0c0f14] p-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><CalendarClock size={18}/></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{r.screens?.name||"LED ekran"} · {r.playlists?.name||"Playlist"}</p><p className="mt-1 text-xs text-zinc-500">{r.days_of_week.map(d=>dayNames[d]).join(", ")} · {r.daily_start?.slice(0,5)}–{r.daily_end?.slice(0,5)}</p></div><button onClick={()=>remove(r.id)} className="rounded-lg p-2 text-zinc-600 hover:text-red-300"><Trash2 size={16}/></button></div>)}</div>
 </div></main>
}