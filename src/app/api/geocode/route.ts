import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Reverse geocoding tanpa API key — Nominatim (OpenStreetMap).
 * GET /api/geocode?lat=..&lng=..  ->  { label }
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&accept-language=id`,
      {
        headers: { "User-Agent": "SIGAP-SafetyMap/1.0 (community safety map)" },
        signal: AbortSignal.timeout(7000),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    const parts = [
      a.village ?? a.suburb ?? a.neighbourhood,
      a.town ?? a.city_district ?? a.city ?? a.county,
    ].filter(Boolean);
    const label = parts.length
      ? [...new Set(parts)].join(", ")
      : (data.display_name ?? "").split(",").slice(0, 2).join(",");
    return NextResponse.json({ label: label || null });
  } catch {
    return NextResponse.json({ label: null, error: "Geocoder tidak terjangkau" }, { status: 502 });
  }
}
