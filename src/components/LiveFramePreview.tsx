"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FrameTemplate } from "@/lib/frames";
import { Sparkles, Camera, Check } from "lucide-react";

interface LiveFramePreviewProps {
  frame: FrameTemplate;
  capturedPhotos: string[];
  currentPoseIndex: number;
  totalPoses: number;
  className?: string;
}

export default function LiveFramePreview({
  frame,
  capturedPhotos,
  currentPoseIndex,
  totalPoses,
  className = "",
}: LiveFramePreviewProps) {
  const isStrip = frame.formatId === "strip_2x6";
  const aspectRatio = frame.width / frame.height; // e.g. 600/1800 = 0.333, or 1200/1800 = 0.666

  return (
    <div
      className={`flex flex-col items-center select-none ${className}`}
      style={{ pointerEvents: "none" }}
    >
      {/* Header Info Tag */}
      <div className="mb-2 px-3 py-1 rounded-xl bg-[#10111c]/90 border border-[#292b3b] shadow-xl backdrop-blur-md flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#f0a25c]" />
        <span className="font-mono-tech text-[11px] font-bold text-white tracking-wider uppercase">
          Posisi Frame (Alur Z)
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#246cff]/20 text-[#246cff] font-bold">
          {capturedPhotos.filter(Boolean).length}/{totalPoses}
        </span>
      </div>

      {/* Frame Scaled Container */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.85)] border-2 border-[#292b3b]/80 bg-[#10111c]"
        style={{
          width: isStrip ? "140px" : "200px",
          height: isStrip ? "420px" : "300px",
          maxHeight: "68vh",
          aspectRatio: `${frame.width} / ${frame.height}`,
        }}
      >
        {/* Background Color of Frame */}
        <div
          className="absolute inset-0 z-0"
          style={{ backgroundColor: frame.bgHex || "#ffffff" }}
        />

        {/* Individual Slots (Rendered with precise percentage coordinates) */}
        {frame.slots.map((slot, slotIdx) => {
          let photoIndex = slotIdx;
          if (frame.slotMapping && frame.slotMapping[slotIdx] !== undefined) {
            photoIndex = frame.slotMapping[slotIdx];
          }

          const hasPhoto = Boolean(capturedPhotos[photoIndex]);
          const isCurrentActive = photoIndex === currentPoseIndex && !hasPhoto;

          const leftPct = (slot.x / frame.width) * 100;
          const topPct = (slot.y / frame.height) * 100;
          const widthPct = (slot.width / frame.width) * 100;
          const heightPct = (slot.height / frame.height) * 100;

          return (
            <div
              key={slotIdx}
              className="absolute z-10 overflow-hidden flex items-center justify-center transition-all duration-300"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
              }}
            >
              {hasPhoto ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full relative"
                >
                  <img
                    src={capturedPhotos[photoIndex]}
                    alt={`Pose ${photoIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500/90 text-white flex items-center justify-center text-[9px] font-black shadow-md">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                </motion.div>
              ) : (
                <div
                  className={`w-full h-full flex flex-col items-center justify-center text-center p-1 transition-all ${
                    isCurrentActive
                      ? "bg-[#ff7b00]/25 border-2 border-[#ff7b00] shadow-[inset_0_0_12px_rgba(255,123,0,0.5)] animate-pulse"
                      : "bg-[#090a12]/70 border border-dashed border-[#454964]"
                  }`}
                >
                  <Camera
                    className={`w-4 h-4 mb-0.5 ${
                      isCurrentActive ? "text-[#ff7b00]" : "text-[#6b6f8a]"
                    }`}
                  />
                  <span
                    className={`font-mono-tech text-[10px] font-bold uppercase leading-none ${
                      isCurrentActive ? "text-white" : "text-[#878ba3]"
                    }`}
                  >
                    Foto {photoIndex + 1}
                  </span>
                  {isCurrentActive && (
                    <span className="text-[8px] text-[#ffb066] font-semibold mt-0.5">
                      • Menunggu •
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Frame Overlay Image (Top Layer) */}
        <img
          src={frame.frameSrc}
          alt={frame.name}
          className="absolute inset-0 w-full h-full object-fill z-20 pointer-events-none"
        />
      </div>

      <div className="mt-1.5 text-center">
        <span className="font-mono-tech text-[10px] text-[#9b9eaf] font-medium">
          {frame.name}
        </span>
      </div>
    </div>
  );
}
