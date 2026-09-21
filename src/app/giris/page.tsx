"use client";

import { Film, LoaderCircle, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";\nimport { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();\n  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { company_name: "DEN Ajans" },
          },
        });

    if (result.error) {
      setMessage(result.error.message === "Invalid login credentials" ? "E-posta veya şifre hatalı." : result.error.message);
    } else if (mode === "signup" && !result.data.session) {
      setMessage("Hesabınız oluşturuldu. E-postanıza gelen doğrulama bağlantısını açın.");
    } else {
      const requested = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;\n      const safeNext = requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";\n      const destination = email.trim().toLowerCase() === "denledglobal@gmail.com" && safeNext === "/" ? "/yonetim" : safeNext;\n      router.replace(destination);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#07090d] px-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(34,211,238,.18),transparent_42%)]" />
      <section className="relative w-full max-w-md rounded-3xl border border-white/[.08] bg-[#0c1118]/95 p-6 shadow-2xl shadow-cyan-950/30 sm:p-8">
        <div className="mb-8 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400 text-[#061017]"><Film size={22} /></div><div><p className="font-bold tracking-[.13em]">DEN LED</p><p className="text-[10px] tracking-[.2em] text-cyan-400">AI STUDIO</p></div></div>
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[.07] px-3 py-1 text-[11px] font-semibold text-cyan-300"><Sparkles size={13} /> PROFESYONEL LED İÇERİK ÜRETİMİ</span>
        <h1 className="mt-5 text-2xl font-semibold">{mode === "login" ? "Tekrar hoş geldiniz" : "Studio hesabınızı oluşturun"}</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">Projelerinize, ekranlarınıza ve yayınlarınıza güvenli şekilde erişin.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block"><span className="mb-2 block text-xs text-zinc-400">E-posta</span><span className="relative block"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={17} /><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 w-full rounded-xl border border-white/[.08] bg-black/20 pl-11 pr-4 text-sm outline-none focus:border-cyan-400/40" placeholder="firma@ornek.com" /></span></label>
          <label className="block"><span className="mb-2 block text-xs text-zinc-400">Şifre</span><span className="relative block"><LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={17} /><input required minLength={8} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 w-full rounded-xl border border-white/[.08] bg-black/20 pl-11 pr-4 text-sm outline-none focus:border-cyan-400/40" placeholder="En az 8 karakter" /></span></label>
          {message && <p className={`rounded-xl border p-3 text-xs leading-5 ${message.startsWith("Hesabınız") ? "border-emerald-400/20 bg-emerald-400/[.06] text-emerald-300" : "border-red-400/20 bg-red-400/[.06] text-red-300"}`}>{message}</p>}
          <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 text-sm font-semibold text-[#051017] transition hover:bg-cyan-300 disabled:opacity-60">{loading && <LoaderCircle className="animate-spin" size={17} />}{mode === "login" ? "Giriş yap" : "Hesap oluştur"}</button>
        </form>
        <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} className="mt-5 w-full text-center text-xs text-zinc-500 hover:text-cyan-300">{mode === "login" ? "Hesabınız yok mu? Ücretsiz deneyin" : "Zaten hesabınız var mı? Giriş yapın"}</button>
        <p className="mt-7 border-t border-white/[.06] pt-5 text-center text-[10px] text-zinc-600">7 gün ücretsiz deneme · Kredi kartı gerekmez</p>
      </section>
    </main>
  );
}
