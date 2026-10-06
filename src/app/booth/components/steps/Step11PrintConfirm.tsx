"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Printer } from "lucide-react";
import type { BoothController } from "../../hooks/useBooth";

/** Step 11 — Konfirmasi cetak */
export default function Step11PrintConfirm({ booth }: { booth: BoothController }) {
  const {
    setStep, step, printCopies, setPrintCopies, isPrinting, photostripBase64Ref,
    handleStartDriveUpload, handleSimulatePrint,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 11: PRINT CONFIRMATION ======================================= */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "print_session" && (
          <motion.div
            key="print_session"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 bg-[#090a12]/80 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            <div className="mt-4">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Cetak Foto Fisik
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm mt-1">
                Siapkan cetakan fisik berkualitas laboratorium studio
              </p>
            </div>

            <div className="max-w-xs w-full my-auto p-3 bg-[#10111c]/90 backdrop-blur-md rounded-2xl border border-[#292b3b] shadow-2xl">
              {photostripBase64Ref.current && (
                <div className="relative rounded-xl overflow-hidden shadow-md max-h-72 flex justify-center">
                  <img
                    src={photostripBase64Ref.current}
                    alt="Assembled Strip"
                    className="max-h-72 object-contain"
                  />
                  {isPrinting && (
                    <motion.div
                      initial={{ top: "0%" }}
                      animate={{ top: "100%" }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute left-0 right-0 h-1 bg-[#f0a25c] shadow-[0_0_12px_#f0a25c]"
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#292b3b] text-xs">
                <span className="text-[#9b9eaf]">Jumlah Cetak:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrintCopies(Math.max(1, printCopies - 1))}
                    className="w-6 h-6 rounded bg-[#171927] border border-[#292b3b] text-white flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold text-white font-mono-tech">{printCopies}</span>
                  <button
                    onClick={() => setPrintCopies(printCopies + 1)}
                    className="w-6 h-6 rounded bg-[#171927] border border-[#292b3b] text-white flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-row items-center justify-center gap-4 w-full max-w-md mb-8 sm:mb-14 pb-2">
              <button
                disabled={isPrinting}
                onClick={handleSimulatePrint}
                className="flex-1 px-7 py-3.5 bg-[#f0a25c] hover:bg-[#ff7b00] text-[#090a12] rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg whitespace-nowrap"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>{isPrinting ? "Mencetak..." : "Cetak Foto"}</span>
              </button>

              <button
                onClick={() => {
                  handleStartDriveUpload();
                  setStep("upload_digital");
                }}
                className="flex-1 px-6 py-3.5 bg-[#171927] hover:bg-[#202336] text-white rounded-xl border border-[#292b3b] font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>Lewati Cetak</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
