"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [cameraFlash, setCameraFlash] = useState(false);
  const [boxFlash, setBoxFlash] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [flashTriggered, setFlashTriggered] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnterText = () => {
    if (cooldownRef.current) return;
    setIsFocusing(true);
    setFlashTriggered(false);

    // Delayed shutter snap (0.5s after keeping cursor inside the text box)
    hoverTimerRef.current = setTimeout(() => {
      setIsFocusing(false);
      setFlashTriggered(true);
      setBoxFlash(true);
      setCameraFlash(true);
      cooldownRef.current = true;

      setTimeout(() => {
        setBoxFlash(false);
        setCameraFlash(false);
      }, 260);

      // Cooldown before next hover trigger
      setTimeout(() => {
        cooldownRef.current = false;
        setFlashTriggered(false);
      }, 1600);
    }, 500);
  };

  const handleMouseLeaveText = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsFocusing(false);
  };

  return (
    <div className="min-h-screen bg-[#090a12] text-[#f7f7fb] selection:bg-[#ff7b00] selection:text-white font-sans relative">
      {/* Interactive Camera Shutter Flash (Jepretan Kamera) Strobe */}
      <AnimatePresence>
        {cameraFlash && (
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 bg-white z-[9999] pointer-events-none"
          />
        )}
      </AnimatePresence>

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
            <a href="#demo" className="hover:text-white transition-colors">
              Demo
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
                <span>Mulai AIBOX</span>
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

        {/* Main Headline with Camera Shutter Viewfinder and Delayed Hover Strobe Snap */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          onMouseEnter={handleMouseEnterText}
          onMouseLeave={handleMouseLeaveText}
          className={`relative inline-block max-w-4xl mx-auto mb-6 px-6 sm:px-12 py-8 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden ${isFocusing
            ? "bg-[#10111c]/60 ring-1 ring-[#f0a25c]/50 scale-[0.995]"
            : flashTriggered
              ? "bg-[#10111c]/80 ring-2 ring-[#246cff] shadow-[0_0_50px_rgba(36,108,255,0.35)]"
              : "hover:bg-[#10111c]/40"
            }`}
        >
          {/* Box Flash Xenon Strobe Overlay */}
          <AnimatePresence>
            {boxFlash && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className="absolute inset-0 bg-white z-30 pointer-events-none mix-blend-screen shadow-[0_0_80px_rgba(255,255,255,0.9)]"
              />
            )}
          </AnimatePresence>

          {/* Viewfinder Reticle Corner Brackets that snap tightly inward on focus */}
          <div
            className={`absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 transition-all duration-300 pointer-events-none ${isFocusing
              ? "border-[#f0a25c] w-8 h-8 scale-90"
              : flashTriggered
                ? "border-[#246cff] w-8 h-8 drop-shadow-[0_0_10px_#246cff]"
                : "border-[#f0a25c]/40"
              }`}
          />
          <div
            className={`absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 transition-all duration-300 pointer-events-none ${isFocusing
              ? "border-[#f0a25c] w-8 h-8 scale-90"
              : flashTriggered
                ? "border-[#246cff] w-8 h-8 drop-shadow-[0_0_10px_#246cff]"
                : "border-[#f0a25c]/40"
              }`}
          />
          <div
            className={`absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 transition-all duration-300 pointer-events-none ${isFocusing
              ? "border-[#f0a25c] w-8 h-8 scale-90"
              : flashTriggered
                ? "border-[#246cff] w-8 h-8 drop-shadow-[0_0_10px_#246cff]"
                : "border-[#f0a25c]/40"
              }`}
          />
          <div
            className={`absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 transition-all duration-300 pointer-events-none ${isFocusing
              ? "border-[#f0a25c] w-8 h-8 scale-90"
              : flashTriggered
                ? "border-[#246cff] w-8 h-8 drop-shadow-[0_0_10px_#246cff]"
                : "border-[#f0a25c]/40"
              }`}
          />

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.06em] text-white leading-[0.96] select-none">
            <span className="block drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
              Capture Your Essence,
            </span>
            <span className="block mt-2 bg-gradient-to-r from-[#f0a25c] via-[#ffeed6] to-[#f0a25c] bg-clip-text text-transparent bg-[length:200%_auto] hover:opacity-95 transition-all drop-shadow-[0_2px_15px_rgba(240,162,92,0.3)]">
              Elevated by aibox.
            </span>
          </h1>
        </motion.div>

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
              <span>Mulai AIBOX</span>
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

        {/* Live Kiosk Dual Demo: model_a.mp4 & model_b.mp4 side-by-side with ui-box.png overlay */}
        <motion.div
          id="demo"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="w-full max-w-6xl mt-16 text-left scroll-mt-24"
        >
          {/* Showcase Section Heading */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-4 border-b border-[#292b3b]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0a25c]/10 border border-[#f0a25c]/25 text-[#f0a25c] text-[11px] font-mono-tech tracking-wider uppercase mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f0a25c] animate-pulse" />
                Dual Interactive PV Demonstration
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Live Demonstration
              </h3>
              <p className="text-xs sm:text-sm text-[#9b9eaf] mt-1 max-w-xl">
                Pengalaman photobooth touchless dengan deteksi gestur tangan presisi tinggi dan pemrosesan multi-pose instan.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono-tech text-[10px] text-[#9b9eaf] uppercase tracking-wider bg-[#10111c] px-3 py-1.5 rounded-lg border border-[#292b3b] hidden sm:inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                60 FPS Engine
              </span>
              <span className="font-mono-tech text-[10px] text-[#f0a25c] uppercase tracking-wider bg-[#f0a25c]/10 px-3 py-1.5 rounded-lg border border-[#f0a25c]/25">
                Touchless Photobox
              </span>
            </div>
          </div>

          {/* Dual Video Grid (Side-by-Side A & B) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7">
            {/* DEMO CARD A */}
            <div className="group bg-[#10111c] rounded-2xl p-4 sm:p-5 border border-[#292b3b] hover:border-[#f0a25c]/40 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#292b3b]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#f0a25c] animate-pulse" />
                    <span className="font-mono-tech text-xs font-semibold text-white tracking-wide uppercase">
                      LIVE DEMO
                    </span>
                  </div>
                  <span className="font-mono-tech text-[10px] text-[#f0a25c] bg-[#f0a25c]/10 border border-[#f0a25c]/25 px-2 py-0.5 rounded tracking-wider uppercase">
                    OPTICAL AI
                  </span>
                </div>

                {/* Video container with realistic UI Box Overlay */}
                <div className="relative aspect-video rounded-xl bg-[#090a12] border border-[#292b3b] overflow-hidden shadow-2xl">
                  <video
                    src="/model_a.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <img
                    src="/ui-box.png"
                    alt="AI Box Kiosk Interface A"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                  />
                </div>

                {/* Selling Copy & Specs */}
                <div className="mt-4">
                  <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <Hand className="w-4 h-4 text-[#f0a25c]" />
                    Navigasi Gestur 100% Touchless
                  </h4>
                  <p className="text-xs text-[#9b9eaf] mt-1 leading-relaxed">
                    Pengunjung memilih paket, format frame, dan tema photobox cukup dengan mengarahkan tangan ke udara tanpa menyentuh kaca display.
                  </p>
                </div>
              </div>

              {/* Badges / Micro Specs */}
              <div className="mt-4 pt-3.5 border-t border-[#292b3b]/70 flex flex-wrap items-center gap-2 font-mono-tech text-[10px]">
                <span className="px-2.5 py-1 rounded bg-[#090a12] border border-[#292b3b] text-[#cbd0e1]">
                  MediaPipe Skeleton
                </span>
                <span className="px-2.5 py-1 rounded bg-[#090a12] border border-[#292b3b] text-[#cbd0e1]">
                  Hover Ring Dwell 1.2s
                </span>
                <span className="px-2.5 py-1 rounded bg-[#f0a25c]/10 border border-[#f0a25c]/25 text-[#f0a25c]">
                  Anti Smudge Screen
                </span>
              </div>
            </div>

            {/* DEMO CARD B */}
            <div className="group bg-[#10111c] rounded-2xl p-4 sm:p-5 border border-[#292b3b] hover:border-[#246cff]/40 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#292b3b]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#246cff] animate-pulse" />
                    <span className="font-mono-tech text-xs font-semibold text-white tracking-wide uppercase">
                      LIVE DEMO
                    </span>
                  </div>
                  <span className="font-mono-tech text-[10px] text-[#246cff] bg-[#246cff]/10 border border-[#246cff]/25 px-2 py-0.5 rounded tracking-wider uppercase">
                    300 DPI RENDER
                  </span>
                </div>

                {/* Video container with realistic UI Box Overlay */}
                <div className="relative aspect-video rounded-xl bg-[#090a12] border border-[#292b3b] overflow-hidden shadow-2xl">
                  <video
                    src="/model_b.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <img
                    src="/ui-box.png"
                    alt="AI Box Kiosk Interface B"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                  />
                </div>

                {/* Selling Copy & Specs */}
                <div className="mt-4">
                  <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#246cff]" />
                    Siklus Foto Dinamis & Fast Preview
                  </h4>
                  <p className="text-xs text-[#9b9eaf] mt-1 leading-relaxed">
                    Sistem pemotretan berurutan dengan audio-visual countdown, compositing frame otomatis 300 DPI, dan cetak studio cepat.
                  </p>
                </div>
              </div>

              {/* Badges / Micro Specs */}
              <div className="mt-4 pt-3.5 border-t border-[#292b3b]/70 flex flex-wrap items-center gap-2 font-mono-tech text-[10px]">
                <span className="px-2.5 py-1 rounded bg-[#090a12] border border-[#292b3b] text-[#cbd0e1]">
                  Auto Flash
                </span>
                <span className="px-2.5 py-1 rounded bg-[#090a12] border border-[#292b3b] text-[#cbd0e1]">
                  Instant Print Spooler
                </span>
                <span className="px-2.5 py-1 rounded bg-[#246cff]/10 border border-[#246cff]/25 text-[#246cff]">
                  QR Digital Download
                </span>
              </div>
            </div>
          </div>

          {/* Selling Banner / Kiosk Highlights */}
          <div className="mt-6 bg-[#10111c]/60 rounded-xl p-4 border border-[#292b3b] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#f0a25c]/15 border border-[#f0a25c]/25 flex items-center justify-center text-[#f0a25c]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Siap untuk Event, Mall & Retail Space</p>
                <p className="text-[11px] text-[#9b9eaf]">Hardware plug & play mandiri dengan maintenance software nol.</p>
              </div>
            </div>
            <Link
              href="/booth"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#ff7b00] to-[#f0a25c] text-white text-xs font-semibold hover:shadow-[0_0_20px_rgba(255,123,0,0.4)] transition-all"
            >
              Coba Interactive Booth Sekarang
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
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

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-[-0.04em] mb-4">
            Hadirkan AI Box di Acara Spesial Anda!
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
