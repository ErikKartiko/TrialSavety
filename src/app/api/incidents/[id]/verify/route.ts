import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema";

export const dynamic = "force-dynamic";

/** Konfirmasi warga: "Saya juga melihat / ini benar" */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const [row] = await db
    .update(incidents)
    .set({ verifications: sql`least(${incidents.verifications} + 1, 999)` })
    .where(eq(incidents.id, numId))
    .returning({ verifications: incidents.verifications });

  if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ verifications: row.verifications });
}
