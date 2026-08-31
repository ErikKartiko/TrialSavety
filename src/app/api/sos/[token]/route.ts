import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sosEvents, sosPings } from "@/db/schema";
import { toIso } from "@/lib/iso";

export const dynamic = "force-dynamic";

/** Data pelacakan publik berdasarkan token (tanpa identitas perangkat) */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length > 40) {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
  }
  const [event] = await db.select().from(sosEvents).where(eq(sosEvents.token, token)).limit(1);
  if (!event) return NextResponse.json({ error: "Sinyal tidak ditemukan" }, { status: 404 });

  const pings = await db
    .select()
    .from(sosPings)
    .where(eq(sosPings.sosId, event.id))
    .orderBy(asc(sosPings.createdAt))
    .limit(800);

  return NextResponse.json({
    event: {
      id: event.id,
      token: event.token,
      message: event.message,
      lat: event.lat,
      lng: event.lng,
      status: event.status,
      createdAt: toIso(event.createdAt),
      resolvedAt: toIso(event.resolvedAt),
    },
    pings: pings.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      battery: p.battery,
      createdAt: toIso(p.createdAt),
    })),
    serverTime: new Date().toISOString(),
  });
}
