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
    <div className="min-h-screen bg-[#070b14] bg-tech-grid text-white overflow-hidden font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* ===== NAVBAR HEADER ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-midnight border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <Logo size="sm" variant="rounded" animated={false} />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xl tracking-tight text-white group-hover:text-amber-400 transition-colors">
                AI Box
              </span>
              <span className="font-mono-tech text-[10px] text-slate-400 tracking-widest uppercase font-medium">
                Cyber-Studio PWA
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 font-mono-tech text-xs tracking-wider uppercase text-slate-400">
            <a href="#fitur" className="hover:text-amber-400 transition-colors font-medium">
              Fitur Sistem
            </a>
            <a href="#cara-kerja" className="hover:text-amber-400 transition-colors font-medium">
              Cara Kerja
            </a>
            <a href="#sewa" className="hover:text-amber-400 transition-colors font-medium">
              Sewa Booth
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-display text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Masuk Kiosk Console</span>
              </motion.button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Ambient Specular Glow */}
        {mounted && (
          <>
            <div className="absolute top-20 left-1/4 w-[550px] h-[350px] bg-blue-600/15 rounded-2xl blur-[140px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-[450px] h-[300px] bg-amber-500/10 rounded-2xl blur-[130px] pointer-events-none" />
          </>
        )}

        {/* Optical Brackets in Background */}
        <div className="camera-bracket-tl opacity-30 pointer-events-none" />
        <div className="camera-bracket-tr opacity-30 pointer-events-none" />

        {/* Left Column: Vision & CTA */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="lg:w-1/2 z-10 text-center lg:text-left"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 glass-midnight rounded-lg text-amber-300 font-mono-tech text-xs tracking-wider uppercase mb-6 border border-amber-400/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
            <span className="font-semibold">Edge AI Hand Gesture Photobooth</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.08] font-display">
            Pengalaman Foto Masa Depan,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500">
              Tanpa Sentuh Layar.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-normal mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Photobooth kiosk generasi baru yang dikendalikan sepenuhnya dengan gestur tangan AI
            melalui browser. Lambaikan tangan untuk mulai, berpose bebas, dan cetak film strip HD
            secara instan.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-7 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-display text-sm font-bold tracking-wider uppercase shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-3 group"
              >
                <Camera className="w-4 h-4" />
                <span>Mulai Sesi Photobooth</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>

            <a
              href="#cara-kerja"
              className="w-full sm:w-auto px-7 py-3.5 glass-midnight hover:border-amber-400/30 text-white rounded-xl font-mono-tech text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 font-medium"
            >
              Lihat Cara Kerja
            </a>
          </div>

          {/* Precision Metrics */}
          <div className="pt-8 border-t border-white/10 flex flex-wrap items-center justify-center lg:justify-start gap-8 sm:gap-12">
            <div>
              <span className="font-display font-black text-2xl sm:text-3xl text-white block">
                0 ms
              </span>
              <span className="font-mono-tech text-slate-400 text-xs tracking-wider uppercase font-medium">
                Zero Cloud Latency
              </span>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div>
              <span className="font-display font-black text-2xl sm:text-3xl text-amber-400 block">
                100%
              </span>
              <span className="font-mono-tech text-slate-400 text-xs tracking-wider uppercase font-medium">
                Touchless Gesture
              </span>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div>
              <span className="font-display font-black text-2xl sm:text-3xl text-white block">
                300 DPI
              </span>
              <span className="font-mono-tech text-slate-400 text-xs tracking-wider uppercase font-medium">
                Studio Film Strip
              </span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Interactive Live Cyber Kiosk Simulator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:w-1/2 z-10 w-full flex justify-center"
        >
          <div className="relative w-full max-w-md glass-midnight rounded-2xl p-6 sm:p-7 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.7)] overflow-hidden">
            {/* Top Lens Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
                <span className="font-mono-tech text-xs font-bold text-white tracking-wider uppercase">
                  KIOSK OPTICS SIMULATOR
                </span>
              </div>
              <span className="font-mono-tech text-[10px] text-slate-400 tracking-widest uppercase font-medium">
                MEDIAPIPE 15 FPS
              </span>
            </div>

            {/* Simulated Live Viewfinder Box */}
            <div className="relative aspect-[4/3] rounded-xl bg-[#0c1222] border border-white/10 overflow-hidden flex flex-col items-center justify-center p-6 text-center">
              {/* Corner Viewfinder Ticks in Mustard */}
              <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-amber-400/80" />
              <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-amber-400/80" />
              <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-amber-400/80" />
              <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-amber-400/80" />

              {/* Central Dynamic Gesture Sensor Feedback */}
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-full border border-dashed border-amber-400/40 animate-spin-slow flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                    {simulatedGesture === "wave" && <Hand className="w-7 h-7" />}
                    {simulatedGesture === "peace" && <span className="text-2xl font-bold">✌️</span>}
                    {simulatedGesture === "fist" && <span className="text-2xl font-bold">✊</span>}
                  </div>
                </div>
              </div>

              <div className="font-mono-tech text-xs text-amber-300 font-bold uppercase tracking-wider mb-1">
                SENSOR: GESTUR {simulatedGesture.toUpperCase()}
              </div>
              <p className="text-slate-300 text-xs font-normal max-w-xs">
                {simulatedGesture === "wave" && "Lambaian tangan terdeteksi: Membuka menu photobooth..."}
                {simulatedGesture === "peace" && "Gestur Peace terdeteksi: Memicu hitung mundur foto..."}
                {simulatedGesture === "fist" && "Gestur Kepalan terdeteksi: Mengaktifkan rekam email suara..."}
              </p>
            </div>

            {/* Feature Tabs Selector */}
            <div className="grid grid-cols-3 gap-2.5 mt-5">
              {[
                { id: "strip", label: "Film Strip", desc: "Multi-Pose HD" },
                { id: "kiosk", label: "Kiosk HUD", desc: "Gesture Optics" },
                { id: "frame", label: "AI Creative", desc: "Studio Lighting" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    activeTab === tab.id
                      ? "bg-amber-400/10 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      : "bg-[#0c1222]/80 border-white/5 hover:border-white/20"
                  }`}
                >
                  <span className="font-display font-bold text-xs text-white block">
                    {tab.label}
                  </span>
                  <span className="font-mono-tech text-[9px] text-slate-400 uppercase font-medium">
                    {tab.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===== BENTO GRID FEATURES SECTION ===== */}
      <section id="fitur" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 glass-midnight rounded-lg text-amber-300 font-mono-tech text-xs tracking-wider uppercase mb-3 border border-amber-400/30">
            <span className="font-semibold">Arsitektur Sistem</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display mb-4">
            Didesain untuk Standar Tertinggi
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto font-normal">
            Kombinasi teknologi Computer Vision client-side dan compositing canvas 300 DPI
            untuk performa kiosk 24/7 tanpa kompromi.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Hand Gesture Vision (Large, Col 2) */}
          <div className="md:col-span-2 glass-midnight rounded-2xl p-8 sm:p-10 border border-white/10 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-2xl blur-[100px] pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-6">
                <Hand className="w-6 h-6" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-display mb-3">
                100% Client-Side Hand Gesture AI
              </h3>
              <p className="text-slate-300 text-sm sm:text-base font-normal leading-relaxed max-w-lg mb-6">
                Menggunakan MediaPipe Tasks Vision berbasis WebAssembly & WebGL. Seluruh deteksi
                landmark 21 titik tangan dieksekusi langsung di GPU perangkat kiosk pengguna.
                Bebas latensi server dan aman secara privasi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
              <span className="font-mono-tech text-[10px] px-3 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 font-medium">
                WASM ACCELERATED
              </span>
              <span className="font-mono-tech text-[10px] px-3 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 font-medium">
                WEBGL SHADERS
              </span>
              <span className="font-mono-tech text-[10px] px-3 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 font-medium">
                ZERO GPU SERVER COST
              </span>
            </div>
          </div>

          {/* Card 2: 300 DPI Film Strip Compositing */}
          <div className="glass-midnight rounded-2xl p-8 border border-white/10 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-6">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white font-display mb-3">
                Konva.js 300 DPI Compositing
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm font-normal leading-relaxed mb-6">
                Penggabungan multi-frame, watermark transparan, dan branding kustom acara dilakukan
                dengan resolusi cetak industri (300 DPI) dalam hitungan milidetik.
              </p>
            </div>
            <div className="font-mono-tech text-[11px] text-amber-300 font-bold uppercase">
              HIGH-RES PRINT READY
            </div>
          </div>

          {/* Card 3: Instant Cloud Delivery */}
          <div className="glass-midnight rounded-2xl p-8 border border-white/10 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-6">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white font-display mb-3">
                Cloud Vault & QR Instant
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm font-normal leading-relaxed mb-6">
                Folder Google Drive publik otomatis dibuat dengan hak akses langsung. Pengguna
                hanya perlu scan QR Code atau menerima via email SMTP terenkripsi.
              </p>
            </div>
            <div className="font-mono-tech text-[11px] text-amber-300 font-bold uppercase">
              AUTO-SHARED CLOUD FOLDER
            </div>
          </div>

          {/* Card 4: Hardware Kiosk Mode (Col 2) */}
          <div className="md:col-span-2 glass-midnight rounded-2xl p-8 sm:p-10 border border-white/10 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-6">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-display mb-3">
                Kiosk Stability 24/7 & Offline Caching
              </h3>
              <p className="text-slate-300 text-sm sm:text-base font-normal leading-relaxed max-w-lg mb-6">
                Dilengkapi arsitektur PWA Serwist modern dan memory buffer auto-cleanup. Sistem
                mampu beroperasi nonstop di layar sentuh, iPad, maupun kiosk booth tanpa memory
                leak atau overheat.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
              <span className="font-mono-tech text-[10px] px-3 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 font-medium">
                PWA SERVICE WORKER
              </span>
              <span className="font-mono-tech text-[10px] px-3 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 font-medium">
                AUTO MEMORY FLUSH
              </span>
              <span className="font-mono-tech text-[10px] px-3 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 font-medium">
                KIOSK SECURE ESCAPE
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STEP-BY-STEP USER FLOW ===== */}
      <section id="cara-kerja" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 glass-midnight rounded-lg text-amber-300 font-mono-tech text-xs tracking-wider uppercase mb-3 border border-amber-400/30">
            <span className="font-semibold">Alur Pengguna</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display mb-4">
            4 Langkah Mudah Sesi Foto
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto font-normal">
            Pengalaman tanpa hambatan yang dirancang untuk keseruan instan di setiap acara.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              icon: Hand,
              title: "Lambaikan Tangan",
              desc: "Angkat dan lambaikan tangan ke depan kamera untuk mengaktifkan sesi photobooth.",
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
              desc: "Pilih kombinasi pose terbaik yang ingin dirangkai ke dalam strip foto digital.",
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
              className="glass-midnight rounded-2xl p-7 border border-white/10 relative group hover:border-amber-400/40 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:text-slate-950 group-hover:bg-amber-400 transition-colors">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="font-mono-tech text-2xl font-bold text-slate-500 group-hover:text-amber-400 transition-colors">
                  {item.step}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white font-display mb-2">
                {item.title}
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm font-normal leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== VIP EVENT BOOKING CALL TO ACTION ===== */}
      <section id="sewa" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="glass-midnight rounded-2xl p-8 sm:p-14 border border-amber-400/30 text-center relative overflow-hidden shadow-[0_0_60px_rgba(245,158,11,0.1)]">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-400/10 rounded-2xl blur-3xl pointer-events-none" />

          <div className="inline-block relative mb-6">
            <Logo size="md" variant="splash" animated />
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-display mb-4 tracking-tight">
            Hadirkan AI Box di Acara Spesial Anda
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto font-normal mb-8 leading-relaxed">
            Tersedia untuk rental Pernikahan, Ulang Tahun, Gathering Perusahaan, dan Expo Brand.
            Konsultasikan tema bingkai kustom dan kebutuhan hardware booth Anda bersama kami.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.a
              href="https://wa.me/6281234567890?text=Halo%20AI%20Box%2C%20saya%20tertarik%20untuk%20menyewa%20photobooth"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-display font-bold text-sm uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2.5"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Hubungi Tim via WhatsApp</span>
            </motion.a>

            <Link href="/booth">
              <span className="w-full sm:w-auto px-8 py-3.5 glass-midnight hover:border-amber-400/30 text-white font-mono-tech text-xs uppercase tracking-wider rounded-xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer font-medium">
                <span>Coba Mode Booth Sekarang</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== MINIMALIST FOOTER ===== */}
      <footer className="py-10 px-4 border-t border-white/10 glass-midnight">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" variant="rounded" animated={false} />
            <div>
              <span className="font-display font-extrabold text-sm text-white block">
                AI Box Photobooth
              </span>
              <span className="font-mono-tech text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                Touchless Cyber-Studio Architecture
              </span>
            </div>
          </div>

          <div className="font-mono-tech text-xs text-slate-400 text-center sm:text-right font-medium">
            &copy; {new Date().getFullYear()} SAAKA / AIBOX. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
