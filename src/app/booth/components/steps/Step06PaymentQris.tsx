"use client";

import { motion, AnimatePresence } from "framer-motion";
import { QrCode, ArrowLeft, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { BoothController } from "../../hooks/useBooth";

/** Step 6 — Bayar QRIS */
export default function Step06PaymentQris({ booth }: { booth: BoothController }) {
  const {
    selectedPkg, selectedFormat, setStep, step, setCapturedPhotos, setCurrentPoseIndex,
    qrisTimer,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 6: BAYAR QRIS ================================================ */}
      <AnimatePresence>
        {step === "payment_qris" && selectedPkg && (
          <motion.div
            key="payment_qris"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="absolute inset-0 z-40 bg-[#090a12]/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-full max-w-md flex flex-col items-center justify-center mb-3">
              <button
                data-dwell-id="btn-back-theme"
                onClick={() => setStep("select_theme")}
                className="px-6 py-2 rounded-xl bg-[#171927]/90 hover:bg-[#202336] text-[#ced0dc] hover:text-white border border-[#292b3b] font-medium text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#f0a25c]" />
                <span>Kembali Pilih Bingkai</span>
              </button>
            </div>

            <div className="bg-[#10111c]/95 backdrop-blur-lg rounded-3xl p-7 sm:p-8 max-w-md w-full text-center border border-[#292b3b] shadow-2xl">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <QrCode className="w-6 h-6 text-[#f0a25c]" />
                <span className="text-white font-extrabold text-2xl tracking-tight">
                  Pembayaran QRIS
                </span>
              </div>

              <p className="font-mono-tech text-[#9b9eaf] text-xs tracking-wider uppercase mb-4">
                Scan via BCA, GoPay, OVO, Dana, ShopeePay
              </p>

              <div className="bg-white p-4 rounded-2xl inline-block mb-4 shadow-inner">
                <QRCodeSVG
                  value={`https://qris.id/pay/aibox?amt=${selectedPkg.rawPrice}&pkg=${selectedPkg.id}`}
                  size={160}
                  level="H"
                />
              </div>

              <div className="bg-[#090a12]/90 border border-[#292b3b] rounded-2xl py-3 px-4 mb-4">
                <span className="text-xs text-[#9b9eaf] block uppercase font-mono-tech">
                  {selectedPkg.name} • {selectedFormat.name}
                </span>
                <span className="text-white font-black text-3xl tracking-tight mt-0.5 block">
                  {selectedPkg.price}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 font-mono-tech text-[#ced0dc] text-sm mb-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-[#f0a25c] border-t-transparent rounded-full"
                />
                <span>Memverifikasi Pembayaran ({qrisTimer}s)...</span>
              </div>

              <button
                data-dwell-id="btn-simulate-qris"
                onClick={() => {
                  setCapturedPhotos([]);
                  setCurrentPoseIndex(0);
                  setStep("pose_ready");
                }}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-sm font-bold tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Simulasi Pembayaran Berhasil</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
