"use client";

/** Identitas perangkat anonim (disimpan di localStorage) untuk kepemilikan kontak & SOS */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  const KEY = "sigap_device_id";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
