/**
 * Tipe & konstanta bersama untuk aplikasi SIGAP.
 * Aman dipakai di sisi server maupun klien.
 */

export type IncidentCategory =
  | "pencurian"
  | "curanmor"
  | "perampokan"
  | "tawuran"
  | "pelecehan"
  | "kebakaran"
  | "kecelakaan"
  | "banjir"
  | "mencurigakan"
  | "lainnya";

export type IncidentSource = "warga" | "berita" | "otoritas" | "komunitas";

export interface IncidentDto {
  id: number;
  title: string;
  description: string | null;
  category: IncidentCategory;
  severity: number; // 1..5
  lat: number;
  lng: number;
  areaName: string | null;
  source: IncidentSource;
  sourceDetail: string | null;
  reporterName: string | null;
  verifications: number;
  status: "aktif" | "dipantau" | "selesai";
  occurredAt: string;
  createdAt: string;
}

export interface ContactDto {
  id: number;
  deviceId: string;
  name: string;
  phone: string;
  relation: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface SosEventDto {
  id: number;
  token: string;
  message: string | null;
  lat: number;
  lng: number;
  status: "aktif" | "selesai";
  createdAt: string;
  resolvedAt: string | null;
}

export interface SosPingDto {
  id: number;
  lat: number;
  lng: number;
  battery: number | null;
  createdAt: string;
}

export const CATEGORIES: Record<
  IncidentCategory,
  { label: string; color: string; soft: string }
> = {
  pencurian: { label: "Pencurian", color: "#f59e0b", soft: "rgba(245,158,11,.14)" },
  curanmor: { label: "Curanmor", color: "#fb923c", soft: "rgba(251,146,60,.14)" },
  perampokan: { label: "Perampokan", color: "#ef4444", soft: "rgba(239,68,68,.16)" },
  tawuran: { label: "Tawuran", color: "#f43f5e", soft: "rgba(244,63,94,.14)" },
  pelecehan: { label: "Pelecehan", color: "#d946ef", soft: "rgba(217,70,239,.14)" },
  kebakaran: { label: "Kebakaran", color: "#f97316", soft: "rgba(249,115,22,.16)" },
  kecelakaan: { label: "Kecelakaan", color: "#eab308", soft: "rgba(234,179,8,.14)" },
  banjir: { label: "Banjir", color: "#38bdf8", soft: "rgba(56,189,248,.14)" },
  mencurigakan: { label: "Mencurigakan", color: "#a78bfa", soft: "rgba(167,139,250,.14)" },
  lainnya: { label: "Lainnya", color: "#94a3b8", soft: "rgba(148,163,184,.14)" },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as IncidentCategory[];

export const SOURCES: Record<IncidentSource, { label: string }> = {
  warga: { label: "Laporan Warga" },
  berita: { label: "Media Berita" },
  otoritas: { label: "Otoritas" },
  komunitas: { label: "Komunitas" },
};

export const SEVERITY_LABELS = ["", "Rendah", "Ringan", "Sedang", "Tinggi", "Kritis"];

export type DangerLevel = "AMAN" | "WASPADA" | "SIAGA" | "BAHAYA";

export const DANGER_LEVELS: Record<
  DangerLevel,
  { color: string; desc: string; min: number }
> = {
  AMAN: { color: "#34d399", desc: "Area relatif aman. Tetap waspada seperti biasa.", min: 0 },
  WASPADA: { color: "#fbbf24", desc: "Ada aktivitas tercatat. Tingkatkan kewaspadaan.", min: 21 },
  SIAGA: { color: "#fb923c", desc: "Risiko meningkat. Hindari tempat sepi & gelap.", min: 46 },
  BAHAYA: { color: "#f43f5e", desc: "Risiko tinggi! Pertimbangkan rute lain.", min: 71 },
};

export const DEFAULT_CENTER = { lat: -6.175392, lng: 106.827153 }; // Monas, Jakarta

export const EMERGENCY_NUMBERS = [
  { number: "112", label: "Darurat Nasional", note: "Semua keadaan darurat" },
  { number: "110", label: "Polisi", note: "Kejahatan & gangguan kamtibmas" },
  { number: "113", label: "Pemadam Kebakaran", note: "Kebakaran & penyelamatan" },
  { number: "119", label: "Ambulans / PSC", note: "Medis & kecelakaan" },
  { number: "115", label: "Basarnas / SAR", note: "Pencarian & pertolongan" },
];
