import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { toIso } from "@/lib/iso";

export const dynamic = "force-dynamic";

function serialize<T extends { createdAt: string }>(row: T): T {
  return { ...row, createdAt: toIso(row.createdAt) ?? row.createdAt };
}

function deviceIdOf(req: NextRequest) {
  return req.headers.get("x-device-id")?.trim().slice(0, 80) ?? "";
}

export async function GET(req: NextRequest) {
  const deviceId = deviceIdOf(req);
  if (!deviceId) return NextResponse.json({ contacts: [] });
  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.deviceId, deviceId))
    .orderBy(desc(contacts.isPrimary), asc(contacts.createdAt));
  return NextResponse.json({ contacts: rows.map(serialize) });
}

export async function POST(req: NextRequest) {
  const deviceId = deviceIdOf(req);
  if (!deviceId) {
    return NextResponse.json({ error: "Perangkat tidak dikenali" }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim().slice(0, 80);
  const phone = String(body.phone ?? "").trim().slice(0, 24);
  const relation = String(body.relation ?? "").trim().slice(0, 60) || null;
  const isPrimary = Boolean(body.isPrimary);

  if (name.length < 2) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  if (!/^[+\d][\d\s-]{5,22}$/.test(phone)) {
    return NextResponse.json({ error: "Nomor telepon tidak valid" }, { status: 400 });
  }

  const existing = await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.deviceId, deviceId));
  if (existing.length >= 8) {
    return NextResponse.json({ error: "Maksimal 8 kontak darurat" }, { status: 400 });
  }

  const [created] = await db
    .insert(contacts)
    .values({ deviceId, name, phone, relation, isPrimary: isPrimary || existing.length === 0 })
    .returning();
  return NextResponse.json({ contact: serialize(created) }, { status: 201 });
}
