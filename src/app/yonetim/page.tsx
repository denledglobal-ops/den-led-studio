"use client";
import { useEffect,useState } from "react";
import { Building2,CreditCard,MonitorPlay,Sparkles,Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Stats={orgs:number;screens:number;orders:number;paid:number;credits:number};
export default function AdminPage(){
 const [stats,setStats]=useState<Stats>({orgs:0,screens:0,orders:0,paid:0,credits:0});
 const [orders,setOrders]=useState<any[]>([]); const [error,setError]=useState<string|null>(null);
 useEffect(()=>{let alive=true;(async()=>{const s=createClient();
  const [o,sc,bo,cl]=await Promise.all([
   s.from("organizations").select("id,name,plan,created_at"),
   s.from("screens").select("id"),
   s.from("billing_orders").select("id,organization_id,plan,billing_period,amount_cents,currency,status,created_at").order("created_at",{ascending:false}).limit(20),
   s.from("credit_ledger").select("amount")
  ]);
  if(!alive)return; const first=o.error||sc.error||bo.error||cl.error;if(first){setError(first.message);return;}
  const rows=bo.data||[];setOrders(rows);setStats({orgs:o.data?.length||0,screens:sc.data?.length||0,orders:rows.length,paid:rows.filter(x=>x.status==="paid").length,credits:(cl.data||[]).reduce((a,x)=>a+Number(x.amount||0),0)});
 })();return()=>{alive=false};},[]);
 const cards=[["Şirketler",stats.orgs,Building2],["LED Ekranlar",stats.screens,MonitorPlay],["Ödemeler",stats.paid+"/"+stats.orders,CreditCard],["Toplam Kredi",stats.credits,Sparkles]];
 return <main className="min-h-screen bg-[#07090d] p-5 text-white sm:p-8"><div className="mx-auto max-w-6xl">
  <p className="text-xs font-semibold tracking-[.18em] text-cyan-400">DEN LED · FAZ 9</p><h1 className="mt-2 text-3xl font-semibold">Üst Yönetim</h1><p className="mt-2 text-sm text-zinc-500">Müşteriler, ekranlar, ödemeler ve krediler tek merkezde.</p>
  {error&&<div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">{error}</div>}
  <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([n,v,I]:any)=><div key={n} className="rounded-2xl border border-white/[.07] bg-[#0c0f14] p-5"><I className="text-cyan-300"/><p className="mt-5 text-xs text-zinc-500">{n}</p><p className="mt-1 text-3xl font-semibold">{v}</p></div>)}</div>
  <div className="mt-8 rounded-2xl border border-white/[.07] bg-[#0c0f14] p-5"><div className="flex items-center gap-2"><Users size={18}/><h2 className="font-semibold">Son ödeme hareketleri</h2></div>
  <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-zinc-500"><tr><th className="py-3">Paket</th><th>Dönem</th><th>Tutar</th><th>Durum</th><th>Tarih</th></tr></thead><tbody>{orders.map(x=><tr key={x.id} className="border-t border-white/[.06]"><td className="py-3 capitalize">{x.plan}</td><td>{x.billing_period}</td><td>{(x.amount_cents/100).toLocaleString("tr-TR")} {x.currency}</td><td className="capitalize">{x.status}</td><td>{new Date(x.created_at).toLocaleDateString("tr-TR")}</td></tr>)}</tbody></table></div></div>
 </div></main>;
}
