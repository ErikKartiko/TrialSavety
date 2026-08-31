import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WMO: [number[], string][] = [
  [[0], "Cerah"],
  [[1, 2], "Berawan sebagian"],
  [[3], "Berawan"],
  [[45, 48], "Berkabut"],
  [[51, 53, 55, 56, 57], "Gerimis"],
  [[61, 63, 66, 80, 81], "Hujan ringan"],
  [[65, 67, 82], "HUJAN LEBAT"],
  [[71, 73, 75, 77, 85, 86], "Hujan es"],
  [[95, 96, 99], "BADAI PETIR"],
];

function labelFor(code: number) {
  for (const [codes, label] of WMO) if (codes.includes(code)) return label;
  return "Berawan";
}

/** Cuaca real-time tanpa API key — Open-Meteo. GET /api/cuaca?lat=..&lng=.. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=auto&forecast_days=1`,
      { signal: AbortSignal.timeout(7000) },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      current?: {
        temperature_2m: number;
        precipitation: number;
        weather_code: number;
        wind_speed_10m: number;
      };
    };
    const c = json.current;
    if (!c) throw new Error("kosong");
    const berat = c.precipitation >= 2 || [65, 67, 82, 95, 96, 99].includes(c.weather_code);
    return NextResponse.json({
      suhu: Math.round(c.temperature_2m),
      hujan: c.precipitation,
      angin: Math.round(c.wind_speed_10m),
      kode: c.weather_code,
      kondisi: labelFor(c.weather_code),
      berat,
      at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Layanan cuaca tidak terjangkau" }, { status: 502 });
  }
}
