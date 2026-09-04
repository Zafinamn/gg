import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Globe2, KeyRound, LogOut, MapPin, RefreshCw, Eye, FileText, Link2, Copy, Plus, Check } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface AnalyticsData {
  generatedAt: string;
  summary: { totalOpens: number; totalCatalogs: number; countries: number; topCity: string };
  catalogs: { id: string; filename: string; opens: number; lastOpenedAt: string | null }[];
  links: { id: string; slug?: string; name: string; catalogId: string; filename: string; opens: number; lastOpenedAt: string | null }[];
  locations: { country: string; region: string; city: string; latitude: number | null; longitude: number | null; opens: number }[];
  daily: { date: string; opens: number }[];
}

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [41, 41],
});

const linkUrl = (id: string, slug?: string) => `${window.location.origin}/share/${encodeURIComponent(slug || id)}`;

export const AdminDashboard: React.FC = () => {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('gg-admin-token'));
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapEl, setMapEl] = useState<HTMLDivElement | null>(null);
  const [linkCatalogId, setLinkCatalogId] = useState('');
  const [linkName, setLinkName] = useState('');
  const [createdLink, setCreatedLink] = useState('');
  const [createdLinkCopied, setCreatedLinkCopied] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLinkName, setEditingLinkName] = useState('');
  const [savingLinkName, setSavingLinkName] = useState(false);

  const maxDaily = Math.max(1, ...((data?.daily || []).map((d) => d.opens)));
  const countries = useMemo(() => {
    const map = new Map<string, number>();
    (data?.locations || []).forEach((l) => map.set(l.country, (map.get(l.country) || 0) + l.opens));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const load = async (nextToken = token) => {
    if (!nextToken) return;
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin-analytics', { headers: { Authorization: `Bearer ${nextToken}` }, cache: 'no-store' });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.error || 'Ачаалж чадсангүй.');
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Ачаалж чадсангүй.');
      if (/unauthorized/i.test(e?.message || '')) { sessionStorage.removeItem('gg-admin-token'); setToken(null); }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (token) load(token); }, [token]);

  useEffect(() => {
    if (!mapEl) return;
    const map = L.map(mapEl, { scrollWheelZoom: true, worldCopyJump: true }).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 18 }).addTo(map);
    const markers: L.Marker[] = [];
    (data?.locations || []).forEach((loc) => {
      if (loc.latitude == null || loc.longitude == null) return;
      markers.push(L.marker([loc.latitude, loc.longitude], { icon: markerIcon }).addTo(map).bindPopup(`<strong>${escapeHtml(loc.city)}</strong><br/>${escapeHtml(loc.country)} · ${loc.opens} нээлт`));
    });
    if (markers.length) map.fitBounds(L.featureGroup(markers).getBounds().pad(0.25), { maxZoom: 5 });
    return () => { map.remove(); };
  }, [mapEl, data]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin-auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.error || 'Нэвтэрч чадсангүй.');
      sessionStorage.setItem('gg-admin-token', json.token); setToken(json.token); setPassword('');
    } catch (e: any) { setError(e?.message || 'Нэвтэрч чадсангүй.'); }
    finally { setLoading(false); }
  };

  const createShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !linkCatalogId.trim() || !linkName.trim()) return;
    setCreatingLink(true); setError(''); setCreatedLink(''); setCreatedLinkCopied(false);
    try {
      const r = await fetch('/api/admin-share-links', {
        method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ catalogId: linkCatalogId.trim(), name: linkName.trim() }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.error || 'Холбоос үүсгэж чадсангүй.');
      setCreatedLink(new URL(json.link, window.location.origin).toString());
      setLinkName('');
      await load(token);
    } catch (e: any) { setError(e?.message || 'Холбоос үүсгэж чадсангүй.'); }
    finally { setCreatingLink(false); }
  };

  const renameLink = async (linkId: string) => {
    if (!token || !editingLinkName.trim()) return;
    setSavingLinkName(true); setError('');
    try {
      const r = await fetch('/api/admin-share-links', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ linkId, name: editingLinkName.trim() }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.error || 'Нэр солих үед алдаа гарлаа.');
      setEditingLinkId(null); setEditingLinkName('');
      await load(token);
    } catch (e: any) { setError(e?.message || 'Нэр солих үед алдаа гарлаа.'); }
    finally { setSavingLinkName(false); }
  };

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); return true; } catch {
      const el = document.createElement('textarea'); el.value = value; document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove(); return true;
    }
  };

  if (!token) return (
    <div className="min-h-screen bg-[#07101f] text-white grid place-items-center p-6">
      <form onSubmit={login} className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.06] p-7 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-indigo-500/20 p-3"><KeyRound className="h-5 w-5 text-indigo-300" /></div><div><h1 className="text-xl font-bold">Админ хяналтын самбар</h1><p className="text-sm text-slate-400">Зөвхөн админы нэвтрэлттэй</p></div></div>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Нууц үг" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-indigo-400" autoFocus />
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        <button disabled={loading} className="mt-4 w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold transition hover:bg-indigo-400 disabled:opacity-50">{loading ? 'Шалгаж байна...' : 'Нэвтрэх'}</button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07101f] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07101f]/85 px-5 py-4 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between"><div><div className="flex items-center gap-2 text-lg font-bold"><BarChart3 className="h-5 w-5 text-indigo-300" /> Админ хяналтын самбар</div><p className="text-xs text-slate-500">Каталог, холбоос, нээлт ба байршлын статистик</p></div><div className="flex gap-2"><button onClick={() => load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Шинэчлэх</button><button onClick={() => { sessionStorage.removeItem('gg-admin-token'); setToken(null); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5"><LogOut className="h-4 w-4" /> Гарах</button></div></div></header>
      <main className="mx-auto max-w-7xl space-y-6 p-5">
        {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div>}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={<Eye />} label="Нийт нээлт" value={data?.summary.totalOpens ?? 0} /><Stat icon={<FileText />} label="Хуваалцсан каталог" value={data?.summary.totalCatalogs ?? 0} /><Stat icon={<Globe2 />} label="Улс" value={data?.summary.countries ?? 0} /><Stat icon={<MapPin />} label="Хамгийн олон хот" value={data?.summary.topCity ?? '—'} /></section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex items-center gap-2"><Link2 className="h-5 w-5 text-indigo-300" /><h2 className="font-semibold">Дэлгүүр тус бүрийн холбоос</h2></div>
          <p className="mb-4 text-sm text-slate-400">Нэг каталогийг олон дэлгүүрт тусдаа холбоосоор тарааж, дэлгүүр бүрийн нээлтийг тусад нь тоолно.</p>
          <form onSubmit={createShareLink} className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
            <input value={linkCatalogId} onChange={(e)=>setLinkCatalogId(e.target.value)} placeholder="Каталогийн ID (ж: 8d1... )" className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
            <input value={linkName} onChange={(e)=>setLinkName(e.target.value)} placeholder="Холбоосын нэр (ж: 5-р дэлгүүр)" className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
            <button disabled={creatingLink} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold hover:bg-indigo-400 disabled:opacity-50"><Plus className="h-4 w-4" /> {creatingLink ? 'Үүсгэж байна...' : 'Холбоос үүсгэх'}</button>
          </form>
          {createdLink && <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4"><div className="mb-2 font-semibold text-emerald-200">Холбоос бэлэн</div><div className="break-all text-sm text-slate-300">{createdLink}</div><div className="mt-3 flex flex-wrap gap-2"><button onClick={async()=>{await copy(createdLink); setCreatedLinkCopied(true);}} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 px-3 py-2 text-sm hover:bg-white/5"><Copy className="h-4 w-4" /> {createdLinkCopied ? 'Хуулсан' : 'Хуулах'}</button></div></div>}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><h2 className="mb-4 font-semibold">Холбоос бүрээр</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr><th className="pb-3">Нэр</th><th className="pb-3">Каталог</th><th className="pb-3">Нээлт</th><th className="pb-3">Сүүлд</th><th className="pb-3">Холбоос</th><th className="pb-3">Үйлдэл</th></tr></thead><tbody>{(data?.links || []).map((l) => { const url = linkUrl(l.id, l.slug); const editing = editingLinkId === l.id; return <tr key={l.id} className="border-t border-white/5"><td className="py-3">{editing ? <div className="flex flex-wrap gap-2"><input value={editingLinkName} onChange={(e)=>setEditingLinkName(e.target.value)} className="min-w-[180px] rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-sm outline-none focus:border-indigo-400" autoFocus /><button disabled={savingLinkName} onClick={()=>renameLink(l.id)} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold hover:bg-indigo-400 disabled:opacity-50">Хадгалах</button><button onClick={()=>{setEditingLinkId(null);setEditingLinkName('')}} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Цуцлах</button></div> : <><div className="font-medium">{l.name}</div><div className="text-xs text-slate-500">ID: {l.id}</div></>}</td><td className="py-3">{l.filename}</td><td className="py-3 font-semibold text-indigo-200">{l.opens}</td><td className="py-3 text-slate-400">{l.lastOpenedAt ? new Date(l.lastOpenedAt).toLocaleString('mn-MN') : '—'}</td><td className="py-3"><button onClick={()=>copy(url)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs hover:bg-white/5"><Copy className="h-3.5 w-3.5" /> Хуулах</button></td><td className="py-3">{!editing && <button onClick={()=>{setEditingLinkId(l.id);setEditingLinkName(l.name)}} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs hover:bg-white/5">Нэр солих</button>}</td></tr>; })}{!(data?.links || []).length && <tr><td colSpan={6} className="py-6 text-center text-slate-500">Одоогоор тусдаа холбоос алга.</td></tr>}</tbody></table></div></section>

        <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Нээлтийн газрын зураг</h2><span className="text-xs text-slate-500">IP-д суурилсан ойролцоо байршил</span></div><div ref={setMapEl} className="h-[420px] overflow-hidden rounded-2xl" /></div><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><h2 className="mb-4 font-semibold">Улсаар</h2><div className="space-y-3">{countries.slice(0,10).map(([country,opens])=><div key={country} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2"><span>{country || '—'}</span><span className="font-semibold text-indigo-200">{opens}</span></div>)}{!countries.length&&<p className="text-sm text-slate-500">Одоогоор мэдээлэл алга.</p>}</div></div></section>
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><h2 className="mb-4 font-semibold">Каталог бүрээр</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr><th className="pb-3">Каталог</th><th className="pb-3">Нээлт</th><th className="pb-3">Сүүлд нээсэн</th><th className="pb-3">ID</th></tr></thead><tbody>{(data?.catalogs||[]).map(c=><tr key={c.id} className="border-t border-white/5"><td className="py-3 font-medium">{c.filename}</td><td className="py-3 font-semibold">{c.opens}</td><td className="py-3 text-slate-400">{c.lastOpenedAt?new Date(c.lastOpenedAt).toLocaleString('mn-MN'):'—'}</td><td className="py-3 text-xs text-slate-500">{c.id}</td></tr>)}</tbody></table></div></section>
        <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><h2 className="mb-4 font-semibold">Хот / бүсээр</h2><div className="max-h-[420px] space-y-2 overflow-auto">{(data?.locations||[]).map((l,i)=><div key={`${l.country}-${l.city}-${i}`} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2"><div><div className="font-medium">{l.city}</div><div className="text-xs text-slate-500">{l.country} {l.region&&`· ${l.region}`}</div></div><div className="font-semibold text-indigo-200">{l.opens}</div></div>)}</div></div><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><h2 className="mb-4 font-semibold">Өдрөөр нээлт</h2><div className="space-y-3">{(data?.daily||[]).slice(-14).map(d=><div key={d.date}><div className="mb-1 flex justify-between text-xs text-slate-400"><span>{new Date(d.date).toLocaleDateString('mn-MN')}</span><span>{d.opens}</span></div><div className="h-2 rounded-full bg-white/5"><div className="h-2 rounded-full bg-indigo-400" style={{width:`${(d.opens/maxDaily)*100}%`}} /></div></div>)}</div></div></section>
        <p className="pb-6 text-xs text-slate-500">Байршил нь хэрэглэгчийн public IP-ээс тооцсон ойролцоо мэдээлэл бөгөөд нарийн GPS байршил биш.</p>
      </main>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-3 flex items-center gap-2 text-sm text-slate-400">{React.cloneElement(icon as React.ReactElement<any>, { className:'h-4 w-4 text-indigo-300' })}{label}</div><div className="text-2xl font-bold">{value}</div></div>;
function escapeHtml(value: string) { return value.replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c] || c)); }
