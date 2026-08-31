import { NextResponse } from "next/server";
import { gte } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { matchArea } from "@/lib/gazetteer";
import type { IncidentCategory } from "@/lib/sigap";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const QUERIES: { q: string; hint: IncidentCategory }[] = [
  { q: "begal OR perampasan OR rampok when:3d", hint: "perampokan" },
  { q: "tawuran when:3d", hint: "tawuran" },
  { q: "curanmor OR \"pencurian motor\" when:3d", hint: "curanmor" },
  { q: "pencurian OR copet OR pembobolan when:3d", hint: "pencurian" },
  { q: "kebakaran when:2d", hint: "kebakaran" },
  { q: "\"kecelakaan lalu lintas\" OR \"tabrak lari\" when:2d", hint: "kecelakaan" },
  { q: "banjir OR genangan when:2d", hint: "banjir" },
];

const KEYWORDS: [RegExp, IncidentCategory][] = [
  [/begal|rampok|rampas|samurai|senjata tajam|todong/i, "perampokan"],
  [/curanmor|pencurian motor|kunci t|raib.*motor/i, "curanmor"],
  [/pencuri|maling|copet|bobol|jambret/i, "pencurian"],
  [/tawuran|bentrok|bentrokan|amat massa/i, "tawuran"],
  [/cabul|leceh|lecehkan|rudapaksa|asusila/i, "pelecehan"],
  [/kebakaran|terbakar|dilalap api|hangus/i, "kebakaran"],
  [/kecelakaan|tabrak|laka lantas|laka /i, "kecelakaan"],
  [/banjir|genangan|luapan| terendam/i, "banjir"],
];

interface ParsedItem {
  title: string;
  link: string;
  source: string;
  pubDate: Date;
}

function parseRss(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  const clean = (s: string) =>
    s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim();
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = /<title>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? "";
    const link = /<link>([\s\S]*?)<\/link>/.exec(block)?.[1] ?? "";
    const pub = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1] ?? "";
    const source = /<source[^>]*>([\s\S]*?)<\/source>/.exec(block)?.[1] ?? "";
    const pubDate = new Date(clean(pub));
    const cleanedTitle = clean(title).replace(/ - [^-]{2,40}$/, "");
    if (cleanedTitle && !Number.isNaN(pubDate.getTime())) {
      items.push({ title: cleanedTitle, link: clean(link), source: clean(source), pubDate });
    }
  }
  return items;
}

function classify(title: string, hint: IncidentCategory): IncidentCategory | null {
  for (const [re, cat] of KEYWORDS) if (re.test(title)) return cat;
  const t = title.toLowerCase();
  if (/begal|rampok|tawuran|curanmor|maling|copet|kebakaran|banjir|kecelakaan|cabul/.test(t)) return hint;
  return null;
}

function severityOf(title: string): number {
  if (/tewas|meninggal|korban jiwa|ditembak/i.test(title)) return 5;
  if (/bacok|luka|sekarat|kritis|senjata api|besar/i.test(title)) return 4;
  return 3;
}

export async function GET() {
  const results = await Promise.allSettled(
    QUERIES.map(async ({ q }) => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
          "Accept-Language": "id-ID,id;q=0.9",
        },
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseRss(await res.text());
    }),
  );

  const all = results.flatMap((r, i) =>
    r.status === "fulfilled"
      ? r.value.slice(0, 8).map((item) => ({ ...item, hint: QUERIES[i].hint }))
      : [],
  );

  // Ambil judul berita yang sudah terekam agar tidak ganda
  const since = new Date(Date.now() - 72 * 36e5).toISOString();
  const existingRows = await db
    .select({ title: incidents.title })
    .from(incidents)
    .where(gte(incidents.occurredAt, since));
  const existing = new Set(existingRows.map((r) => r.title.toLowerCase().trim()));

  const seen = new Set<string>();
  const values: (typeof incidents.$inferInsert)[] = [];
  let unmatched = 0;

  for (const item of all) {
    if (Date.now() - item.pubDate.getTime() > 72 * 36e5) continue;
    const key = item.title.toLowerCase().trim();
    if (seen.has(key) || existing.has(key)) continue;
    seen.add(key);

    // Judul harus menyebut wilayah Indonesia agar tidak tercampur berita luar negeri
    if (!/indonesia|jakarta|bekasi|depok|bogor|tangerang|bandung|semarang|surabaya|medan|makassar|bali|palembang|jogja|yogyakarta/i.test(item.title)) {
      unmatched++;
      continue;
    }
    const area = matchArea(item.title);
    if (!area) {
      unmatched++;
      continue;
    }
    const category = classify(item.title, item.hint);
    if (!category) {
      unmatched++;
      continue;
    }

    values.push({
      title: item.title.slice(0, 160),
      description: item.link ? `Sumber: ${item.source || "Media online"}. Buka tautan berita di umpan aktivitas.` : null,
      category,
      severity: severityOf(item.title),
      lat: area.lat + (Math.random() - 0.5) * 0.01,
      lng: area.lng + (Math.random() - 0.5) * 0.01,
      areaName: area.name,
      source: "berita",
      sourceDetail: item.source.slice(0, 60) || "Google News",
      occurredAt: item.pubDate.toISOString(),
      status: "aktif",
    });

    if (values.length >= 14) break;
  }

  let inserted = 0;
  if (values.length > 0) {
    const rows = await db.insert(incidents).values(values).returning({ id: incidents.id });
    inserted = rows.length;
  }

  return NextResponse.json({
    feeds: QUERIES.length,
    parsed: all.length,
    unmatched,
    inserted,
    at: new Date().toISOString(),
  });
}
