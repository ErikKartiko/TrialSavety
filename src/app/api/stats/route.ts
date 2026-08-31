import { NextResponse } from "next/server";
import { desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { CATEGORIES, type IncidentDto, type IncidentCategory } from "@/lib/sigap";
import { hotspots as computeHotspots } from "@/lib/geo";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = Date.now();
  const since = new Date(now - 7 * 24 * 36e5).toISOString();
  const rows = (await db
    .select()
    .from(incidents)
    .where(gte(incidents.occurredAt, since))
    .orderBy(desc(incidents.occurredAt))
    .limit(800)) as IncidentDto[];

  // per kategori
  const byCategory = (Object.keys(CATEGORIES) as IncidentCategory[])
    .map((key) => ({
      key,
      label: CATEGORIES[key].label,
      color: CATEGORIES[key].color,
      total: rows.filter((r) => r.category === key).length,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  // deret waktu 72 jam terakhir, bucket 6 jam
  const buckets: { t: string; label: string; total: number; kritikal: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = now - (i + 1) * 6 * 36e5;
    const end = start + 6 * 36e5;
    const inBucket = rows.filter((r) => {
      const t = new Date(r.occurredAt).getTime();
      return t > start && t <= end;
    });
    const d = new Date(end);
    buckets.push({
      t: d.toISOString(),
      label: d.toLocaleString("id-ID", { weekday: "short", hour: "2-digit" }),
      total: inBucket.length,
      kritikal: inBucket.filter((r) => r.severity >= 4).length,
    });
  }

  const verified = rows.filter((r) => r.verifications > 0).length;

  return NextResponse.json({
    total7d: rows.length,
    verified,
    byCategory,
    series: buckets,
    hotspots: computeHotspots(rows, now, 6),
    sources: {
      warga: rows.filter((r) => r.source === "warga").length,
      berita: rows.filter((r) => r.source === "berita").length,
      otoritas: rows.filter((r) => r.source === "otoritas").length,
      komunitas: rows.filter((r) => r.source === "komunitas").length,
    },
  });
}
