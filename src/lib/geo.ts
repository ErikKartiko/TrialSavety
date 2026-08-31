import type { DangerLevel, IncidentDto } from "./sigap";
import { DANGER_LEVELS } from "./sigap";

/** Jarak haversine dalam meter */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

/** Umur kejadian dalam jam */
export function ageHours(iso: string, now = Date.now()) {
  return Math.max(0, (now - new Date(iso).getTime()) / 36e5);
}

/** Peluruhan waktu (paruh ±36 jam, berhenti setelah 96 jam) */
export function timeDecay(ageH: number) {
  if (ageH > 96) return 0;
  return Math.exp(-ageH / 36);
}

/** Skor kerawanan 0-100 di titik tertentu */
export function dangerScore(
  incidents: IncidentDto[],
  at: { lat: number; lng: number },
  now = Date.now(),
) {
  let score = 0;
  for (const i of incidents) {
    if (i.status === "selesai") continue;
    const d = haversineM(at.lat, at.lng, i.lat, i.lng);
    if (d > 3000) continue;
    const decay = timeDecay(ageHours(i.occurredAt, now));
    if (decay <= 0) continue;
    const distDecay = Math.exp(-d / 900);
    const verifyBoost = 1 + Math.min(i.verifications, 10) * 0.06;
    score += i.severity * 9.5 * decay * distDecay * verifyBoost;
  }
  return Math.min(100, Math.round(score));
}

export function dangerLevel(score: number): DangerLevel {
  if (score >= DANGER_LEVELS.BAHAYA.min) return "BAHAYA";
  if (score >= DANGER_LEVELS.SIAGA.min) return "SIAGA";
  if (score >= DANGER_LEVELS.WASPADA.min) return "WASPADA";
  return "AMAN";
}

/** Kejadian yang relevan untuk alarm kedekatan */
export interface ProximityThreat {
  incident: IncidentDto;
  distanceM: number;
  ageH: number;
}

export function proximityThreats(
  incidents: IncidentDto[],
  at: { lat: number; lng: number },
  now = Date.now(),
): ProximityThreat[] {
  const out: ProximityThreat[] = [];
  for (const i of incidents) {
    if (i.status === "selesai") continue;
    const ageH = ageHours(i.occurredAt, now);
    if (ageH > 12) continue;
    if (i.severity < 3) continue;
    const d = haversineM(at.lat, at.lng, i.lat, i.lng);
    if (d > 1500) continue;
    out.push({ incident: i, distanceM: d, ageH });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}

/** Zona bayangan bahaya untuk overlay peta */
export interface DangerZone {
  lat: number;
  lng: number;
  radius: number;
  color: string;
  weight: number;
}

export function dangerZones(incidents: IncidentDto[], now = Date.now()): DangerZone[] {
  return incidents
    .filter((i) => i.status !== "selesai" && ageHours(i.occurredAt, now) <= 48)
    .map((i) => {
      const decay = timeDecay(ageHours(i.occurredAt, now));
      return {
        lat: i.lat,
        lng: i.lng,
        radius: 140 + i.severity * 70 * (1 + Math.min(i.verifications, 8) * 0.05),
        color: i.severity >= 4 ? "#ef4444" : i.severity === 3 ? "#f97316" : "#facc15",
        weight: decay * (0.35 + i.severity * 0.16),
      };
    })
    .filter((z) => z.weight > 0.05);
}

/** Hotspot agregat untuk statistik */
export interface Hotspot {
  key: string;
  lat: number;
  lng: number;
  score: number;
  count: number;
  areaName: string;
}

export function hotspots(incidents: IncidentDto[], now = Date.now(), limit = 5): Hotspot[] {
  const cells = new Map<string, Hotspot>();
  for (const i of incidents) {
    if (i.status === "selesai") continue;
    const decay = timeDecay(ageHours(i.occurredAt, now));
    if (decay <= 0) continue;
    const key = `${i.lat.toFixed(2)}|${i.lng.toFixed(2)}`;
    const cell =
      cells.get(key) ??
      ({ key, lat: i.lat, lng: i.lng, score: 0, count: 0, areaName: i.areaName ?? "Area" } as Hotspot);
    cell.score += i.severity * decay * 10;
    cell.count += 1;
    cell.areaName = i.areaName ?? cell.areaName;
    cells.set(key, cell);
  }
  return [...cells.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => ({ ...c, score: Math.round(c.score) }));
}
