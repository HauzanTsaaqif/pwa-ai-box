"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Backspace, EnvelopeSimple, HandFist, Microphone } from "@phosphor-icons/react";
import GestureIcon from "../GestureIcon";
import VoiceRecordingOverlay from "../voice/VoiceRecordingOverlay";
import ThumbsConfirmIndicator from "../voice/ThumbsConfirmIndicator";
import type { BoothController } from "../../hooks/useBooth";

/**
 * Step 12 — Upload digital (email + Drive)
 * Input email manual / dwell, atau suara: kepal tangan → bicara → buka tangan → jempol atas/bawah (tahan 3 detik).
 * Logika alurnya ada di hooks/useBoothVoiceEmail.ts.
 */
export default function Step12UploadDigital({ booth }: { booth: BoothController }) {
  const {
    setStep, step, voiceStatus, setEmailInput, emailInput, handleSendEmail,
    voicePhase, audioLevel, soundDetected, liveTranscript, confirmHold, voiceManual,
    startVoiceRecording, stopVoiceRecording,
  } = booth;

  const isVoiceBusy = voicePhase === "recording" || voicePhase === "processing";
  const isReview = voicePhase === "review";

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 12: UPLOAD DIGITAL (EMAIL + DRIVE) =========================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "upload_digital" && (
          <motion.div
            key="upload_digital"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="absolute inset-0 z-40 bg-[#090a12]/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c]/90 backdrop-blur-lg rounded-2xl p-7 max-w-md w-full text-center border border-[#292b3b] shadow-2xl mb-8 sm:mb-12">
              <div className="w-12 h-12 rounded-xl bg-[#246cff]/15 text-[#246cff] border border-[#246cff]/30 flex items-center justify-center mx-auto mb-3">
                <EnvelopeSimple weight="fill" className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1">Kirim File HD ke Email Anda</h3>
              <p className="text-xs text-[#9b9eaf] mb-4">
                Ketik email Anda, atau gunakan suara dengan hand sign
              </p>

              {/* Petunjuk gestur */}
              {!isReview && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-[#171927] border border-[#292b3b] text-[#ced0dc] text-xs">
                  <HandFist weight="fill" className="w-4 h-4 text-[#246cff]" />
                  <span>Kepal tangan untuk bicara</span>
                </div>
              )}

              <div className="relative mb-3">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="contoh@gmail.com"
                  className={`w-full px-4 py-3 bg-[#090a12] border rounded-xl text-white placeholder:text-[#454964] focus:outline-none focus:border-[#246cff] text-sm pr-12 font-mono-tech transition-colors ${isReview ? "border-emerald-400/60" : "border-[#292b3b]"}`}
                />
                <button
                  type="button"
                  data-dwell-id="btn-voice-email"
                  onClick={startVoiceRecording}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors cursor-pointer bg-[#171927] text-[#9b9eaf] hover:text-white hover:bg-[#246cff]"
                  title="Input email dengan suara"
                >
                  <Microphone weight="fill" className="w-4 h-4" />
                </button>
              </div>

              {voiceStatus && !isVoiceBusy && (
                <p className="text-xs text-[#f0a25c] mb-3 font-mono-tech break-words">{voiceStatus}</p>
              )}

              {/* Konfirmasi hasil suara: jempol atas = kirim, jempol bawah = rekam ulang */}
              <AnimatePresence>
                {isReview && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: 10, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className={`rounded-xl border p-3 transition-colors ${confirmHold?.gesture === "thumbs_up" ? "bg-emerald-500/15 border-emerald-400/60" : "bg-[#171927] border-[#292b3b]"}`}>
                        <GestureIcon gesture="thumbs_up" className="w-8 h-8 mx-auto text-emerald-400" />
                        <div className="mt-1 text-xs font-bold text-white">Kirim Email</div>
                        <div className="text-[10px] text-[#9b9eaf]">Tahan jempol atas 3 detik</div>
                      </div>
                      <div className={`rounded-xl border p-3 transition-colors ${confirmHold?.gesture === "thumbs_down" ? "bg-rose-500/15 border-rose-400/60" : "bg-[#171927] border-[#292b3b]"}`}>
                        <GestureIcon gesture="thumbs_down" className="w-8 h-8 mx-auto text-rose-400" />
                        <div className="mt-1 text-xs font-bold text-white">Rekam Ulang</div>
                        <div className="text-[10px] text-[#9b9eaf]">Tahan jempol bawah 3 detik</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Domain Tap / Dwell Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
                {["@gmail.com", "@yahoo.com", "@outlook.com"].map((dom) => (
                  <button
                    key={dom}
                    type="button"
                    data-dwell-id={`domain-${dom}`}
                    onClick={() => {
                      setEmailInput((prev) => {
                        const base = prev.split("@")[0].trim();
                        return base ? `${base}${dom}` : dom;
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#171927] hover:bg-[#246cff] border border-[#292b3b] text-white text-[11px] font-mono-tech transition-colors cursor-pointer"
                  >
                    {dom}
                  </button>
                ))}
                <button
                  type="button"
                  data-dwell-id="btn-clear-email"
                  onClick={() => setEmailInput("")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#171927] hover:bg-rose-600/80 border border-[#292b3b] text-[#9b9eaf] hover:text-white text-[11px] font-mono-tech transition-colors cursor-pointer"
                >
                  <Backspace weight="bold" className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>

              <div className="flex flex-row gap-3">
                <button
                  onClick={() => setStep("qr_download")}
                  className="flex-1 py-3.5 bg-[#171927] hover:bg-[#202336] text-[#9b9eaf] hover:text-white rounded-xl text-xs font-semibold uppercase tracking-wider border border-[#292b3b] transition-all whitespace-nowrap"
                >
                  Lewati
                </button>

                <button
                  onClick={() => {
                    handleSendEmail(emailInput);
                    setStep("qr_download");
                  }}
                  className="flex-1 py-3.5 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#246cff]/25 whitespace-nowrap"
                >
                  Kirim Email
                </button>
              </div>
            </div>

            {/* Layar menghitam + mic beranimasi saat merekam */}
            <AnimatePresence>
              {isVoiceBusy && (
                <VoiceRecordingOverlay
                  key="voice-overlay"
                  phase={voicePhase as "recording" | "processing"}
                  audioLevel={audioLevel}
                  soundDetected={soundDetected}
                  liveTranscript={liveTranscript}
                  manual={voiceManual}
                  onStop={stopVoiceRecording}
                />
              )}
            </AnimatePresence>

            {/* Animasi jempol atas/bawah terdeteksi + hitung mundur 3 detik */}
            <AnimatePresence>
              {isReview && confirmHold && <ThumbsConfirmIndicator key="confirm" hold={confirmHold} />}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
