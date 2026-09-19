"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,Building2} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
type Org={id:string;name:string;plan:string;trial_ends_at:string|null;created_at:string};
export default function Customers(){
 const [rows,setRows]=useState<Org[]>([]);const [error,setError]=useState<string|null>(null);
 useEffect(()=>{let on=true;(async()=>{const s=createClient();const {data,error}=await s.from("organizations").select("id,name,plan,trial_ends_at,created_at").order("created_at",{ascending:false});if(!on)return;if(error)setError(error.message);else setRows(data||[]);})();return()=>{on=false}},[]);
 return <main className="min-h-screen bg-[#07090d] p-5 text-white sm:p-8"><div className="mx-auto max-w-6xl">
 <Link href="/yonetim" className="flex items-center gap-2 text-sm text-zinc-400"><ArrowLeft size={16}/>Üst yönetime dön</Link>
 <h1 className="mt-7 text-3xl font-semibold">Müşteri & Şirketler</h1><p className="mt-2 text-sm text-zinc-500">DEN LED üzerindeki şirket hesapları ve paket durumları.</p>
 {error&&<div className="mt-5 rounded-xl border border-red-400/20 p-3 text-red-300">{error}</div>}
 <div className="mt-7 overflow-x-auto rounded-2xl border border-white/[.07] bg-[#0c0f14]"><table className="w-full text-left text-sm"><thead className="text-zinc-500"><tr><th className="p-4">Şirket</th><th>Paket</th><th>Deneme bitişi</th><th>Kayıt</th></tr></thead><tbody>{rows.map(x=><tr key={x.id} className="border-t border-white/[.06]"><td className="p-4"><div className="flex items-center gap-2"><Building2 size={16}/>{x.name}</div></td><td className="capitalize">{x.plan}</td><td>{x.trial_ends_at?new Date(x.trial_ends_at).toLocaleDateString("tr-TR"):"-"}</td><td>{new Date(x.created_at).toLocaleDateString("tr-TR")}</td></tr>)}</tbody></table></div>
 </div></main>
}