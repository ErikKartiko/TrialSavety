"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  RadioTower,
  LocateFixed,
  Crosshair,
  Megaphone,
  Volume2,
  VolumeX,
  Layers,
  Radio,
  ChartNoAxesColumn,
  Phone,
  ChevronDown,
  Satellite,
  CheckCircle2,
} from "lucide-react";
import {
  CATEGORIES,
  DANGER_LEVELS,
  type ContactDto,
  type IncidentDto,
} from "@/lib/sigap";
import { dangerScore, dangerLevel, proximityThreats, haversineM, formatDistance } from "@/lib/geo";
import { getDeviceId } from "@/lib/device";
import { useAudioAlarm } from "@/components/useAudioAlarm";
import IntroSplash from "@/components/IntroSplash";
import AlarmBanner, { type AlarmInfo } from "@/components/AlarmBanner";
import SosControl, { type ActiveSos } from "@/components/SosControl";
import ReportModal, { type ReportPayload } from "@/components/ReportModal";
import FeedPanel from "@/components/FeedPanel";
import StatsPanel from "@/components/StatsPanel";
import ContactsPanel from "@/components/ContactsPanel";
import type { GeoFix, FlyTarget } from "@/components/map/SafetyMap";

const SafetyMap = dynamic(() => import("@/components/map/SafetyMap"), { ssr: false });

type Panel = "aktivitas" | "statistik" | "kontak" | null;

function HudClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden text-right sm:block">
      <p className="font-mono text-[15px] font-bold leading-none text-white">
        {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="hud-label mt-1">
        {now.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
      </p>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const level = dangerLevel(score);
  const c = DANGER_LEVELS[level].color;
  const r = 15.5;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-2.5">
      <svg width="46" height="46" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#141d33" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={c}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (circ * score) / 100}
          style={{ transition: "stroke-dashoffset .8s ease, stroke .4s ease", filter: `drop-shadow(0 0 5px ${c})` }}
        />
        <text
          x="20"
          y="20"
          textAnchor="middle"
          dominantBaseline="central"
          transform="rotate(90 20 20)"
          fill="#fff"
          fontSize="12"
          fontWeight="700"
          fontFamily="var(--font-plex)"
        >
          {score}
        </text>
      </svg>
      <div>
        <p className="font-mono text-[13px] font-bold tracking-[0.14em]" style={{ color: c }}>
          {level}
        </p>
        <p className="hud-label mt-0.5">Skor kerawanan area</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [entered, setEntered] = useState(false);
  const [incidents, setIncidents] = useState<IncidentDto[]>([]);
  const [userPos, setUserPos] = useState<GeoFix | null>(null);
  const [follow, setFollow] = useState(true);
  const [simMode, setSimMode] = useState(false);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [showZones, setShowZones] = useState(true);
  const [panel, setPanel] = useState<Panel>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const [contacts, setContacts] = useState<ContactDto[]>([]);
  const [contactsBusy, setContactsBusy] = useState(false);

  const [sos, setSos] = useState<ActiveSos | null>(null);
  const [alarm, setAlarm] = useState<AlarmInfo | null>(null);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cuaca, setCuaca] = useState<{ suhu: number; kondisi: string; hujan: number; berat: boolean } | null>(null);
  const cuacaCell = useRef<string | null>(null);
  const rainWarned = useRef<string | null>(null);

  const siren = useAudioAlarm();
  const knownIds = useRef<Set<number>>(new Set());
  const userPosRef = useRef<GeoFix | null>(null);
  const sosRef = useRef<ActiveSos | null>(null);
  const threatRef = useRef<{ id: number; at: number } | null>(null);
  const alarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  userPosRef.current = userPos;
  sosRef.current = sos;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ---------- data kejadian ---------- */
  const fetchIncidents = useCallback(async (announce: boolean) => {
    try {
      const res = await fetch("/api/incidents?jam=96", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { incidents: IncidentDto[] };
      const rows = data.incidents;
      if (announce && userPosRef.current) {
        const pos = userPosRef.current;
        const freshNear = rows.find(
          (r) =>
            !knownIds.current.has(r.id) &&
            r.severity >= 3 &&
            r.status !== "selesai" &&
            Date.now() - new Date(r.createdAt).getTime() < 5 * 60000 &&
            haversineM(pos.lat, pos.lng, r.lat, r.lng) < 1500,
        );
        if (freshNear) {
          setAlarm({
            kind: "baru",
            incidentId: freshNear.id,
            title: freshNear.title,
            category: freshNear.category,
            severity: freshNear.severity,
            distanceM: haversineM(pos.lat, pos.lng, freshNear.lat, freshNear.lng),
            occurredAt: freshNear.occurredAt,
          });
        }
      }
      rows.forEach((r) => knownIds.current.add(r.id));
      setIncidents(rows);
    } catch {
      /* sambungan terputus — dicoba lagi siklus berikut */
    }
  }, []);

  useEffect(() => {
    if (!entered) return;
    void fetchIncidents(false);
    const t = setInterval(() => void fetchIncidents(true), 12000);
    return () => clearInterval(t);
  }, [entered, fetchIncidents]);

  /* ---------- GPS ---------- */
  const startWatch = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setSimMode(true);
      showToast("GPS tidak tersedia — mode simulasi aktif. Ketuk peta untuk memindahkan posisi.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, simulated: false });
        setSimMode(false);
      },
      () => {
        setSimMode(true);
        showToast("Izin lokasi ditolak — mode simulasi aktif. Ketuk peta untuk memindahkan posisi.");
      },
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 15000 },
    );
    return id;
  }, [showToast]);

  useEffect(() => {
    if (!entered || simMode) return;
    const id = startWatch();
    return () => {
      if (id !== undefined && "geolocation" in navigator) navigator.geolocation.clearWatch(id);
    };
  }, [entered, simMode, startWatch]);

  /* ---------- kontak ---------- */
  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts", { headers: { "x-device-id": getDeviceId() } });
      if (res.ok) setContacts(((await res.json()) as { contacts: ContactDto[] }).contacts);
    } catch {
      /* abaikan */
    }
  }, []);

  useEffect(() => {
    if (entered) void loadContacts();
  }, [entered, loadContacts]);

  /* ---------- deteksi ancaman dekat ---------- */
  useEffect(() => {
    if (!userPos || incidents.length === 0) return;
    const threats = proximityThreats(incidents, userPos);
    const nearest = threats[0];
    if (!nearest) {
      threatRef.current = null;
      return;
    }
    const critical =
      (nearest.incident.severity >= 4 && nearest.distanceM <= 700) ||
      (nearest.incident.severity >= 3 && nearest.distanceM <= 420);
    if (!critical) return;
    const last = threatRef.current;
    if (!last || last.id !== nearest.incident.id || Date.now() - last.at > 3 * 60000) {
      threatRef.current = { id: nearest.incident.id, at: Date.now() };
      setAlarm({
        kind: "dekat",
        incidentId: nearest.incident.id,
        title: nearest.incident.title,
        category: nearest.incident.category,
        severity: nearest.incident.severity,
        distanceM: nearest.distanceM,
        occurredAt: nearest.incident.occurredAt,
      });
    }
  }, [incidents, userPos]);

  /* ---------- sirene mengikuti alarm ---------- */
  useEffect(() => {
    if (alarm && !muted) siren.start();
    else siren.stop();
  }, [alarm, muted, siren]);

  useEffect(() => {
    if (!alarm) return;
    if (alarmTimer.current) clearTimeout(alarmTimer.current);
    alarmTimer.current = setTimeout(() => setAlarm(null), 30000);
    return () => {
      if (alarmTimer.current) clearTimeout(alarmTimer.current);
    };
  }, [alarm]);

  /* ---------- SOS ping berkala ---------- */
  useEffect(() => {
    if (!sos) return;
    const ping = async () => {
      const pos = userPosRef.current;
      const cur = sosRef.current;
      if (!pos || !cur) return;
      let battery: number | null = null;
      try {
        const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
        if (nav.getBattery) battery = Math.round((await nav.getBattery()).level * 100);
      } catch {
        /* abaikan */
      }
      try {
        const res = await fetch(`/api/sos/${cur.token}/ping`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.lat, lng: pos.lng, deviceId: getDeviceId(), battery }),
        });
        if (res.ok) {
          setSos((s) => (s ? { ...s, lastPingAt: Date.now(), pingCount: s.pingCount + 1 } : s));
        }
      } catch {
        /* dicoba lagi pada siklus berikut */
      }
    };
    void ping();
    const t = setInterval(ping, 15000);
    const tick = setInterval(() => setSos((s) => (s ? { ...s } : s)), 1000);
    return () => {
      clearInterval(t);
      clearInterval(tick);
    };
  }, [sos?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- aksi ---------- */
  const verify = useCallback(async (id: number) => {
    setIncidents((rows) => rows.map((r) => (r.id === id ? { ...r, verifications: r.verifications + 1 } : r)));
    try {
      await fetch(`/api/incidents/${id}/verify`, { method: "POST" });
    } catch {
      /* optimistis, abaikan gagal */
    }
  }, []);

  const flyTo = useCallback((lat: number, lng: number, zoom = 15) => {
    setFollow(false);
    setFlyTarget({ lat, lng, zoom, ts: Date.now() });
  }, []);

  const fireSos = useCallback(async () => {
    const pos = userPosRef.current;
    if (!pos) return;
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.lat, lng: pos.lng, deviceId: getDeviceId() }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { token: string };
      setSos({
        token: data.token,
        url: `${window.location.origin}/lacak/${data.token}`,
        startedAt: Date.now(),
        lastPingAt: null,
        pingCount: 0,
      });
      showToast("Sinyal darurat aktif — bagikan tautan ke kerabat Anda.");
    } catch {
      showToast("Gagal mengaktifkan sinyal. Coba lagi.");
    }
  }, [showToast]);

  const resolveSos = useCallback(async () => {
    const cur = sosRef.current;
    if (!cur) return;
    try {
      await fetch(`/api/sos/${cur.token}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
    } catch {
      /* abaikan */
    }
    setSos(null);
    showToast("Sinyal darurat dihentikan. Tetap waspada.");
  }, [showToast]);

  const addContact = useCallback(
    async (c: { name: string; phone: string; relation: string; isPrimary: boolean }) => {
      setContactsBusy(true);
      try {
        const res = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-device-id": getDeviceId() },
          body: JSON.stringify(c),
        });
        const data = await res.json();
        if (!res.ok) return (data as { error?: string }).error ?? "Gagal menyimpan";
        await loadContacts();
        showToast("Kontak kerabat tersimpan.");
        return null;
      } catch {
        return "Jaringan bermasalah";
      } finally {
        setContactsBusy(false);
      }
    },
    [loadContacts, showToast],
  );

  const deleteContact = useCallback(
    async (id: number) => {
      setContacts((rows) => rows.filter((r) => r.id !== id));
      try {
        await fetch(`/api/contacts/${id}`, { method: "DELETE", headers: { "x-device-id": getDeviceId() } });
      } catch {
        /* abaikan */
      }
    },
    [],
  );

  const submitReport = useCallback(
    async (p: ReportPayload) => {
      setReportBusy(true);
      setReportError(null);
      try {
        const res = await fetch("/api/incidents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...p, sourceDetail: "Laporan Warga" }),
        });
        const data = await res.json();
        if (!res.ok) {
          setReportError((data as { error?: string }).error ?? "Gagal mengirim laporan");
          return;
        }
        const created = (data as { incident: IncidentDto }).incident;
        setIncidents((rows) => [created, ...rows]);
        knownIds.current.add(created.id);
        setReportOpen(false);
        setPicked(null);
        showToast("Laporan tersebar — warga sekitar kini terlindungi.");
      } catch {
        setReportError("Jaringan bermasalah, coba lagi.");
      } finally {
        setReportBusy(false);
      }
    },
    [showToast],
  );

  const onMapClick = useCallback(
    (lat: number, lng: number) => {
      if (picking && reportOpen) {
        setPicked({ lat, lng });
        setPicking(false);
        return;
      }
      if (simMode) {
        setUserPos({ lat, lng, accuracy: 35, simulated: true });
      }
    },
    [picking, reportOpen, simMode],
  );

  const enterGps = useCallback(() => {
    window.localStorage.setItem("sigap_intro", "1");
    setEntered(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, simulated: false }),
        () => setSimMode(true),
        { enableHighAccuracy: true, timeout: 12000 },
      );
    }
  }, []);

  const enterSim = useCallback(() => {
    window.localStorage.setItem("sigap_intro", "1");
    setSimMode(true);
    setEntered(true);
    showToast("Mode simulasi — ketuk peta untuk memindahkan posisi Anda.");
  }, [showToast]);

  useEffect(() => {
    if (window.localStorage.getItem("sigap_intro") === "1") setEntered(true);
  }, []);

  /* ---------- turunan ---------- */
  const anchor = userPos ?? center;
  const score = useMemo(
    () => (anchor ? dangerScore(incidents, anchor) : 0),
    [incidents, anchor],
  );
  const level = dangerLevel(score);
  const threats = useMemo(
    () => (userPos ? proximityThreats(incidents, userPos) : []),
    [incidents, userPos],
  );
  const clickMode = picking ? "lapor" : simMode ? "simulasi" : null;

  /* ---------- agregator berita keamanan (Google News RSS, tanpa API key) ---------- */
  useEffect(() => {
    if (!entered) return;
    const sync = async () => {
      try {
        const res = await fetch("/api/berita", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { inserted: number };
        if (j.inserted > 0) {
          await fetchIncidents(false);
          showToast(`${j.inserted} berita keamanan baru dipetakan dari media online.`);
        }
      } catch {
        /* daring tidak tersedia */
      }
    };
    void sync();
    const t = setInterval(sync, 10 * 60000);
    return () => clearInterval(t);
  }, [entered, fetchIncidents, showToast]);

  /* ---------- cuaca real-time di sekitar pengguna (Open-Meteo, tanpa API key) ---------- */
  useEffect(() => {
    if (!anchor) return;
    const cellKey = `${anchor.lat.toFixed(1)}|${anchor.lng.toFixed(1)}`;
    if (cuacaCell.current === cellKey) return;
    cuacaCell.current = cellKey;
    void (async () => {
      try {
        const res = await fetch(`/api/cuaca?lat=${anchor.lat}&lng=${anchor.lng}`, { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { suhu: number; kondisi: string; hujan: number; berat: boolean };
        setCuaca(j);
        if (j.berat && rainWarned.current !== cellKey) {
          rainWarned.current = cellKey;
          showToast("Curah hujan tinggi di sekitar Anda — waspada banjir & genangan.");
        }
      } catch {
        /* abaikan */
      }
    })();
  }, [anchor, showToast]);

  const PANEL_META: Record<Exclude<Panel, null>, { title: string; sub: string }> = {
    aktivitas: { title: "Aktivitas Terkini", sub: `${incidents.length} kejadian · 96 jam terakhir` },
    statistik: { title: "Analisis Wilayah", sub: "Tren, kategori & zona paling rawan" },
    kontak: { title: "Kontak Darurat", sub: "Kerabat penerima sinyal & nomor penting" },
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-abyss">
      <SafetyMap
        incidents={incidents}
        userPos={userPos}
        follow={follow}
        sosActive={!!sos}
        showZones={showZones}
        flyTarget={flyTarget}
        clickMode={clickMode}
        pickedReport={picked}
        onMapClick={onMapClick}
        onVerify={verify}
        onMove={(c) => setCenter(c)}
      />
      <div className="map-vignette" />

      {/* ---------- HUD atas ---------- */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] px-3 pt-3">
        <div className="glass scanlines pointer-events-auto mx-auto flex h-[62px] max-w-5xl items-center justify-between gap-3 rounded-2xl px-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative grid size-10 place-items-center overflow-hidden rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
              <RadioTower size={18} />
              <span
                className="absolute inset-0"
                style={{ background: "conic-gradient(from 0deg, rgba(34,211,238,0.25), transparent 80deg)", animation: "sweep 3.2s linear infinite" }}
              />
            </span>
            <div className="leading-tight">
              <p className="text-[17px] font-bold tracking-[0.12em] text-white">
                SIGAP<span className="text-cyan-300">.</span>
              </p>
              <p className="hud-label">Peta Kewaspadaan Warga</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ScoreGauge score={score} />
            <HudClock />
            <button
              onClick={() => setMuted((m) => !m)}
              className="grid size-10 place-items-center rounded-xl border border-line bg-black/40 text-slate-400 transition hover:text-white"
              aria-label={muted ? "Suara mati" : "Suara aktif"}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-cyan-300" />}
            </button>
          </div>
        </div>

        {/* ticker laporan */}
        <div className="pointer-events-auto mx-auto mt-1.5 flex h-7 max-w-5xl items-center overflow-hidden rounded-xl border border-line bg-black/55 backdrop-blur-md">
          <span className="flex h-full shrink-0 items-center gap-1.5 border-r border-line px-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-danger">
            <span className="size-1.5 animate-blink rounded-full bg-danger" /> Live
          </span>
          <div className="relative flex-1 overflow-hidden">
            <div className="inline-flex whitespace-nowrap hover:[animation-play-state:paused]" style={{ animation: "ticker 36s linear infinite" }}>
              {[0, 1].map((dup) => (
                <span key={dup} className="inline-flex">
                  {incidents.slice(0, 8).map((i) => (
                    <span key={`${dup}-${i.id}`} className="mx-4 inline-flex items-center gap-2 font-mono text-[10px] text-slate-400">
                      <span className="size-1 rounded-full" style={{ background: CATEGORIES[i.category]?.color ?? "#94a3b8" }} />
                      {i.title}
                      <span className="text-slate-600">· {i.areaName ?? ""}</span>
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* banner alarm */}
        {alarm && (
          <div className="mx-auto mt-2 max-w-xl">
            <AlarmBanner
              alarm={alarm}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onDismiss={() => setAlarm(null)}
              onView={() => {
                const target = incidents.find((i) => i.id === alarm.incidentId);
                if (target) flyTo(target.lat, target.lng, 16);
                setAlarm(null);
              }}
            />
          </div>
        )}
      </header>

      {/* ---------- kontrol kanan ---------- */}
      <div className="absolute right-3 top-1/2 z-[1000] flex -translate-y-1/2 flex-col gap-2">
        <button
          onClick={() => {
            if (follow) {
              setFollow(false);
              showToast("Mode ikuti dimatikan — geser peta bebas.");
              return;
            }
            if (userPos) {
              setFollow(true);
              flyTo(userPos.lat, userPos.lng, 16);
            } else showToast("Posisi belum tersedia.");
          }}
          className={`glass grid size-11 place-items-center rounded-xl transition ${follow && userPos ? "text-cyan-300" : "text-slate-400 hover:text-white"}`}
          aria-label="Pusatkan & ikuti lokasi saya"
        >
          <LocateFixed size={17} />
        </button>
        <button
          onClick={() => setShowZones((z) => !z)}
          className={`glass grid size-11 place-items-center rounded-xl transition ${showZones ? "text-warn" : "text-slate-600 hover:text-white"}`}
          aria-label="Tampilkan zona rawan"
        >
          <Layers size={17} />
        </button>
        <button
          onClick={() => {
            setSimMode((s) => {
              const next = !s;
              showToast(next ? "Mode simulasi aktif — ketuk peta untuk memindahkan posisi." : "Kembali ke GPS langsung.");
              return next;
            });
          }}
          className={`glass grid size-11 place-items-center rounded-xl transition ${simMode ? "text-warn" : "text-slate-400 hover:text-white"}`}
          aria-label="Mode simulasi posisi"
        >
          <Crosshair size={17} />
        </button>
        <button
          onClick={() => {
            setReportOpen(true);
            setPicking(false);
            setReportError(null);
          }}
          className="glass grid size-11 place-items-center rounded-xl border-danger/40 text-danger transition hover:bg-danger/15"
          aria-label="Lapor kejadian"
        >
          <Megaphone size={17} />
        </button>
      </div>

      {/* ---------- status bar kecil atas-bawah kiri ---------- */}
      <div className="pointer-events-none absolute bottom-[150px] left-3 z-[1000] hidden sm:block">
        <div className="glass rounded-xl px-3 py-2 font-mono text-[9.5px] leading-relaxed text-slate-500">
          <p className="flex items-center gap-1.5">
            <Satellite size={10} className={userPos && !userPos.simulated ? "text-emerald-400" : "text-slate-600"} />
            {userPos
              ? userPos.simulated
                ? `SIMULASI · ${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)}`
                : `GPS · ${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)} · ±${Math.round(userPos.accuracy)}m`
              : "MENCARI SINYAL POSISI..."}
          </p>
          <p className="mt-0.5">
            {threats.length > 0
              ? `ANCAMAN TERDEKAT ${formatDistance(threats[0].distanceM)} · L${threats[0].incident.severity}`
              : `RADAR BERSIH · ${DANGER_LEVELS[level].desc}`}
          </p>
          {cuaca && (
            <p className={`mt-0.5 ${cuaca.berat ? "text-sky-300 animate-blink" : ""}`}>
              CUACA · {cuaca.kondisi} · {cuaca.suhu}°C{cuaca.hujan > 0 ? ` · HUJAN ${cuaca.hujan} mm` : ""}
            </p>
          )}
        </div>
      </div>

      {/* ---------- SOS ---------- */}
      <div className="absolute bottom-[84px] left-3 z-[1001] sm:bottom-6">
        <SosControl sos={sos} disabled={!userPos} contacts={contacts} onFire={fireSos} onResolve={resolveSos} />
      </div>

      {/* ---------- tab panel bawah ---------- */}
      <nav className="absolute inset-x-0 bottom-0 z-[1000] flex justify-center pb-3">
        <div className="glass pointer-events-auto flex items-center gap-1 rounded-2xl p-1.5">
          {(
            [
              { key: "aktivitas", icon: Radio, label: "Aktivitas" },
              { key: "statistik", icon: ChartNoAxesColumn, label: "Statistik" },
              { key: "kontak", icon: Phone, label: "Kontak" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setPanel((p) => (p === t.key ? null : t.key))}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                panel === t.key ? "bg-cyan-400/15 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]" : "text-slate-400 hover:text-white"
              }`}
            >
              <t.icon size={15} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ---------- panel bawah ---------- */}
      {panel && (
        <div className="absolute inset-x-0 bottom-[76px] z-[999] flex justify-center px-3">
          <div className="glass scanlines animate-rise pointer-events-auto h-[46vh] w-full max-w-3xl rounded-3xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-white">{PANEL_META[panel].title}</p>
                <p className="hud-label mt-0.5">{PANEL_META[panel].sub}</p>
              </div>
              <button
                onClick={() => setPanel(null)}
                className="grid size-8 place-items-center rounded-lg border border-line bg-black/40 text-slate-400 transition hover:text-white"
                aria-label="Tutup panel"
              >
                <ChevronDown size={16} />
              </button>
            </div>
            <div className="h-[calc(100%-52px)]">
              {panel === "aktivitas" && (
                <FeedPanel incidents={incidents} userPos={userPos} onFlyTo={(i) => { flyTo(i.lat, i.lng, 16); }} onVerify={verify} />
              )}
              {panel === "statistik" && <StatsPanel onFlyTo={(lat, lng) => flyTo(lat, lng, 14)} />}
              {panel === "kontak" && (
                <ContactsPanel contacts={contacts} busy={contactsBusy} onAdd={addContact} onDelete={deleteContact} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- modal lapor ---------- */}
      <ReportModal
        open={reportOpen}
        busy={reportBusy}
        picking={picking}
        userPos={userPos}
        picked={picked}
        error={reportError}
        onClose={() => {
          setReportOpen(false);
          setPicking(false);
          setPicked(null);
        }}
        onStartPick={() => setPicking(true)}
        onSubmit={submitReport}
      />

      {/* ---------- indikator memilih titik ---------- */}
      {picking && reportOpen && (
        <div className="absolute inset-x-0 bottom-[120px] z-[1100] flex justify-center px-4">
          <div className="glass animate-rise flex items-center gap-3 rounded-2xl px-4 py-3">
            <Crosshair size={16} className="animate-blink text-warn" />
            <p className="text-[12px] font-semibold text-slate-200">
              Ketuk titik di peta untuk menandai lokasi kejadian
            </p>
            <button
              onClick={() => setPicking(false)}
              className="rounded-lg border border-line bg-black/40 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 transition hover:text-white"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ---------- toast ---------- */}
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[170px] z-[1100] flex justify-center px-4">
          <p className="glass animate-rise pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold text-slate-200">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" /> {toast}
          </p>
        </div>
      )}

      {!entered && <IntroSplash onEnterGps={enterGps} onEnterSim={enterSim} />}
    </main>
  );
}
