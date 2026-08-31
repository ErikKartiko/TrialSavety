"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SirenNodes {
  ctx: AudioContext;
  osc: OscillatorNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  gain: GainNode;
}

/** Sirene dua nada berbasis Web Audio API + getar (bila didukung) */
export function useAudioAlarm() {
  const nodesRef = useRef<SirenNodes | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Browser membatasi autoplay: buka kunci audio saat interaksi pertama
  useEffect(() => {
    const unlock = () => {
      if (!nodesRef.current) {
        try {
          const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (Ctx) nodesRef.current = { ctx: new Ctx() } as SirenNodes;
        } catch {
          /* abaikan */
        }
      }
      nodesRef.current?.ctx.resume().then(() => setUnlocked(true)).catch(() => undefined);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const start = useCallback(() => {
    const n = nodesRef.current;
    if (!n || n.osc) return;
    try {
      const { ctx } = n;
      void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.value = 620;
      lfo.type = "sine";
      lfo.frequency.value = 0.9; // naik-turun ±1 detik
      lfoGain.gain.value = 260;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      lfo.start();

      nodesRef.current = { ctx, osc, lfo, lfoGain, gain };
      setPlaying(true);
      if ("vibrate" in navigator) navigator.vibrate([300, 120, 300, 120, 600]);
      if (typeof document !== "undefined") document.title = "‼ BAHAYA DEKAT — SIGAP";
    } catch {
      /* perangkat tanpa audio tetap dapat alarm visual */
    }
  }, []);

  const stop = useCallback(() => {
    const n = nodesRef.current;
    if (n?.osc) {
      try {
        n.gain.gain.exponentialRampToValueAtTime(0.0001, n.ctx.currentTime + 0.25);
        setTimeout(() => {
          try {
            n.osc?.stop();
            n.lfo?.stop();
          } catch {
            /* abaikan */
          }
        }, 300);
      } catch {
        /* abaikan */
      }
      nodesRef.current = { ctx: n.ctx } as SirenNodes;
    }
    setPlaying(false);
    if (typeof document !== "undefined") document.title = "SIGAP — Peta Kewaspadaan Warga";
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { start, stop, playing, unlocked };
}
