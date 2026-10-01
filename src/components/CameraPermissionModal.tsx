"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, AlertCircle, CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";

interface CameraPermissionModalProps {
  status: "connecting" | "ready" | "error";
  errorMessage?: string;
  onRetry: () => void;
}

export default function CameraPermissionModal({
  status,
  errorMessage,
  onRetry,
}: CameraPermissionModalProps) {
  if (status === "ready") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#090a12]/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative max-w-md w-full bg-[#10111c] border border-[#292b3b] rounded-3xl p-7 sm:p-8 shadow-2xl text-center overflow-hidden"
        >
          {/* Ambient Studio Backlight Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-b from-[#246cff]/25 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Aperture / Lens Radar Ring Animation */}
          <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            {status === "connecting" && (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-[#246cff]/60"
                />
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-2 rounded-full bg-[#246cff]/15 blur-sm"
                />
                <div className="w-16 h-16 rounded-2xl bg-[#171927] border border-[#292b3b] flex items-center justify-center z-10 shadow-lg">
                  <Camera className="w-8 h-8 text-[#246cff] animate-pulse" />
                </div>
              </>
            )}

            {status === "error" && (
              <div className="w-20 h-20 rounded-full bg-rose-500/15 border-2 border-rose-500/40 flex items-center justify-center shadow-lg">
                <AlertCircle className="w-10 h-10 text-rose-400" />
              </div>
            )}
          </div>

          {/* Header & Copywriting */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#246cff]/10 border border-[#246cff]/30 text-[#246cff] font-mono-tech text-xs uppercase tracking-wider font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akses Kamera Studio AI Box</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              {status === "connecting"
                ? "Mempersiapkan Kamera & Sensor"
                : "Akses Kamera Dibutuhkan"}
            </h3>

            <p className="text-sm sm:text-base text-[#9b9eaf] leading-relaxed">
              {status === "connecting"
                ? "Menghubungkan sensor optik kamera dan deteksi gestur AI tangan. Jika browser meminta izin, silakan tekan 'Izinkan' (Allow)."
                : errorMessage ||
                  "Browser belum mengizinkan akses ke kamera. Silakan klik ikon kamera/gembok di sebelah URL browser dan pilih 'Izinkan' (Allow)."}
            </p>
          </div>

          {/* Action on Error */}
          {status === "error" && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRetry}
              className="w-full py-4 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-2xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(36,108,255,0.4)]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Hubungkan Ulang Kamera</span>
            </motion.button>
          )}

          {/* Optical Corner Accents */}
          <div className="camera-bracket-tl opacity-50" />
          <div className="camera-bracket-tr opacity-50" />
          <div className="camera-bracket-bl opacity-50" />
          <div className="camera-bracket-br opacity-50" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
