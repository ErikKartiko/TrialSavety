/**
 * Kamus nama area -> koordinat untuk memetakan judul berita ke lokasi.
 * Mencakup wilayah Jabodetabek + kota-kota besar Indonesia.
 */

export interface GeoEntry {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
}

export const GAZETTEER: GeoEntry[] = [
  // Jakarta Pusat
  { name: "Monas – Gambir", aliases: ["monas", "gambir", "medan merdeka"], lat: -6.1754, lng: 106.8272 },
  { name: "Tanah Abang", aliases: ["tanah abang"], lat: -6.1866, lng: 106.8137 },
  { name: "Senen", aliases: ["senen", "pasar senen", "stasiun senen"], lat: -6.175, lng: 106.8419 },
  { name: "Kemayoran", aliases: ["kemayoran", "jiexpo"], lat: -6.1616, lng: 106.8458 },
  { name: "Menteng", aliases: ["menteng", "cikini"], lat: -6.193, lng: 106.8386 },
  { name: "Johar Baru", aliases: ["johar baru", "johar"], lat: -6.1813, lng: 106.8602 },
  { name: "Sawah Besar", aliases: ["sawah besar", "mangga dua"], lat: -6.1398, lng: 106.8292 },
  // Jakarta Utara
  { name: "Kota Tua – Tambora", aliases: ["kota tua", "tambora"], lat: -6.1352, lng: 106.8106 },
  { name: "Kelapa Gading", aliases: ["kelapa gading", "gading"], lat: -6.158, lng: 106.9055 },
  { name: "Cilincing", aliases: ["cilincing", "marunda"], lat: -6.1079, lng: 106.9427 },
  { name: "Pluit", aliases: ["pluit", "penjaringan", "muara angke"], lat: -6.1219, lng: 106.7917 },
  { name: "Sunter", aliases: ["sunter"], lat: -6.1442, lng: 106.8764 },
  { name: "Ancol – Pademangan", aliases: ["ancol", "pademangan"], lat: -6.1266, lng: 106.8384 },
  { name: "Tanjung Priok", aliases: ["tanjung priok", "priok"], lat: -6.1095, lng: 106.8835 },
  { name: "Koja", aliases: ["koja"], lat: -6.1183, lng: 106.9118 },
  // Jakarta Barat
  { name: "Grogol – Petamburan", aliases: ["grogol", "petamburan"], lat: -6.1665, lng: 106.7874 },
  { name: "Cengkareng", aliases: ["cengkareng", "duri kosambi"], lat: -6.1468, lng: 106.7262 },
  { name: "Kebon Jeruk", aliases: ["kebon jeruk"], lat: -6.1888, lng: 106.7704 },
  { name: "Kembangan", aliases: ["kembangan"], lat: -6.1916, lng: 106.7362 },
  { name: "Kalideres", aliases: ["kalideres"], lat: -6.1471, lng: 106.7071 },
  { name: "Palmerah", aliases: ["palmerah", "slipi"], lat: -6.1912, lng: 106.7967 },
  // Jakarta Selatan
  { name: "Blok M – Kebayoran Baru", aliases: ["blok m", "kebayoran baru"], lat: -6.244, lng: 106.7984 },
  { name: "Kemang – Mampang", aliases: ["kemang", "mampang prapatan"], lat: -6.2613, lng: 106.8108 },
  { name: "Kalibata – Pancoran", aliases: ["kalibata", "pancoran"], lat: -6.2576, lng: 106.8523 },
  { name: "Pasar Minggu", aliases: ["pasar minggu"], lat: -6.2849, lng: 106.8448 },
  { name: "Lebak Bulus – Cilandak", aliases: ["lebak bulus", "cilandak", "pondok indah"], lat: -6.2897, lng: 106.7769 },
  { name: "Jagakarsa", aliases: ["jagakarsa", "lenteng agung"], lat: -6.3336, lng: 106.8196 },
  { name: "Tebet", aliases: ["tebet"], lat: -6.2297, lng: 106.8523 },
  { name: "Kuningan – Setiabudi", aliases: ["kuningan", "setiabudi"], lat: -6.2277, lng: 106.8356 },
  { name: "Sudirman – Karet", aliases: ["sudirman", "karet", "bendungan hilir"], lat: -6.2089, lng: 106.8238 },
  // Jakarta Timur
  { name: "Manggarai", aliases: ["manggarai", "stasiun manggarai"], lat: -6.2099, lng: 106.8502 },
  { name: "Kampung Melayu", aliases: ["kampung melayu"], lat: -6.2244, lng: 106.8661 },
  { name: "Jatinegara", aliases: ["jatinegara"], lat: -6.2149, lng: 106.8707 },
  { name: "Matraman", aliases: ["matraman"], lat: -6.1822, lng: 106.8572 },
  { name: "Cawang – Kramat Jati", aliases: ["cawang", "kramat jati"], lat: -6.2428, lng: 106.8667 },
  { name: "Halim – Makasar", aliases: ["halim", "makasar"], lat: -6.2661, lng: 106.8889 },
  { name: "Pasar Rebo", aliases: ["pasar rebo", "cijantung"], lat: -6.3072, lng: 106.8578 },
  { name: "Cakung", aliases: ["cakung"], lat: -6.1824, lng: 106.9456 },
  { name: "Pulo Gadung", aliases: ["pulo gadung", "pulogadung"], lat: -6.1862, lng: 106.9021 },
  { name: "Duren Sawit", aliases: ["duren sawit", "klender"], lat: -6.2236, lng: 106.9092 },
  { name: "Ciracas", aliases: ["ciracas", "cibubur"], lat: -6.3262, lng: 106.8724 },
  // Bodetabek
  { name: "Depok – Margonda", aliases: ["depok", "margonda"], lat: -6.3717, lng: 106.8324 },
  { name: "Bekasi", aliases: ["bekasi"], lat: -6.2458, lng: 106.9884 },
  { name: "Bogor", aliases: ["bogor"], lat: -6.5971, lng: 106.806 },
  { name: "Tangerang", aliases: ["tangerang", "bintaro", "gading serpong", "bsd"], lat: -6.2561, lng: 106.6429 },
  // Kota besar lain
  { name: "Bandung", aliases: ["bandung"], lat: -6.9175, lng: 107.6191 },
  { name: "Semarang", aliases: ["semarang"], lat: -6.9667, lng: 110.4167 },
  { name: "Surabaya", aliases: ["surabaya"], lat: -7.2575, lng: 112.7521 },
  { name: "Yogyakarta", aliases: ["yogyakarta", "jogja"], lat: -7.7956, lng: 110.3695 },
  { name: "Medan", aliases: ["medan"], lat: 3.5952, lng: 98.6722 },
  { name: "Palembang", aliases: ["palembang"], lat: -2.9761, lng: 104.7754 },
  { name: "Makassar", aliases: ["makassar"], lat: -5.1477, lng: 119.4327 },
  { name: "Denpasar – Bali", aliases: ["denpasar", "bali", "kuta"], lat: -8.6705, lng: 115.2126 },
];

/** Cari area pertama yang cocok dengan sebuah teks (judul berita) */
export function matchArea(text: string): GeoEntry | null {
  const t = text.toLowerCase();
  for (const g of GAZETTEER) {
    if (g.aliases.some((a) => t.includes(a))) return g;
  }
  return null;
}
