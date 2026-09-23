"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  User,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { validateAdmin, saveSession, isLoggedIn } from "@/lib/auth";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isLoggedIn()) {
      router.replace("/booth");
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Mohon isi ID Operator dan Kata Sandi.");
      return;
    }

    setLoading(true);

    try {
      const valid = await validateAdmin(username.trim(), password);
      if (valid) {
        saveSession(username.trim());
        router.replace("/booth");
      } else {
        setError("Kredensial tidak valid. Silakan periksa kembali.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 bg-tech-grid flex items-center justify-center p-4 sm:p-6 relative overflow-hidden text-white font-sans">
      {/* Ambient Deep Blue & Warm Mustard Spotlights */}
      {mounted && (
        <>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[320px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-20 right-10 w-[350px] h-[250px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        </>
      )}

      {/* Optical Corner Brackets (Mustard Accent) */}
      <div className="camera-bracket-tl opacity-40 pointer-events-none" />
      <div className="camera-bracket-tr opacity-40 pointer-events-none" />
      <div className="camera-bracket-bl opacity-40 pointer-events-none" />
      <div className="camera-bracket-br opacity-40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        {/* Header & Logo */}
        <div className="text-center mb-7">
          <div className="inline-block relative mb-3.5">
            <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-lg animate-pulse-subtle" />
            <div className="relative">
              <Logo size="md" variant="splash" animated />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono-tech text-[11px] tracking-widest uppercase mb-3 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Operator Access Control
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
            AI Box Kiosk Console
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 font-light">
            Masuk untuk mengaktifkan sesi kamera & sensor interaktif
          </p>
        </div>

        {/* Specular Midnight Card with Clean Disciplined Radius */}
        <div className="glass-midnight rounded-2xl p-7 sm:p-8 shadow-2xl relative border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-4.5">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-mono-tech tracking-wider uppercase text-zinc-300 mb-1.5 font-medium">
                Operator ID / Username
              </label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-amber-400 transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-obsidian-900/90 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 font-mono-tech text-sm transition-all duration-200 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-mono-tech tracking-wider uppercase text-zinc-300 mb-1.5 font-medium">
                Security Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-amber-400 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={loading}
                  className="w-full pl-10 pr-11 py-3 bg-obsidian-900/90 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 font-mono-tech text-sm transition-all duration-200 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-medium"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={!loading ? { scale: 1.01 } : {}}
              whileTap={!loading ? { scale: 0.99 } : {}}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-obsidian-950 rounded-xl font-display font-extrabold text-sm tracking-wide shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:shadow-[0_0_35px_rgba(245,158,11,0.45)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-obsidian-950/30 border-t-obsidian-950 rounded-full"
                  />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Inisialisasi Photobooth Console</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Quick Credential Hint */}
          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <span className="text-[11px] font-mono-tech text-zinc-400">
              Default: <span className="text-zinc-200 font-semibold">admin</span> /{" "}
              <span className="text-zinc-200 font-semibold">aibox2026</span>
            </span>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-5">
          <a
            href="/"
            className="text-zinc-400 hover:text-amber-400 text-xs font-mono-tech transition-colors inline-flex items-center gap-1.5 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Kembali ke Halaman Publik</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
