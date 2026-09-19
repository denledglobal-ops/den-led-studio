"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft,CreditCard,Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
type Sub={plan:string;status:string;billing_period:string|null;current_period_end:string|null};
export default function BillingPage(){
 const router=useRouter(); const [sub,setSub]=useState<Sub|null>(null); const [credits,setCredits]=useState(0); const [error,setError]=useState<string|null>(null);
 useEffect(()=>{let active=true;const run=async()=>{const s=createClient();const {data:o}=await s.from("organizations").select("id").limit(1).maybeSingle();if(!o)return;const a=await s.from("subscriptions").select("plan,status,billing_period,current_period_end").eq("organization_id",o.id).maybeSingle();const b=await s.rpc("credit_balance",{target_org:o.id});if(!active)return;if(a.error||b.error)setError(a.error?.message||b.error?.message||"Bilgiler alınamadı.");setSub(a.data as Sub|null);setCredits(Number(b.data??0));};run();return()=>{active=false;};},[]);
 const plans=[["Starter","Başlangıç paketi"],["Pro","Profesyonel LED işletmeleri"],["Enterprise","Çoklu müşteri ve ekran yönetimi"]];
 return <main className="min-h-screen bg-[#07090d] p-5 text-white sm:p-8"><div className="mx-auto max-w-5xl">
 <button onClick={()=>router.push("/")} className="mb-7 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/>Panele dön</button>
 <p className="text-xs font-semibold tracking-[.18em] text-cyan-400">FAZ 8 · ABONELİK</p><h1 className="mt-2 text-3xl font-semibold">Paket & Krediler</h1><p className="mt-2 text-sm text-zinc-500">Aboneliğinizi ve AI video üretim kredilerinizi yönetin.</p>
 {error&&<div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">{error}</div>}
 <div className="mt-7 grid gap-4 sm:grid-cols-2"><div className="rounded-3xl border border-white/[.07] bg-[#0c0f14] p-5"><CreditCard className="text-cyan-300"/><p className="mt-5 text-xs text-zinc-500">MEVCUT PAKET</p><p className="mt-1 text-2xl font-semibold capitalize">{sub?.plan||"trial"}</p><p className="mt-2 text-sm text-zinc-500">Durum: <span className="text-zinc-300">{sub?.status||"trialing"}</span></p></div><div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/[.04] p-5"><Sparkles className="text-cyan-300"/><p className="mt-5 text-xs text-zinc-500">KALAN AI VİDEO KREDİSİ</p><p className="mt-1 text-4xl font-semibold">{credits}</p><p className="mt-2 text-sm text-zinc-500">Her AI video üretimi 1 kredi kullanır.</p></div></div>
 <h2 className="mt-9 text-lg font-medium">Paketler</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{plans.map(([name,desc])=><div key={name} className="rounded-2xl border border-white/[.07] bg-[#0c0f14] p-5"><h3 className="text-lg font-semibold">{name}</h3><p className="mt-2 min-h-10 text-sm text-zinc-500">{desc}</p><button disabled className="mt-6 h-10 w-full rounded-xl border border-white/10 text-sm text-zinc-500">Ödeme yakında</button></div>)}</div>
 </div></main>