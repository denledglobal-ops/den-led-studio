"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft,Shield,Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
type Member={id:string;user_id:string;role:"owner"|"admin"|"member";is_active:boolean;created_at:string};
export default function TeamPage(){
 const router=useRouter(); const [org,setOrg]=useState<{id:string;name:string}|null>(null); const [members,setMembers]=useState<Member[]>([]); const [error,setError]=useState<string|null>(null);
 async function load(){const s=createClient(); const {data:o,error:oe}=await s.from("organizations").select("id,name").limit(1).maybeSingle(); if(oe||!o){setError(oe?.message||"Şirket bulunamadı.");return;} setOrg(o);
 const {data,error}=await s.from("organization_members").select("id,user_id,role,is_active,created_at").eq("organization_id",o.id).order("created_at"); if(error)setError(error.message); else setMembers((data??[]) as Member[]);}
 useEffect(()=>{load();},[]);
 async function changeRole(id:string,role:Member["role"]){const {error}=await createClient().from("organization_members").update({role}).eq("id",id);if(error)setError(error.message);else await load();}
 async function toggle(id:string,value:boolean){const {error}=await createClient().from("organization_members").update({is_active:!value}).eq("id",id);if(error)setError(error.message);else await load();}
 return <main className="min-h-screen bg-[#07090d] p-5 text-white sm:p-8"><div className="mx-auto max-w-5xl">
 <button onClick={()=>router.push("/")} className="mb-7 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/>Panele dön</button>
 <p className="text-xs font-semibold tracking-[.18em] text-cyan-400">FAZ 7 · MULTI-TENANT</p><h1 className="mt-2 text-3xl font-semibold">Ekip & Yetkiler</h1><p className="mt-2 text-sm text-zinc-500">{org?.name||"Şirket"} kullanıcılarını ve erişim rollerini yönetin.</p>
 {error&&<div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">{error}</div>}
 <section className="mt-7 overflow-hidden rounded-3xl border border-white/[.07] bg-[#0c0f14]">
 <div className="flex items-center gap-3 border-b border-white/[.06] p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Users size={19}/></div><div><h2 className="font-medium">Şirket kullanıcıları</h2><p className="text-xs text-zinc-600">{members.length} kullanıcı</p></div></div>
 <div className="divide-y divide-white/[.05]">{members.map(m=><div key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><Shield size={17} className="text-cyan-400"/><div><p className="truncate text-sm">{m.user_id}</p><p className="text-[10px] text-zinc-600">{m.is_active?"Aktif":"Pasif"}</p></div></div><select value={m.role} disabled={m.role==="owner"} onChange={e=>changeRole(m.id,e.target.value as Member["role"])} className="h-9 rounded-lg border border-white/10 bg-[#11151c] px-3 text-xs disabled:opacity-50"><option value="owner">Owner</option><option value="admin">Admin</option><option value="member">Member</option></select><button disabled={m.role==="owner"} onClick={()=>toggle(m.id,m.is_active)} className="h-9 rounded-lg border border-white/10 px-3 text-xs text-zinc-400 hover:text-white disabled:opacity-30">{m.is_active?"Pasife al":"Aktifleştir"}</button></div>)}</div>
 </section></div></main>
}