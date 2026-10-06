"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import type { BoothController } from "../../hooks/useBooth";
import GestureIcon from "../GestureIcon";

/** Step 8B — Review foto per jepretan */
export default function Step08bPhotoReview({ booth }: { booth: BoothController }) {
  const {
    step, capturedPhotos, currentPoseIndex, totalPoses, handleRetakeCurrentPose, handleAcceptAndNextPose,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 8B: REVIEW FOTO PER JEPRETAN (CLEAN & ELEGANT) =============== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "photo_review_single" && (
          <motion.div
            key="photo_review_single"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-0 z-30 bg-[#090a12]/85 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-8 text-center"
          >
            {/* Top Ergonomic Navigation Bar */}
            <div className="w-full max-w-4xl flex items-center justify-between gap-3 pt-4 sm:pt-6">
              <button
                data-dwell-id="btn-retake-single-pose"
                onClick={handleRetakeCurrentPose}
                className="px-5 py-3 bg-[#171927]/90 hover:bg-rose-600/90 text-white rounded-2xl border border-[#292b3b] hover:border-rose-500 text-xs sm:text-sm font-semibold tracking-wide transition-all flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span className="inline-flex items-center gap-1.5">Foto Ulang <GestureIcon gesture="thumbs_down" className="w-4 h-4" /></span>
              </button>

              <div className="px-4 py-2 rounded-xl bg-[#10111c]/90 border border-[#292b3b] text-center hidden sm:block shadow-md">
                <span className="font-mono-tech text-xs text-[#ced0dc] uppercase font-bold tracking-wider">
                  Foto {currentPoseIndex + 1} dari {totalPoses}
                </span>
              </div>

              <button
                data-dwell-id="btn-accept-next-pose"
                onClick={handleAcceptAndNextPose}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-xs sm:text-sm font-semibold tracking-wide transition-all flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>
                  <span className="inline-flex items-center gap-1.5">{currentPoseIndex + 1 < totalPoses ? "Lanjut Foto" : "Selesai"} <GestureIcon gesture="thumbs_up" className="w-4 h-4" /></span>
                </span>
              </button>
            </div>

            {/* Center Snapshot Preview (100% Clean Image, No Obstructing Overlay Badge) */}
            <div className="my-auto flex flex-col items-center justify-center max-h-[64vh]">
              {capturedPhotos[currentPoseIndex] ? (
                <div className="relative rounded-3xl overflow-hidden border border-[#292b3b] shadow-2xl bg-[#10111c] max-h-[60vh] p-1.5 flex items-center justify-center">
                  <img
                    src={capturedPhotos[currentPoseIndex]}
                    alt={`Hasil Foto ${currentPoseIndex + 1}`}
                    className="max-h-[58vh] object-contain rounded-2xl"
                  />
                </div>
              ) : (
                <div className="p-8 text-[#9b9eaf] text-sm">Memuat pratinjau foto...</div>
              )}
            </div>

            {/* Subtle Bottom Spacer */}
            <div className="h-2" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
