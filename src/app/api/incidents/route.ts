import { NextRequest, NextResponse } from "next/server";
import { desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { CATEGORY_KEYS, type IncidentSource } from "@/lib/sigap";
import { toIso } from "@/lib/iso";

export const dynamic = "force-dynamic";

function serialize<T extends { occurredAt: string; createdAt: string }>(row: T): T {
  return {
    ...row,
    occurredAt: toIso(row.occurredAt) ?? row.occurredAt,
    createdAt: toIso(row.createdAt) ?? row.createdAt,
  };
}

const SOURCES: IncidentSource[] = ["warga", "berita", "otoritas", "komunitas"];

function sanitizeBody(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim();
  return v.length ? v.slice(0, 1000) : null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const hours = Math.min(Number(url.searchParams.get("jam") ?? 96) || 96, 24 * 14);
  const since = new Date(Date.now() - hours * 36e5);

  const rows = await db
    .select()
    .from(incidents)
    .where(gte(incidents.occurredAt, since.toISOString()))
    .orderBy(desc(incidents.occurredAt))
    .limit(600);

  return NextResponse.json({ incidents: rows.map(serialize), serverTime: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const title = sanitizeBody(body.title);
  const description = sanitizeBody(body.description);
  const category = String(body.category ?? "lainnya");
  const severity = Math.round(Number(body.severity));
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const areaName = sanitizeBody(body.areaName);
  const reporterName = sanitizeBody(body.reporterName);

  if (!title || title.length < 4) {
    return NextResponse.json({ error: "Judul minimal 4 karakter" }, { status: 400 });
  }
  if (!CATEGORY_KEYS.includes(category as never)) {
    return NextResponse.json({ error: "Kategori tidak dikenal" }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
  }
  if (!Number.isFinite(severity) || severity < 1 || severity > 5) {
    return NextResponse.json({ error: "Tingkat keparahan 1-5" }, { status: 400 });
  }

  const sourceRaw = String(body.source ?? "warga");
  const source = SOURCES.includes(sourceRaw as IncidentSource)
    ? (sourceRaw as IncidentSource)
    : "warga";

  const [created] = await db
    .insert(incidents)
    .values({
      title,
      description,
      category,
      severity,
      lat,
      lng,
      areaName,
      source,
      sourceDetail: sanitizeBody(body.sourceDetail) ?? "Laporan Warga",
      reporterName: reporterName ?? "Anonim",
      occurredAt: new Date().toISOString(),
    })
    .returning();

  return NextResponse.json({ incident: serialize(created) }, { status: 201 });
}
