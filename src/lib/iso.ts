/** Normalisasi timestamp Postgres -> string ISO 8601 ber-zona UTC agar aman diparse semua browser */
export function toIso(v: string | Date | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  const s = v.includes("T") ? v : v.replace(" ", "T");
  const zoned = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s) ? s : `${s}Z`;
  const d = new Date(zoned);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
