"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, ChevronLeft } from "lucide-react";
import { FRAMES } from "@/lib/frames";
import type { BoothController } from "../../hooks/useBooth";
import { Check as PhCheck } from "@phosphor-icons/react";

/** Step 5 — Pilih tema / template */
export default function Step05SelectTheme({ booth }: { booth: BoothController }) {
  const {
    selectedFormat, themePage, setThemePage, lockedSelectionId, setStep, step,
    hoveredItemId, handleSelectTheme,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 5: PILIH TEMA / TEMPLATE (VISUAL MOCKUPS & CAROUSEL PAGINATION) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "select_theme" && (
          <motion.div
            key="select_theme"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute inset-0 z-30 bg-[#090a12]/80 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            {/* Top Navigation Bar with Back Button */}
            <div className="w-full max-w-5xl flex items-center justify-between pt-4 sm:pt-6 mb-2">
              <button
                data-dwell-id="btn-back-format"
                onClick={() => setStep("select_format")}
                className="px-4 py-2 rounded-xl bg-[#171927]/90 hover:bg-[#202336] text-[#ced0dc] hover:text-white border border-[#292b3b] text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#f0a25c]" />
                <span>Kembali</span>
              </button>

              <div className="text-center flex-1 pr-14 sm:pr-20">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Pilih Bingkai Foto
                </h2>
                <p className="text-[#9b9eaf] text-xs sm:text-sm mt-0.5">
                  Arahkan kursor telunjuk ke desain bingkai favorit Anda
                </p>
              </div>
            </div>

            {/* Template Cards Grid filtered by selectedFormat */}
            {(() => {
              const availableFrames = FRAMES.filter(
                (f) => !selectedFormat || f.formatId === selectedFormat.id
              );
              const maxPerPage = 3;
              const totalPages = Math.ceil(availableFrames.length / maxPerPage) || 1;
              const pagedFrames = availableFrames.slice(
                themePage * maxPerPage,
                themePage * maxPerPage + maxPerPage
              );

              return (
                <div className="relative w-full max-w-5xl my-auto flex items-center justify-between gap-3">
                  {/* Previous Page Button */}
                  {totalPages > 1 && (
                    <button
                      data-dwell-id="prev_theme"
                      onClick={() => setThemePage((prev) => Math.max(0, prev - 1))}
                      disabled={themePage === 0}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${themePage === 0
                        ? "opacity-30 cursor-not-allowed border-[#292b3b] text-[#9b9eaf]"
                        : "bg-[#10111c]/90 hover:bg-[#171927] border-[#292b3b] text-white shadow-xl hover:border-[#f0a25c]"
                        }`}
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  )}

                  {/* Displayed Themes for Current Format */}
                  <div
                    className={`grid gap-5 flex-1 ${pagedFrames.length === 2
                      ? "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto"
                      : "grid-cols-1 md:grid-cols-3"
                      }`}
                  >
                    {pagedFrames.map((thm) => {
                      const isHovered = hoveredItemId === thm.id;
                      const isLocked = lockedSelectionId === thm.id;

                      return (
                        <motion.div
                          key={thm.id}
                          data-dwell-id={thm.id}
                          onClick={() => handleSelectTheme(thm)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative rounded-3xl p-5 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border group ${isLocked
                            ? "bg-[#10111c]/95 border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl backdrop-blur-md"
                            : isHovered
                              ? "bg-[#10111c]/95 border-[#f0a25c] ring-2 ring-[#f0a25c]/40 shadow-xl backdrop-blur-md"
                              : "bg-[#10111c]/85 border-[#292b3b] hover:border-[#3b3e5b] backdrop-blur-md"
                            }`}
                        >
                          {thm.badge && (
                            <span className="absolute -top-3 right-5 px-3 py-1 bg-[#f0a25c] text-[#090a12] font-black text-xs tracking-wider uppercase rounded-lg shadow-md z-10">
                              {thm.badge}
                            </span>
                          )}

                          {/* REAL VISUAL FRAME PREVIEW THUMBNAIL */}
                          <div className="w-full h-48 rounded-2xl mb-3 bg-[#090a12]/95 border border-[#292b3b] overflow-hidden shadow-inner relative flex items-center justify-center p-2 group-hover:border-[#f0a25c]/50 transition-colors">
                            <img
                              src={thm.frameSrc}
                              alt={thm.name}
                              className="h-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                            />
                            <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-lg bg-[#090a12]/80 border border-[#292b3b] text-[11px] font-mono-tech text-[#f0a25c] backdrop-blur-sm font-bold">
                              {thm.slots.length} Foto
                            </span>
                          </div>

                          <div>
                            <h3 className="text-xl font-black text-white mb-1">{thm.name}</h3>
                            <p className="text-xs text-[#ced0dc] leading-relaxed mb-3">
                              {thm.description}
                            </p>
                          </div>

                          <div>
                            {isHovered && !isLocked && (
                              <div className="w-full bg-[#090a12] h-2 rounded-full overflow-hidden mb-2.5">
                                <div
                                  className="dwell-bar bg-[#f0a25c] h-full transition-all duration-75"
                                  style={{ width: "0%" }}
                                />
                              </div>
                            )}

                            <div
                              className={`w-full py-3 rounded-2xl font-bold text-xs tracking-wider uppercase text-center transition-all ${isLocked
                                ? "bg-emerald-500 text-white"
                                : isHovered
                                  ? "bg-[#f0a25c] text-[#090a12]"
                                  : "bg-[#171927] text-white border border-[#292b3b]"
                                }`}
                            >
                              {isLocked
                                ? <span className="inline-flex items-center gap-1.5"><PhCheck weight="bold" className="w-4 h-4" /> Bingkai Dipilih!</span>
                                : isHovered
                                  ? <span className="dwell-label">Memilih...</span>
                                  : "Pilih Bingkai"}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Next Page Button */}
                  {totalPages > 1 && (
                    <button
                      data-dwell-id="next_theme"
                      onClick={() => setThemePage((prev) => Math.min(totalPages - 1, prev + 1))}
                      disabled={themePage >= totalPages - 1}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${themePage >= totalPages - 1
                        ? "opacity-30 cursor-not-allowed border-[#292b3b] text-[#9b9eaf]"
                        : "bg-[#10111c]/90 hover:bg-[#171927] border-[#292b3b] text-white shadow-xl hover:border-[#f0a25c]"
                        }`}
                      title="Halaman Selanjutnya"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Bottom spacer */}
            <div className="h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
