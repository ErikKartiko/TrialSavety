import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Kejadian / laporan kerawanan (warga, berita, otoritas, komunitas)
 */
export const incidents = pgTable(
  "incidents",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull().default("lainnya"),
    severity: integer("severity").notNull().default(2), // 1 (ringan) - 5 (kritis)
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    areaName: text("area_name"),
    source: text("source").notNull().default("warga"), // warga | berita | otoritas | komunitas
    sourceDetail: text("source_detail"),
    reporterName: text("reporter_name"),
    verifications: integer("verifications").notNull().default(0),
    status: text("status").notNull().default("aktif"), // aktif | dipantau | selesai
    occurredAt: timestamp("occurred_at", { mode: "string" }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("incidents_occurred_idx").on(t.occurredAt),
    index("incidents_category_idx").on(t.category),
  ],
);

/**
 * Kontak darurat / kerabat per perangkat
 */
export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    deviceId: text("device_id").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    relation: text("relation"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [index("contacts_device_idx").on(t.deviceId)],
);

/**
 * Peristiwa sinyal darurat (SOS) yang bisa dilacak kerabat via token
 */
export const sosEvents = pgTable(
  "sos_events",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull().unique(),
    deviceId: text("device_id"),
    message: text("message"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    status: text("status").notNull().default("aktif"), // aktif | selesai
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { mode: "string" }),
  },
  (t) => [index("sos_token_idx").on(t.token)],
);

/**
 * Breadcrumb lokasi berkala saat SOS aktif
 */
export const sosPings = pgTable(
  "sos_pings",
  {
    id: serial("id").primaryKey(),
    sosId: integer("sos_id")
      .notNull()
      .references(() => sosEvents.id, { onDelete: "cascade" }),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    battery: integer("battery"),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [index("sos_pings_sos_idx").on(t.sosId)],
);

export type IncidentRow = typeof incidents.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type SosEventRow = typeof sosEvents.$inferSelect;
export type SosPingRow = typeof sosPings.$inferSelect;
