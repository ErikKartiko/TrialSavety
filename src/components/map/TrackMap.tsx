"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { SosPingDto } from "@/lib/sigap";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

function sosIcon(active: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [40, 40],
    html: `<span class="sigap-user ${active ? "u-sos" : ""}">
      <span class="u-ring"></span><span class="u-ring r2"></span>
      <span class="u-dot" style="${active ? "" : "background:#94a3b8;box-shadow:0 0 14px 2px rgba(148,163,184,.7)"}"></span>
    </span>`,
  });
}

function FollowLast({ last }: { last: SosPingDto | null }) {
  const map = useMap();
  useEffect(() => {
    if (last) map.setView([last.lat, last.lng], Math.max(map.getZoom(), 15), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.id, map]);
  return null;
}

interface TrackMapProps {
  pings: SosPingDto[];
  active: boolean;
}

export default function TrackMap({ pings, active }: TrackMapProps) {
  const last = pings[pings.length - 1] ?? null;
  const path = pings.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <MapContainer
      center={last ? [last.lat, last.lng] : [-6.175392, 106.827153]}
      zoom={15}
      minZoom={10}
      maxZoom={18}
      zoomControl={false}
      className="absolute inset-0 z-0"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
      <FollowLast last={last} />
      {path.length > 1 && (
        <Polyline
          positions={path}
          pathOptions={{ color: active ? "#fb4d6d" : "#64748b", weight: 3, opacity: 0.75, dashArray: "1 7", lineCap: "round" }}
        />
      )}
      {last && <Marker position={[last.lat, last.lng]} icon={sosIcon(active)} />}
    </MapContainer>
  );
}
