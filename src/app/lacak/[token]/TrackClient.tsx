"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Siren,
  Radio,
  BatteryMedium,
  Clock,
  ExternalLink,
  Copy,
  Check,
  PhoneCall,
  Route,
  ShieldCheck,
  SearchX,
} from "lucide-react";
import { MapPin } from "lucide-react";
import type { SosEventDto, SosPingDto } from "@/lib/sigap";
import { haversineM, formatDistance } from "@/lib/geo";
import { timeAgo, fullDateTime } from "@/lib/format";

const TrackMap = dynamic(() => import("@/components/map/TrackMap"), { ssr: false });

interface TrackData {
  event: SosEventDto;
  pings: SosPingDto[];
  serverTime: string;
}

export default function TrackClient({ token }: { token: string }) {
  const [data, setData] = useState<TrackData | null>(null);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [alamat, setAlamat] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/sos/${token}`, { cache: "no-store" });
        if (res.status === 404) {
          if (alive) setMissing(true);
          return;
        }
        if (!res.ok) return;
        const json = (await res.json()) as TrackData;
        if (alive) setData(json);
      } catch {
        /* coba lagi */
      }
    };
    void load();
    const t = setInterval(load, 7000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [token]);

  const active = data?.event.status === "aktif";
  const last = data?.pings[data.pings.length - 1] ?? null;

  // Alamat titik terakhir via reverse geocoding (OpenStreetMap)
  useEffect(() => {
    if (!last) return;
    let alive = true;
    fetch(`/api/geocode?lat=${last.lat}&lng=${last.lng}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { label: string | null }) => {
        if (alive && j.label) setAlamat(j.label);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [last?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalDist = useMemo(() => {
    if (!data) return 0;
    let d = 0;
    for (let i = 1; i < data.pings.length; i++) {
      d += haversineM(data.pings[i - 1].lat, data.pings[i - 1].lng, data.pings[i].lat, data.pings[i].lng);
    }
    return d;
  }, [data]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* abaikan */
    }
  };

  if (missing) {
    return (
      <main className="grid h-dvh place-items-center bg-abyss px-6 text-center">
        <div>
          <SearchX size={40} className="mx-auto text-slate-600" />
          <h1 className="mt-4 text-xl font-bold text-white">Sinyal tidak ditemukan</h1>
          <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-slate-500">
            Tautan pelacakan ini salah, sudah dihapus, atau sinyal darurat tidak pernah diaktifkan.
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-2.5 text-[12px] font-bold uppercase tracking-widest text-cyan-300"
          >
            Buka SIGAP
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-abyss">
      {data ? (
        <TrackMap pings={data.pings} active={!!active} />
      ) : (
        <div className="grid h-full place-items-center">
          <p className="flex animate-blink items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300">
            <Radio size={14} /> Menghubungkan ke sinyal...
          </p>
        </div>
      )}
      <div className="map-vignette" />

      {/* header status */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] px-3 pt-3">
        <div
          className={`glass scanlines pointer-events-auto mx-auto max-w-xl rounded-2xl border p-4 ${
            active ? "border-danger/50" : "border-line"
          } ${active ? "animate-alarm" : ""}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-xl ${
                  active ? "animate-blink bg-danger/15 text-danger" : "bg-slate-500/10 text-slate-400"
                }`}
              >
                <Siren size={20} />
              </span>
              <div>
                <p className={`font-mono text-[11px] font-bold uppercase tracking-[0.22em] ${active ? "text-danger" : "text-slate-400"}`}>
                  {active ? "‼ Sinyal darurat aktif" : "Sinyal darurat berakhir"}
                </p>
                <p className="text-[12px] text-slate-300">
                  {data
                    ? active
                      ? "Seseorang membagikan lokasinya kepada Anda"
                      : "Pelacakan dihentikan — lokasi terakhir tersimpan"
                    : "Memuat..."}
                </p>
              </div>
            </div>
            {active && (
              <span className="relative flex size-3 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-danger" />
              </span>
            )}
          </div>

          {data?.event.message && (
            <p className="mt-2 rounded-xl border border-line bg-black/40 px-3 py-2 text-[12px] italic text-slate-300">
              “{data.event.message}”
            </p>
          )}

          {data && last && (
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <div className="rounded-xl border border-line bg-black/30 px-2.5 py-2">
                <p className="hud-label flex items-center gap-1"><Clock size={9} /> Diperbarui</p>
                <p className="mt-0.5 font-mono text-[12px] font-bold text-cyan-300">
                  {timeAgo(last.createdAt, Date.parse(data.serverTime))}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-black/30 px-2.5 py-2">
                <p className="hud-label flex items-center gap-1"><Route size={9} /> Pergerakan</p>
                <p className="mt-0.5 font-mono text-[12px] font-bold text-white">{formatDistance(totalDist)}</p>
              </div>
              <div className="rounded-xl border border-line bg-black/30 px-2.5 py-2">
                <p className="hud-label flex items-center gap-1"><BatteryMedium size={9} /> Baterai</p>
                <p className="mt-0.5 font-mono text-[12px] font-bold text-emerald-300">
                  {last.battery !== null ? `${last.battery}%` : "—"}
                </p>
              </div>
            </div>
          )}

          {alamat && last && (
            <p className="mt-2 flex items-start gap-1.5 font-mono text-[10px] leading-relaxed text-slate-400">
              <MapPin size={11} className="mt-px shrink-0 text-cyan-400" />
              {alamat}
            </p>
          )}

          {data && last && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <a
                href={`https://www.google.com/maps?q=${last.lat},${last.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#04121c] transition hover:brightness-110"
              >
                <ExternalLink size={13} /> Buka di Google Maps
              </a>
              <a
                href="tel:112"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-danger/50 bg-danger/10 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-danger transition hover:bg-danger/20"
              >
                <PhoneCall size={13} /> 112
              </a>
              <button
                onClick={copyLink}
                className="grid w-11 place-items-center rounded-xl border border-line bg-black/40 text-slate-400 transition hover:text-white"
                aria-label="Salin tautan pelacakan"
              >
                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
            </div>
          )}

          {data && (
            <p className="mt-2.5 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600">
              Mulai {fullDateTime(data.event.createdAt)}
              {data.event.resolvedAt ? ` · Selesai ${fullDateTime(data.event.resolvedAt)}` : ""}
            </p>
          )}
        </div>
        <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600">
          <ShieldCheck size={10} className="mr-1 inline text-cyan-400/70" />
          Dibagikan aman lewat aplikasi SIGAP
        </p>
      </header>
    </main>
  );
}
