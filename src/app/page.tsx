"use client";

import { Activity, Bell, ChevronRight, CircleHelp, Clock3, Film, LayoutDashboard, LogOut, Menu, MonitorPlay, Play, Plus, Search, Send, Settings, Sparkles, Upload, Users, WandSparkles, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Genel Bakış", icon: LayoutDashboard, active: true },
  { label: "Video Oluştur", icon: WandSparkles },
  { label: "Projelerim", icon: Film, count: "12" },
  { label: "LED Ekranlar", icon: MonitorPlay, count: "4" },
  { label: "Müşteriler", icon: Users },
];
const demoProjects = [
  { title: "Burger Kampanyası", size: "1920 × 640", status: "Hazır", color: "from-orange-500 to-red-700", time: "12 dk önce" },
  { title: "Hafta Sonu İndirimi", size: "1280 × 384", status: "Üretiliyor", color: "from-fuchsia-600 to-violet-900", time: "%68 tamamlandı" },
  { title: "Yeni Sezon", size: "1920 × 1080", status: "Gönderildi", color: "from-cyan-500 to-blue-900", time: "Dün, 18:42" },
];
const demoScreens = [
  { name: "Merkez Mağaza", location: "Kadıköy / İstanbul", status: "Yayında", resolution: "1920 × 640" },
  { name: "Şube 02", location: "Ümraniye / İstanbul", status: "Yayında", resolution: "1280 × 384" },
  { name: "Vitrin Ekranı", location: "Ataşehir / İstanbul", status: "Beklemede", resolution: "1920 × 1080" },
];

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [started, setStarted] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [projects, setProjects] = useState(demoProjects);
  const [screens, setScreens] = useState(demoScreens);
  const [dataReady, setDataReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      const supabase = createClient();
      const { data: organization } = await supabase
        .from("organizations")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (!active || !organization) return;
      setOrganizationId(organization.id);
      const [projectResult, screenResult] = await Promise.all([
        supabase.from("projects").select("id,title,width,height,status,created_at").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("screens").select("id,name,location,width,height,last_seen_at").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(5),
      ]);
      if (!active) return;
      setProjects((projectResult.data ?? []).map((item) => ({
        title: item.title,
        size: `${item.width} × ${item.height}`,
        status: item.status === "ready" ? "Hazır" : item.status === "failed" ? "Hata" : item.status === "draft" ? "Taslak" : "Üretiliyor",
        color: item.status === "ready" ? "from-cyan-500 to-blue-900" : "from-fuchsia-600 to-violet-900",
        time: new Intl.RelativeTimeFormat("tr", { numeric: "auto" }).format(-Math.max(1, Math.round((Date.now() - new Date(item.created_at).getTime()) / 60000)), "minute"),
      })));
      setScreens((screenResult.data ?? []).map((item) => ({
        name: item.name,
        location: item.location || "Konum eklenmedi",
        status: item.last_seen_at && Date.now() - new Date(item.last_seen_at).getTime() < 300000 ? "Yayında" : "Beklemede",
        resolution: `${item.width} × ${item.height}`,
      })));
      setDataReady(true);
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  async function createProject() {
    if (!prompt.trim() || !organizationId || saving) return;
    setSaving(true);
    const title = prompt.trim().split(/[.!?]/)[0].slice(0, 46) || "Yeni LED Projesi";
    const { data, error } = await createClient().from("projects").insert({
      organization_id: organizationId,
      title,
      prompt: prompt.trim(),
      width: 1920,
      height: 640,
      duration_seconds: 15,
      status: "queued",
    }).select("title,width,height,status,created_at").single();
    if (!error && data) {
      setProjects((current) => [{ title: data.title, size: `${data.width} × ${data.height}`, status: "Üretiliyor", color: "from-fuchsia-600 to-violet-900", time: "şimdi" }, ...current].slice(0, 5));
      setStarted(true);
      setPrompt("");
    }
    setSaving(false);
  }
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/giris");
    router.refresh();
  }
  return (
    <main className="min-h-screen bg-[#07090d] text-white selection:bg-cyan-400/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_65%_-10%,rgba(14,165,233,.13),transparent_38%)]" />
      <aside className={`fixed inset-y-0 left-0 z-50 w-[264px] border-r border-white/[.07] bg-[#0b0e13]/95 p-5 backdrop-blur-xl transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-10 flex items-center justify-between"><Logo /><button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 lg:hidden" aria-label="Menüyü kapat"><X size={19} /></button></div>
        <nav className="space-y-1.5">{navItems.map((item) => <button key={item.label} className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition ${item.active ? "bg-cyan-400/10 text-cyan-300" : "text-zinc-400 hover:bg-white/[.04] hover:text-white"}`}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.count && <span className="ml-auto rounded-md bg-white/[.06] px-2 py-0.5 text-[11px] text-zinc-400">{item.count}</span>}</button>)}</nav>
        <div className="my-6 h-px bg-white/[.06]" />
        <nav className="space-y-1">{[{ label: "Ayarlar", icon: Settings }, { label: "Yardım Merkezi", icon: CircleHelp }].map((item) => <button key={item.label} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-zinc-500 transition hover:bg-white/[.04] hover:text-white"><item.icon size={18} />{item.label}</button>)}</nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[.09] to-blue-600/[.04] p-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-cyan-300"><Zap size={14} fill="currentColor" /> PRO PLAN</div><div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[72%] rounded-full bg-cyan-400" /></div><p className="text-[11px] text-zinc-400">18 / 25 video kredisi</p></div>
      </aside>
      <section className="relative lg:pl-[264px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-white/[.06] bg-[#07090d]/80 px-4 backdrop-blur-xl sm:px-7"><button onClick={() => setMobileOpen(true)} className="rounded-xl border border-white/10 p-2.5 text-zinc-300 lg:hidden" aria-label="Menüyü aç"><Menu size={20} /></button><div className="relative hidden max-w-sm flex-1 sm:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={17} /><input placeholder="Proje veya ekran ara..." className="h-10 w-full rounded-xl border border-white/[.07] bg-white/[.025] pl-10 pr-4 text-sm outline-none placeholder:text-zinc-600 focus:border-cyan-400/40" /></div><div className="ml-auto flex items-center gap-3"><button className="relative rounded-xl border border-white/[.07] p-2.5 text-zinc-400 hover:text-white"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-cyan-400" /></button><div className="h-8 w-px bg-white/[.07]" /><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-[#061017]">DA</div><div className="hidden sm:block"><p className="text-sm font-medium">DEN Ajans</p><p className="text-[11px] text-zinc-500">Yönetici</p></div><button onClick={signOut} className="rounded-xl border border-white/[.07] p-2.5 text-zinc-500 hover:border-red-400/30 hover:text-red-300" aria-label="Çıkış yap"><LogOut size={17} /></button></div></div></header>
        <div className="mx-auto max-w-[1480px] p-4 sm:p-7 lg:p-8">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-sm text-cyan-400">18 Eylül 2026, Cuma</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Günaydın, DEN Ajans</h1><p className="mt-2 text-sm text-zinc-500">LED içeriklerinizi tek merkezden üretin ve yönetin.</p></div><button onClick={() => { promptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); promptRef.current?.focus(); }} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-semibold text-[#051017] transition hover:bg-cyan-300"><Plus size={18} /> Yeni proje</button></div>
          <div className="grid gap-4 xl:grid-cols-[1.45fr_.55fr]">
            <section className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-[#0c1118] p-5 sm:p-7"><div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" /><div className="relative"><div className="mb-6 flex items-start justify-between"><div><span className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[.07] px-3 py-1 text-[11px] font-semibold tracking-wide text-cyan-300"><Sparkles size={13} /> AI VIDEO STUDIO</span><h2 className="text-xl font-semibold sm:text-2xl">Fikrinizi LED videoya dönüştürün</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Kampanyanızı anlatın; yapay zekâ ekran ölçünüze uygun, akıcı ve dikkat çekici videoyu hazırlasın.</p></div><div className="hidden h-12 w-12 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 sm:grid"><WandSparkles size={23} /></div></div><textarea ref={promptRef} value={prompt} onChange={(e) => { setPrompt(e.target.value); setStarted(false); }} placeholder="Örnek: Siyah fonda altın ışıklarla açılan, yeni sezon indirimi için lüks bir kuyumcu videosu oluştur..." className="min-h-28 w-full resize-none rounded-2xl border border-white/[.08] bg-black/25 p-4 text-sm leading-6 outline-none placeholder:text-zinc-600 focus:border-cyan-400/40" /><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><button className="flex h-11 items-center justify-between rounded-xl border border-white/[.08] bg-white/[.025] px-4 text-left text-sm text-zinc-300"><span><span className="mr-2 text-zinc-600">Ölçü</span> 1920 × 640 px</span><ChevronRight size={16} className="text-zinc-600" /></button><button className="flex h-11 items-center justify-between rounded-xl border border-white/[.08] bg-white/[.025] px-4 text-left text-sm text-zinc-300"><span><span className="mr-2 text-zinc-600">Süre</span> 15 saniye</span><ChevronRight size={16} className="text-zinc-600" /></button><button onClick={createProject} disabled={!prompt.trim() || !organizationId || saving} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-30"><Sparkles size={17} /> {saving ? "Kaydediliyor" : "Oluştur"}</button></div>{started && <div className="mt-4 flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[.06] p-3 text-sm text-cyan-200"><Activity size={17} className="animate-pulse" /> Proje kaydedildi ve video üretim kuyruğuna alındı.</div>}</div></section>
            <section className="overflow-hidden rounded-3xl border border-white/[.07] bg-[#0c0f14] p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-medium">Sistem durumu</p><p className="mt-1 text-xs text-zinc-600">Bulut servisleri ve ekran ağı</p></div><span className="flex items-center gap-2 rounded-full bg-emerald-400/[.08] px-2.5 py-1 text-[11px] text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Aktif</span></div><div className="grid grid-cols-2 gap-3">{[{ n: dataReady ? String(projects.length) : "—", t: "Toplam proje" }, { n: dataReady ? String(screens.length) : "—", t: "Bağlı ekran" }, { n: "18", t: "Kalan kredi" }, { n: "%99.9", t: "Çalışma süresi" }].map((x) => <div key={x.t} className="relative overflow-hidden rounded-2xl border border-white/[.055] bg-gradient-to-br from-white/[.035] to-transparent p-4"><div className="absolute -right-6 -top-6 h-14 w-14 rounded-full bg-cyan-400/[.06] blur-xl" /><p className="relative text-xl font-semibold">{x.n}</p><p className="relative mt-1 text-[11px] text-zinc-600">{x.t}</p></div>)}</div><div className="mt-4 rounded-2xl border border-white/[.05] bg-black/20 p-3"><div className="mb-3 flex items-center justify-between text-[10px]"><span className="text-zinc-500">7 günlük üretim</span><span className="text-emerald-400">+24%</span></div><div className="flex h-12 items-end gap-2">{[31,48,38,64,51,82,72].map((height, index) => <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-blue-600/40 to-cyan-300/90" style={{ height: `${height}%` }} />)}</div></div><button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-3 text-xs text-zinc-500 transition hover:border-cyan-400/30 hover:text-cyan-300"><Upload size={15} /> Hazır videoyu yükle</button></section>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-3xl border border-white/[.07] bg-[#0c0f14] p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-medium">Son projeler</h2><p className="mt-1 text-xs text-zinc-600">Üretim ve yayın geçmişiniz</p></div><button className="text-xs text-cyan-400 hover:text-cyan-300">Tümünü gör</button></div>{projects.length ? <div className="space-y-3">{projects.map((p) => <div key={`${p.title}-${p.time}`} className="group flex items-center gap-4 rounded-2xl border border-white/[.055] bg-white/[.018] p-3 transition hover:border-cyan-400/20 hover:bg-white/[.03]"><div className={`relative grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br ${p.color}`}><div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,.18)_48%,transparent_76%)] bg-[length:220%_100%]" /><Play size={17} fill="white" className="relative" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{p.title}</p><p className="mt-1 text-[11px] text-zinc-600">{p.size} · {p.time}</p></div><span className={`hidden rounded-full px-2.5 py-1 text-[10px] sm:inline ${p.status === "Hazır" ? "bg-cyan-400/10 text-cyan-300" : p.status === "Gönderildi" ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-300"}`}>{p.status}</span><button className="rounded-lg p-2 text-zinc-600 group-hover:text-white"><ChevronRight size={18} /></button></div>)}</div> : <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/[.08] bg-gradient-to-b from-white/[.02] to-transparent text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/[.08] text-cyan-400"><Film size={22} /></div><p className="mt-4 text-sm font-medium">İlk projenizi oluşturun</p><p className="mt-1 text-xs text-zinc-600">AI Studio ile birkaç dakikada başlayın.</p></div></div>}</section>
            <section className="rounded-3xl border border-white/[.07] bg-[#0c0f14] p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-medium">LED ekranlar</h2><p className="mt-1 text-xs text-zinc-600">Uzaktan bağlı cihazlar</p></div><button className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.07] text-zinc-400 hover:text-white"><Plus size={17} /></button></div><div className="space-y-3">{screens.map((screen) => <div key={screen.name} className="flex items-center gap-3 rounded-2xl border border-white/[.055] p-3.5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/[.08] text-cyan-400"><MonitorPlay size={19} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{screen.name}</p><span className={`h-1.5 w-1.5 rounded-full ${screen.status === "Yayında" ? "bg-emerald-400" : "bg-amber-400"}`} /></div><p className="mt-1 truncate text-[10px] text-zinc-600">{screen.location} · {screen.resolution}</p></div><button className="rounded-lg border border-white/[.07] p-2 text-zinc-500 hover:border-cyan-400/30 hover:text-cyan-300" aria-label={`${screen.name} ekranına gönder`}><Send size={15} /></button></div>)}</div><div className="mt-4 flex items-center gap-2 rounded-xl bg-white/[.025] p-3 text-[11px] text-zinc-600"><Clock3 size={14} /> Son senkronizasyon: şimdi</div></section>
          </div>
        </div>
      </section>
    </main>
  );
}

function Logo() { return <div className="flex items-center gap-3"><div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-cyan-400 text-[#061017]"><Film size={21} strokeWidth={2.4} /><span className="absolute bottom-0 h-1 w-full bg-blue-600" /></div><div><p className="text-[15px] font-bold tracking-[.12em]">DEN LED</p><p className="text-[9px] tracking-[.2em] text-cyan-400">AI STUDIO</p></div></div>; }
