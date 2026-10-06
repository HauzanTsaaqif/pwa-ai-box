"use client";

import { motion } from "framer-motion";
import GestureIcon from "../GestureIcon";
import { VOICE_CONFIRM_MS, type ConfirmHold } from "../../hooks/useBoothVoiceEmail";

const RADIUS = 78;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const COPY = {
  thumbs_up: { title: "Kirim Email", hint: "Tahan jempol atas…", color: "#34d399", glow: "rgba(52,211,153,0.35)" },
  thumbs_down: { title: "Rekam Ulang", hint: "Tahan jempol bawah…", color: "#fb7185", glow: "rgba(251,113,133,0.35)" },
} as const;

/** Indikator besar saat jempol terdeteksi: ikon membesar + cincin progres 3 detik sebelum aksi dijalankan. */
export default function ThumbsConfirmIndicator({ hold }: { hold: ConfirmHold }) {
  const copy = COPY[hold.gesture];
  const secondsLeft = Math.max(1, Math.ceil((VOICE_CONFIRM_MS / 1000) * (1 - hold.progress)));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-[55] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none"
    >
      <motion.div
        key={hold.gesture}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 16 }}
        className="relative w-52 h-52 flex items-center justify-center"
        style={{ filter: `drop-shadow(0 0 28px ${copy.glow})` }}
      >
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 180 180" aria-hidden="true">
          <circle cx="90" cy="90" r={RADIUS} fill="rgba(16,17,28,0.9)" stroke="#292b3b" strokeWidth="8" />
          <circle
            cx="90"
            cy="90"
            r={RADIUS}
            fill="none"
            stroke={copy.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - hold.progress)}
          />
        </svg>
        <motion.div
          animate={{ y: hold.gesture === "thumbs_up" ? [0, -6, 0] : [0, 6, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          style={{ color: copy.color }}
        >
          <GestureIcon gesture={hold.gesture} className="w-24 h-24" />
        </motion.div>
        <span
          className="absolute -bottom-3 px-3 py-1 rounded-full text-sm font-bold font-mono-tech bg-[#10111c] border border-[#292b3b]"
          style={{ color: copy.color }}
        >
          {secondsLeft}
        </span>
      </motion.div>

      <h3 className="text-2xl font-bold text-white mt-8">{copy.title}</h3>
      <p className="text-sm text-[#9b9eaf] mt-1">{copy.hint}</p>
    </motion.div>
  );
}
