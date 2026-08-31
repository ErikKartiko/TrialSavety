import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sosEvents, sosPings } from "@/db/schema";

export const dynamic = "force-dynamic";

/** Kirim pembaruan lokasi berkala selama SOS aktif */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const deviceId = String(body.deviceId ?? "");
  const batteryRaw = Number(body.battery);
  const battery = Number.isFinite(batteryRaw) ? Math.min(100, Math.max(0, Math.round(batteryRaw))) : null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
  }

  const [event] = await db.select().from(sosEvents).where(eq(sosEvents.token, token)).limit(1);
  if (!event) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (event.deviceId && deviceId && event.deviceId !== deviceId) {
    return NextResponse.json({ error: "Bukan pemilik sinyal" }, { status: 403 });
  }
  if (event.status !== "aktif") {
    return NextResponse.json({ error: "Sinyal sudah berakhir", status: event.status }, { status: 409 });
  }

  // Catat ping bila bergerak > 15m atau sudah > 60 dtk sejak ping terakhir
  await db.insert(sosPings).values({ sosId: event.id, lat, lng, battery });
  await db.update(sosEvents).set({ lat, lng }).where(eq(sosEvents.id, event.id));

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
