"use client";

import { useMemo, useState } from "react";
import { Navigation, ShieldCheck, Clock, Layers } from "lucide-react";
import {
  CATEGORIES,
  SEVERITY_LABELS,
  SOURCES,
  type IncidentCategory,
  type IncidentDto,
} from "@/lib/sigap";
import { CATEGORY_ICONS } from "./CategoryIcon";
import { haversineM, formatDistance } from "@/lib/geo";
import { timeAgo } from "@/lib/format";

interface FeedPanelProps {
  incidents: IncidentDto[];
  userPos: { lat: number; lng: number } | null;
  onFlyTo: (i: IncidentDto) => void;
  onVerify: (id: number) => void;
}

export default function FeedPanel({ incidents, userPos, onFlyTo, onVerify }: FeedPanelProps) {
  const [filter, setFilter] = useState<IncidentCategory | "semua">("semua");
  const [onlyNew, setOnlyNew] = useState(false);

  const presentCats = useMemo(() => {
    const set = new Set(incidents.map((i) => i.category));
    return (Object.keys(CATEGORIES) as IncidentCategory[]).filter((k) => set.has(k));
  }, [incidents]);

  const list = useMemo(() => {
    let out = incidents;
    if (filter !== "semua") out = out.filter((i) => i.category === filter);
    if (onlyNew) out = out.filter((i) => Date.now() - new Date(i.occurredAt).getTime() < 6 * 36e5);
    return out.slice(0, 80);
  }, [incidents, filter, onlyNew]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pr-1 sigap-scroll">
        <button
          onClick={() => setFilter("semua")}
          className={`shrink-0 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
            filter === "semua"
              ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-300"
              : "border-line bg-black/30 text-slate-500 hover:text-slate-300"
          }`}
        >
          Semua ({incidents.length})
        </button>
        {presentCats.map((key) => {
          const Icon = CATEGORY_ICONS[key];
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                active
                  ? "text-white"
                  : "border-line bg-black/30 text-slate-500 hover:text-slate-300"
              }`}
              style={active ? { borderColor: CATEGORIES[key].color, color: CATEGORIES[key].color, background: CATEGORIES[key].soft } : undefined}
            >
              <Icon size={12} /> {CATEGORIES[key].label}
            </button>
          );
        })}
        <button
          onClick={() => setOnlyNew((v) => !v)}
          className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
            onlyNew
              ? "border-warn/60 bg-warn/10 text-warn"
              : "border-line bg-black/30 text-slate-500 hover:text-slate-300"
          }`}
        >
          <Clock size={12} /> &lt; 6 jam
        </button>
      </div>

      <div className="sigap-scroll -mx-1 flex-1 space-y-1.5 overflow-y-auto px-1 pb-1">
        {list.length === 0 && (
          <div className="grid place-items-center gap-2 py-10 text-center">
            <Layers size={22} className="text-slate-600" />
            <p className="text-[12px] text-slate-500">Belum ada kejadian pada filter ini.</p>
          </div>
        )}
        {list.map((i) => {
          const cat = CATEGORIES[i.category] ?? CATEGORIES.lainnya;
          const Icon = CATEGORY_ICONS[i.category] ?? CATEGORY_ICONS.lainnya;
          const dist = userPos ? haversineM(userPos.lat, userPos.lng, i.lat, i.lng) : null;
          return (
            <article
              key={i.id}
              className="group relative overflow-hidden rounded-2xl border border-line bg-black/30 p-3 transition hover:border-slate-500/50"
            >
              <span
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ background: cat.color, boxShadow: `0 0 12px ${cat.color}` }}
              />
              <div className="flex items-start gap-2.5 pl-1.5">
                <span
                  className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl"
                  style={{ background: cat.soft, color: cat.color }}
                >
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold leading-snug text-slate-100">
                    {i.title}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
                    {i.areaName ?? "—"}
                    {dist !== null ? ` · ${formatDistance(dist)} dari Anda` : ""} ·{" "}
                    {timeAgo(i.occurredAt)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className="rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
                      style={{ background: cat.soft, color: cat.color }}
                    >
                      {cat.label} · L{i.severity} {SEVERITY_LABELS[i.severity]}
                    </span>
                    <span className="rounded-md bg-slate-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-400">
                      {SOURCES[i.source]?.label ?? i.source}
                    </span>
                    {i.verifications > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-300">
                        <ShieldCheck size={10} /> {i.verifications} dikonfirmasi
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    onClick={() => onFlyTo(i)}
                    className="grid size-8 place-items-center rounded-lg border border-line bg-black/40 text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-300"
                    aria-label="Arahkan peta ke kejadian"
                  >
                    <Navigation size={13} />
                  </button>
                  <button
                    onClick={() => onVerify(i.id)}
                    className="grid size-8 place-items-center rounded-lg border border-line bg-black/40 text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-300"
                    aria-label="Konfirmasi kejadian"
                  >
                    <ShieldCheck size={13} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
