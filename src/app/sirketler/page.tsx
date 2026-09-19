"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft,Building2,Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
type Org={id:string;name:string;plan:string;trial_ends_at:string|null;created_at:string};
export default function OrganizationsPage(){
 const router=useRouter(); const [rows,setRows]=useState<Org[]>([]); const [name,setName]=useState(""); const [error,setError]=useState<string|null>(null);
 async function load(){const {data,error}=await createClient().from("organizations").select("id,name,plan,trial_ends_at,created_at").order("created_at",{ascending:false});if(error)setError(error.message);else setRows((data??[]) as Org[]);}
 useEffect(()=>{load();},[]);
 async function createOrg(){if(!name.trim())return;setError(null);const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){setError("Oturum bulunamadı.");return;}const {data,error}=await s.from("organizations").insert({name:name.trim(),owner_id:user.id}).select("id").single();if(error){setError(error.message);return;}await s.from("organization_members").insert({organization_id:data.id,user_id:user.id,role:"owner"});setName("");await load();}
 function selectOrg(id:string){localStorage.setItem("denled_active_org",id);router.push("/");}
 return <main className="min-h-screen bg-[#07090d] p-5 text-white sm:p-8"><div className="mx-auto max-w-5xl">
 <button onClick={()=>router.push("/")} className="mb-7 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/>Panele dön</button>
 <p className="text-xs font-semibold tracking-[.18em] text-cyan-400">FAZ 7 · MÜŞTERİ YÖNETİMİ</p><h1 className="mt-2 text-3xl font-semibold">Şirketler</h1><p className="mt-2 text-sm text-zinc-500">LED müşterilerini oluşturun ve çalışacağınız şirketi seçin.</p>
 {error&&<div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">{error}</div>}
 <div className="mt-7 flex gap-3 rounded-2xl border border-white/[.07] bg-[#0c0f14] p-4"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Yeni şirket / müşteri adı" className="h-11 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 text-sm outline-none focus:border-cyan-400/40"/><button onClick={createOrg} className="flex h-11 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-black"><Plus size={16}/>Şirket oluştur</button></div>
 <div className="mt-6 grid gap-4 sm:grid-cols-2">{rows.map(o=><button key={o.id} onClick={()=>selectOrg(o.id)} className="rounded-2xl border border-white/[.07] bg-[#0c0f14] p-5 text-left hover:border-cyan-400/30"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Building2 size={18}/></div><div><h2 className="font-medium">{o.name}</h2><p className="mt-1 text-xs uppercase text-zinc-600">{o.plan}</p></div></div><p className="mt-4 text-xs text-zinc-500">Bu şirketle çalış</p></button>)}</div>
 </div></main>