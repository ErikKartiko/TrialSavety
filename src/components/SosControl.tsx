"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Siren, Copy, Check, Send, XCircle, MessageCircle, Radio } from "lucide-react";
import type { ContactDto } from "@/lib/sigap";
import { waLink } from "@/lib/format";

export interface ActiveSos {
  token: string;
  url: string;
  startedAt: number;
  lastPingAt: number | null;
  pingCount: number;
}

interface SosControlProps {
  sos: ActiveSos | null;
  disabled: boolean;
  contacts: ContactDto[];
  onFire: () => void;
  onResolve: () => void;
}

const HOLD_MS = 2200;

export default function SosControl({ sos, disabled, contacts, onFire, onResolve }: SosControlProps) {
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const cancelHold = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setProgress(0);
  }, []);

  const tick = useCallback(() => {
    const p = Math.min(1, (performance.now() - startRef.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      cancelHold();
      if ("vibrate" in navigator) navigator.vibrate([80, 60, 80, 60, 300]);
      onFire();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onFire, cancelHold]);

  const beginHold = useCallback(() => {
    if (disabled || sos) return;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, sos, tick]);

  useEffect(() => () => cancelHold(), [cancelHold]);

  const copyUrl = async () => {
    if (!sos) return;
    try {
      await navigator.clipboard.writeText(sos.url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = sos.url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (sos) {
    const primary = contacts.filter((c) => c.isPrimary);
    const targets = primary.length ? primary : contacts.slice(0, 3);
    const pesan = `SINYAL DARURAT SIGAP!\nSaya butuh bantuan. Lacak lokasi saya secara langsung di sini:\n${sos.url}\n\nDikirim otomatis oleh aplikasi SIGAP.`;

    return (
      <div className="glass scanlines animate-rise pointer-events-auto w-[min(92vw,340px)] rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-danger" />
            </span>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-danger">
              Sinyal Aktif
            </p>
          </div>
          <Radio size={15} className="animate-blink text-danger" />
        </div>

        <p className="mt-2 text-[12px] leading-relaxed text-slate-300">
          Kerabat yang menerima tautan ini dapat melacak posisi Anda <b>secara langsung</b>.
        </p>

        <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-black/40 px-2.5 py-2">
          <p className="flex-1 truncate font-mono text-[11px] text-cyan-300">{sos.url}</p>
          <button
            onClick={copyUrl}
            className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-1.5 text-cyan-300 transition hover:bg-cyan-400/20"
            aria-label="Salin tautan"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        <div className="mt-2 space-y-1.5">
          {targets.map((c) => (
            <a
              key={c.id}
              href={waLink(c.phone, pesan)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-line bg-black/30 px-3 py-2 text-[12px] font-semibold text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-400/10"
            >
              <span className="flex items-center gap-2">
                <MessageCircle size={14} className="text-emerald-400" />
                Kirim ke {c.name}
                {c.relation ? <span className="text-slate-500">· {c.relation}</span> : null}
              </span>
              <Send size={13} className="text-slate-500" />
            </a>
          ))}
          {contacts.length === 0 && (
            <p className="rounded-xl border border-dashed border-line px-3 py-2 text-[11px] text-slate-500">
              Tambahkan kerabat di tab KONTAK agar bisa mengirim sekali ketuk.
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="font-mono text-[10px] text-slate-500">
            {sos.lastPingAt
              ? `Ping #${sos.pingCount} · ${Math.max(0, Math.round((Date.now() - sos.lastPingAt) / 1000))} dtk lalu`
              : "Menunggu ping pertama..."}
          </p>
          <button
            onClick={onResolve}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-black/40 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-danger/50 hover:text-danger"
          >
            <XCircle size={14} /> Akhiri
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <button
        onPointerDown={beginHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        aria-label="Tombol SOS: tahan untuk mengaktifkan"
        className={`hold-ring relative grid size-[92px] select-none place-items-center rounded-full border transition active:scale-95 ${
          disabled
            ? "cursor-not-allowed border-line bg-ink text-slate-600"
            : "border-danger/60 text-white"
        }`}
        style={{
          background: disabled
            ? undefined
            : `conic-gradient(#fb4d6d ${progress * 360}deg, rgba(251,77,109,0.12) ${progress * 360}deg)`,
          boxShadow: disabled ? "none" : "0 0 34px rgba(251,77,109,0.35), inset 0 0 24px rgba(0,0,0,0.55)",
        }}
      >
        <span className="absolute inset-2 grid place-items-center rounded-full bg-gradient-to-b from-[#23060e] to-[#12040a]">
          <Siren size={30} className={progress > 0 ? "animate-blink text-danger" : "text-danger"} />
        </span>
        {progress > 0 && (
          <span className="absolute -top-1 font-mono text-[10px] font-bold text-danger">
            {Math.ceil((1 - progress) * (HOLD_MS / 1000))}
          </span>
        )}
      </button>
      <p className="hud-label text-center leading-tight">
        {disabled ? "Menunggu lokasi" : "Tahan utk SOS"}
      </p>
    </div>
  );
}
