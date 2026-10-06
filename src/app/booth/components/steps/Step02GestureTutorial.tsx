"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Hand, CheckCircle2, ChevronRight, Target } from "lucide-react";
import type { BoothController } from "../../hooks/useBooth";
import GestureIcon from "../GestureIcon";
import { Check as PhCheck } from "@phosphor-icons/react";

/** Step 2 — Latihan gerakan tangan (warm-up) */
export default function Step02GestureTutorial({ booth }: { booth: BoothController }) {
  const {
    setStep, step, isHandDetected, targetCircleRef, tutorialProgress, tutorialCompleted,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 2: LATIHAN GERAK-GERAKKAN TANGAN (INTERACTIVE WARM-UP) ====== */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {step === "gesture_tutorial" && (
          <motion.div
            key="gesture_tutorial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 text-center transition-all duration-500 ${isHandDetected
              ? "bg-[#090a12]/50 backdrop-blur-none"
              : "bg-[#090a12]/85 backdrop-blur-md"
              }`}
          >
            {/* Top Bar with Skip Option */}
            <div className="w-full max-w-4xl flex items-center justify-between pt-6 sm:pt-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#246cff]/15 border border-[#246cff]/30 text-[#246cff] text-xs font-bold tracking-wider uppercase">
                <Hand className="w-4 h-4" />
                <span>Pemanasan Singkat</span>
              </div>

              <button
                data-dwell-id="btn-skip-tutorial"
                onClick={() => setStep("select_package")}
                className="px-5 py-2.5 rounded-xl bg-[#171927]/90 hover:bg-[#202336] text-[#f0a25c] hover:text-white border border-[#292b3b] font-mono-tech text-xs tracking-wider uppercase font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>Lewati</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Instructions (Vertically lowered for comfort) */}
            <div className="max-w-xl mt-5 sm:mt-8 text-center">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2">
                Arahkan Telunjuk
              </h2>
              <p className="text-[#ced0dc] text-sm sm:text-base leading-relaxed">
                Ujung jari telunjuk adalah kursor. Arahkan ke lingkaran di tengah layar.
              </p>
            </div>

            {/* Central Target Sensor Portal (Enlarged and shifted higher vertically) */}
            <div className="relative my-auto -translate-y-5 sm:-translate-y-0 flex flex-col items-center justify-center">
              <motion.div
                ref={targetCircleRef}
                animate={
                  tutorialCompleted
                    ? { scale: [1, 1.08, 1] }
                    : { scale: [1, 1.04, 1] }
                }
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`relative w-52 h-52 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${tutorialCompleted
                  ? "bg-emerald-500/20 border-emerald-400 shadow-[0_0_55px_rgba(52,211,153,0.6)]"
                  : tutorialProgress > 0
                    ? "bg-[#f0a25c]/15 border-[#f0a25c] shadow-[0_0_40px_rgba(240,162,92,0.45)]"
                    : "bg-[#10111c]/85 border-[#292b3b] shadow-2xl"
                  }`}
              >
                {/* Radial Progress Gauge (Scaled to 208px circle) */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 208 208">
                  <circle
                    cx="104"
                    cy="104"
                    r="94"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="104"
                    cy="104"
                    r="94"
                    stroke={tutorialCompleted ? "#34d399" : "#f0a25c"}
                    strokeWidth="6"
                    strokeDasharray="591"
                    strokeDashoffset={591 - (591 * tutorialProgress) / 100}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-100"
                  />
                </svg>

                {/* Inner Icon & Message */}
                <div className="flex flex-col items-center justify-center text-center p-3 select-none">
                  {tutorialCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-emerald-400 flex flex-col items-center justify-center"
                    >
                      <CheckCircle2 className="w-14 h-14 mb-2" />
                      <span className="font-black text-base text-white uppercase tracking-wider">
                        Sensor Siap!
                      </span>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <GestureIcon gesture="pointing" className="w-14 h-14 mb-2 animate-bounce" />
                      <span className="text-sm font-black text-white uppercase tracking-wider">
                        {tutorialProgress > 0 ? `${tutorialProgress}%` : "Arahkan Telunjuk"}
                      </span>
                      <span className="text-xs text-[#9b9eaf] mt-0.5">Ke Lingkaran Ini</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Requirement: User MUST pose Peace to proceed when completed (Separated with generous mt) */}
              {tutorialCompleted ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-7 flex flex-col items-center gap-2"
                >
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="px-7 py-3 rounded-2xl bg-[#246cff] text-[#fff] font-bold text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(36,108,255,0.7)] flex items-center gap-2 select-none border border-white/20"
                  >
                    <span className="inline-flex items-center gap-1.5"><GestureIcon gesture="peace" className="w-4 h-4" /> Pose Peace Untuk Lanjut</span>
                  </motion.div>
                </motion.div>
              ) : (
                <></>
              )}
            </div>

            {/* 3 Informational Steps at the Bottom (Enlarged and shifted higher up) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl sm:max-w-4xl mt-4 sm:mt-6 mb-16 sm:mb-24 pt-4 border-t border-white/10">
              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-all text-left flex items-center gap-4 ${isHandDetected
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10"
                  : "bg-[#10111c]/85 border-[#292b3b] text-[#9b9eaf]"
                  }`}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 ${isHandDetected ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40" : "bg-[#171927] text-[#9b9eaf]"
                    }`}
                >
                  1
                </div>
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-white">Angkat Tangan</div>
                  <div className="text-xs sm:text-sm text-[#9b9eaf] mt-0.5">
                    {isHandDetected ? <span className="inline-flex items-center gap-1.5"><PhCheck weight="bold" className="w-4 h-4" /> Terdeteksi</span> : "Hadapkan ke kamera"}
                  </div>
                </div>
              </div>

              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-all text-left flex items-center gap-4 ${tutorialProgress > 0
                  ? "bg-[#ff7b00]/15 border-[#ff7b00]/50 text-[#f0a25c] shadow-lg shadow-[#ff7b00]/10"
                  : "bg-[#10111c]/85 border-[#292b3b] text-[#9b9eaf]"
                  }`}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 ${tutorialProgress > 0 ? "bg-[#ff7b00] text-[#090a12] shadow-lg shadow-[#ff7b00]/40" : "bg-[#171927] text-[#9b9eaf]"
                    }`}
                >
                  2
                </div>
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-white">Telunjuk <GestureIcon gesture="pointing" className="inline w-4 h-4 -mt-1" /></div>
                  <div className="text-xs sm:text-sm text-[#9b9eaf] mt-0.5">
                    {tutorialProgress > 0 ? `${tutorialProgress}% Terkunci` : "Kursor layar"}
                  </div>
                </div>
              </div>

              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-all text-left flex items-center gap-4 ${tutorialCompleted
                  ? "bg-[#246cff]/20 border-[#246cff]/60 text-[#fff] shadow-lg shadow-[#246cff]/20"
                  : "bg-[#10111c]/85 border-[#292b3b] text-[#9b9eaf]"
                  }`}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 ${tutorialCompleted ? "bg-[#246cff] text-white shadow-lg shadow-[#246cff]/40" : "bg-[#171927] text-[#9b9eaf]"
                    }`}
                >
                  3
                </div>
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-white">Pose Peace <GestureIcon gesture="peace" className="inline w-4 h-4 -mt-1" /></div>
                  <div className="text-xs sm:text-sm text-[#9b9eaf] mt-0.5">
                    {tutorialCompleted ? "Tunjukkan sekarang!" : "Untuk konfirmasi"}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
