import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const allowed = (process.env.ADMIN_EMAILS || "denledglobal@gmail.com")
    .split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
  if (!user.email || !allowed.includes(user.email.toLowerCase())) redirect("/");

  const admin = createAdminClient();
  const [orgs, screens, projects, deployments] = await Promise.all([
    admin.from("organizations").select("id,name,plan,trial_ends_at,created_at").order("created_at", { ascending: false }).limit(100),
    admin.from("screens").select("id,name,device_status,last_seen_at,organization_id"),
    admin.from("projects").select("id,status,provider,organization_id,created_at").order("created_at", { ascending: false }).limit(500),
    admin.from("deployments").select("id,status,created_at").order("created_at", { ascending: false }).limit(500),
  ]);

  const organizations = orgs.data ?? [];
  const screenRows = screens.data ?? [];
  const projectRows = projects.data ?? [];
  const deploymentRows = deployments.data ?? [];
  const online = screenRows.filter((s:any) => s.last_seen_at && Date.now() - new Date(s.last_seen_at).getTime() < 120000).length;
  const ready = projectRows.filter((p:any) => p.status === "ready").length;
  const failed = projectRows.filter((p:any) => p.status === "failed").length;

  const cards = [
    ["Müşteri / Firma", organizations.length],
    ["LED Ekran", screenRows.length],
    ["Online Ekran", online],
    ["Hazır Video", ready],
    ["Hatalı İş", failed],
    ["Yayın Kaydı", deploymentRows.length],
  ];

  return <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-xs tracking-[.35em] text-cyan-400">DEN LED • ÜST YÖNETİM</p>
        <h1 className="mt-2 text-3xl font-semibold">Operasyon Merkezi</h1>
        <p className="mt-2 text-slate-400">Müşteriler, cihazlar, video üretimi ve yayınların tek ekrandan özeti.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label,value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-slate-400">{label}</div><div className="mt-2 text-3xl font-semibold">{value}</div>
        </div>)}
      </section>
      <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4 font-medium">Son Firmalar</div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-left text-slate-400"><tr><th className="p-4">Firma</th><th className="p-4">Paket</th><th className="p-4">Ekran</th><th className="p-4">Proje</th><th className="p-4">Kayıt</th></tr></thead>
          <tbody>{organizations.slice(0,20).map((o:any) => <tr key={o.id} className="border-t border-white/5">
            <td className="p-4 font-medium">{o.name}</td><td className="p-4 uppercase">{o.plan}</td>
            <td className="p-4">{screenRows.filter((s:any)=>s.organization_id===o.id).length}</td>
            <td className="p-4">{projectRows.filter((p:any)=>p.organization_id===o.id).length}</td>
            <td className="p-4 text-slate-400">{new Date(o.created_at).toLocaleDateString("tr-TR")}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </div>
  </main>;
}
