import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sosEvents } from "@/db/schema";
import { toIso } from "@/lib/iso";

export const dynamic = "force-dynamic";

/** Hentikan sinyal darurat (hanya pemilik perangkat) */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  let deviceId = "";
  try {
    const body = (await req.json()) as Record<string, unknown>;
    deviceId = String(body.deviceId ?? "");
  } catch {
    /* abaikan */
  }

  const [event] = await db.select().from(sosEvents).where(eq(sosEvents.token, token)).limit(1);
  if (!event) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (event.deviceId && event.deviceId !== deviceId) {
    return NextResponse.json({ error: "Bukan pemilik sinyal" }, { status: 403 });
  }

  const [updated] = await db
    .update(sosEvents)
    .set({ status: "selesai", resolvedAt: new Date().toISOString() })
    .where(eq(sosEvents.id, event.id))
    .returning();

  return NextResponse.json({ ok: true, resolvedAt: toIso(updated.resolvedAt) });
}
