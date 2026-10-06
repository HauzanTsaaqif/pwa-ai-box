"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import type { BoothController } from "../../hooks/useBooth";

/** Step 14 — Terima kasih & reset otomatis */
export default function Step14ThankYou({ booth }: { booth: BoothController }) {
  const {
    step, thankYouTimer, handleResetToWelcome,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 14: THANK YOU / RESET ======================================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "thank_you" && (
          <motion.div
            key="thank_you"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-40 bg-[#090a12]/85 backdrop-blur-md flex items-center justify-center p-4 text-center"
          >
            <div className="bg-[#10111c]/90 backdrop-blur-lg rounded-2xl p-9 max-w-md w-full border border-[#292b3b] shadow-2xl">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-16 h-16 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4"
              >
                <Heart className="w-8 h-8 fill-rose-400" />
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Terima Kasih!
              </h2>
              <p className="text-sm text-[#9b9eaf] leading-relaxed mb-6">
                Terima kasih telah berfoto di AI Box Photobooth. Jangan lupa ambil hasil cetak Anda
                di slot mesin printer!
              </p>

              <button
                onClick={handleResetToWelcome}
                className="w-full py-3 bg-[#f0a25c] hover:bg-[#ff7b00] text-[#090a12] rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                Mulai Sesi Baru ({thankYouTimer}s)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
