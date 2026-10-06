"use client";

import { motion } from "framer-motion";
import { CircleNotch, HandPalm, Microphone, Stop } from "@phosphor-icons/react";
import type { VoicePhase } from "../../hooks/useBoothVoiceEmail";

interface VoiceRecordingOverlayProps {
  phase: Extract<VoicePhase, "recording" | "processing">;
  audioLevel: number;      // 0..1
  soundDetected: boolean;
  liveTranscript: string;
  manual: boolean;         // dimulai lewat tombol (bukan kepalan) → tampilkan tombol selesai
  onStop: () => void;
}

const BAR_COUNT = 23;

/** Layar menghitam + mic beranimasi yang bereaksi terhadap suara (muncul saat tangan mengepal). */
export default function VoiceRecordingOverlay({
  phase, audioLevel, soundDetected, liveTranscript, manual, onStop,
}: VoiceRecordingOverlayProps) {
  const isRecording = phase === "recording";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center px-6 text-center"
    >
      {/* Mic + cincin yang membesar mengikuti volume suara */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className={`absolute inset-0 rounded-full border ${soundDetected ? "border-emerald-400/60" : "border-[#246cff]/50"}`}
            animate={
              isRecording
                ? { scale: 0.55 + i * 0.16 + audioLevel * (0.5 + i * 0.25), opacity: soundDetected ? 0.75 - i * 0.2 : 0.45 - i * 0.12 }
                : { scale: 0.6, opacity: 0.2 }
            }
            transition={{ type: "spring", stiffness: 180, damping: 16 }}
          />
        ))}
        {isRecording && !soundDetected && (
          <motion.span
            className="absolute inset-6 rounded-full bg-[#246cff]/15"
            animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.15, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: isRecording ? 1 + audioLevel * 0.12 : 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className={`relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl border ${soundDetected
            ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-emerald-500/30"
            : "bg-[#246cff]/20 border-[#246cff]/50 text-[#7aa7ff] shadow-[#246cff]/30"
            }`}
        >
          {isRecording ? (
            <Microphone weight="fill" className="w-12 h-12" />
          ) : (
            <CircleNotch weight="bold" className="w-12 h-12 animate-spin" />
          )}
        </motion.div>
      </div>

      {/* Gelombang suara */}
      <div className="h-16 flex items-center justify-center gap-1.5 mt-6" aria-hidden="true">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const shape = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.85));
          const centerBoost = 1 - Math.abs(i - (BAR_COUNT - 1) / 2) / BAR_COUNT;
          const height = isRecording ? 6 + shape * centerBoost * audioLevel * 58 : 6;
          return (
            <motion.span
              key={i}
              className={`w-1.5 rounded-full ${soundDetected ? "bg-emerald-400" : "bg-[#246cff]/70"}`}
              animate={{ height }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            />
          );
        })}
      </div>

      {/* Status */}
      {isRecording ? (
        <>
          <h3 className="text-2xl font-bold text-white mt-4">Mendengarkan…</h3>
          <p className="text-sm text-[#9b9eaf] mt-1">Ucapkan email Anda, contoh: &ldquo;budi123 at gmail dot com&rdquo;</p>
          <div
            className={`mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono-tech border transition-colors ${soundDetected
              ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300"
              : "bg-[#171927] border-[#292b3b] text-[#9b9eaf]"
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${soundDetected ? "bg-emerald-400 animate-ping" : "bg-[#454964]"}`} />
            {soundDetected ? "Suara terdeteksi" : "Menunggu suara"}
          </div>
          <p className="min-h-6 mt-4 max-w-md text-sm text-white/90 font-mono-tech break-words">{liveTranscript}</p>

          {manual ? (
            <button
              type="button"
              data-dwell-id="btn-voice-stop"
              onClick={onStop}
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
            >
              <Stop weight="fill" className="w-4 h-4" />
              Selesai
            </button>
          ) : (
            <div className="mt-6 inline-flex items-center gap-2 text-xs text-[#9b9eaf]">
              <HandPalm weight="fill" className="w-4 h-4" />
              Buka kepalan tangan untuk selesai
            </div>
          )}
        </>
      ) : (
        <>
          <h3 className="text-2xl font-bold text-white mt-4">Mengonversi suara…</h3>
          <p className="text-sm text-[#9b9eaf] mt-1">Mengubah rekaman menjadi teks email</p>
        </>
      )}
    </motion.div>
  );
}
