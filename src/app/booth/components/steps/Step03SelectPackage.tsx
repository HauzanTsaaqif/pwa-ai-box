"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Camera, ArrowLeft } from "lucide-react";
import { PACKAGES } from "../../constants";
import type { BoothController } from "../../hooks/useBooth";
import { Check as PhCheck } from "@phosphor-icons/react";

/** Step 3 — Pilih paket */
export default function Step03SelectPackage({ booth }: { booth: BoothController }) {
  const {
    lockedSelectionId, setStep, step, hoveredItemId, handleSelectPackage,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 3: PILIH PAKET (80-90% OPACITY OVERLAY) ====================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "select_package" && (
          <motion.div
            key="select_package"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute inset-0 z-30 bg-[#090a12]/80 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            {/* Top Navigation Bar with Back Button */}
            <div className="w-full max-w-5xl flex items-center justify-between pt-4 sm:pt-6 mb-2">
              <button
                data-dwell-id="btn-back-tutorial"
                onClick={() => setStep("gesture_tutorial")}
                className="px-4 py-2 rounded-xl bg-[#171927]/90 hover:bg-[#202336] text-[#ced0dc] hover:text-white border border-[#292b3b] text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#f0a25c]" />
                <span>Kembali</span>
              </button>

              <div className="text-center flex-1 pr-14 sm:pr-20">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Pilih Paket Foto Studio
                </h2>
                <p className="text-[#9b9eaf] text-xs sm:text-sm mt-0.5">
                  Arahkan kursor telunjuk ke paket pilihan
                </p>
              </div>
            </div>

            {/* 3 Package Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl w-full my-auto">
              {PACKAGES.map((pkg) => {
                const isHovered = hoveredItemId === pkg.id;
                const isLocked = lockedSelectionId === pkg.id;

                return (
                  <motion.div
                    key={pkg.id}
                    data-dwell-id={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative rounded-3xl p-6 sm:p-7 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border ${isLocked
                      ? "bg-[#10111c]/95 border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl backdrop-blur-md"
                      : isHovered
                        ? "bg-[#10111c]/95 border-[#f0a25c] ring-2 ring-[#f0a25c]/40 shadow-xl backdrop-blur-md"
                        : "bg-[#10111c]/85 border-[#292b3b] hover:border-[#3b3e5b] backdrop-blur-md"
                      }`}
                  >
                    {pkg.badge && (
                      <span className="absolute -top-3 right-5 px-3 py-1 bg-[#f0a25c] text-[#090a12] font-black text-xs tracking-wider uppercase rounded-lg shadow-md">
                        {pkg.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-black text-white">{pkg.name}</h3>
                        <div className="w-9 h-9 rounded-xl bg-[#171927] flex items-center justify-center border border-[#292b3b]">
                          <Camera className="w-5 h-5 text-[#f0a25c]" />
                        </div>
                      </div>

                      <div className="mb-4">
                        <span className="text-3xl sm:text-4xl font-black text-white block tracking-tight">
                          {pkg.price}
                        </span>
                        <span className="text-sm font-semibold text-[#f0a25c] block mt-1">
                          {pkg.poses} Pose Foto Studio
                        </span>
                      </div>

                      <ul className="space-y-2.5 border-t border-[#292b3b] pt-4 mb-5">
                        {pkg.features.map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-2.5 text-sm text-[#e0e2ed]">
                            <CheckCircle2 className="w-4 h-4 text-[#f0a25c] flex-shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
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
                        className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase text-center transition-all ${isLocked
                          ? "bg-emerald-500 text-white"
                          : isHovered
                            ? "bg-[#f0a25c] text-[#090a12]"
                            : "bg-[#171927] text-white border border-[#292b3b]"
                          }`}
                      >
                        {isLocked
                          ? <span className="inline-flex items-center gap-1.5"><PhCheck weight="bold" className="w-4 h-4" /> Paket Dipilih!</span>
                          : isHovered
                            ? <span className="dwell-label">Memilih...</span>
                            : "Pilih Paket"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom spacer (Back button is now at top for ergonomics) */}
            <div className="h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
