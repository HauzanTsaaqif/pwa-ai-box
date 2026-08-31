"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  Sparkles,
  Hand,
  QrCode,
  ChevronRight,
  ArrowRight,
  MessageCircle,
  Star,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Layers,
} from "lucide-react";
import Logo from "@/components/Logo";

const PARTICLES_COUNT = 24;

interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

const PARTICLE_COLORS = ["#0EA5E9", "#3B82F6", "#F97316", "#10B981", "#8B5CF6"];

export default function LandingPage() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"strip" | "kiosk" | "frame">("strip");

  useEffect(() => {
    setMounted(true);
    const newParticles: Particle[] = Array.from({ length: PARTICLES_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 8,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="min-h-screen bg-surface overflow-hidden text-dark">
      {/* ===== NAVBAR HEADER ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo size="sm" variant="rounded" animated={false} />
            <div className="flex flex-col">
              <span className="font-extrabold text-xl text-dark group-hover:text-primary transition-colors">
                AI Box
              </span>
              <span className="text-xs text-light-muted font-medium tracking-wide">
                Photobooth PWA
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-5 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-full text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Masuk Booth</span>
              </motion.button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Particle Floating Elements */}
        {mounted &&
          particles.map((p) => (
            <div
              key={p.id}
              className="absolute pointer-events-none"
              style={{
                left: `${p.x}%`,
                bottom: "-10px",
                width: `${p.size}px`,
                height: `${p.size}px`,
                borderRadius: "50%",
                background: p.color,
                opacity: 0.35,
                animation: `particle-float ${p.duration}s linear ${p.delay}s infinite`,
              }}
            />
          ))}

        {/* Ambient Gradient Glows */}
        <div className="absolute top-10 left-[-150px] w-[500px] h-[500px] rounded-full bg-sky-400/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-[-150px] w-[450px] h-[450px] rounded-full bg-orange-400/15 blur-[120px] pointer-events-none" />

        {/* Left Column: Text & CTA */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="lg:w-1/2 z-10 text-center lg:text-left"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 border border-sky-200/80 rounded-full text-sky-700 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Next-Gen Interactive Photobooth</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-dark mb-6 leading-[1.1]">
            Abadikan Momen Lebih Seru dengan{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              AI Box Photobooth
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-light-muted font-light mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Pengalaman foto touchless berbasis AI dengan kontrol gestur tangan.
            Lambaikan tangan untuk mulai, berpose bebas, dan dapatkan strip foto digital secara instan!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary via-blue-600 to-secondary text-white rounded-full text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 flex items-center justify-center gap-3"
              >
                <Camera className="w-5 h-5" />
                Mulai Sesi Photobooth
                <ArrowRight className="w-5 h-5 animate-pulse" />
              </motion.button>
            </Link>

            <a
              href="#cara-kerja"
              className="w-full sm:w-auto px-7 py-4 bg-white text-dark border border-gray-200 hover:border-primary/40 rounded-full text-base font-medium shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
            >
              Lihat Cara Kerja
            </a>
          </div>

          {/* Statistics Badges */}
          <div className="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-center lg:justify-start gap-6 sm:gap-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-primary font-bold">
                ⚡
              </div>
              <div className="text-left">
                <span className="font-bold text-dark text-lg sm:text-xl block leading-tight">
                  100% Touchless
                </span>
                <span className="text-light-muted text-xs">Sensor Gestur Tangan</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-accent font-bold">
                ⭐
              </div>
              <div className="text-left">
                <span className="font-bold text-dark text-lg sm:text-xl block leading-tight">
                  4.9 / 5.0
                </span>
                <span className="text-light-muted text-xs">Kepuasan Pengguna</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Feature Explanation Showcase Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:w-1/2 z-10 relative flex justify-center"
        >
          {/* Main Card Graphic */}
          <div className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 via-dark to-slate-950 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header branding */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Logo size="sm" variant="rounded" animated />
                <span className="text-white font-bold text-lg">Panduan Fitur AI Box</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/20 text-sky-300 rounded-full text-xs font-semibold border border-sky-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Fitur Utama
              </div>
            </div>

            {/* Central Feature Card Detail */}
            <div className="relative my-2 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold px-2.5 py-1 bg-primary text-white rounded-md uppercase">
                  {activeTab === "strip"
                    ? "Film Strip"
                    : activeTab === "kiosk"
                    ? "Kiosk Mode"
                    : "AI Frame"}
                </span>
                <span className="text-white/60 text-xs font-medium">
                  {activeTab === "strip"
                    ? "Layout Foto Multi-Pose"
                    : activeTab === "kiosk"
                    ? "Kontrol Sensor Gestur"
                    : "Bingkai Kustom AI"}
                </span>
              </div>

              <p className="text-white/90 text-sm leading-relaxed mb-3">
                {activeTab === "strip"
                  ? "Fitur Film Strip menggabungkan 3 hingga 4 pose foto pengguna secara otomatis ke dalam desain strip retro/modern yang siap dicetak atau diunduh via QR Code."
                  : activeTab === "kiosk"
                  ? "Mode Kiosk Touchless menjalankan sensor pengenal lambaian tangan di layar penuh tanpa memerlukan sentuhan fisik atau tombol pada layar."
                  : "Bingkai Kreatif AI memberikan pencahayaan studio cerdas dan bingkai artistik kustom yang dapat disesuaikan dengan tema acara anda."}
              </p>

              <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Klik tab di bawah untuk melihat contoh visual</span>
              </div>
            </div>

            {/* Feature Tabs Selector */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div
                onClick={() => setActiveTab("strip")}
                className={`relative h-28 rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer ${
                  activeTab === "strip"
                    ? "border-primary ring-2 ring-primary/50 scale-[1.02]"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <Image
                  src="/sample/strip.png"
                  alt="Film Strip"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-2">
                  <span className="text-white text-[11px] font-bold">Film Strip</span>
                </div>
              </div>

              <div
                onClick={() => setActiveTab("kiosk")}
                className={`relative h-28 rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer ${
                  activeTab === "kiosk"
                    ? "border-primary ring-2 ring-primary/50 scale-[1.02]"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <Image
                  src="/sample/kiosk.png"
                  alt="Kiosk Mode"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-2">
                  <span className="text-white text-[11px] font-bold">Kiosk Mode</span>
                </div>
              </div>

              <div
                onClick={() => setActiveTab("frame")}
                className={`relative h-28 rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer ${
                  activeTab === "frame"
                    ? "border-primary ring-2 ring-primary/50 scale-[1.02]"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <Image
                  src="/sample/frame.png"
                  alt="AI Frame"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-2">
                  <span className="text-white text-[11px] font-bold">AI Frame</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===== FEATURE HIGHLIGHT BADGES ===== */}
      <section className="py-8 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Hand, label: "Kontrol Gestur Tangan", desc: "Sensitivitas Tinggi", color: "text-sky-500" },
              { icon: Sparkles, label: "Fitur AI Enhancement", desc: "Lighting & Filter", color: "text-orange-500" },
              { icon: Camera, label: "Kamera HD Presisi", desc: "1080p Crystal Clear", color: "text-blue-500" },
              { icon: QrCode, label: "Pengiriman Digital", desc: "Email & QR Instan", color: "text-emerald-500" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -3 }}
                className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-center gap-3.5"
              >
                <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-dark">{item.label}</h4>
                  <p className="text-xs text-light-muted">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== GALLERY SHOWCASE SECTION ===== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-black text-dark mb-4 tracking-tight">
              Galeri Hasil & Pengalaman Photobooth
            </h2>
            <p className="text-light-muted text-lg max-w-2xl mx-auto">
              Lihat bagaimana AI Box Photobooth menciptakan momen seru untuk pengguna di berbagai event
            </p>

            {/* Tab Selector */}
            <div className="flex justify-center gap-2 mt-8">
              {[
                { id: "strip", label: "Strip Photo Template" },
                { id: "kiosk", label: "Booth Kiosk Setup" },
                { id: "frame", label: "AI Creative Frame" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "bg-white text-dark/70 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Tab Preview */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xl"
          >
            <div className="md:col-span-2 relative h-[380px] sm:h-[450px] rounded-2xl overflow-hidden shadow-lg border border-gray-100">
              <Image
                src={
                  activeTab === "strip"
                    ? "/sample/strip.png"
                    : activeTab === "kiosk"
                    ? "/sample/kiosk.png"
                    : "/sample/frame.png"
                }
                alt="Photobooth Showcase"
                fill
                className="object-cover"
              />
            </div>

            <div className="flex flex-col justify-center space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-primary flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-dark">
                {activeTab === "strip"
                  ? "Kombinasi Pose Strip Kustom"
                  : activeTab === "kiosk"
                  ? "Setup Booth Elegan & Modern"
                  : "Filter & Bingkai Artistik AI"}
              </h3>
              <p className="text-light-muted text-base leading-relaxed">
                {activeTab === "strip"
                  ? "Pengguna dapat mengambil 3 hingga 4 pose berturut-turut yang secara otomatis disesuaikan ke dalam strip foto digital siap cetak atau download."
                  : activeTab === "kiosk"
                  ? "Desain kiosk interaktif yang cocok ditempatkan pada event pernikahan, ulang tahun, gathering perusahaan, dan expo produk."
                  : "Algoritma AI meningkatkan pencahayaan foto, melembutkan kulit, dan memberikan pilihan bingkai kustom sesuai tema acara."}
              </p>
              <div className="pt-2">
                <Link href="/login">
                  <span className="inline-flex items-center gap-2 text-primary font-bold hover:underline cursor-pointer">
                    Coba Pengalaman Sekarang <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== CARA KERJA SECTION ===== */}
      <section id="cara-kerja" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-primary bg-sky-50 px-4 py-1.5 rounded-full border border-sky-100">
              Mudah & Cepat
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-dark mt-4 mb-4 tracking-tight">
              4 Langkah Mudah Berfoto
            </h2>
            <p className="text-light-muted text-lg max-w-2xl mx-auto">
              Tidak perlu memegang perangkat, semua proses dilakukan dengan gestur dan perintah yang ramah pengguna.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                step: "01",
                icon: Hand,
                title: "Lambaikan Tangan",
                desc: "Cukup angkat atau lambaikan tangan ke depan kamera untuk mengaktifkan sesi photobooth.",
                color: "from-sky-500 to-blue-600",
              },
              {
                step: "02",
                icon: Camera,
                title: "Ambil Foto 3 Pose",
                desc: "Hitung mundur otomatis dengan panduan gestur untuk mengambil pose foto terbaikmu.",
                color: "from-orange-500 to-amber-600",
              },
              {
                step: "03",
                icon: Sparkles,
                title: "Pilih AI Style & Frame",
                desc: "Terapkan bingkai foto interaktif dan gaya AI yang sesuai dengan selera kamu.",
                color: "from-purple-500 to-indigo-600",
              },
              {
                step: "04",
                icon: QrCode,
                title: "Terima via QR & Email",
                desc: "Scan QR Code di layar atau masukkan email untuk mengunduh strip foto resolusi tinggi.",
                color: "from-emerald-500 to-teal-600",
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -6 }}
                className="group relative bg-white rounded-3xl p-7 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300"
              >
                {/* Step Badge */}
                <div className="absolute top-5 right-5 text-4xl font-black text-gray-100 group-hover:text-sky-100 transition-colors select-none">
                  {item.step}
                </div>

                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-lg shadow-gray-200`}
                >
                  <item.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-bold text-dark mb-3 relative z-10">
                  {item.title}
                </h3>
                <p className="text-light-muted text-sm sm:text-base leading-relaxed relative z-10">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COME JOIN / CONTACT SECTION ===== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-950 via-dark to-slate-900 text-white relative overflow-hidden">
        {/* Background Ambient Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-[100px]" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="mb-6 inline-block">
            <Logo size="md" variant="splash" animated />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black mb-6 tracking-tight">
            Hadirkan{" "}
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-orange-400 bg-clip-text text-transparent">
              AI Box Photobooth
            </span>{" "}
            di Acara Anda!
          </h2>
          <p className="text-white/80 text-lg sm:text-xl mb-10 leading-relaxed max-w-2xl mx-auto font-light">
            Sewa photobooth interaktif berbasis AI untuk Pernikahan, Ulang Tahun, Corporate Event, atau Expo.
            Hubungi tim kami via WhatsApp untuk penawaran khusus.
          </p>

          <motion.a
            href="https://wa.me/6281234567890?text=Halo%20AI%20Box%2C%20saya%20tertarik%20untuk%20menyewa%20photobooth"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-3 px-9 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full text-lg font-bold shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300"
          >
            <MessageCircle className="w-6 h-6" />
            Konsultasi & Sewa via WhatsApp
            <ChevronRight className="w-5 h-5" />
          </motion.a>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 px-4 bg-dark text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" variant="rounded" animated={false} />
            <div>
              <span className="text-white font-extrabold text-lg block leading-tight">
                AI Box Photobooth
              </span>
              <span className="text-white/50 text-xs">
                Smart Touchless PWA Experience
              </span>
            </div>
          </div>

          <p className="text-white/50 text-sm text-center md:text-right">
            &copy; {new Date().getFullYear()} AI Box Photobooth. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
