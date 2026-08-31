"use client";

import { useEffect, useState } from "react";
import { Megaphone, MapPin, Crosshair, X, Send, LoaderCircle } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_KEYS,
  SEVERITY_LABELS,
  type IncidentCategory,
} from "@/lib/sigap";
import { CATEGORY_ICONS } from "./CategoryIcon";

export interface ReportPayload {
  title: string;
  description: string;
  category: IncidentCategory;
  severity: number;
  lat: number;
  lng: number;
  areaName: string;
  reporterName: string;
}

interface ReportModalProps {
  open: boolean;
  busy: boolean;
  picking: boolean;
  userPos: { lat: number; lng: number } | null;
  picked: { lat: number; lng: number } | null;
  error: string | null;
  onClose: () => void;
  onStartPick: () => void;
  onSubmit: (p: ReportPayload) => void;
}

export default function ReportModal(props: ReportModalProps) {
  const { open, busy, picking, userPos, picked, error, onClose, onStartPick, onSubmit } = props;
  const [category, setCategory] = useState<IncidentCategory>("pencurian");
  const [severity, setSeverity] = useState(3);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [areaName, setAreaName] = useState("");
  const [reporterName, setReporterName] = useState("");

  useEffect(() => {
    if (open) {
      setCategory("pencurian");
      setSeverity(3);
      setTitle("");
      setDescription("");
      setAreaName("");
      setReporterName("");
    }
  }, [open]);

  // Auto-isi nama area lewat reverse geocoding (Nominatim/OSM) saat titik berubah
  useEffect(() => {
    if (!open) return;
    const coord = picked ?? userPos;
    if (!coord || areaName.trim()) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?lat=${coord.lat}&lng=${coord.lng}`, { cache: "no-store" });
        const j = (await res.json()) as { label: string | null };
        if (j.label) setAreaName((v) => (v.trim() ? v : j.label ?? v));
      } catch {
        /* geocoder offline — pengguna isi manual */
      }
    }, 450);
    return () => clearTimeout(t);
  }, [open, picked, userPos, areaName]);

  // Saat memilih titik di peta, modal disembunyikan agar peta bisa diketuk
  if (!open || picking) return null;

  const coord = picked ?? userPos;
  const canSubmit = title.trim().length >= 4 && coord && !busy;

  return (
    <div className="fixed inset-0 z-[1200] grid place-items-end sm:place-items-center">
      <button
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="glass scanlines animate-rise pointer-events-auto relative max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl sigap-scroll">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl border border-danger/40 bg-danger/10 text-danger">
              <Megaphone size={17} />
            </span>
            <div>
              <p className="text-[15px] font-bold text-white">Lapor Kerawanan</p>
              <p className="hud-label mt-0.5">Lindungi warga sekitar Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-line bg-black/40 p-1.5 text-slate-400 transition hover:text-white"
            aria-label="Tutup formulir"
          >
            <X size={16} />
          </button>
        </div>

        {/* Kategori */}
        <p className="hud-label mt-5 mb-2">Jenis kejadian</p>
        <div className="grid grid-cols-5 gap-1.5">
          {CATEGORY_KEYS.map((key) => {
            const Icon = CATEGORY_ICONS[key];
            const c = CATEGORIES[key];
            const active = category === key;
            return (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[9.5px] font-semibold uppercase tracking-wide transition ${
                  active ? "text-white" : "border-line bg-black/30 text-slate-500 hover:text-slate-300"
                }`}
                style={
                  active
                    ? { borderColor: c.color, background: c.soft, color: c.color }
                    : undefined
                }
              >
                <Icon size={17} />
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Keparahan */}
        <p className="hud-label mt-4 mb-2">Tingkat keparahan</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => {
            const active = severity === s;
            const color = s >= 4 ? "#fb4d6d" : s === 3 ? "#fb923c" : "#facc15";
            return (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`flex-1 rounded-xl border px-1 py-2 font-mono text-[11px] font-bold transition ${
                  active ? "text-white" : "border-line bg-black/30 text-slate-500 hover:text-slate-300"
                }`}
                style={active ? { borderColor: color, background: `${color}22`, color } : undefined}
              >
                {s}
                <span className="block text-[8.5px] font-medium uppercase tracking-wide">
                  {SEVERITY_LABELS[s]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Judul & deskripsi */}
        <p className="hud-label mt-4 mb-2">Ringkasan kejadian</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="cth: Percobaan perampasan HP di depan minimarket"
          className="w-full rounded-xl border border-line bg-black/40 px-3.5 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={600}
          rows={3}
          placeholder="Detail singkat: ciri pelaku, kronologi, kondisi terkini (opsional)"
          className="mt-2 w-full resize-none rounded-xl border border-line bg-black/40 px-3.5 py-2.5 text-[12.5px] text-white placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none"
        />

        {/* Lokasi */}
        <p className="hud-label mt-4 mb-2">Titik lokasi</p>
        <div className="grid grid-cols-2 gap-1.5">
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold ${
              !picked ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300" : "border-line bg-black/30 text-slate-500"
            }`}
          >
            <MapPin size={15} />
            <span className="truncate">{picked ? "Titik peta dipakai" : "Lokasi saya"}</span>
          </div>
          <button
            onClick={onStartPick}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition ${
              picking
                ? "animate-blink border-warn bg-warn/10 text-warn"
                : "border-line bg-black/30 text-slate-400 hover:text-white"
            }`}
          >
            <Crosshair size={15} />
            {picking ? "Ketuk peta..." : "Pilih di peta"}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <input
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            maxLength={80}
            placeholder="Nama area (cth: Pasar Senen)"
            className="rounded-xl border border-line bg-black/40 px-3 py-2 text-[12px] text-white placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none"
          />
          <input
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            maxLength={60}
            placeholder="Nama Anda (opsional)"
            className="rounded-xl border border-line bg-black/40 px-3 py-2 text-[12px] text-white placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none"
          />
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-slate-500">
          {coord
            ? `Koordinat: ${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`
            : "Lokasi belum tersedia — aktifkan GPS atau pilih di peta."}
        </p>

        {error && (
          <p className="mt-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-[12px] text-danger">
            {error}
          </p>
        )}

        <button
          onClick={() =>
            coord &&
            onSubmit({
              title: title.trim(),
              description: description.trim(),
              category,
              severity,
              lat: coord.lat,
              lng: coord.lng,
              areaName: areaName.trim(),
              reporterName: reporterName.trim(),
            })
          }
          disabled={!canSubmit}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[13px] font-bold uppercase tracking-[0.14em] transition ${
            canSubmit
              ? "bg-gradient-to-r from-danger to-[#ff7847] text-white shadow-[0_10px_40px_rgba(251,77,109,0.35)] hover:brightness-110"
              : "cursor-not-allowed border border-line bg-black/30 text-slate-600"
          }`}
        >
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
          {busy ? "Mengirim..." : "Sebarkan Laporan"}
        </button>
      </div>
    </div>
  );
}
