import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const deviceId = req.headers.get("x-device-id")?.trim() ?? "";
  const { id } = await ctx.params;
  const numId = Number(id);
  if (!deviceId || !Number.isInteger(numId)) {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  const removed = await db
    .delete(contacts)
    .where(and(eq(contacts.id, numId), eq(contacts.deviceId, deviceId)))
    .returning({ id: contacts.id });
  if (!removed.length) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
