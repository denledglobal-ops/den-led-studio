import Link from "next/link";
import { ArrowRight, Film, MonitorUp, Radio, ShieldCheck, Sparkles, Zap } from "lucide-react";

const features = [
  ["AI Video Studio", "LED reklam videolarını dakikalar içinde üretin.", Sparkles],
  ["Uzaktan Yayın", "İçeriği internet üzerinden ekranlarınıza gönderin.", Radio],
  ["Playlist & Program", "İçerikleri sıraya alın, gün ve saat bazlı yayınlayın.", Film],
  ["Ekran Yönetimi", "Tüm LED ekranlarınızı tek panelden yönetin.", MonitorUp],
  ["Güvenli Altyapı", "Firma bazlı erişim, cihaz eşleştirme ve güvenli yayın.", ShieldCheck],
  ["Hızlı Operasyon", "İçerik üretiminden ekrana kadar tek iş akışı.", Zap],
];

export default function TanitimPage() {
  return <main className="min-h-screen bg-[#05080d] text-white">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <div><div className="text-lg font-black tracking-[.16em]">DEN LED</div><div className="text-[10px] tracking-[.28em] text-cyan-400">AI STUDIO</div></div>
      <div className="flex gap-3"><Link href="/giris" className="rounded-xl border border-white/10 px-4 py-2 text-sm">Giriş</Link><Link href="/giris" className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950">Ücretsiz Dene</Link></div>
    </header>
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-20 text-center">
      <div className="mx-auto inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-xs font-semibold text-cyan-300">LED REKLAMCILIĞIN YENİ ÇALIŞMA SİSTEMİ</div>
      <h1 className="mx-auto mt-7 max-w-5xl text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl">Videoyu üret. Ekranı yönet. <span className="text-cyan-400">Yayına gönder.</span></h1>
      <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">DEN LED AI Studio; LED panel firmaları ve dijital reklam operatörleri için içerik üretimi, ekran yönetimi, playlist ve uzaktan yayın süreçlerini tek platformda birleştirir.</p>
      <div className="mt-9 flex flex-wrap justify-center gap-3"><Link href="/giris" className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950">7 Gün Ücretsiz Dene <ArrowRight size={18}/></Link><a href="#ozellikler" className="rounded-xl border border-white/10 px-6 py-3 font-semibold">Özellikleri Gör</a></div>
    </section>
    <section id="ozellikler" className="mx-auto grid max-w-7xl gap-4 px-6 pb-24 md:grid-cols-3">{features.map(([title,desc,Icon]) => { const I=Icon as typeof Sparkles; return <article key={String(title)} className="rounded-3xl border border-white/[.08] bg-white/[.025] p-6"><I className="text-cyan-400" size={24}/><h2 className="mt-5 text-lg font-bold">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-zinc-500">{String(desc)}</p></article>})}</section>
    <section className="border-y border-white/[.06] bg-cyan-400/[.035]"><div className="mx-auto max-w-5xl px-6 py-20 text-center"><h2 className="text-3xl font-black sm:text-4xl">LED işinizi tek merkezden yönetin.</h2><p className="mx-auto mt-4 max-w-xl text-zinc-400">Hesabınızı oluşturun, ekranlarınızı ekleyin ve DEN LED çalışma alanınızı kullanmaya başlayın.</p><Link href="/giris" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950">Hemen Başla <ArrowRight size={18}/></Link></div></section>
    <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-xs text-zinc-600 sm:flex-row sm:justify-between"><span>© 2026 DEN LED Global</span><span>AI destekli LED içerik ve yayın platformu</span></footer>
  </main>;
}
