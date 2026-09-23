"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Camera,
  Hand,
  QrCode,
  ArrowRight,
  MessageCircle,
  Layers,
  Cpu,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Logo from "@/components/Logo";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"strip" | "kiosk" | "frame">("strip");
  const [simulatedGesture, setSimulatedGesture] = useState<"wave" | "peace" | "fist">("wave");

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setSimulatedGesture((prev) =>
        prev === "wave" ? "peace" : prev === "peace" ? "fist" : "wave"
      );
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#090a12] text-[#f7f7fb] selection:bg-[#ff7b00] selection:text-white font-sans">
      {/* ===== HEADER NAVIGATION ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#090a12]/90 border-b border-[#292b3b] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo size="sm" variant="rounded" animated={false} />
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-[#f0a25c] transition-colors">
                ai<span className="text-[#246cff]">box</span>
              </span>
              <span className="font-mono-tech text-[9px] text-[#9b9eaf] tracking-wider uppercase">
                Photobooth Studio
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#9b9eaf]">
            <a href="#fitur" className="hover:text-white transition-colors">
              Fitur
            </a>
            <a href="#cara-kerja" className="hover:text-white transition-colors">
              Cara Kerja
            </a>
            <a href="#sewa" className="hover:text-white transition-colors">
              Sewa Booth
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 shadow-[0_4px_16px_rgba(36,108,255,0.3)]"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Masuk Kiosk</span>
              </motion.button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION (Inspired by compro) ===== */}
      <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-28 px-4 sm:px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Ambient Subtle Radial Glow */}
        {mounted && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-[#2e3247]/30 to-transparent rounded-full blur-[120px] pointer-events-none" />
        )}

        {/* Section Kicker */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#ff7b00]/10 border border-[#ff7b00]/25 text-[#f0a25c] text-xs font-semibold tracking-wider uppercase mb-6"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#ff7b00]" />
          <span>AI-Powered Photo Experience</span>
        </motion.div>

        {/* Main Headline with exact compro phrasing and typography */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.06em] text-white leading-[0.96] max-w-4xl mx-auto mb-6"
        >
          Capture Your Essence,<br />
          <span className="text-[#f0a25c]">Elevated by aibox.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-[#9b9eaf] text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed font-normal"
        >
          The world&apos;s first AI-powered photobooth with gesture control — built for effortless,
          unforgettable moments. Lambaikan tangan untuk mulai, berpose bebas, dan cetak foto studio secara instan.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14 w-full sm:w-auto"
        >
          <Link href="/login" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl text-sm font-semibold tracking-tight shadow-[0_10px_25px_rgba(36,108,255,0.25)] transition-all flex items-center justify-center gap-2.5"
            >
              <Camera className="w-4 h-4" />
              <span>Mulai Kiosk Photobooth</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>

          <a
            href="#cara-kerja"
            className="w-full sm:w-auto px-7 py-3.5 bg-[#171927] hover:bg-[#202336] text-[#f7f7fb] border border-[#292b3b] rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <span>Lihat Cara Kerja</span>
          </a>
        </motion.div>

        {/* Stats Row (compro inspired) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 pt-8 border-t border-[#292b3b]/70 max-w-2xl mx-auto w-full"
        >
          <div>
            <strong className="block text-2xl sm:text-3xl font-bold text-white tracking-tight">
              500+
            </strong>
            <span className="text-[11px] text-[#9b9eaf] uppercase tracking-wider font-mono-tech">
              Acara Sukses
            </span>
          </div>
          <div className="w-[1px] h-8 bg-[#292b3b]" />
          <div>
            <strong className="block text-2xl sm:text-3xl font-bold text-[#f0a25c] tracking-tight">
              100%
            </strong>
            <span className="text-[11px] text-[#9b9eaf] uppercase tracking-wider font-mono-tech">
              Touchless Gesture
            </span>
          </div>
          <div className="w-[1px] h-8 bg-[#292b3b]" />
          <div>
            <strong className="block text-2xl sm:text-3xl font-bold text-white tracking-tight">
              300 DPI
            </strong>
            <span className="text-[11px] text-[#9b9eaf] uppercase tracking-wider font-mono-tech">
              Studio Print HD
            </span>
          </div>
        </motion.div>

        {/* Interactive Live Kiosk Viewfinder Simulator */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="w-full max-w-md mt-16"
        >
          <div className="bg-[#10111c] rounded-2xl p-6 border border-[#292b3b] shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-left">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#292b3b]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#f0a25c] animate-pulse" />
                <span className="font-mono-tech text-xs font-semibold text-white tracking-wide uppercase">
                  KIOSK OPTICS SIMULATOR
                </span>
              </div>
              <span className="font-mono-tech text-[10px] text-[#9b9eaf] tracking-wider uppercase">
                MEDIAPIPE 15 FPS
              </span>
            </div>

            <div className="relative aspect-[4/3] rounded-xl bg-[#090a12] border border-[#292b3b] overflow-hidden flex flex-col items-center justify-center p-6 text-center">
              {/* Corner Framing Ticks in warm apricot */}
              <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-[#f0a25c]/70" />
              <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-[#f0a25c]/70" />
              <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-[#f0a25c]/70" />
              <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-[#f0a25c]/70" />

              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-full border border-dashed border-[#f0a25c]/40 animate-spin-slow flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#f0a25c]/10 flex items-center justify-center text-[#f0a25c]">
                    {simulatedGesture === "wave" && <Hand className="w-6 h-6" />}
                    {simulatedGesture === "peace" && <span className="text-xl font-bold">✌️</span>}
                    {simulatedGesture === "fist" && <span className="text-xl font-bold">✊</span>}
                  </div>
                </div>
              </div>

              <div className="font-mono-tech text-xs text-[#f0a25c] font-semibold uppercase tracking-wider mb-1">
                SENSOR: GESTUR {simulatedGesture.toUpperCase()}
              </div>
              <p className="text-[#9b9eaf] text-xs font-normal max-w-xs">
                {simulatedGesture === "wave" && "Lambaian tangan terdeteksi: Membuka menu photobooth..."}
                {simulatedGesture === "peace" && "Gestur Peace terdeteksi: Memicu hitung mundur foto..."}
                {simulatedGesture === "fist" && "Gestur Kepalan terdeteksi: Mengaktifkan rekam email suara..."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { id: "strip", label: "Film Strip", desc: "Multi-Pose HD" },
                { id: "kiosk", label: "Gesture HUD", desc: "Optics AI" },
                { id: "frame", label: "Branding", desc: "Custom Frame" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    activeTab === tab.id
                      ? "bg-[#171927] border-[#f0a25c]/50 text-white"
                      : "bg-[#090a12]/60 border-[#292b3b] text-[#9b9eaf] hover:border-[#383b52]"
                  }`}
                >
                  <span className="font-semibold text-xs text-white block">
                    {tab.label}
                  </span>
                  <span className="font-mono-tech text-[9px] text-[#9b9eaf] uppercase">
                    {tab.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="fitur" className="py-24 px-4 sm:px-6 max-w-6xl mx-auto border-t border-[#292b3b]">
        <div className="text-center mb-16">
          <p className="text-[#ff7b00] font-mono-tech text-xs tracking-wider uppercase font-semibold mb-2">
            Arsitektur Sistem
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-[-0.04em] mb-4">
            Didesain untuk Standar Tertinggi
          </h2>
          <p className="text-[#9b9eaf] text-sm sm:text-base max-w-xl mx-auto">
            Kombinasi teknologi Computer Vision client-side dan compositing canvas 300 DPI
            untuk performa kiosk 24/7 tanpa kompromi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Gesture Vision */}
          <div className="md:col-span-2 bg-[#10111c] rounded-2xl p-8 border border-[#292b3b] relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#246cff]/10 border border-[#246cff]/20 flex items-center justify-center text-[#246cff] mb-6">
                <Hand className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-3">
                100% Client-Side Hand Gesture AI
              </h3>
              <p className="text-[#9b9eaf] text-sm leading-relaxed max-w-lg mb-6">
                Menggunakan MediaPipe Tasks Vision berbasis WebAssembly & WebGL. Seluruh deteksi
                landmark 21 titik tangan dieksekusi langsung di GPU perangkat kiosk pengguna.
                Bebas latensi server dan aman secara privasi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-[#292b3b]">
              <span className="font-mono-tech text-[10px] px-3 py-1 rounded-lg bg-[#171927] text-[#9b9eaf] border border-[#292b3b]">
                WASM ACCELERATED
              </span>
              <span className="font-mono-tech text-[10px] px-3 py-1 rounded-lg bg-[#171927] text-[#9b9eaf] border border-[#292b3b]">
                WEBGL SHADERS
              </span>
              <span className="font-mono-tech text-[10px] px-3 py-1 rounded-lg bg-[#171927] text-[#9b9eaf] border border-[#292b3b]">
                ZERO SERVER DELAY
              </span>
            </div>
          </div>

          {/* Card 2: 300 DPI Compositing */}
          <div className="bg-[#10111c] rounded-2xl p-8 border border-[#292b3b] flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#f0a25c]/10 border border-[#f0a25c]/25 flex items-center justify-center text-[#f0a25c] mb-6">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-3">
                Konva.js 300 DPI Compositing
              </h3>
              <p className="text-[#9b9eaf] text-xs leading-relaxed mb-6">
                Penggabungan multi-frame, watermark transparan, dan branding kustom acara dilakukan
                dengan resolusi cetak industri (300 DPI) dalam hitungan milidetik.
              </p>
            </div>
            <div className="font-mono-tech text-[11px] text-[#f0a25c] font-semibold uppercase">
              HIGH-RES PRINT READY
            </div>
          </div>

          {/* Card 3: Instant Cloud Delivery */}
          <div className="bg-[#10111c] rounded-2xl p-8 border border-[#292b3b] flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-6">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-3">
                Cloud Vault & QR Instant
              </h3>
              <p className="text-[#9b9eaf] text-xs leading-relaxed mb-6">
                Folder Google Drive publik otomatis dibuat dengan hak akses langsung. Pengguna
                hanya perlu scan QR Code atau menerima via email SMTP terenkripsi.
              </p>
            </div>
            <div className="font-mono-tech text-[11px] text-emerald-400 font-semibold uppercase">
              AUTO-SHARED CLOUD FOLDER
            </div>
          </div>

          {/* Card 4: Hardware Kiosk Stability */}
          <div className="md:col-span-2 bg-[#10111c] rounded-2xl p-8 border border-[#292b3b] flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#246cff]/10 border border-[#246cff]/20 flex items-center justify-center text-[#246cff] mb-6">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-3">
                Kiosk Stability 24/7 & Offline Caching
              </h3>
              <p className="text-[#9b9eaf] text-sm leading-relaxed max-w-lg mb-6">
                Dilengkapi arsitektur PWA Serwist modern dan memory buffer auto-cleanup. Sistem
                mampu beroperasi nonstop di layar sentuh, iPad, maupun booth tanpa memory
                leak atau overheat.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-[#292b3b]">
              <span className="font-mono-tech text-[10px] px-3 py-1 rounded-lg bg-[#171927] text-[#9b9eaf] border border-[#292b3b]">
                PWA SERVICE WORKER
              </span>
              <span className="font-mono-tech text-[10px] px-3 py-1 rounded-lg bg-[#171927] text-[#9b9eaf] border border-[#292b3b]">
                AUTO MEMORY FLUSH
              </span>
              <span className="font-mono-tech text-[10px] px-3 py-1 rounded-lg bg-[#171927] text-[#9b9eaf] border border-[#292b3b]">
                KIOSK PIN PROTECTION
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STEP-BY-STEP USER FLOW ===== */}
      <section id="cara-kerja" className="py-24 px-4 sm:px-6 max-w-6xl mx-auto border-t border-[#292b3b]">
        <div className="text-center mb-16">
          <p className="text-[#ff7b00] font-mono-tech text-xs tracking-wider uppercase font-semibold mb-2">
            Alur Pengguna
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-[-0.04em] mb-4">
            4 Langkah Mudah Sesi Foto
          </h2>
          <p className="text-[#9b9eaf] text-sm sm:text-base max-w-md mx-auto">
            Pengalaman tanpa hambatan yang dirancang untuk keseruan instan di setiap acara.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              step: "01",
              icon: Hand,
              title: "Lambaikan Tangan",
              desc: "Angkat tangan ke depan kamera untuk mengaktifkan sesi photobooth.",
            },
            {
              step: "02",
              icon: Camera,
              title: "Pilih & Foto HD",
              desc: "Gunakan reticle gestur untuk memilih paket lalu berpose bebas dengan hitung mundur.",
            },
            {
              step: "03",
              icon: Layers,
              title: "Kurasi Film Strip",
              desc: "Pilih pose terbaik yang ingin dirangkai ke dalam strip foto digital.",
            },
            {
              step: "04",
              icon: QrCode,
              title: "QR & Print Instan",
              desc: "Scan QR Code untuk download langsung ke smartphone atau cetak fisik di tempat.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-[#10111c] rounded-2xl p-7 border border-[#292b3b] hover:border-[#f0a25c]/40 transition-colors group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#171927] border border-[#292b3b] flex items-center justify-center text-[#f0a25c] group-hover:bg-[#f0a25c] group-hover:text-[#090a12] transition-colors">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="font-mono-tech text-xl font-bold text-[#454964] group-hover:text-[#f0a25c] transition-colors">
                  {item.step}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                {item.title}
              </h3>
              <p className="text-[#9b9eaf] text-xs leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== EVENT BOOKING CTA ===== */}
      <section id="sewa" className="py-24 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="bg-[#10111c] rounded-2xl p-8 sm:p-12 border border-[#292b3b] text-center relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="inline-block relative mb-6">
            <Logo size="md" variant="splash" animated />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-[-0.04em] mb-4">
            Hadirkan AI Box di Acara Spesial Anda
          </h2>
          <p className="text-[#9b9eaf] text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">
            Tersedia untuk rental Pernikahan, Ulang Tahun, Gathering Perusahaan, dan Brand Expo.
            Konsultasikan tema bingkai kustom dan kebutuhan hardware booth Anda bersama kami.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <motion.a
              href="https://wa.me/6281234567890?text=Halo%20AI%20Box%2C%20saya%20tertarik%20untuk%20menyewa%20photobooth"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#246cff] hover:bg-[#4d87ff] text-white font-semibold text-sm rounded-xl shadow-[0_8px_20px_rgba(36,108,255,0.25)] transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Hubungi via WhatsApp</span>
            </motion.a>

            <Link href="/booth">
              <span className="w-full sm:w-auto px-6 py-3.5 bg-[#171927] hover:bg-[#202336] text-white border border-[#292b3b] text-xs font-semibold uppercase tracking-wider rounded-xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer">
                <span>Coba Mode Booth</span>
                <ChevronRight className="w-4 h-4 text-[#f0a25c]" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 px-4 border-t border-[#292b3b] bg-[#090a12]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" variant="rounded" animated={false} />
            <div>
              <span className="font-bold text-sm text-white block">
                ai<span className="text-[#246cff]">box</span> Photobooth
              </span>
              <span className="font-mono-tech text-[10px] text-[#9b9eaf] tracking-wider uppercase">
                Touchless Studio Experience
              </span>
            </div>
          </div>

          <div className="font-mono-tech text-xs text-[#9b9eaf] text-center sm:text-right">
            &copy; {new Date().getFullYear()} SAAKA / AIBOX. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
