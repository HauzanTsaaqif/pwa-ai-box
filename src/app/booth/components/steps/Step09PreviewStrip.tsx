"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import type { BoothController } from "../../hooks/useBooth";
import GestureIcon from "../GestureIcon";

/** Step 9 — Preview lengkap photostrip */
export default function Step09PreviewStrip({ booth }: { booth: BoothController }) {
  const {
    step, capturedPhotos, selectedRetakePose, setSelectedRetakePose, selectedRetakePoseRef, previewStripUrl,
    photostripBase64Ref, totalPoses, handleRetakeSpecificPose, handleConfirmPreview, handleRetake,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 9: PREVIEW LENGKAP HASIL PHOTOSTRIP (CLEAN & MINIMAL) ======== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "preview_retake" && (
          <motion.div
            key="preview_retake"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-0 z-30 bg-[#090a12]/85 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-8 text-center"
          >
            {/* Top Action Bar */}
            <div className="w-full max-w-5xl flex items-center justify-between gap-3 pt-4 sm:pt-6">
              <button
                data-dwell-id="btn-retake-all-poses"
                onClick={handleRetake}
                className="px-5 py-2.5 bg-[#171927]/90 hover:bg-[#202336] text-white rounded-xl border border-[#292b3b] text-xs sm:text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 shrink-0"
              >
                <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Foto Ulang Semua</span>
              </button>

              <div className="px-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Pratinjau Hasil Cetak
                </h2>
              </div>

              <button
                data-dwell-id="btn-confirm-print"
                onClick={handleConfirmPreview}
                className="px-6 py-2.5 bg-[#246cff] hover:bg-[#3d7eff] text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg whitespace-nowrap shrink-0 active:scale-95"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span className="inline-flex items-center gap-1.5">Lanjut Cetak <GestureIcon gesture="thumbs_up" className="w-4 h-4" /></span>
              </button>
            </div>

            {/* Main Content Area: Side-by-Side Strip Preview (Left) and Vertical Photo Retake Selector (Right) */}
            <div className="my-auto flex flex-col md:flex-row items-center justify-center gap-6 lg:gap-10 w-full max-w-5xl px-4 py-2">
              {/* KIRI: Pratinjau Photostrip Lengkap (Frame + Foto) */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#292b3b] bg-[#10111c]/90 p-2 max-h-[58vh] flex items-center justify-center">
                  {previewStripUrl || photostripBase64Ref.current ? (
                    <img
                      src={previewStripUrl || photostripBase64Ref.current}
                      alt="Hasil Foto dan Frame"
                      className="max-h-[54vh] object-contain rounded-xl shadow-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-10">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-2 border-[#f0a25c] border-t-transparent rounded-full"
                      />
                      <span className="text-white text-xs">Menyusun strip foto...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* KANAN: Daftar Vertikal Foto untuk Dipilih & Diulang */}
              <div className="flex flex-col w-full max-w-md bg-[#10111c]/95 border border-[#292b3b] rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between pb-3 border-b border-[#292b3b] mb-3">
                  <div className="flex items-center gap-2 text-left">
                    <RotateCcw className="w-4 h-4 text-[#f0a25c]" />
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                      Pilih Foto untuk Diulang
                    </h3>
                  </div>
                  {selectedRetakePose !== null && (
                    <div className="px-2.5 py-0.5 rounded-full bg-[#f0a25c]/15 border border-[#f0a25c]/30 text-[#f0a25c] text-xs font-mono-tech font-bold shrink-0">
                      Foto #{selectedRetakePose + 1}
                    </div>
                  )}
                </div>

                {/* Vertical List of Photo Cards */}
                <div className="flex flex-col gap-2 max-h-[44vh] overflow-y-auto pr-1">
                  {Array.from({ length: totalPoses }).map((_, idx) => {
                    const photo = capturedPhotos[idx];
                    const isSelected = selectedRetakePose === idx;
                    return (
                      <div
                        key={idx}
                        data-retake-index={idx}
                        data-dwell-id={`card-retake-pose-${idx}`}
                        onClick={() => {
                          selectedRetakePoseRef.current = idx;
                          setSelectedRetakePose(idx);
                        }}
                        onMouseEnter={() => {
                          selectedRetakePoseRef.current = idx;
                          setSelectedRetakePose(idx);
                        }}
                        className={`group relative rounded-xl p-2 border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer select-none ${isSelected
                          ? "bg-[#1d2035] border-[#f0a25c] ring-1 ring-[#f0a25c]/40 shadow-md"
                          : "bg-[#151726]/70 border-[#292b3b] hover:border-[#3d4158] hover:bg-[#1a1d2e]"
                          }`}
                      >
                        {/* Thumbnail + Label */}
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-12 rounded-lg overflow-hidden bg-black/70 border border-[#292b3b] shrink-0">
                            {photo ? (
                              <img
                                src={photo}
                                alt={`Pose ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-[#6b6f8a]">
                                Kosong
                              </div>
                            )}
                            <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-black/85 font-mono-tech text-[9px] text-white font-bold">
                              #{idx + 1}
                            </div>
                          </div>

                          <div className="text-left">
                            <span className="text-xs sm:text-sm font-semibold text-white">
                              Foto #{idx + 1}
                            </span>
                          </div>
                        </div>

                        {/* Direct Retake Button */}
                        <button
                          type="button"
                          data-dwell-id={`btn-retake-pose-${idx}`}
                          data-retake-index={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetakeSpecificPose(idx);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${isSelected
                            ? "bg-rose-600 hover:bg-rose-500 text-white shadow"
                            : "bg-[#202336] hover:bg-rose-600/80 text-rose-300 hover:text-white"
                            }`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Ulang</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Streamlined Gesture Helper Pills */}
                <div className="mt-3 pt-3 border-t border-[#292b3b] flex items-center justify-around text-xs text-[#9b9eaf]">
                  <span className="flex items-center gap-1">
                    <GestureIcon gesture="thumbs_down" className="w-5 h-5" />
                    <span>Jempol Bawah: <strong className="text-rose-300">Ulang</strong></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <GestureIcon gesture="thumbs_up" className="w-5 h-5" />
                    <span>Jempol Atas: <strong className="text-emerald-300">Lanjut</strong></span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom spacer */}
            <div className="h-2" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
