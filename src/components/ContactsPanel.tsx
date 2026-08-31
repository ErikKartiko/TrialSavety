"use client";

import { useState } from "react";
import {
  UserPlus,
  Phone,
  MessageCircle,
  Trash2,
  Star,
  LoaderCircle,
  HeartHandshake,
  Siren,
} from "lucide-react";
import { EMERGENCY_NUMBERS, type ContactDto } from "@/lib/sigap";
import { waLink } from "@/lib/format";

interface ContactsPanelProps {
  contacts: ContactDto[];
  busy: boolean;
  onAdd: (c: { name: string; phone: string; relation: string; isPrimary: boolean }) => Promise<string | null>;
  onDelete: (id: number) => void;
}

export default function ContactsPanel({ contacts, busy, onAdd, onDelete }: ContactsPanelProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const err = await onAdd({ name, phone, relation, isPrimary: contacts.length === 0 });
    if (err) setError(err);
    else {
      setName("");
      setPhone("");
      setRelation("");
    }
  };

  return (
    <div className="sigap-scroll h-full space-y-4 overflow-y-auto pr-1">
      {/* Nomor darurat nasional */}
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-3">
        <p className="hud-label mb-2 flex items-center gap-1.5 !text-danger">
          <Siren size={12} /> Panggilan darurat nasional
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {EMERGENCY_NUMBERS.map((e) => (
            <a
              key={e.number}
              href={`tel:${e.number}`}
              className="group rounded-xl border border-line bg-black/40 px-3 py-2 transition hover:border-danger/60 hover:bg-danger/10"
            >
              <p className="font-mono text-lg font-bold leading-none text-white group-hover:text-danger">
                {e.number}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-slate-300">{e.label}</p>
              <p className="text-[9px] text-slate-500">{e.note}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Form tambah kerabat */}
      <div className="rounded-2xl border border-line bg-black/30 p-3">
        <p className="hud-label mb-2 flex items-center gap-1.5">
          <UserPlus size={12} /> Tambah kerabat / orang tepercaya
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Nama (cth: Ibu)"
            className="rounded-xl border border-line bg-black/40 px-3 py-2 text-[12px] text-white placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
            inputMode="tel"
            placeholder="No. HP (08xx)"
            className="rounded-xl border border-line bg-black/40 px-3 py-2 text-[12px] text-white placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none"
          />
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <input
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            maxLength={40}
            placeholder="Relasi (cth: Keluarga, Pasangan, Sahabat)"
            className="flex-1 rounded-xl border border-line bg-black/40 px-3 py-2 text-[12px] text-white placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={busy || name.trim().length < 2 || phone.trim().length < 6}
            className={`flex items-center gap-1.5 rounded-xl px-4 text-[11px] font-bold uppercase tracking-wider transition ${
              busy || name.trim().length < 2 || phone.trim().length < 6
                ? "cursor-not-allowed border border-line bg-black/30 text-slate-600"
                : "bg-gradient-to-r from-cyan-500 to-sky-500 text-[#04121c] hover:brightness-110"
            }`}
          >
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Simpan
          </button>
        </div>
        {error && <p className="mt-1.5 text-[11px] text-danger">{error}</p>}
      </div>

      {/* Daftar kerabat */}
      <div className="space-y-1.5">
        {contacts.length === 0 && (
          <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-line py-8 text-center">
            <HeartHandshake size={22} className="text-slate-600" />
            <p className="px-6 text-[12px] leading-relaxed text-slate-500">
              Belum ada kerabat. Tambahkan kontak agar sinyal SOS bisa dikirim sekali ketuk lewat WhatsApp.
            </p>
          </div>
        )}
        {contacts.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-black/30 px-3 py-2.5"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-cyan-400/20 to-cyan-400/5 font-mono text-[13px] font-bold text-cyan-300">
              {c.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-100">
                {c.name}
                {c.isPrimary && <Star size={11} className="fill-warn text-warn" />}
              </p>
              <p className="truncate font-mono text-[10px] text-slate-500">
                {c.phone} {c.relation ? `· ${c.relation}` : ""}
              </p>
            </div>
            <a
              href={`tel:${c.phone}`}
              className="grid size-8 place-items-center rounded-lg border border-line bg-black/40 text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-300"
              aria-label={`Telepon ${c.name}`}
            >
              <Phone size={13} />
            </a>
            <a
              href={waLink(c.phone, "Halo, saya membagikan kontak darurat SIGAP.")}
              target="_blank"
              rel="noreferrer"
              className="grid size-8 place-items-center rounded-lg border border-line bg-black/40 text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-300"
              aria-label={`WhatsApp ${c.name}`}
            >
              <MessageCircle size={13} />
            </a>
            <button
              onClick={() => onDelete(c.id)}
              className="grid size-8 place-items-center rounded-lg border border-line bg-black/40 text-slate-400 transition hover:border-danger/50 hover:text-danger"
              aria-label={`Hapus ${c.name}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
