"use client";
import { FormEvent, useState } from "react";
import { Film, LoaderCircle, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  async function submit(e:FormEvent){
    e.preventDefault(); setMessage("");
    if(password.length<8){setMessage("Şifre en az 8 karakter olmalı.");return;}
    if(password!==confirm){setMessage("Şifreler eşleşmiyor.");return;}
    setLoading(true);
    const supabase=createClient();
    const {error}=await supabase.auth.updateUser({password});
    setLoading(false);
    if(error){setMessage(error.message);return;}
    await supabase.auth.signOut();
    window.location.assign("/giris?reset=success&next=%2Fyonetim");
  }
  return <main className="grid min-h-screen place-items-center bg-[#07090d] px-4 text-white">
    <section className="w-full max-w-md rounded-3xl border border-white/[.08] bg-[#0c1118] p-8 shadow-2xl">
      <div className="mb-7 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400 text-[#061017]"><Film size={22}/></div><div><p className="font-bold tracking-[.13em]">DEN LED</p><p className="text-[10px] tracking-[.2em] text-cyan-400">AI STUDIO</p></div></div>
      <h1 className="text-2xl font-semibold">Yeni şifre belirleyin</h1><p className="mt-2 text-sm text-zinc-500">Hesabınız için yeni bir şifre oluşturun.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block"><span className="mb-2 block text-xs text-zinc-400">Yeni şifre</span><span className="relative block"><LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={17}/><input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="h-12 w-full rounded-xl border border-white/[.08] bg-black/20 pl-11 pr-4 outline-none focus:border-cyan-400/40"/></span></label>
        <label className="block"><span className="mb-2 block text-xs text-zinc-400">Yeni şifre tekrar</span><input required minLength={8} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="h-12 w-full rounded-xl border border-white/[.08] bg-black/20 px-4 outline-none focus:border-cyan-400/40"/></label>
        {message&&<p className="rounded-xl border border-red-400/20 bg-red-400/[.06] p-3 text-xs text-red-300">{message}</p>}
        <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 font-semibold text-[#051017] disabled:opacity-60">{loading&&<LoaderCircle className="animate-spin" size={17}/>}Şifreyi kaydet</button>
      </form>
    </section>
  </main>;
}
