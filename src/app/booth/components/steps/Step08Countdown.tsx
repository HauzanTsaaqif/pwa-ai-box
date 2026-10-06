"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { BoothController } from "../../hooks/useBooth";

/** Step 8 — Hitung mundur & jepret */
export default function Step08Countdown({ booth }: { booth: BoothController }) {
  const {
    step, photoCountdown, isCompositingPreview,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 8: COUNTDOWN 5 DETIK & CAPTURE =============================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "countdown" && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none select-none"
          >
            {isCompositingPreview ? (
              <div className="flex flex-col items-center gap-4 bg-[#10111c]/90 px-8 py-6 rounded-2xl border border-[#292b3b] backdrop-blur-md shadow-2xl">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 border-3 border-[#f0a25c] border-t-transparent rounded-full"
                />
                <span className="text-white font-medium text-sm">Menyusun Foto ke Bingkai...</span>
              </div>
            ) : (
              <motion.div
                key={photoCountdown}
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-8xl sm:text-[11rem] font-black text-white font-mono-tech drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]"
              >
                {photoCountdown > 0 ? photoCountdown : "SMILE!"}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
