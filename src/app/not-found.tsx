"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Camera } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070b14] bg-tech-grid flex items-center justify-center p-4 selection:bg-amber-400 selection:text-slate-950 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-midnight rounded-2xl p-8 sm:p-12 border border-white/10 text-center max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.6)]"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 mx-auto mb-6 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center"
        >
          <Camera className="w-10 h-10 text-amber-400" />
        </motion.div>

        <h1 className="text-6xl font-extrabold text-white mb-2 font-display">404</h1>
        <p className="text-base text-slate-300 mb-8 font-normal">
          Halaman tidak ditemukan di kiosk AI Box.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 text-slate-950 rounded-xl font-display font-bold text-xs uppercase tracking-wider hover:bg-amber-300 transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)]"
        >
          <Home className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </motion.div>
    </div>
  );
}
