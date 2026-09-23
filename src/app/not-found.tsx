"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Camera } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#090a12] flex items-center justify-center p-4 selection:bg-[#ff7b00] selection:text-white font-sans">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#10111c] rounded-2xl p-8 sm:p-12 border border-[#292b3b] text-center max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 mx-auto mb-6 rounded-xl bg-[#246cff]/10 border border-[#246cff]/25 flex items-center justify-center"
        >
          <Camera className="w-8 h-8 text-[#246cff]" />
        </motion.div>

        <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">404</h1>
        <p className="text-sm text-[#9b9eaf] mb-8 font-normal">
          Halaman tidak ditemukan di kiosk AI Box.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#246cff] text-white rounded-xl font-semibold text-xs uppercase tracking-wider hover:bg-[#4d87ff] transition-all shadow-[0_4px_16px_rgba(36,108,255,0.3)]"
        >
          <Home className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </motion.div>
    </div>
  );
}
