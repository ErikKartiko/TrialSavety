"use client";

import { useEffect, useState } from "react";
import { Satellite, MapPin, Crosshair, ShieldCheck } from "lucide-react";

const BOOT_LINES = [
  "MENYAMBUNGKAN SATELIT POSISI...",
  "MENARIK LAPORAN WARGA & BERITA...",
  "KALIBRASI RADAR KERAWANAN...",
  "SISTEM SIAP DIGUNAKAN",
];

interface IntroSplashProps {
  onEnterGps: () => void;
  onEnterSim: () => void;
}

export default function IntroSplash({ onEnterGps, onEnterSim }: IntroSplashProps) {
  const [step, setStep] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setPct((p) => {
        const next = Math.min(100, p + 4 + Math.random() * 7);
        return next;
      });
    }, 90);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setStep(Math.min(BOOT_LINES.length - 1, Math.floor((pct / 100) * BOOT_LINES.length)));
  }, [pct]);

  const ready = pct >= 100;

  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center overflow-hidden bg-abyss">
      {/* radar rings */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        {[520, 400, 280, 170].map((s, i) => (
          <span
            key={s}
            className="absolute rounded-full border border-cyan-400/10"
            style={{ width: s, height: s, animation: `ping-slow ${3 + i * 0.7}s cubic-bezier(0,0,.2,1) infinite`, animationDelay: `${i * 0.45}s` }}
          />
        ))}
        <span className="absolute h-[520px] w-[520px] rounded-full border border-cyan-400/10" />
        <span
          className="absolute h-[520px] w-[520px] rounded-full"
          style={{
            background: "conic-gradient(from 0deg, rgba(34,211,238,0.22), transparent 70deg)",
            animation: "sweep 4.2s linear infinite",
          }}
        />
      </div>

      <div className="relative z-10 w-[min(92vw,430px)] px-6 text-center">
        <div className="mx-auto mb-5 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">
          <Satellite size={13} className="animate-blink" /> Sistem Kewaspadaan Warga
        </div>

        <h1 className="text-[64px] font-bold leading-none tracking-[0.08em] text-white sm:text-[84px]">
          SIGAP
          <span className="text-cyan-300">.</span>
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-slate-400">
          Peta keamanan <b className="text-slate-200">real-time</b> dari laporan warga & berita,
          sirene peringatan bahaya, serta sinyal SOS yang bisa{" "}
          <b className="text-slate-200">dilacak kerabat Anda secara langsung</b>.
        </p>

        {/* boot status */}
        <div className="mt-7 rounded-2xl border border-line bg-black/40 p-3 text-left">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
            <span>BOOT.{String(step + 1).padStart(2, "0")}</span>
            <span>{Math.floor(pct)}%</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={`mt-2 font-mono text-[10px] tracking-wider ${ready ? "text-emerald-300" : "text-cyan-300/80 animate-blink"}`}>
            {BOOT_LINES[step]}
          </p>
        </div>

        <div className={`mt-6 space-y-2 transition-opacity duration-500 ${ready ? "opacity-100" : "pointer-events-none opacity-30"}`}>
          <button
            onClick={onEnterGps}
            disabled={!ready}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3.5 text-[13px] font-bold uppercase tracking-[0.14em] text-[#04121c] shadow-[0_10px_44px_rgba(34,211,238,0.35)] transition hover:brightness-110 active:scale-[0.98]"
          >
            <MapPin size={16} /> Aktifkan GPS & Masuk
          </button>
          <button
            onClick={onEnterSim}
            disabled={!ready}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-black/40 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 transition hover:border-warn/50 hover:text-warn"
          >
            <Crosshair size={15} /> Masuk mode simulasi (tanpa GPS)
          </button>
          <p className="flex items-center justify-center gap-1.5 pt-1 font-mono text-[9px] uppercase tracking-widest text-slate-600">
            <ShieldCheck size={10} /> Lokasi hanya diproses di perangkat Anda
          </p>
        </div>
      </div>
    </div>
  );
}
