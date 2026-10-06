"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { BoothController } from "../../hooks/useBooth";
import GestureIcon from "../GestureIcon";

/** Step 1 — Selamat datang (solid, 5 detik) */
export default function Step01Welcome({ booth }: { booth: BoothController }) {
  const {
    setStep, step, welcomeCountdown,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 1: HALAMAN SELAMAT DATANG (SOLID BG, BERTAHAN 5 DETIK) ======= */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {step === "welcome_intro" && (
          <motion.div
            key="welcome_intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-50 bg-[#090a12] flex flex-col items-center justify-center p-6 sm:p-12 text-center select-none overflow-hidden"
          >
            {/* Ambient Depth Radial Gradient */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-gradient-to-b from-[#2e3247]/35 to-transparent rounded-full blur-[140px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center max-w-4xl px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <div className="inline-block px-5 py-2 rounded-full bg-[#f0a25c]/15 border border-[#f0a25c]/40 text-[#f0a25c] font-mono-tech text-sm sm:text-base font-bold uppercase tracking-widest mb-6">
                  AI BOX PHOTO STUDIO
                </div>

                <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] text-white mb-6 drop-shadow-[0_8px_35px_rgba(0,0,0,0.9)]">
                  CAPTURE YOUR MOMENTS!
                </h1>

                <p className="text-2xl sm:text-3xl text-white font-bold mb-3 tracking-tight">
                  Studio Bebas Sentuh
                </p>

                <p className="text-lg sm:text-xl text-[#ced0dc] max-w-xl mx-auto leading-relaxed mb-10">
                  Gerakkan telunjuk Anda <GestureIcon gesture="pointing" className="inline w-4 h-4 -mt-0.5" /> sebagai kursor layar.
                </p>
              </motion.div>

              {/* Progress & Start Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-3 px-7 py-4 rounded-2xl bg-[#10111c] border border-[#292b3b] shadow-2xl">
                  <div className="w-5 h-5 rounded-full border-3 border-[#f0a25c] border-t-transparent animate-spin" />
                  <span className="text-base font-mono-tech text-white font-bold">
                    Mulai Dalam <strong className="text-[#f0a25c] text-xl">{welcomeCountdown}s</strong>
                  </span>
                </div>

                <button
                  onClick={() => setStep("gesture_tutorial")}
                  className="px-9 py-4 bg-[#f0a25c] hover:bg-[#ff7b00] text-[#090a12] rounded-2xl font-bold text-base tracking-wider uppercase transition-all shadow-[0_6px_25px_rgba(240,162,92,0.4)]"
                >
                  Mulai Sekarang
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
