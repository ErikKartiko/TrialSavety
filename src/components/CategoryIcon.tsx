import {
  Wallet,
  Bike,
  ShieldAlert,
  Swords,
  Hand,
  Flame,
  Car,
  Waves,
  Eye,
  CircleAlert,
  type LucideIcon,
} from "lucide-react";
import type { IncidentCategory } from "@/lib/sigap";

export const CATEGORY_ICONS: Record<IncidentCategory, LucideIcon> = {
  pencurian: Wallet,
  curanmor: Bike,
  perampokan: ShieldAlert,
  tawuran: Swords,
  pelecehan: Hand,
  kebakaran: Flame,
  kecelakaan: Car,
  banjir: Waves,
  mencurigakan: Eye,
  lainnya: CircleAlert,
};
