import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Globe2, KeyRound, LogOut, MapPin, RefreshCw, Eye, FileText } from 'lucide-react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface AnalyticsData {
  generatedAt: string;
  summary: { totalOpens: number; totalCatalogs: number; countries: number; topCity: string };
  catalogs: { id: string; filename: string; opens: number; lastOpenedAt: string | null }[];
  locations: { country: string; region: string; city: string; latitude: number | null; longitude: number | null; opens: number }[];
  daily: { date: string; opens: number }[];
}

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [41, 41],
});

export const AdminDashboard: React.FC = () => {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('gg-admin-token'));
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapEl, setMapEl] = useState<HTMLDivElement | null>(null);

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
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Ачаалж чадсангүй.');
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Ачаалж чадсангүй.');
      if (/unauthorized/i.test(e?.message || '')) {
        sessionStorage.removeItem('gg-admin-token'); setToken(null);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (token) load(token); }, [token]);

  useEffect(() => {
    if (!mapEl) return;
    const map = L.map(mapEl, { scrollWheelZoom: true, worldCopyJump: true }).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 18 }).addTo(map);
    const markers: Marker[] = [];
    (data?.locations || []).forEach((loc) => {
      if (loc.latitude == null || loc.longitude == null) return;
      const marker = L.marker([loc.latitude, loc.longitude], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`<strong>${escapeHtml(loc.city)}</strong><br/>${escapeHtml(loc.country)} · ${loc.opens} нээлт`);
      markers.push(marker);
    });
    if (markers.length) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 5 });
    }
    return () => { map.remove(); };
  }, [mapEl, data]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin-auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Нэвтэрч чадсангүй.');
      sessionStorage.setItem('gg-admin-token', json.token); setToken(json.token); setPassword('');
    } catch (e: any) { setError(e?.message || 'Нэвтэрч чадсангүй.'); }
    finally { setLoading(false); }
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
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07101f]/85 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between"><div><div className="flex items-center gap-2 text-lg font-bold"><BarChart3 className="h-5 w-5 text-indigo-300" /> Админ хяналтын самбар</div><p className="text-xs text-slate-500">Каталогийн нээлт ба байршлын статистик</p></div><div className="flex gap-2"><button onClick={() => load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Шинэчлэх</button><button onClick={() => { sessionStorage.removeItem('gg-admin-token'); setToken(null); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5"><LogOut className="h-4 w-4" /> Гарах</button></div></div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 p-5">
        {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div>}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Eye />} label="Нийт нээлт" value={data?.summary.totalOpens ?? 0} />
          <Stat icon={<FileText />} label="Хуваалцсан каталог" value={data?.summary.totalCatalogs ?? 0} />
          <Stat icon={<Globe2 />} label="Улс" value={data?.summary.countries ?? 0} />
          <Stat icon={<MapPin />} label="Хамгийн олон хот" value={data?.summary.topCity ?? '—'} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Нээлтийн газрын зураг</h2><span className="text-xs text-slate-500">IP-д суурилсан ойролцоо байршил</span></div><div ref={setMapEl} className="h-[420px] overflow-hidden rounded-2xl" /></div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><h2 className="mb-4 font-semibold">Улсаар</h2><div className="space-y-3">{countries.slice(0, 10).map(([country, opens]) => <div key={country} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2"><span>{country || '—'}</span><span className="font-semibold text-indigo-200">{opens}</span></div>)}{!countries.length && <p className="text-sm text-slate-500">Одоогоор мэдээлэл алга.</p>}</div></div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><h2 className="mb-4 font-semibold">Каталог бүрээр</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr><th className="pb-3">Каталог</th><th className="pb-3">Нээлт</th><th className="pb-3">Сүүлд нээсэн</th></tr></thead><tbody>{(data?.catalogs || []).map((c) => <tr key={c.id} className="border-t border-white/5"><td className="py-3"><div className="font-medium">{c.filename}</div><div className="text-xs text-slate-500">{c.id}</div></td><td className="py-3 font-semibold">{c.opens}</td><td className="py-3 text-slate-400">{c.lastOpenedAt ? new Date(c.lastOpenedAt).toLocaleString('mn-MN') : '—'}</td></tr>)}</tbody></table></div></section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><h2 className="mb-4 font-semibold">Хот / бүсээр</h2><div className="max-h-[420px] space-y-2 overflow-auto">{(data?.locations || []).map((l, i) => <div key={`${l.country}-${l.city}-${i}`} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2"><div><div className="font-medium">{l.city}</div><div className="text-xs text-slate-500">{l.country} {l.region && `· ${l.region}`}</div></div><div className="font-semibold text-indigo-200">{l.opens}</div></div>)}</div></div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><h2 className="mb-4 font-semibold">Өдрөөр нээлт</h2><div className="space-y-3">{(data?.daily || []).slice(-14).map((d) => <div key={d.date}><div className="mb-1 flex justify-between text-xs text-slate-400"><span>{new Date(d.date).toLocaleDateString('mn-MN')}</span><span>{d.opens}</span></div><div className="h-2 rounded-full bg-white/5"><div className="h-2 rounded-full bg-indigo-400" style={{ width: `${(d.opens / maxDaily) * 100}%` }} /></div></div>)}</div></div>
        </section>
        <p className="pb-6 text-xs text-slate-500">Байршил нь хэрэглэгчийн public IP-ээс тооцсон ойролцоо мэдээлэл бөгөөд нарийн GPS байршил биш.</p>
      </main>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="mb-4 inline-flex rounded-xl bg-indigo-500/15 p-2 text-indigo-300">{icon}</div><div className="text-2xl font-bold">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>;

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' } as any)[char]); }
