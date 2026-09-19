"use client";

import { Activity, Bell, ChevronRight, CircleHelp, Clock3, Film, LayoutDashboard, LogOut, Menu, MonitorPlay, Palette, Pencil, Play, Plus, Search, Send, Settings, Sparkles, Timer, Trash2, Upload, Users, WandSparkles, X, Zap } from "lucide-react";
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
  { id: "demo-1", title: "Burger Kampanyası", size: "1920 × 640", status: "Hazır", color: "from-orange-500 to-red-700", time: "12 dk önce" },
  { id: "demo-2", title: "Hafta Sonu İndirimi", size: "1280 × 384", status: "Üretiliyor", color: "from-fuchsia-600 to-violet-900", time: "%68 tamamlandı" },
  { id: "demo-3", title: "Yeni Sezon", size: "1920 × 1080", status: "Gönderildi", color: "from-cyan-500 to-blue-900", time: "Dün, 18:42" },
];
const demoScreens = [
  { id: "demo-1", name: "Merkez Mağaza", location: "Kadıköy / İstanbul", status: "Yayında", resolution: "1920 × 640", width: 1920, height: 640, lastSeenAt: new Date().toISOString(), playerVersion: "1.0.0" },
  { id: "demo-2", name: "Şube 02", location: "Ümraniye / İstanbul", status: "Online", resolution: "1280 × 384", width: 1280, height: 384, lastSeenAt: new Date().toISOString(), playerVersion: "1.0.0" },
  { id: "demo-3", name: "Vitrin Ekranı", location: "Ataşehir / İstanbul", status: "Offline", resolution: "1920 × 1080", width: 1920, height: 1080, lastSeenAt: null, playerVersion: null },
];

const videoStyles = ["Premium", "Enerjik", "Minimal", "Sinematik"] as const;
const resolutionOptions = [
  { value: "1920x640", label: "1920 × 640", detail: "Yatay LED" },
  { value: "1280x384", label: "1280 × 384", detail: "Şerit ekran" },
  { value: "1920x1080", label: "1920 × 1080", detail: "Full HD" },
  { value: "1080x1920", label: "1080 × 1920", detail: "Dikey ekran" },
  { value: "custom", label: "Özel ölçü", detail: "LED panel" },
];

type ScreenItem = (typeof demoScreens)[number];

function screenStatus(deviceStatus: string | null, lastSeenAt: string | null) {
  const fresh = lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 120000;
  if (!fresh) return "Offline";
  if (deviceStatus === "playing") return "Yayında";
  if (deviceStatus === "error") return "Hata";
  return "Online";
}

function lastSeenLabel(value: string | null) {
  if (!value) return "Henüz bağlanmadı";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Az önce";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dk önce`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} sa önce`;
  return `${Math.floor(seconds / 86400)} gün önce`;
}

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState("1920x640");
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(640);
  const [duration, setDuration] = useState(15);
  const [videoStyle, setVideoStyle] = useState<(typeof videoStyles)[number]>("Premium");
  const [weeklyProduction, setWeeklyProduction] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [started, setStarted] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [projects, setProjects] = useState(demoProjects);
  const [screens, setScreens] = useState(demoScreens);
  const [dataReady, setDataReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [screenModal, setScreenModal] = useState<ScreenItem | "new" | null>(null);
  const [pairingScreen, setPairingScreen] = useState<ScreenItem | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingBusy, setPairingBusy] = useState(false);
  const [commandBusy, setCommandBusy] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
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
        supabase.from("projects").select("id,title,width,height,status,created_at").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("screens").select("id,name,location,width,height,last_seen_at,device_status,player_version").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(5),
      ]);
      if (!active) return;
      const projectRows = projectResult.data ?? [];
      setProjects(projectRows.map((item) => ({
        id: item.id,
        title: item.title,
        size: `${item.width} × ${item.height}`,
        status: item.status === "ready" ? "Hazır" : item.status === "failed" ? "Hata" : item.status === "draft" ? "Taslak" : "Üretiliyor",
        color: item.status === "ready" ? "from-cyan-500 to-blue-900" : "from-fuchsia-600 to-violet-900",
        time: new Intl.RelativeTimeFormat("tr", { numeric: "auto" }).format(-Math.max(1, Math.round((Date.now() - new Date(item.created_at).getTime()) / 60000)), "minute"),
      })).slice(0, 5));
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);
      const counts = Array.from({ length: 7 }, () => 0);
      projectRows.forEach((item) => {
        const created = new Date(item.created_at);
        const index = Math.floor((created.getTime() - start.getTime()) / 86400000);
        if (index >= 0 && index < 7) counts[index] += 1;
      });
      setWeeklyProduction(counts);
      setScreens((screenResult.data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        location: item.location || "Konum eklenmedi",
        status: screenStatus(item.device_status, item.last_seen_at),
        resolution: `${item.width} × ${item.height}`,
        width: item.width,
        height: item.height,
        lastSeenAt: item.last_seen_at,
        playerVersion: item.player_version,
      })));
      setDataReady(true);
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  async function uploadReadyVideo(file: File) {
    if (!organizationId || uploading) return;
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      setGenerationError("Yalnızca MP4, WebM veya MOV video yükleyebilirsiniz.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setGenerationError("Video dosyası en fazla 100 MB olabilir.");
      return;
    }
    setUploading(true);
    setGenerationError(null);
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${organizationId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("project-videos").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      setGenerationError(uploadError.message);
      setUploading(false);
      return;
    }
    const { data: publicData } = supabase.storage.from("project-videos").getPublicUrl(path);
    const title = file.name.replace(/\.[^.]+$/, "").slice(0, 46) || "Yüklenen Video";
    const { data, error } = await supabase.from("projects").insert({
      organization_id: organizationId, title, prompt: "Hazır video yüklemesi",
      width: 1920, height: 1080, duration_seconds: 0, status: "ready",
      output_url: publicData.publicUrl, provider: "upload",
    }).select("id,title,width,height,status,created_at").single();
    if (error || !data) {
      await supabase.storage.from("project-videos").remove([path]);
      setGenerationError(error?.message || "Video projesi oluşturulamadı.");
      setUploading(false);
      return;
    }
    setProjects((current) => [{ id: data.id, title: data.title, size: "Hazır video", status: "Hazır", color: "from-cyan-500 to-blue-900", time: "şimdi" }, ...current].slice(0, 5));
    setUploading(false);
    router.push(`/projeler/${data.id}`);
  }

  async function createProject() {
    if (!prompt.trim() || !organizationId || saving) return;
    setSaving(true);
    setGenerationError(null);
    const title = prompt.trim().split(/[.!?]/)[0].slice(0, 46) || "Yeni LED Projesi";
    const [width, height] = resolution === "custom" ? [customWidth, customHeight] : resolution.split("x").map(Number);
    const { data, error } = await createClient().from("projects").insert({
      organization_id: organizationId,
      title,
      prompt: prompt.trim(),
      width,
      height,
      duration_seconds: duration,
      status: "queued",
    }).select("id,title,width,height,status,created_at").single();
    if (!error && data) {
      setProjects((current) => [{ id: data.id, title: data.title, size: `${data.width} × ${data.height}`, status: "Üretiliyor", color: "from-fuchsia-600 to-violet-900", time: "şimdi" }, ...current].slice(0, 5));
      setWeeklyProduction((current) => current.map((value, index) => index === 6 ? value + 1 : value));
      try {
        const response = await fetch("/api/video/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: data.id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || "Video üretimi başlatılamadı.");
        setStarted(true);
        setPrompt("");
        router.push(`/projeler/${data.id}`);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Video üretimi başlatılamadı.";
        setGenerationError(message);
        await createClient().from("projects").update({ status: "failed", generation_error: message }).eq("id", data.id);
        setProjects((current) => current.map((project) => project.id === data.id ? { ...project, status: "Hata" } : project));
      }
    } else if (error) {
      setGenerationError(error.message);
    }
    setSaving(false);
  }

  async function saveScreen(values: { name: string; location: string; width: number; height: number }) {
    if (!organizationId) return;
    const supabase = createClient();
    if (screenModal && screenModal !== "new") {
      const { data, error } = await supabase.from("screens").update(values).eq("id", screenModal.id).select("id,name,location,width,height,last_seen_at,device_status,player_version").single();
      if (!error && data) setScreens((current) => current.map((screen) => screen.id === data.id ? { id: data.id, name: data.name, location: data.location || "Konum eklenmedi", width: data.width, height: data.height, resolution: `${data.width} × ${data.height}`, status: screenStatus(data.device_status, data.last_seen_at), lastSeenAt: data.last_seen_at, playerVersion: data.player_version } : screen));
    } else {
      const { data, error } = await supabase.from("screens").insert({ organization_id: organizationId, ...values }).select("id,name,location,width,height,last_seen_at,device_status,player_version").single();
      if (!error && data) setScreens((current) => [{ id: data.id, name: data.name, location: data.location || "Konum eklenmedi", width: data.width, height: data.height, resolution: `${data.width} × ${data.height}`, status: screenStatus(data.device_status, data.last_seen_at), lastSeenAt: data.last_seen_at, playerVersion: data.player_version }, ...current].slice(0, 5));
    }
    setScreenModal(null);
  }

  async function createPairingCode(screen: ScreenItem) {
    if (screen.id.startsWith("demo-") || pairingBusy) return;
    setPairingScreen(screen);
    setPairingBusy(true);
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    for (const byte of bytes) code += alphabet[byte % alphabet.length];
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await createClient().from("screens").update({ pairing_code: code, pairing_expires_at: expires }).eq("id", screen.id);
    setPairingCode(error ? null : code);
    setPairingBusy(false);
  }

  async function sendDeviceCommand(screen: ScreenItem, command: "reload" | "redownload" | "restart") {
    if (screen.id.startsWith("demo-") || commandBusy) return;
    setCommandBusy(`${screen.id}:${command}`);
    const { error } = await createClient().from("device_commands").insert({ screen_id: screen.id, command });
    setCommandBusy(null);
    if (error) setGenerationError(`Cihaz komutu gönderilemedi: ${error.message}`);
  }

  async function deleteScreen(screen: ScreenItem) {
    if (screen.id.startsWith("demo-")) return;
    const { error } = await createClient().from("screens").delete().eq("id", screen.id);
    if (!error) setScreens((current) => current.filter((item) => item.id !== screen.id));
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
            <section className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-[#0c1118] p-5 sm:p-7">
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="relative">
                <div className="mb-6 flex items-start justify-between"><div><span className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[.07] px-3 py-1 text-[11px] font-semibold tracking-wide text-cyan-300"><Sparkles size={13} /> AI VIDEO STUDIO</span><h2 className="text-xl font-semibold sm:text-2xl">Fikrinizi LED videoya dönüştürün</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Kampanyanızı anlatın; yapay zekâ ekran ölçünüze uygun, akıcı ve dikkat çekici videoyu hazırlasın.</p></div><div className="hidden h-12 w-12 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 sm:grid"><WandSparkles size={23} /></div></div>
                <textarea ref={promptRef} value={prompt} onChange={(e) => { setPrompt(e.target.value); setStarted(false); }} placeholder="Örnek: Siyah fonda altın ışıklarla açılan, yeni sezon indirimi için lüks bir kuyumcu videosu oluştur..." className="min-h-28 w-full resize-none rounded-2xl border border-white/[.08] bg-black/25 p-4 text-sm leading-6 outline-none placeholder:text-zinc-600 focus:border-cyan-400/40" />
                <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-1 flex items-center gap-1.5 text-[11px] text-zinc-600"><Palette size={13} /> Görsel stil</span>{videoStyles.map((style) => <button key={style} onClick={() => setVideoStyle(style)} className={`rounded-full border px-3 py-1.5 text-[11px] transition ${videoStyle === style ? "border-cyan-400/35 bg-cyan-400/10 text-cyan-300" : "border-white/[.07] text-zinc-500 hover:text-white"}`}>{style}</button>)}</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <label className="relative flex h-12 items-center rounded-xl border border-white/[.08] bg-white/[.025] px-4"><MonitorPlay size={16} className="mr-3 text-cyan-400" /><span className="mr-2 text-xs text-zinc-600">Ölçü</span><select value={resolution} onChange={(event) => setResolution(event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent text-sm text-zinc-200 outline-none">{resolutionOptions.map((option) => <option key={option.value} value={option.value} className="bg-[#0c1118]">{option.label} · {option.detail}</option>)}</select></label>
                  {resolution === "custom" ? <div className="grid grid-cols-2 gap-2 sm:col-span-3"><label className="rounded-xl border border-white/[.08] bg-white/[.025] p-3"><span className="text-[10px] text-zinc-600">Genişlik (px)</span><input type="number" min={64} max={8192} step={1} value={customWidth} onChange={(e) => setCustomWidth(Math.max(64, Math.min(8192, Number(e.target.value) || 64)))} className="mt-1 w-full bg-transparent text-sm outline-none"/></label><label className="rounded-xl border border-white/[.08] bg-white/[.025] p-3"><span className="text-[10px] text-zinc-600">Yükseklik (px)</span><input type="number" min={64} max={8192} step={1} value={customHeight} onChange={(e) => setCustomHeight(Math.max(64, Math.min(8192, Number(e.target.value) || 64)))} className="mt-1 w-full bg-transparent text-sm outline-none"/></label></div> : null}
                  <label className="relative flex h-12 items-center rounded-xl border border-white/[.08] bg-white/[.025] px-4"><Timer size={16} className="mr-3 text-violet-400" /><span className="mr-2 text-xs text-zinc-600">Süre</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="min-w-0 flex-1 appearance-none bg-transparent text-sm text-zinc-200 outline-none">{[10, 15, 20, 30].map((seconds) => <option key={seconds} value={seconds} className="bg-[#0c1118]">{seconds} saniye</option>)}</select></label>
                  <button onClick={createProject} disabled={!prompt.trim() || !organizationId || saving} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-black transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-30"><Sparkles size={17} /> {saving ? "Kaydediliyor" : "Oluştur"}</button>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[.05] pt-4 text-[11px] text-zinc-600"><span>Seçim: <strong className="font-medium text-zinc-300">{videoStyle} · {resolution === "custom" ? `${customWidth} × ${customHeight}` : resolutionOptions.find((item) => item.value === resolution)?.label} · {duration} sn</strong></span><span>1 video kredisi</span></div>
                {started ? <div className="mt-4 flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[.06] p-3 text-sm text-cyan-200"><Activity size={17} className="animate-pulse" /> Proje kaydedildi ve video üretim kuyruğuna alındı.</div> : null}
                {generationError ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[.06] p-3 text-sm text-red-200">Video üretimi başlatılamadı: {generationError}</div> : null}
              </div>
            </section>
            <section className="overflow-hidden rounded-3xl border border-white/[.07] bg-[#0c0f14] p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-medium">Sistem durumu</p><p className="mt-1 text-xs text-zinc-600">Bulut servisleri ve ekran ağı</p></div><span className="flex items-center gap-2 rounded-full bg-emerald-400/[.08] px-2.5 py-1 text-[11px] text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Aktif</span></div><div className="grid grid-cols-2 gap-3">{[{ n: dataReady ? String(projects.length) : "—", t: "Son projeler" }, { n: dataReady ? String(screens.length) : "—", t: "Bağlı ekran" }, { n: "18", t: "Kalan kredi" }, { n: "%99.9", t: "Çalışma süresi" }].map((x) => <div key={x.t} className="relative overflow-hidden rounded-2xl border border-white/[.055] bg-gradient-to-br from-white/[.035] to-transparent p-4"><div className="absolute -right-6 -top-6 h-14 w-14 rounded-full bg-cyan-400/[.06] blur-xl" /><p className="relative text-xl font-semibold">{x.n}</p><p className="relative mt-1 text-[11px] text-zinc-600">{x.t}</p></div>)}</div><ProductionChart values={weeklyProduction} /><input ref={uploadRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadReadyVideo(file); e.currentTarget.value = ""; }} /><button disabled={uploading || !organizationId} onClick={() => uploadRef.current?.click()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-3 text-xs text-zinc-500 transition hover:border-cyan-400/30 hover:text-cyan-300 disabled:opacity-40"><Upload size={15} /> {uploading ? "Video yükleniyor..." : "Hazır videoyu yükle"}</button></section>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-3xl border border-white/[.07] bg-[#0c0f14] p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-medium">Son projeler</h2><p className="mt-1 text-xs text-zinc-600">Üretim ve yayın geçmişiniz</p></div><button onClick={() => router.push("/projeler")} className="text-xs text-cyan-400 hover:text-cyan-300">Tümünü gör</button></div>{projects.length ? <div className="space-y-3">{projects.map((p) => <button type="button" onClick={() => !p.id.startsWith("demo-") && router.push(`/projeler/${p.id}`)} key={p.id} className="group flex w-full items-center gap-4 rounded-2xl border border-white/[.055] bg-white/[.018] p-3 text-left transition hover:border-cyan-400/20 hover:bg-white/[.03]"><div className={`relative grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br ${p.color}`}><div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,.18)_48%,transparent_76%)] bg-[length:220%_100%]" /><Play size={17} fill="white" className="relative" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{p.title}</p><p className="mt-1 text-[11px] text-zinc-600">{p.size} · {p.time}</p></div><span className={`hidden rounded-full px-2.5 py-1 text-[10px] sm:inline ${p.status === "Hazır" ? "bg-cyan-400/10 text-cyan-300" : p.status === "Gönderildi" ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-300"}`}>{p.status}</span><span className="rounded-lg p-2 text-zinc-600 group-hover:text-white"><ChevronRight size={18} /></span></button>)}</div> : <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/[.08] bg-gradient-to-b from-white/[.02] to-transparent text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/[.08] text-cyan-400"><Film size={22} /></div><p className="mt-4 text-sm font-medium">İlk projenizi oluşturun</p><p className="mt-1 text-xs text-zinc-600">AI Studio ile birkaç dakikada başlayın.</p></div></div>}</section>
            <section className="rounded-3xl border border-white/[.07] bg-[#0c0f14] p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-medium">LED ekranlar</h2><p className="mt-1 text-xs text-zinc-600">Uzaktan bağlı cihazlar</p></div><button onClick={() => setScreenModal("new")} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.07] text-zinc-400 hover:border-cyan-400/30 hover:text-cyan-300" aria-label="Yeni LED ekran ekle"><Plus size={17} /></button></div>{screens.length ? <div className="space-y-3">{screens.map((screen) => <div key={screen.id} className="group flex items-center gap-3 rounded-2xl border border-white/[.055] p-3.5 transition hover:border-cyan-400/15"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/[.08] text-cyan-400"><MonitorPlay size={19} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{screen.name}</p><span className={`h-1.5 w-1.5 rounded-full ${screen.status === "Yayında" ? "bg-emerald-400" : screen.status === "Online" ? "bg-cyan-400" : screen.status === "Hata" ? "bg-red-400" : "bg-zinc-600"}`} /><span className={`text-[9px] font-medium ${screen.status === "Yayında" ? "text-emerald-400" : screen.status === "Online" ? "text-cyan-400" : screen.status === "Hata" ? "text-red-400" : "text-zinc-500"}`}>{screen.status}</span></div><p className="mt-1 truncate text-[10px] text-zinc-600">{screen.location} · {screen.resolution}</p><p className="mt-1 truncate text-[9px] text-zinc-700">Son bağlantı: {lastSeenLabel(screen.lastSeenAt)}{screen.playerVersion ? ` · Player v${screen.playerVersion}` : ""}</p></div><div className="flex gap-1 opacity-60 transition group-hover:opacity-100"><button disabled={!!commandBusy} onClick={() => sendDeviceCommand(screen, "reload")} className="rounded-lg border border-white/[.07] px-2 text-[9px] text-zinc-500 hover:text-cyan-300 disabled:opacity-30" title="Yayını yenile">Yenile</button><button disabled={!!commandBusy} onClick={() => sendDeviceCommand(screen, "redownload")} className="rounded-lg border border-white/[.07] px-2 text-[9px] text-zinc-500 hover:text-cyan-300 disabled:opacity-30" title="Videoyu yeniden indir">İndir</button><button disabled={!!commandBusy} onClick={() => sendDeviceCommand(screen, "restart")} className="rounded-lg border border-white/[.07] px-2 text-[9px] text-zinc-500 hover:text-amber-300 disabled:opacity-30" title="Player'ı yeniden başlat">Restart</button><button onClick={() => setScreenModal(screen)} className="rounded-lg border border-white/[.07] p-2 text-zinc-500 hover:text-cyan-300" aria-label={`${screen.name} ekranını düzenle`}><Pencil size={14} /></button><button onClick={() => deleteScreen(screen)} className="rounded-lg border border-white/[.07] p-2 text-zinc-500 hover:text-red-300" aria-label={`${screen.name} ekranını sil`}><Trash2 size={14} /></button><button onClick={() => createPairingCode(screen)} className="rounded-lg border border-white/[.07] p-2 text-zinc-500 hover:border-cyan-400/30 hover:text-cyan-300" aria-label={`${screen.name} cihazını eşleştir`}><Zap size={14} /></button></div></div>)}</div> : <button onClick={() => setScreenModal("new")} className="grid min-h-48 w-full place-items-center rounded-2xl border border-dashed border-white/[.08] bg-gradient-to-b from-white/[.02] to-transparent text-center"><span><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/[.08] text-cyan-400"><MonitorPlay size={22} /></span><span className="mt-4 block text-sm font-medium">İlk ekranınızı bağlayın</span><span className="mt-1 block text-xs text-zinc-600">Çözünürlük ve konum bilgisini ekleyin.</span></span></button>}<div className="mt-4 flex items-center gap-2 rounded-xl bg-white/[.025] p-3 text-[11px] text-zinc-600"><Clock3 size={14} /> Son senkronizasyon: şimdi</div></section>
          </div>
        </div>
      </section>
      {screenModal ? <ScreenModal screen={screenModal === "new" ? null : screenModal} onClose={() => setScreenModal(null)} onSave={saveScreen} /> : null}
      {pairingScreen ? <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-[#0c1118] p-7 text-center shadow-2xl"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300"><MonitorPlay size={26}/></div><p className="mt-5 text-[10px] font-semibold tracking-[.18em] text-cyan-400">CİHAZ EŞLEŞTİRME</p><h2 className="mt-2 text-xl font-semibold">{pairingScreen.name}</h2><p className="mt-2 text-xs leading-5 text-zinc-500">Bu kodu DEN LED Player ilk kurulum ekranına girin. Kod 10 dakika geçerlidir ve eşleşince otomatik iptal edilir.</p><div className="my-6 rounded-2xl border border-white/[.08] bg-black/30 px-5 py-6 font-mono text-4xl font-bold tracking-[.22em] text-white">{pairingBusy ? "······" : pairingCode || "HATA"}</div><button onClick={() => { setPairingScreen(null); setPairingCode(null); }} className="h-11 w-full rounded-xl border border-white/[.08] text-sm text-zinc-300 hover:border-cyan-400/30">Kapat</button></div></div> : null}
    </main>
  );
}

function ProductionChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${8 + index * 14},${42 - (value / max) * 32}`).join(" ");
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return new Intl.DateTimeFormat("tr", { weekday: "short" }).format(date).replace(".", "");
  });
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/[.05] bg-black/20 p-4">
      <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">7 günlük üretim</p><p className="mt-1 text-lg font-semibold">{total} <span className="text-[11px] font-normal text-zinc-600">proje</span></p></div><span className="rounded-full bg-cyan-400/[.08] px-2.5 py-1 text-[10px] text-cyan-300">Canlı veri</span></div>
      <div className="relative h-24">
        <div className="absolute inset-x-0 top-2 border-t border-dashed border-white/[.06]" />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/[.05]" />
        <svg viewBox="0 0 100 48" className="absolute inset-x-0 top-0 h-20 w-full overflow-visible" role="img" aria-label="Son yedi günlük proje üretim grafiği">
          <defs><linearGradient id="production-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></linearGradient></defs>
          <polygon points={`8,46 ${points} 92,46`} fill="url(#production-fill)" />
          <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          {values.map((value, index) => <circle key={index} cx={8 + index * 14} cy={42 - (value / max) * 32} r={index === 6 ? 2.4 : 1.5} fill={index === 6 ? "#fff" : "#22d3ee"}><title>{days[index]}: {value} proje</title></circle>)}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex justify-between text-[9px] text-zinc-600">{days.map((day, index) => <span key={`${day}-${index}`} className={index === 6 ? "text-cyan-300" : ""}>{day}</span>)}</div>
      </div>
    </div>
  );
}

function ScreenModal({ screen, onClose, onSave }: { screen: ScreenItem | null; onClose: () => void; onSave: (values: { name: string; location: string; width: number; height: number }) => Promise<void> }) {
  const [name, setName] = useState(screen?.name ?? "");
  const [location, setLocation] = useState(screen?.location === "Konum eklenmedi" ? "" : screen?.location ?? "");
  const presetResolution = screen && resolutionOptions.some((option) => option.value === `${screen.width}x${screen.height}`) ? `${screen.width}x${screen.height}` : screen ? "custom" : "1920x640";
  const [resolution, setResolution] = useState(presetResolution);
  const [customWidth, setCustomWidth] = useState(screen?.width ?? 1920);
  const [customHeight, setCustomHeight] = useState(screen?.height ?? 640);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const [width, height] = resolution === "custom"
      ? [customWidth, customHeight]
      : resolution.split("x").map(Number);
    setBusy(true);
    await onSave({ name: name.trim(), location: location.trim(), width, height });
    setBusy(false);
  }
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="screen-modal-title"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/[.09] bg-[#0c1118] p-6 shadow-2xl shadow-cyan-950/30"><div className="mb-6 flex items-start justify-between"><div><p className="mb-2 text-[10px] font-semibold tracking-[.18em] text-cyan-400">LED AĞI</p><h2 id="screen-modal-title" className="text-xl font-semibold">{screen ? "Ekranı düzenle" : "Yeni ekran ekle"}</h2><p className="mt-1 text-xs text-zinc-500">Cihaz bilgileri uzaktan yayın için kullanılacak.</p></div><button type="button" onClick={onClose} className="rounded-xl border border-white/[.07] p-2 text-zinc-500 hover:text-white" aria-label="Pencereyi kapat"><X size={17} /></button></div><div className="space-y-4"><label className="block"><span className="mb-2 block text-xs text-zinc-400">Ekran adı</span><input required value={name} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-xl border border-white/[.08] bg-black/20 px-4 text-sm outline-none focus:border-cyan-400/40" placeholder="Merkez Mağaza" /></label><label className="block"><span className="mb-2 block text-xs text-zinc-400">Konum</span><input value={location} onChange={(e) => setLocation(e.target.value)} className="h-11 w-full rounded-xl border border-white/[.08] bg-black/20 px-4 text-sm outline-none focus:border-cyan-400/40" placeholder="Kadıköy / İstanbul" /></label><label className="block"><span className="mb-2 block text-xs text-zinc-400">Çözünürlük</span><select value={resolution} onChange={(e) => setResolution(e.target.value)} className="h-11 w-full rounded-xl border border-white/[.08] bg-[#090c11] px-4 text-sm outline-none focus:border-cyan-400/40"><option value="1920x640">1920 × 640 — Yatay LED</option><option value="1280x384">1280 × 384 — Yatay LED</option><option value="1920x1080">1920 × 1080 — Full HD</option><option value="1080x1920">1080 × 1920 — Dikey LED</option><option value="custom">Özel ölçü — LED panel</option></select></label>{resolution === "custom" ? <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-2 block text-xs text-zinc-400">Genişlik (px)</span><input required type="number" min={64} max={8192} step={1} value={customWidth} onChange={(e) => setCustomWidth(Math.max(64, Math.min(8192, Number(e.target.value) || 64)))} className="h-11 w-full rounded-xl border border-white/[.08] bg-black/20 px-4 text-sm outline-none focus:border-cyan-400/40" /></label><label className="block"><span className="mb-2 block text-xs text-zinc-400">Yükseklik (px)</span><input required type="number" min={64} max={8192} step={1} value={customHeight} onChange={(e) => setCustomHeight(Math.max(64, Math.min(8192, Number(e.target.value) || 64)))} className="h-11 w-full rounded-xl border border-white/[.08] bg-black/20 px-4 text-sm outline-none focus:border-cyan-400/40" /></label></div> : null}</div><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onClose} className="h-11 rounded-xl border border-white/[.08] text-sm text-zinc-400 hover:text-white">Vazgeç</button><button disabled={busy || !name.trim()} className="h-11 rounded-xl bg-cyan-400 text-sm font-semibold text-[#051017] hover:bg-cyan-300 disabled:opacity-50">{busy ? "Kaydediliyor" : "Kaydet"}</button></div></form></div>;
}

function Logo() { return <div className="flex items-center gap-3"><div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-cyan-400 text-[#061017]"><Film size={21} strokeWidth={2.4} /><span className="absolute bottom-0 h-1 w-full bg-blue-600" /></div><div><p className="text-[15px] font-bold tracking-[.12em]">DEN LED</p><p className="text-[9px] tracking-[.2em] text-cyan-400">AI STUDIO</p></div></div>; }
