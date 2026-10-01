"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FrameSlot } from "@/lib/frames";

interface SlotGuideSilhouetteProps {
  slot: FrameSlot | null | undefined;
  poseNumber: number;
  totalPoses: number;
  active: boolean;
}

export default function SlotGuideSilhouette({
  slot,
  poseNumber,
  totalPoses,
  active,
}: SlotGuideSilhouetteProps) {
  if (!active || !slot) return null;

  const isCircle =
    slot.shape === "circle" ||
    Math.abs(slot.width - slot.height) <= 20;

  const ratio = slot.width / slot.height;
  const isLandscape = ratio > 1.05;

  // Compute responsive target size for kiosk viewfinder (centered in live camera feed)
  // Max height around 400px to ensure chest/head is perfectly framed
  let boxWidth = 380;
  let boxHeight = 380;

  if (isCircle) {
    boxWidth = 370;
    boxHeight = 370;
  } else if (isLandscape) {
    boxHeight = 330;
    boxWidth = Math.min(580, Math.round(boxHeight * ratio));
  } else {
    // Portrait
    boxHeight = 420;
    boxWidth = Math.max(270, Math.round(boxHeight * ratio));
  }

  const shapeTitle = isCircle
    ? "BENTUK LINGKARAN ⭕"
    : isLandscape
    ? "KOTAK MELEBAR (LANDSCAPE) 🖼️"
    : "KOTAK TEGAK (PORTRAIT) 📱";

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={`slot-${poseNumber}-${isCircle ? "circle" : "rect"}-${ratio.toFixed(2)}`}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative flex flex-col items-center justify-center"
        >
          {/* Top Informative Guidance Pill */}
          <div className="absolute -top-12 z-30 px-4 py-1.5 rounded-full bg-[#10111c]/95 border border-[#f0a25c]/60 text-white font-mono-tech text-xs tracking-wider uppercase font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#f0a25c] animate-ping" />
            <span className="text-[#f0a25c]">Panduan Slot {poseNumber}/{totalPoses}:</span>
            <span>{shapeTitle}</span>
          </div>

          {/* Center Cutout Box with Full-Screen Dark Vignette Outside (box-shadow) */}
          <div
            style={{
              width: `${boxWidth}px`,
              height: `${boxHeight}px`,
              boxShadow: "0 0 0 9999px rgba(9, 10, 18, 0.62)",
            }}
            className={`relative flex items-center justify-center transition-all duration-300 ${
              isCircle
                ? "rounded-full border-2 border-[#f0a25c] shadow-[0_0_35px_rgba(240,162,92,0.45)]"
                : "rounded-3xl border-2 border-[#f0a25c]/85 shadow-[0_0_35px_rgba(240,162,92,0.35)]"
            }`}
          >
            {/* Viewfinder Corner Brackets for Rectangle */}
            {!isCircle && (
              <>
                <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-[#f0a25c] rounded-tl-lg" />
                <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-[#f0a25c] rounded-tr-lg" />
                <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-[#f0a25c] rounded-bl-lg" />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-[#f0a25c] rounded-br-lg" />
              </>
            )}

            {/* Translucent Human Head & Shoulder Silhouette Guidance (SVG) */}
            <motion.div
              animate={{ opacity: [0.28, 0.48, 0.28] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <svg
                viewBox="0 0 200 240"
                className="w-3/5 h-3/5 text-[#f0a25c]/50 drop-shadow-[0_0_8px_rgba(240,162,92,0.5)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeDasharray="4 4"
              >
                {/* Head Guide Oval */}
                <ellipse cx="100" cy="72" rx="42" ry="52" />
                {/* Neck & Shoulders Guide Arch */}
                <path d="M78 120 C76 138 68 152 28 178 C12 188 10 205 10 220 L190 220 C190 205 188 188 172 178 C132 152 124 138 122 120" />
                {/* Center Target Crosshairs */}
                <line x1="100" y1="20" x2="100" y2="40" strokeDasharray="none" strokeWidth="1.5" />
                <line x1="100" y1="104" x2="100" y2="124" strokeDasharray="none" strokeWidth="1.5" />
                <line x1="48" y1="72" x2="68" y2="72" strokeDasharray="none" strokeWidth="1.5" />
                <line x1="132" y1="72" x2="152" y2="72" strokeDasharray="none" strokeWidth="1.5" />
              </svg>
            </motion.div>
          </div>

          {/* Bottom Helpful Positioning Instruction Pill */}
          <div className="absolute -bottom-11 z-30 px-4 py-1.5 rounded-full bg-[#10111c]/95 border border-[#292b3b] text-[#ced0dc] font-mono-tech text-xs tracking-wide shadow-2xl flex items-center gap-2 backdrop-blur-md">
            <span>Posisikan tubuh & wajah di dalam siluet ini agar pas di bingkai</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
