"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ShieldCheck, Clock, MapPin as PinIcon } from "lucide-react";
import {
  CATEGORIES,
  SEVERITY_LABELS,
  SOURCES,
  DEFAULT_CENTER,
  type IncidentDto,
} from "@/lib/sigap";
import { dangerZones, ageHours } from "@/lib/geo";
import { timeAgo } from "@/lib/format";

export interface GeoFix {
  lat: number;
  lng: number;
  accuracy: number;
  simulated: boolean;
}

export interface FlyTarget {
  lat: number;
  lng: number;
  zoom?: number;
  ts: number;
}

interface SafetyMapProps {
  incidents: IncidentDto[];
  userPos: GeoFix | null;
  follow: boolean;
  sosActive: boolean;
  showZones: boolean;
  flyTarget: FlyTarget | null;
  clickMode: "simulasi" | "lapor" | null;
  pickedReport: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onVerify: (id: number) => void;
  onMove: (center: { lat: number; lng: number; zoom: number }) => void;
}

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

function incidentIcon(i: IncidentDto, selected: boolean, now: number) {
  const cat = CATEGORIES[i.category] ?? CATEGORIES.lainnya;
  const hot = i.severity >= 4 && ageHours(i.occurredAt, now) < 12 && i.status !== "selesai";
  const cls = `mk ${hot ? "mk-hot" : ""} ${selected ? "mk-sel" : ""}`;
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    html: `<span class="${cls}" style="color:${cat.color}">
      <span class="mk-ring"></span>
      <span class="mk-diamond" style="background:${cat.color}; color:${cat.color}"></span>
    </span>`,
  });
}

function userIcon(simulated: boolean, sos: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [40, 40],
    html: `<span class="sigap-user ${simulated ? "u-sim" : ""} ${sos ? "u-sos" : ""}">
      <span class="u-ring"></span><span class="u-ring r2"></span><span class="u-dot"></span>
    </span>`,
  });
}

function pickIcon() {
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    html: `<span style="position:relative;display:block;width:34px;height:34px;margin-left:-17px;margin-top:-30px">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="#22d3ee" stroke="#04121c" stroke-width="1">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#04121c"/>
      </svg></span>`,
  });
}

function MapEffects({
  flyTarget,
  follow,
  userPos,
}: {
  flyTarget: FlyTarget | null;
  follow: boolean;
  userPos: GeoFix | null;
}) {
  const map = useMap();
  const lastFly = useRef(0);
  const firstFix = useRef(false);

  useEffect(() => {
    if (flyTarget && flyTarget.ts !== lastFly.current) {
      lastFly.current = flyTarget.ts;
      map.flyTo([flyTarget.lat, flyTarget.lng], flyTarget.zoom ?? 15, { duration: 1.1 });
    }
  }, [flyTarget, map]);

  useEffect(() => {
    if (!userPos) return;
    if (!firstFix.current) {
      firstFix.current = true;
      map.setView([userPos.lat, userPos.lng], 15, { animate: true });
      return;
    }
    if (follow) {
      map.panTo([userPos.lat, userPos.lng], { animate: true, duration: 0.6 });
    }
  }, [userPos, follow, map]);

  return null;
}

function ClickHandler({
  clickMode,
  onMapClick,
  onMove,
}: {
  clickMode: SafetyMapProps["clickMode"];
  onMapClick: (lat: number, lng: number) => void;
  onMove: SafetyMapProps["onMove"];
}) {
  const map = useMapEvents({
    click(e) {
      if (clickMode) onMapClick(e.latlng.lat, e.latlng.lng);
    },
    moveend() {
      const c = map.getCenter();
      onMove({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    },
  });
  useEffect(() => {
    const c = map.getCenter();
    onMove({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

export default function SafetyMap(props: SafetyMapProps) {
  const {
    incidents,
    userPos,
    follow,
    sosActive,
    showZones,
    flyTarget,
    clickMode,
    pickedReport,
    onMapClick,
    onVerify,
    onMove,
  } = props;

  const now = Date.now();
  const zones = useMemo(() => (showZones ? dangerZones(incidents, now) : []), [incidents, showZones, now]);
  const uIcon = useMemo(() => userIcon(userPos?.simulated ?? false, sosActive), [userPos?.simulated, sosActive]);
  const pIcon = useMemo(() => pickIcon(), []);

  return (
    <MapContainer
      center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
      zoom={13}
      minZoom={10}
      maxZoom={18}
      zoomControl={false}
      worldCopyJump
      className="absolute inset-0 z-0"
      style={{ cursor: clickMode ? "crosshair" : undefined }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
      <MapEffects flyTarget={flyTarget} follow={follow} userPos={userPos} />
      <ClickHandler clickMode={clickMode} onMapClick={onMapClick} onMove={onMove} />

      {/* Zona bayangan bahaya */}
      {zones.map((z, idx) => (
        <Circle
          key={`z-${idx}`}
          center={[z.lat, z.lng]}
          radius={z.radius}
          pathOptions={{
            color: z.color,
            weight: 0,
            fillColor: z.color,
            fillOpacity: Math.min(0.34, 0.10 + z.weight * 0.38),
          }}
          interactive={false}
        />
      ))}

      {/* Marker kejadian */}
      {incidents.map((i) => {
        const cat = CATEGORIES[i.category] ?? CATEGORIES.lainnya;
        return (
          <Marker
            key={`${i.id}-${i.verifications}-${i.status}`}
            position={[i.lat, i.lng]}
            icon={incidentIcon(i, false, now)}
          >
            <Popup>
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: cat.soft, color: cat.color }}
                  >
                    {cat.label}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    L{ i.severity } · {SEVERITY_LABELS[i.severity]}
                  </span>
                </div>
                <p className="text-[13px] font-semibold leading-snug text-white">{i.title}</p>
                {i.description ? (
                  <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">{i.description}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <PinIcon size={10} /> {i.areaName ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={10} /> {timeAgo(i.occurredAt)}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-500">
                  Sumber: {SOURCES[i.source]?.label ?? i.source}
                  {i.sourceDetail ? ` · ${i.sourceDetail}` : ""}
                </div>
                <button
                  onClick={() => onVerify(i.id)}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
                >
                  <ShieldCheck size={13} />
                  Konfirmasi kejadian ({i.verifications})
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Marker lokasi saya */}
      {userPos && (
        <>
          <Circle
            center={[userPos.lat, userPos.lng]}
            radius={Math.max(userPos.accuracy, 40)}
            pathOptions={{
              color: sosActive ? "#fb4d6d" : userPos.simulated ? "#fbbf24" : "#22d3ee",
              weight: 1,
              opacity: 0.4,
              fillColor: sosActive ? "#fb4d6d" : userPos.simulated ? "#fbbf24" : "#22d3ee",
              fillOpacity: 0.06,
            }}
            interactive={false}
          />
          <Marker position={[userPos.lat, userPos.lng]} icon={uIcon} zIndexOffset={500} />
        </>
      )}

      {/* Pin laporan yang dipilih */}
      {pickedReport && <Marker position={[pickedReport.lat, pickedReport.lng]} icon={pIcon} zIndexOffset={600} />}
    </MapContainer>
  );
}
