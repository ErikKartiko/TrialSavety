import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sosEvents, sosPings } from "@/db/schema";
import { toIso } from "@/lib/iso";

export const dynamic = "force-dynamic";

/** Aktifkan sinyal darurat -> menghasilkan tautan pelacakan untuk kerabat */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const deviceId = String(body.deviceId ?? "").slice(0, 80) || null;
  const message = String(body.message ?? "").trim().slice(0, 280) || null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
  }

  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 20);

  const [event] = await db
    .insert(sosEvents)
    .values({ token, deviceId, message, lat, lng })
    .returning();
  await db.insert(sosPings).values({ sosId: event.id, lat, lng });

  return NextResponse.json(
    {
      event: {
        ...event,
        deviceId: undefined,
        createdAt: toIso(event.createdAt),
        resolvedAt: toIso(event.resolvedAt),
      },
      token,
    },
    { status: 201 },
  );
}
