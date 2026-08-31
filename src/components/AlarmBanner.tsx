"use client";

import { TriangleAlert, Eye, X, Volume2, VolumeX, Flame } from "lucide-react";
import { CATEGORIES } from "@/lib/sigap";
import { formatDistance } from "@/lib/geo";
import { timeAgo } from "@/lib/format";

export interface AlarmInfo {
  kind: "dekat" | "baru";
  incidentId: number;
  title: string;
  category: keyof typeof CATEGORIES;
  severity: number;
  distanceM: number;
  occurredAt: string;
}

interface AlarmBannerProps {
  alarm: AlarmInfo;
  muted: boolean;
  onView: () => void;
  onDismiss: () => void;
  onToggleMute: () => void;
}

export default function AlarmBanner({ alarm, muted, onView, onDismiss, onToggleMute }: AlarmBannerProps) {
  const cat = CATEGORIES[alarm.category] ?? CATEGORIES.lainnya;
  const isNear = alarm.kind === "dekat";

  return (
    <div className="animate-rise pointer-events-auto w-full">
      <div
        className={`animate-alarm overflow-hidden rounded-2xl border ${
          isNear && alarm.severity >= 4
            ? "border-danger/70 bg-gradient-to-r from-[#2a0510]/95 to-[#160409]/95"
            : "border-warn/60 bg-gradient-to-r from-[#2a2005]/95 to-[#171002]/95"
        }`}
      >
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span
            className={`grid size-10 shrink-0 animate-blink place-items-center rounded-xl ${
              isNear ? "bg-danger/20 text-danger" : "bg-warn/15 text-warn"
            }`}
          >
            {isNear ? <TriangleAlert size={20} /> : <Flame size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={`font-mono text-[10px] font-bold uppercase tracking-[0.22em] ${
                isNear ? "text-danger" : "text-warn"
              }`}
            >
              {isNear ? "‼ Bahaya di dekat Anda" : "Kejadian baru di sekitar"}
            </p>
            <p className="truncate text-[13px] font-semibold text-white">{alarm.title}</p>
            <p className="font-mono text-[10px] text-slate-400">
              {cat.label} · L{alarm.severity} · {formatDistance(alarm.distanceM)} ·{" "}
              {timeAgo(alarm.occurredAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={onView}
              className="grid size-9 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 transition hover:bg-cyan-400/20"
              aria-label="Lihat di peta"
            >
              <Eye size={15} />
            </button>
            <button
              onClick={onToggleMute}
              className="grid size-9 place-items-center rounded-xl border border-line bg-black/40 text-slate-400 transition hover:text-white"
              aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              onClick={onDismiss}
              className="grid size-9 place-items-center rounded-xl border border-line bg-black/40 text-slate-400 transition hover:text-white"
              aria-label="Tutup peringatan"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
