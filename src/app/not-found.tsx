"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Camera } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Camera className="w-10 h-10 text-primary" />
        </motion.div>

        <h1 className="text-6xl font-black text-dark mb-2">404</h1>
        <p className="text-xl text-light-muted mb-8">
          Halaman tidak ditemukan
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
        >
          <Home className="w-4 h-4" />
          Kembali ke Beranda
        </Link>
      </motion.div>
    </div>
  );
}
