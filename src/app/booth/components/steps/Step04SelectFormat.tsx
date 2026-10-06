"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Layers } from "lucide-react";
import { FORMATS } from "@/lib/frames";
import type { BoothController } from "../../hooks/useBooth";
import { Check as PhCheck } from "@phosphor-icons/react";

/** Step 4 — Pilih ukuran / format */
export default function Step04SelectFormat({ booth }: { booth: BoothController }) {
  const {
    lockedSelectionId, setStep, step, hoveredItemId, handleSelectFormat,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 4: PILIH UKURAN / FORMAT (80-90% OPACITY OVERLAY) ============ */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "select_format" && (
          <motion.div
            key="select_format"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute inset-0 z-30 bg-[#090a12]/80 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            {/* Top Navigation Bar with Back Button */}
            <div className="w-full max-w-4xl flex items-center justify-between pt-4 sm:pt-6 mb-2">
              <button
                data-dwell-id="btn-back-package"
                onClick={() => setStep("select_package")}
                className="px-4 py-2 rounded-xl bg-[#171927]/90 hover:bg-[#202336] text-[#ced0dc] hover:text-white border border-[#292b3b] text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#f0a25c]" />
                <span>Kembali</span>
              </button>

              <div className="text-center flex-1 pr-14 sm:pr-20">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Pilih Ukuran Format Foto
                </h2>
                <p className="text-[#9b9eaf] text-xs sm:text-sm mt-0.5">
                  Arahkan kursor telunjuk ke ukuran cetak pilihan
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full my-auto">
              {FORMATS.map((fmt) => {
                const isHovered = hoveredItemId === fmt.id;
                const isLocked = lockedSelectionId === fmt.id;

                return (
                  <motion.div
                    key={fmt.id}
                    data-dwell-id={fmt.id}
                    onClick={() => handleSelectFormat(fmt)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative rounded-3xl p-7 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border ${isLocked
                      ? "bg-[#10111c]/95 border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl backdrop-blur-md"
                      : isHovered
                        ? "bg-[#10111c]/95 border-[#246cff] ring-2 ring-[#246cff]/40 shadow-xl backdrop-blur-md"
                        : "bg-[#10111c]/85 border-[#292b3b] hover:border-[#3b3e5b] backdrop-blur-md"
                      }`}
                  >
                    {fmt.badge && (
                      <span className="absolute -top-3 right-5 px-3 py-1 bg-[#246cff] text-white font-bold text-xs tracking-wider uppercase rounded-lg shadow-md">
                        {fmt.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-black text-white">{fmt.name}</h3>
                        <div className="w-9 h-9 rounded-xl bg-[#171927] flex items-center justify-center border border-[#292b3b]">
                          <Layers className="w-5 h-5 text-[#246cff]" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-mono-tech text-xs text-[#f0a25c] font-bold">
                          Rasio {fmt.ratio}
                        </span>
                        <span className="text-[#9b9eaf] text-xs">•</span>
                        <span className="font-mono-tech text-xs text-[#9b9eaf]">
                          {fmt.dimensions}
                        </span>
                      </div>

                      <p className="text-sm text-[#ced0dc] leading-relaxed mb-6">
                        {fmt.description}
                      </p>
                    </div>

                    <div>
                      {isHovered && !isLocked && (
                        <div className="w-full bg-[#090a12] h-2 rounded-full overflow-hidden mb-2.5">
                          <div
                            className="dwell-bar bg-[#246cff] h-full transition-all duration-75"
                            style={{ width: "0%" }}
                          />
                        </div>
                      )}

                      <div
                        className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase text-center transition-all ${isLocked
                          ? "bg-emerald-500 text-white"
                          : isHovered
                            ? "bg-[#246cff] text-white"
                            : "bg-[#171927] text-white border border-[#292b3b]"
                          }`}
                      >
                        {isLocked
                          ? <span className="inline-flex items-center gap-1.5"><PhCheck weight="bold" className="w-4 h-4" /> Format Dipilih!</span>
                          : isHovered
                            ? <span className="dwell-label">Memilih...</span>
                            : "Pilih Format"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom spacer */}
            <div className="h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
