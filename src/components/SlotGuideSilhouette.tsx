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
  active,
}: SlotGuideSilhouetteProps) {
  if (!active || !slot) return null;

  const isCircle =
    slot.shape === "circle" ||
    Math.abs(slot.width - slot.height) <= 20;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={`slot-fullscreen-${poseNumber}-${isCircle ? "circle" : "rect"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >


          {/* If Circle Slot: Spacious circular guide without obscuring the camera */}
          {isCircle && (
            <motion.div
              animate={{ opacity: [0.35, 0.6, 0.35] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="w-[min(82vh,82vw)] h-[min(82vh,82vw)] rounded-full border-2 border-dashed border-[#f0a25c]/70 shadow-[0_0_30px_rgba(240,162,92,0.35)] pointer-events-none"
            />
          )}

          {/* Natural Human Head & Shoulder Silhouette Guidance (SVG) - Full screen scale */}
          <motion.div
            animate={{ opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <svg
              viewBox="0 0 240 280"
              className="w-[min(65vh,65vw)] h-[min(75vh,75vw)] text-[#f0a25c]/50 drop-shadow-[0_0_12px_rgba(240,162,92,0.5)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeDasharray="6 6"
            >
              {/* Head Guide Oval */}
              <ellipse cx="120" cy="85" rx="52" ry="64" />
              {/* Neck & Broad Natural Shoulders Arch */}
              <path d="M94 142 C92 165 80 182 32 212 C12 224 10 244 10 264 L230 264 C230 244 228 224 208 212 C160 182 148 165 146 142" />
              {/* Center Framing Crosshairs */}
              <line x1="120" y1="24" x2="120" y2="48" strokeDasharray="none" strokeWidth="2" />
              <line x1="120" y1="122" x2="120" y2="146" strokeDasharray="none" strokeWidth="2" />
              <line x1="58" y1="85" x2="82" y2="85" strokeDasharray="none" strokeWidth="2" />
              <line x1="158" y1="85" x2="182" y2="85" strokeDasharray="none" strokeWidth="2" />
            </svg>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
