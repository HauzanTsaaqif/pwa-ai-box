"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Camera } from "lucide-react";
import type { BoothController } from "../../hooks/useBooth";
import GestureIcon from "../GestureIcon";

/** Step 7 — Pose ready (standby, tunggu gesture Peace) */
export default function Step07PoseReady({ booth }: { booth: BoothController }) {
  const {
    selectedTheme, setStep, step, currentPoseIndex, totalPoses,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 7: POSE READY (STANDBY - WAITING FOR PEACE GESTURE / BUTTON) = */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* ===== STEP 7: POSE READY (CLEAN CAMERA VIEW - NON-OBSTRUCTIVE) ========== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "pose_ready" && (
          <motion.div
            key="pose_ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 pointer-events-none select-none"
          >
            {/* Top Indicator Pill */}
            <div className="mt-2 px-5 py-2 rounded-full bg-[#10111c]/80 backdrop-blur-md border border-[#292b3b] shadow-lg flex items-center gap-2.5 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-mono-tech text-xs sm:text-sm text-white font-bold tracking-wider uppercase">
                Foto {currentPoseIndex + 1} dari {totalPoses}
              </span>
              <span className="text-[#686b7f]">•</span>
              <span className="text-xs sm:text-sm text-[#f0a25c] font-medium">
                {selectedTheme?.name || "Bingkai Pilihan"}
              </span>
            </div>

            {/* Center Area is Kept 100% COMPLETELY CLEAR for Camera Subject */}
            <div className="flex-1" />

            {/* Bottom Elegant Floating Action Bar */}
            <div className="mb-20 sm:mb-24 flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#10111c]/85 backdrop-blur-md border border-[#292b3b] shadow-2xl pointer-events-auto">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#ced0dc]">
                <GestureIcon gesture="peace" className="w-5 h-5 text-[#246cff]" />
                <span>Pose <strong className="text-white">Peace</strong> untuk mulai</span>
              </div>

              <div className="w-px h-4 bg-[#292b3b]" />

              <button
                data-dwell-id="btn-start-countdown-manual"
                onClick={() => setStep("countdown")}
                className="px-4 py-1.5 bg-[#246cff] hover:bg-[#3d7eff] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Mulai</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
