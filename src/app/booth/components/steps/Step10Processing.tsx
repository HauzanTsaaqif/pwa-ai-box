"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Layers } from "lucide-react";
import type { BoothController } from "../../hooks/useBooth";

/** Step 10 — Processing (komposit 300 DPI) */
export default function Step10Processing({ booth }: { booth: BoothController }) {
  const {
    selectedTheme, step, processProgress,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 10: PROCESSING (300 DPI CANVAS COMPOSITING) ================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="absolute inset-0 z-40 bg-[#090a12]/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c]/90 backdrop-blur-lg rounded-2xl p-8 max-w-sm w-full text-center border border-[#292b3b] shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#f0a25c]/15 text-[#f0a25c] border border-[#f0a25c]/30 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-7 h-7 animate-pulse" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1">
                Merangkai Foto HD 300 DPI
              </h3>
              <p className="text-xs text-[#9b9eaf] mb-5">
                Menerapkan template {selectedTheme.name} & resolusi cetak studio...
              </p>

              <div className="w-full bg-[#090a12] h-2 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-[#f0a25c] h-full transition-all duration-300"
                  style={{ width: `${processProgress}%` }}
                />
              </div>

              <span className="font-mono-tech text-xs text-[#f0a25c] font-bold">
                {processProgress}% SELESAI
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
