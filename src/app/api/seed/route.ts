import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import type { IncidentCategory, IncidentSource } from "@/lib/sigap";

export const dynamic = "force-dynamic";

/* Generator acak deterministik agar data contoh konsisten */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ANCHORS: [string, number, number][] = [
  ["Monas – Gambir", -6.1754, 106.8272],
  ["Kota Tua", -6.1352, 106.8133],
  ["Mangga Besar", -6.1458, 106.8217],
  ["Pasar Senen", -6.175, 106.8419],
  ["Stasiun Manggarai", -6.2099, 106.8502],
  ["Tebet", -6.2297, 106.8523],
  ["Karet Sudirman", -6.2089, 106.8238],
  ["Tanah Abang", -6.1866, 106.8137],
  ["Kampung Melayu", -6.2244, 106.8661],
  ["Jatinegara", -6.2149, 106.8707],
  ["Matraman", -6.1822, 106.8572],
  ["Salemba", -6.1845, 106.8447],
  ["Kemayoran", -6.1616, 106.8458],
  ["Kelapa Gading", -6.158, 106.9055],
  ["Cilincing", -6.1079, 106.9427],
  ["Pluit", -6.1219, 106.7917],
  ["Grogol", -6.1665, 106.7874],
  ["Kebon Jeruk", -6.1888, 106.7704],
  ["Blok M", -6.244, 106.7984],
  ["Kemang", -6.2613, 106.8108],
  ["Kalibata", -6.2576, 106.8523],
  ["Pasar Minggu", -6.2849, 106.8448],
  ["Margonda Depok", -6.3717, 106.8324],
  ["Bekasi Timur", -6.2458, 106.9884],
  ["Cawang", -6.2428, 106.8667],
  ["Halim", -6.2661, 106.8889],
  ["Cengkareng", -6.1468, 106.7262],
  ["Tambora", -6.1456, 106.8106],
  ["Cikini", -6.193, 106.8386],
  ["Lebak Bulus", -6.2897, 106.7769],
  ["Pasar Rebo", -6.3072, 106.8578],
  ["Pulo Gadung", -6.1862, 106.9021],
];

const TEMPLATES: Record<
  IncidentCategory,
  { title: string; desc: string; min: number; max: number }[]
> = {
  pencurian: [
    { title: "Pencurian ponsel di angkutan umum", desc: "Pelaku memepet korban dari belakang lalu kabur ke arah gang sempit.", min: 2, max: 4 },
    { title: "Rumah kosong dibobol siang hari", desc: "Pagar dirusak, laptop dan perhiasan raib. Sudah dilaporkan ke RT dan polsek.", min: 3, max: 5 },
    { title: "Copet beraksi di keramaian pasar", desc: "Dompet korban hilang saat berdesak-desakan di los basah. Pelaku diduga berkelompok.", min: 2, max: 4 },
    { title: "Helm dan jaket di parkiran digasak", desc: "Terjadi saat warga salat magrib. Rekaman CCTV masih diperiksa pengelola.", min: 1, max: 3 },
  ],
  curanmor: [
    { title: "Motor matik hilang di parkiran", desc: "Pelaku diduga memakai kunci T, kejadian berlangsung kurang dari 15 menit.", min: 3, max: 4 },
    { title: "Percobaan curanmor terekam CCTV", desc: "Dua pelaku kabur setelah warga berteriak. Warga diminta menambah gembok ganda.", min: 2, max: 3 },
    { title: "Motor terparkir di teras rumah raib", desc: "Kunci cakram dirusak. Pelaku diperkirakan dua orang bermotor.", min: 3, max: 5 },
  ],
  perampokan: [
    { title: "Perampasan ponsel oleh pengendara", desc: "Pelaku merampas HP korban yang sedang berjalan lalu tancap gas ke arah jalan raya.", min: 3, max: 5 },
    { title: "Pengemudi ojol dipepet lalu dirampas", desc: "Uang dan ponsel diambil, korban mengalami luka ringan di lengan.", min: 4, max: 5 },
    { title: "Minimarket disatroni pelaku bersenjata tajam", desc: "Dua pelaku mengancam kasir dan membawa kabur uang laci. Polisi olah TKP.", min: 4, max: 5 },
  ],
  tawuran: [
    { title: "Tawuran antarkelompok remaja", desc: "Terlihat membawa senjata tajam. Warga diminta menghindar dan tidak merekam dari dekat.", min: 3, max: 5 },
    { title: "Bentrokan sempat memblokir jalan", desc: "Arus lalu lintas dialihkan sementara. Petugas sudah berjaga di dua titik.", min: 3, max: 4 },
  ],
  pelecehan: [
    { title: "Pelecehan verbal di halte malam hari", desc: "Pelaku mengikuti korban hingga perempatan. Penerangan halte padam, sudah dilaporkan.", min: 2, max: 4 },
    { title: "Penumpang dilecehkan di dalam angkot", desc: "Sopir mengusir pelaku setelah korban berteriak minta tolong.", min: 3, max: 4 },
  ],
  kebakaran: [
    { title: "Kebakaran rumah tinggal", desc: "Diduga korsleting listrik. Dua unit damkar sudah di lokasi.", min: 3, max: 5 },
    { title: "Kios pasar terbakar dini hari", desc: "Api berhasil dipadamkan setelah satu jam. Tidak ada korban jiwa.", min: 3, max: 4 },
  ],
  kecelakaan: [
    { title: "Tabrak lari, korban pengendara motor", desc: "Pelaku melaju kencang ke arah timur. Plat nomor terpantau CCTV toko.", min: 3, max: 4 },
    { title: "Kecelakaan beruntun di flyover", desc: "Lalu lintas tersendat parah, ambulans dalam perjalanan ke lokasi.", min: 2, max: 4 },
  ],
  banjir: [
    { title: "Genangan setinggi lutut di permukiman", desc: "Air mulai masuk rumah warga. Pompa air belum beroperasi maksimal.", min: 2, max: 4 },
    { title: "Underpass tergenang, kendaraan putar arah", desc: "Hindari jalur ini sampai air surut. Petugas sudah memasang penanda.", min: 2, max: 3 },
  ],
  mencurigakan: [
    { title: "Gerombolan mencurigakan di pos kosong", desc: "Beberapa orang nongkrong membawa botol dan potongan besi sejak malam.", min: 2, max: 3 },
    { title: "Orang tak dikenal memotret rumah warga", desc: "Dicurigai survei sebelum beraksi. Sudah dilaporkan ke satpam perumahan.", min: 1, max: 3 },
  ],
  lainnya: [
    { title: "Anjing liar berkelompok mengejar pejalan kaki", desc: "Sudah dua warga hampir tergigit. Dinas terkait sudah dihubungi.", min: 1, max: 2 },
    { title: "Kabel listrik menjuntai ke jalan", desc: "Berbahaya untuk pengendara motor saat hujan. Warga memasang tanda darurat.", min: 2, max: 3 },
  ],
};

const SOURCE_DETAILS: Record<IncidentSource, string[]> = {
  warga: ["Laporan Warga", "Pos Ronda RW 04", "Grup Warga RT 09", "Ketua RW 07"],
  berita: ["Detik News", "Kompas.com", "Tribun Jakarta", "Tempo.co"],
  otoritas: ["TMCPoldaMetro", "Polsek setempat", "BPBD DKI Jakarta"],
  komunitas: ["Komunitas Ojol Kalibata", "Forum RW se-Jaktim", "Relawan Banjir Jakarta"],
};

export async function POST() {
  const existing = await db.select({ id: incidents.id }).from(incidents).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ seeded: false, message: "Data sudah ada, seed dilewati." });
  }

  const rand = mulberry32(1337);
  const now = Date.now();
  const rows: (typeof incidents.$inferInsert)[] = [];
  const cats = Object.keys(TEMPLATES) as IncidentCategory[];

  // Tiga kejadian sangat baru di dekat pusat untuk demonstrasi alarm
  const recent: [IncidentCategory, number, number, string, number, number][] = [
    ["perampokan", 5, 0.28, "Perampasan ponsel di Jl. Medan Merdeka", -6.1721, 106.8216],
    ["tawuran", 4, 0.6, "Tawuran remaja sekitar Pasar Senen", -6.1766, 106.8441],
    ["mencurigakan", 3, 0.9, "Kelompok tak dikenal di kolong flyover Gambir", -6.1692, 106.8243],
  ];
  for (const [cat, sev, hAgo, title, lat, lng] of recent) {
    const tpl = TEMPLATES[cat][0];
    rows.push({
      title,
      description: tpl.desc,
      category: cat,
      severity: sev,
      lat,
      lng,
      areaName: "Jakarta Pusat",
      source: "warga",
      sourceDetail: "Laporan Warga",
      reporterName: "Anonim",
      verifications: Math.floor(rand() * 6),
      status: "aktif",
      occurredAt: new Date(now - hAgo * 36e5).toISOString(),
    });
  }

  for (let i = 0; i < 52; i++) {
    const anchor = ANCHORS[Math.floor(rand() * ANCHORS.length)];
    const cat = cats[Math.floor(rand() * cats.length)];
    const tpl = TEMPLATES[cat][Math.floor(rand() * TEMPLATES[cat].length)];
    const sev = tpl.min + Math.floor(rand() * (tpl.max - tpl.min + 1));
    const hAgo = 0.4 + Math.pow(rand(), 1.5) * 92;
    const srcRoll = rand();
    const source: IncidentSource =
      srcRoll < 0.5 ? "warga" : srcRoll < 0.75 ? "berita" : srcRoll < 0.88 ? "otoritas" : "komunitas";
    const details = SOURCE_DETAILS[source];
    const status = hAgo > 60 ? (rand() < 0.6 ? "selesai" : "dipantau") : rand() < 0.14 ? "dipantau" : "aktif";

    rows.push({
      title: tpl.title,
      description: tpl.desc,
      category: cat,
      severity: sev,
      lat: anchor[1] + (rand() - 0.5) * 0.016,
      lng: anchor[2] + (rand() - 0.5) * 0.016,
      areaName: anchor[0],
      source,
      sourceDetail: details[Math.floor(rand() * details.length)],
      reporterName: source === "warga" ? "Anonim" : null,
      verifications: source === "warga" ? Math.floor(rand() * rand() * 14) : Math.floor(rand() * 3),
      status,
      occurredAt: new Date(now - hAgo * 36e5).toISOString(),
    });
  }

  const inserted = await db.insert(incidents).values(rows).returning({ id: incidents.id });
  const [latest] = await db
    .select({ id: incidents.id })
    .from(incidents)
    .orderBy(desc(incidents.id))
    .limit(1);

  return NextResponse.json({ seeded: true, inserted: inserted.length, latestId: latest?.id });
}
