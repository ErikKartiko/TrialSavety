"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { TrendingUp, MapPinned, Navigation, RadioTower, ShieldCheck } from "lucide-react";
import type { Hotspot } from "@/lib/geo";

interface StatsData {
  total7d: number;
  verified: number;
  byCategory: { key: string; label: string; color: string; total: number }[];
  series: { t: string; label: string; total: number; kritikal: number }[];
  hotspots: Hotspot[];
  sources: { warga: number; berita: number; otoritas: number; komunitas: number };
}

interface StatsPanelProps {
  onFlyTo: (lat: number, lng: number) => void;
}

export default function StatsPanel({ onFlyTo }: StatsPanelProps) {
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (res.ok && alive) setData(await res.json());
      } catch {
        /* coba lagi siklus berikutnya */
      }
    };
    void load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!data) {
    return (
      <div className="grid h-full place-items-center">
        <p className="animate-blink font-mono text-[11px] uppercase tracking-widest text-slate-500">
          Menghitung statistik...
        </p>
      </div>
    );
  }

  const maxCat = Math.max(1, ...data.byCategory.map((c) => c.total));
  const sourceTotal = Math.max(1, data.sources.warga + data.sources.berita + data.sources.otoritas + data.sources.komunitas);

  return (
    <div className="sigap-scroll h-full space-y-4 overflow-y-auto pr-1">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-line bg-black/30 p-3">
          <p className="hud-label">Kejadian 7 hari</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white">{data.total7d}</p>
        </div>
        <div className="rounded-2xl border border-line bg-black/30 p-3">
          <p className="hud-label">Terverifikasi warga</p>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-2xl font-bold text-emerald-300">
            <ShieldCheck size={16} /> {data.verified}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-black/30 p-3">
          <p className="hud-label">Sumber aktif</p>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-2xl font-bold text-cyan-300">
            <RadioTower size={16} /> 4
          </p>
        </div>
      </div>

      {/* tren */}
      <div className="rounded-2xl border border-line bg-black/30 p-3">
        <p className="hud-label flex items-center gap-1.5">
          <TrendingUp size={12} /> Tren 72 jam terakhir
        </p>
        <div className="mt-2 h-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gKrit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb4d6d" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#fb4d6d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: "#54678c", fontSize: 9, fontFamily: "monospace" }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(10,16,31,0.95)",
                  border: "1px solid #1c2740",
                  borderRadius: 10,
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
                labelStyle={{ color: "#8fa3c8" }}
              />
              <Area type="monotone" dataKey="total" stroke="#22d3ee" strokeWidth={1.8} fill="url(#gTotal)" name="Semua" />
              <Area type="monotone" dataKey="kritikal" stroke="#fb4d6d" strokeWidth={1.8} fill="url(#gKrit)" name="Kritis" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* kategori */}
      <div className="rounded-2xl border border-line bg-black/30 p-3">
        <p className="hud-label mb-2">Jenis kejadian terbanyak</p>
        <div className="space-y-1.5">
          {data.byCategory.slice(0, 6).map((c) => (
            <div key={c.key} className="flex items-center gap-2">
              <span className="w-24 truncate text-[11px] font-semibold text-slate-300">{c.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/50">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(c.total / maxCat) * 100}%`,
                    background: c.color,
                    boxShadow: `0 0 10px ${c.color}66`,
                  }}
                />
              </div>
              <span className="w-7 text-right font-mono text-[11px] font-bold" style={{ color: c.color }}>
                {c.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* sumber information */}
      <div className="rounded-2xl border border-line bg-black/30 p-3">
        <p className="hud-label mb-2">Asal data</p>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/50">
          <span style={{ width: `${(data.sources.warga / sourceTotal) * 100}%`, background: "#22d3ee" }} />
          <span style={{ width: `${(data.sources.berita / sourceTotal) * 100}%`, background: "#fbbf24" }} />
          <span style={{ width: `${(data.sources.otoritas / sourceTotal) * 100}%`, background: "#34d399" }} />
          <span style={{ width: `${(data.sources.komunitas / sourceTotal) * 100}%`, background: "#a78bfa" }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9.5px] uppercase tracking-wider text-slate-400">
          <span className="text-[#22d3ee]">■ Warga {data.sources.warga}</span>
          <span className="text-[#fbbf24]">■ Berita {data.sources.berita}</span>
          <span className="text-[#34d399]">■ Otoritas {data.sources.otoritas}</span>
          <span className="text-[#a78bfa]">■ Komunitas {data.sources.komunitas}</span>
        </div>
      </div>

      {/* hotspot */}
      <div className="rounded-2xl border border-line bg-black/30 p-3">
        <p className="hud-label mb-2 flex items-center gap-1.5">
          <MapPinned size={12} /> Zona paling rawan
        </p>
        <div className="space-y-1.5">
          {data.hotspots.map((h, idx) => (
            <div key={h.key} className="flex items-center gap-2.5 rounded-xl border border-line bg-black/30 px-3 py-2">
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-lg font-mono text-[12px] font-bold ${
                  idx === 0 ? "bg-danger/15 text-danger" : idx === 1 ? "bg-warn/10 text-warn" : "bg-slate-500/10 text-slate-400"
                }`}
              >
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-slate-200">{h.areaName}</p>
                <p className="font-mono text-[9.5px] text-slate-500">
                  {h.count} kejadian · indeks {h.score}
                </p>
              </div>
              <button
                onClick={() => onFlyTo(h.lat, h.lng)}
                className="grid size-8 place-items-center rounded-lg border border-line bg-black/40 text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-300"
                aria-label="Arahkan peta"
              >
                <Navigation size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
