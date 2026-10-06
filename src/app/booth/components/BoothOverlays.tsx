"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Hand, Camera, ChevronRight, ChevronLeft } from "lucide-react";
import { FRAMES } from "@/lib/frames";
import LiveFramePreview from "@/components/LiveFramePreview";
import CameraPermissionModal from "@/components/CameraPermissionModal";
import SlotGuideSilhouette from "@/components/SlotGuideSilhouette";
import type { BoothController } from "../hooks/useBooth";
import GestureIcon from "./GestureIcon";
/** Elemen sistem: tap admin, feed kamera, kanvas tangan, flash, vignette, modal izin, panduan siluet, preview frame, kursor & HUD gestur */
export default function BoothOverlays({ booth }: { booth: BoothController }) {
  const {
    videoRef, canvasRef, cameraReady, cameraStatus, cameraErrorMessage, selectedTheme,
    step, capturedPhotos, currentPoseIndex, isFramePreviewOpen, setIsFramePreviewOpen, lastDetectedGesture,
    isHandDetected, cursorRef, cursorCircleRef, cursorPercentRef, hoveredItemId, xenonFlash,
    initCamera, totalPoses, handleHiddenTap,
  } = booth;

  return (
    <>
      {/* Hidden 5-Tap Admin Trigger (Top-Right Corner) */}
      <div
        onClick={handleHiddenTap}
        className="absolute top-0 right-0 w-24 h-24 z-50 cursor-pointer opacity-0"
        title="Admin tap zone"
      />

      {/* ===== CAMERA BACKGROUND FEED (ALWAYS ACTIVE IN BACKGROUND) ===== */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-feed absolute inset-0 -scale-x-100 will-change-transform"
      />

      {/* Hand Skeleton Overlay Canvas (z-[35] to stay visible above z-30 review/step backdrops) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-[35] pointer-events-none"
      />

      {/* Xenon Studio Flash FX */}
      <AnimatePresence>
        {xenonFlash && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="absolute inset-0 bg-white z-[90] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Dark Studio Vignette Overlay */}
      <div className="absolute inset-0 camera-vignette pointer-events-none" />

      {/* Custom Animated Camera Pop-Out Permission & Status Modal */}
      <CameraPermissionModal
        status={cameraStatus}
        errorMessage={cameraErrorMessage}
        onRetry={initCamera}
      />

      {/* ===== DYNAMIC FRAME SLOT SILHOUETTE GUIDE (VIGNETTE CUTOUT) ===== */}
      <SlotGuideSilhouette
        slot={
          selectedTheme?.slots?.[
          selectedTheme?.slotMapping
            ? selectedTheme.slotMapping[currentPoseIndex] ?? currentPoseIndex
            : currentPoseIndex % (selectedTheme?.slots?.length || 1)
          ] || selectedTheme?.slots?.[0]
        }
        poseNumber={currentPoseIndex + 1}
        totalPoses={totalPoses}
        active={step === "pose_ready" || step === "countdown"}
      />

      {/* ===== LIVE FRAME PREVIEW DI POJOK KANAN (TOMBOL DI SEBELAH KIRI FRAME DENGAN CHEVRON) ===== */}
      {(step === "pose_ready" || step === "countdown" || step === "photo_review_single") && (
        <div className="fixed right-3 sm:right-4 top-1/2 -translate-y-1/2 z-40 flex flex-row items-center gap-2 pointer-events-auto scale-90 sm:scale-100 origin-right">
          {/* Toggle Button: Tepat di sebelah kiri preview frame, posisi terkunci (tidak melompat saat buka/tutup) */}
          <button
            type="button"
            data-dwell-id="btn-toggle-frame-preview"
            data-dwell-time="800"
            onClick={(e) => {
              e.stopPropagation();
              setIsFramePreviewOpen((prev) => !prev);
            }}
            className="px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-2xl bg-[#10111c]/60 hover:bg-[#1a1d2e] border border-[#292b3b] hover:border-[#f0a25c] text-white text-xs font-mono-tech flex items-center gap-1.5 shadow-xl transition-all cursor-pointer pointer-events-auto select-none backdrop-blur-md active:scale-95 shrink-0"
            title={isFramePreviewOpen ? "Tutup Preview" : "Buka Frame Preview"}
          >
            {isFramePreviewOpen ? (
              <>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#f0a25c]" />
                <span className="text-[11px] sm:text-xs text-[#ced0dc] font-semibold whitespace-nowrap">
                  Tutup
                </span>
              </>
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#f0a25c]" />
                <span className="text-[11px] sm:text-xs text-[#ced0dc] font-semibold whitespace-nowrap">
                  Preview
                </span>
              </>
            )}
          </button>

          {/* Frame Preview Container (Menahan posisi agar tombol di sebelah kiri tidak melompat) */}
          <div
            className={`transition-all duration-300 ease-out origin-right ${isFramePreviewOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
              }`}
          >
            <LiveFramePreview
              frame={selectedTheme || FRAMES[0]}
              capturedPhotos={capturedPhotos}
              currentPoseIndex={currentPoseIndex}
              totalPoses={totalPoses}
              onClose={() => setIsFramePreviewOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ===== RETICLE SENSOR CURSOR (DIRECTLY ATTACHED TO TELUNJUK) ===== */}
      {cameraReady && step !== "welcome_intro" && (
        <div
          ref={cursorRef}
          className="fixed top-0 left-0 pointer-events-none z-50 -ml-[35px] -mt-[35px] transition-opacity duration-150 opacity-0 will-change-transform"
          style={{ width: "70px", height: "70px" }}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {hoveredItemId && (
              <>
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 70 70">
                  <circle
                    cx="35"
                    cy="35"
                    r="28"
                    stroke="rgba(240, 162, 92, 0.2)"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    ref={cursorCircleRef}
                    cx="35"
                    cy="35"
                    r="28"
                    stroke="#f0a25c"
                    strokeWidth="3.5"
                    strokeDasharray="176"
                    strokeDashoffset={176}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-75"
                  />
                </svg>
                {/* Dwell percentage lock pill */}
                <div
                  ref={cursorPercentRef}
                  className="absolute -bottom-6 px-2 py-0.5 rounded-full bg-black/80 border border-[#292b3b] font-mono-tech text-[9px] font-bold text-[#f0a25c] tracking-wider pointer-events-none shadow"
                >
                  0%
                </div>
              </>
            )}

            {/* Clean minimal pointer dot (No heavy distracting glow) */}
            <div className="relative w-5 h-5 rounded-full border-2 border-[#f0a25c] bg-[#10111c] shadow-md flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>
        </div>
      )}

      {/* ===== REAL-TIME GESTURE FEEDBACK HUD (CLEAN & MINIMALIST) ===== */}
      {cameraReady && step !== "welcome_intro" && step !== "thank_you" && (
        <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-[45] pointer-events-none select-none">
          <div className="px-4 py-2 rounded-xl border border-[#292b3b] bg-[#10111c]/80 backdrop-blur-md shadow-xl flex items-center gap-2.5 transition-all duration-200">
            {/* Minimalist Status Dot */}
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${isHandDetected ? "bg-emerald-400" : "bg-[#454964]"
                }`}
            />

            <span className="font-mono-tech text-xs tracking-wide font-medium text-[#ced0dc]">
              {!isHandDetected ? (
                <span className="text-[#888b9c]">Angkat Tangan ke Kamera</span>
              ) : lastDetectedGesture === "peace" ? (
                <span className="text-white flex items-center gap-1.5">
                  <GestureIcon gesture="peace" className="w-4 h-4" />
                  <span>Pose Peace</span>
                </span>
              ) : lastDetectedGesture === "pointing" ? (
                <span className="text-white flex items-center gap-1.5">
                  <GestureIcon gesture="pointing" className="w-4 h-4" />
                  <span>Telunjuk (Kursor)</span>
                </span>
              ) : lastDetectedGesture === "thumbs_up" ? (
                <span className="text-white flex items-center gap-1.5">
                  <GestureIcon gesture="thumbs_up" className="w-4 h-4" />
                  <span>Jempol Atas (Lanjut)</span>
                </span>
              ) : lastDetectedGesture === "thumbs_down" ? (
                <span className="text-white flex items-center gap-1.5">
                  <GestureIcon gesture="thumbs_down" className="w-4 h-4" />
                  <span>Jempol Bawah (Ulang)</span>
                </span>
              ) : lastDetectedGesture === "wave" ? (
                <span className="text-white flex items-center gap-1.5">
                  <GestureIcon gesture="wave" className="w-4 h-4" />
                  <span>Lambaian Tangan</span>
                </span>
              ) : lastDetectedGesture === "open_palm" ? (
                <span className="text-white flex items-center gap-1.5">
                  <GestureIcon gesture="open_palm" className="w-4 h-4" />
                  <span>Telapak Terbuka</span>
                </span>
              ) : lastDetectedGesture === "fist" ? (
                <span className="text-white flex items-center gap-1.5">
                  <GestureIcon gesture="fist" className="w-4 h-4" />
                  <span>Kepalan Tangan</span>
                </span>
              ) : (
                <span className="text-white flex items-center gap-1.5">
                  <GestureIcon gesture="none" className="w-4 h-4" />
                  <span>Tangan Terdeteksi</span>
                </span>
              )}
            </span>
          </div>
        </div>
      )}

    </>
  );
}
