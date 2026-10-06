"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { BoothController } from "../../hooks/useBooth";

/** Step 13 — QR download softcopy */
export default function Step13QrDownload({ booth }: { booth: BoothController }) {
  const {
    setStep, step, qrTimer, driveFolderUrl,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== STEP 13: QR DOWNLOAD ============================================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "qr_download" && (
          <motion.div
            key="qr_download"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="absolute inset-0 z-40 bg-[#090a12]/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c]/90 backdrop-blur-lg rounded-2xl p-7 max-w-sm w-full text-center border border-[#292b3b] shadow-2xl mb-8 sm:mb-12">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                <Download className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1">
                Scan Untuk Download
              </h3>
              <p className="text-xs text-[#9b9eaf] mb-4">
                Buka kamera HP Anda dan scan QR Code di bawah untuk menyimpan seluruh file foto HD
              </p>

              <div className="bg-white p-3.5 rounded-xl inline-block mb-3 shadow-inner">
                <QRCodeSVG
                  value={driveFolderUrl || "https://drive.google.com"}
                  size={160}
                  level="H"
                />
              </div>

              <p className="font-mono-tech text-[10px] text-[#9b9eaf] mb-4">
                File otomatis tersimpan di Google Drive Vault
              </p>

              <div className="flex items-center justify-center gap-2 font-mono-tech text-xs text-[#f0a25c] mb-4">
                <span>Auto-Reset Dalam {qrTimer}s</span>
              </div>

              <button
                onClick={() => setStep("thank_you")}
                className="w-full py-3.5 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#246cff]/25 whitespace-nowrap"
              >
                Selesai
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
