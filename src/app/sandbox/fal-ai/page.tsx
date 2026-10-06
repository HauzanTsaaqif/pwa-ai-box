"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Upload,
  Camera,
  RefreshCw,
  Download,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FolderCheck,
  Zap,
  Image as ImageIcon,
  Sliders,
  ShieldAlert,
} from "lucide-react";
import Logo from "@/components/Logo";

// Preset sampel foto untuk testing 1-klik instan
const SAMPLE_PHOTOS = [
  {
    id: "sample1",
    name: "Model Wanita (Sampel)",
    url: "/sample/strip.png",
  },
  {
    id: "sample2",
    name: "Kiosk Event (Sampel)",
    url: "/sample/kiosk.png",
  },
  {
    id: "sample3",
    name: "Frame Photobox (Sampel)",
    url: "/sample/frame.png",
  },
];

const STYLES = [
  {
    id: "ghibli",
    name: "Studio Ghibli",
    desc: "Anime watercolor pastel khas Hayao Miyazaki",
    icon: "🎨",
    gradient: "from-sky-500 to-indigo-600",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    desc: "Warna neon futuristik & latar kota futuristik",
    icon: "⚡",
    gradient: "from-purple-500 to-pink-600",
  },
  {
    id: "pixar",
    name: "Pixar 3D",
    desc: "Karakter animasi 3D kartun ekspresif",
    icon: "🎬",
    gradient: "from-orange-500 to-amber-600",
  },
  {
    id: "retro90s",
    name: "Retro 90s Anime",
    desc: "Gaya anime vintage cel-shading era 90-an",
    icon: "📺",
    gradient: "from-emerald-500 to-teal-600",
  },
];

export default function FalAiSandboxPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>("ghibli");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  
  // Status Generasi
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // Hasil Output
  const [outputImageUrl, setOutputImageUrl] = useState<string | null>(null);
  const [driveFolderUrl, setDriveFolderUrl] = useState<string | null>(null);
  const [drivePhotoUrl, setDrivePhotoUrl] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // State Kamera Webcam
  const [showWebcam, setShowWebcam] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Gantikan sample gambar bawaan pada awal load
  useEffect(() => {
    // Select sample 1 by default for easy testing
    convertUrlToBase64(SAMPLE_PHOTOS[0].url);
  }, []);

  // Helper untuk konversi URL gambar publik ke base64 Data URI
  const convertUrlToBase64 = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setSelectedImage(base64data);
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Failed to load sample image:", err);
    }
  };

  // Handler Upload File Lokal
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg("Ukuran file terlalu besar. Maksimal 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler Webcam Capture
  const startWebcam = async () => {
    try {
      setShowWebcam(true);
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Webcam access error:", err);
      setErrorMsg("Tidak dapat mengakses kamera. Pastikan izin kamera diizinkan browser.");
      setShowWebcam(false);
    }
  };

  const captureWebcam = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setSelectedImage(dataUrl);
        stopWebcam();
      }
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowWebcam(false);
  };

  // State tambahan untuk Mode Demo & Lock Status
  const [isLockedAccount, setIsLockedAccount] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // HANDLER UTAMA: PROSES GENERASI FAL.AI & UPLOAD GOOGLE DRIVE
  const handleGenerateAI = async (forceDemo = false) => {
    if (!selectedImage) {
      setErrorMsg("Silakan pilih atau unggah foto terlebih dahulu.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setInfoNotice(null);
    setIsLockedAccount(false);
    setOutputImageUrl(null);
    setDriveFolderUrl(null);
    setDrivePhotoUrl(null);

    const activeDemo = forceDemo || isDemoMode;

    try {
      // Step 1: Preprocessing
      setLoadingStep(1);
      await new Promise((r) => setTimeout(r, 600));

      // Step 2: Request Generasi Fal.ai / Mode Demo
      setLoadingStep(2);
      const startTime = Date.now();

      const falRes = await fetch("/api/fal-ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: selectedImage,
          prompt: customPrompt,
          style: selectedStyle,
          useDemo: activeDemo,
        }),
      });

      const falData = await falRes.json();

      if (!falData.success) {
        if (falData.isLocked) {
          setIsLockedAccount(true);
          setInfoNotice(falData.instructions);
          return;
        } else if (falData.isConfigured === false) {
          setInfoNotice(falData.instructions || falData.error);
        }
        throw new Error(falData.error || "Gagal melakukan generasi gambar.");
      }

      const generatedUrl = falData.outputImageUrl;
      setOutputImageUrl(generatedUrl);
      setExecutionTime(Math.round((Date.now() - startTime) / 100) / 10);

      if (falData.isDemo) {
        setInfoNotice("Mode Simulasi Demo Aktif. Seluruh alur (termasuk upload ke Google Drive) berhasil diuji coba!");
      }

      // Step 3: Convert URL Hasil Fal.ai ke Base64 untuk disimpan ke Google Drive
      setLoadingStep(3);
      const generatedImageBase64 = await convertUrlToBase64(generatedUrl);

      // Step 4: Upload ke Google Drive via /api/upload-drive
      setLoadingStep(4);
      const driveRes = await fetch("/api/upload-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: "GHIBLI_SANDBOX",
          fileName: `ghibli_ai_${Date.now()}.jpg`,
          imageBase64: generatedImageBase64 || selectedImage,
        }),
      });

      const driveData = await driveRes.json();

      if (driveData.success) {
        setDriveFolderUrl(driveData.folderUrl || driveData.publicUrl);
        setDrivePhotoUrl(driveData.publicPhotoUrl || driveData.folderUrl);
      }
    } catch (err: any) {
      console.error("Generasi Error:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses gambar.");
    } finally {
      setIsGenerating(false);
      setLoadingStep(0);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* HEADER NAVBAR */}
      <header className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </Link>
            <div className="h-5 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-2">
              <Logo size="sm" variant="rounded" animated={false} />
              <span className="font-extrabold text-base bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text text-transparent">
                Fal.AI Ghibli Sandbox
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Free Trial Mode</span>
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* NOTICE BANNER PROMO TERIAL GRATIS */}
        <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-purple-950/80 border border-sky-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Uji Coba Sandbox Fal.AI</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Generate Foto-to-Foto Ghibli AI + Auto Upload Google Drive
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                Coba eksperimen AI tanpa biaya berlangganan! Cukup daftarkan akun gratis di{" "}
                <a
                  href="https://fal.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 underline font-bold hover:text-sky-300"
                >
                  fal.ai
                </a>{" "}
                (dapat Free Trial Credits), salin API Key ke <code>.env.local</code> sebagai <code>FAL_KEY</code>.
              </p>
            </div>
          </div>
        </div>

        {/* ERROR & INFO MESSAGES */}
        {isLockedAccount && (
          <div className="bg-amber-950/90 border border-amber-500/50 rounded-2xl p-5 text-amber-200 text-xs sm:text-sm space-y-3 shadow-xl">
            <div className="flex items-center gap-2 font-bold text-base text-amber-300">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span>Akun Fal.ai Terkunci (Reason: TOP_UP / Butuh Saldo $1)</span>
            </div>
            <p className="leading-relaxed">
              Fal.ai mewajibkan minimal top-up saldo $1 - $5 pada{" "}
              <a href="https://fal.ai/dashboard/billing" target="_blank" rel="noreferrer" className="underline font-bold text-amber-300">
                Fal.ai Billing Dashboard
              </a>{" "}
              untuk mengaktifkan panggilan API Key. Namun, Anda dapat menguji seluruh alur aplikasi secara **100% GRATIS** menggunakan <strong>Mode Simulasi Demo</strong> di bawah ini!
            </p>
            <div className="pt-1 flex flex-wrap gap-3">
              <button
                onClick={() => handleGenerateAI(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Zap className="w-4 h-4" />
                <span>⚡ Coba Mode Simulasi Demo Sekarang</span>
              </button>
              <a
                href="https://fal.ai/dashboard/billing"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-semibold border border-amber-500/30 flex items-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka Dashboard Billing Fal.ai</span>
              </a>
            </div>
          </div>
        )}

        {infoNotice && !isLockedAccount && (
          <div className="bg-amber-950/80 border border-amber-500/40 rounded-2xl p-5 text-amber-200 text-xs sm:text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-amber-300">Informasi Sandbox:</span>
              <p className="leading-relaxed">{infoNotice}</p>
            </div>
          </div>
        )}

        {errorMsg && !isLockedAccount && (
          <div className="bg-rose-950/80 border border-rose-500/40 rounded-2xl p-4 text-rose-200 text-xs sm:text-sm flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT PANEL: INPUT & CONFIGURATION (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            {/* INPUT FOTO */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>1. Pilih Foto Input</span>
                <span className="text-xs text-sky-400 font-normal">HD 1080p</span>
              </h2>

              {/* WEBCAM PREVIEW MODAL IF ACTIVE */}
              {showWebcam ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-700">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={captureWebcam}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Ambil Foto</span>
                    </button>
                    <button
                      onClick={stopWebcam}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* PREVIEW SELECTED IMAGE */}
                  <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-[4/3] border border-slate-800 flex items-center justify-center group">
                    {selectedImage ? (
                      <Image
                        src={selectedImage}
                        alt="Selected Input"
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="text-center p-6 space-y-2 text-slate-500">
                        <ImageIcon className="w-10 h-10 mx-auto text-slate-600" />
                        <p className="text-xs">Belum ada foto yang dipilih</p>
                      </div>
                    )}
                  </div>

                  {/* INPUT CONTROLS */}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4 text-sky-400" />
                      <span>Unggah File</span>
                    </button>
                    <button
                      onClick={startWebcam}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4 text-purple-400" />
                      <span>Gunakan Webcam</span>
                    </button>
                  </div>

                  {/* PRESET SAMPLES (1-CLICK TEST) */}
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                      Atau pilih sampel foto instant (1-klik tes):
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {SAMPLE_PHOTOS.map((sample) => (
                        <button
                          key={sample.id}
                          onClick={() => convertUrlToBase64(sample.url)}
                          className="relative h-16 rounded-lg overflow-hidden border border-slate-800 hover:border-sky-500 transition-all group"
                        >
                          <Image src={sample.url} alt={sample.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* PRESET STYLE SELECTION */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>2. Pilih Gaya AI (Theme Preset)</span>
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {STYLES.map((style) => {
                  const isSelected = selectedStyle === style.id;
                  return (
                    <div
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-slate-800 border-sky-500 ring-2 ring-sky-500/30"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{style.icon}</span>
                        <span className="text-xs font-bold text-white">{style.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">{style.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* CUSTOM PROMPT OPTIONAL */}
              <div className="pt-1">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Custom Prompt Tambahan (Opsional):
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Misal: wearing glasses, smiling face..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* GENERATE BUTTON */}
            <button
              onClick={() => handleGenerateAI(false)}
              disabled={isGenerating || !selectedImage}
              className={`w-full py-4 rounded-2xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-3 ${
                isGenerating || !selectedImage
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-gradient-to-r from-sky-500 via-blue-600 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white shadow-sky-500/25 hover:shadow-sky-500/40"
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Sedang Melukis AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Foto Ghibli AI</span>
                </>
              )}
            </button>
          </div>

          {/* RIGHT PANEL: RESULT PREVIEW & GOOGLE DRIVE SYNC (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[520px] flex flex-col justify-between space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>3. Hasil Generasi & Sinkronisasi Drive</span>
                </h2>
                {executionTime && (
                  <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    ⏱️ Latensi GPU: {executionTime}s
                  </span>
                )}
              </div>

              {/* LOADING OVERLAY ANIMATION */}
              <AnimatePresence>
                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-6"
                  >
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-sky-500/20 border-t-sky-400 animate-spin" />
                      <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                    </div>

                    <div className="space-y-2 max-w-sm">
                      <h3 className="text-lg font-bold text-white">
                        {loadingStep === 1
                          ? "Menyiapkan Gambar Input..."
                          : loadingStep === 2
                          ? "Mengirim ke Fal.AI Serverless GPU..."
                          : loadingStep === 3
                          ? "Melukis Gaya Studio Ghibli..."
                          : "Mengunggah Hasil ke Google Drive..."}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Proses inferensi AI berlangsung sangat cepat (~2.5 detik). Mohon tunggu sejenak.
                      </p>
                    </div>

                    {/* PROGRESS BAR STEPS */}
                    <div className="w-full max-w-xs bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-sky-400 to-purple-500 h-full transition-all duration-500"
                        style={{ width: `${(loadingStep / 4) * 100}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* MAIN DISPLAY AREA */}
              {outputImageUrl ? (
                <div className="space-y-6">
                  {/* BEFORE AFTER COMPARISON PREVIEW */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* ORIGINAL INPUT */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-400 block text-center">
                        Foto Asli (Original Input)
                      </span>
                      <div className="relative h-64 sm:h-72 rounded-xl overflow-hidden bg-black border border-slate-800">
                        {selectedImage && (
                          <Image src={selectedImage} alt="Original" fill className="object-contain" />
                        )}
                      </div>
                    </div>

                    {/* AI GENERATED RESULT */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-sky-400 block text-center flex items-center justify-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Hasil Anime Ghibli AI
                      </span>
                      <div className="relative h-64 sm:h-72 rounded-xl overflow-hidden bg-black border border-sky-500/40 ring-2 ring-sky-500/20 glow-effect">
                        <Image src={outputImageUrl} alt="Ghibli AI Output" fill className="object-contain" />
                      </div>
                    </div>
                  </div>

                  {/* GOOGLE DRIVE SYNC CARD RESULT */}
                  {driveFolderUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 text-xs space-y-3"
                    >
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span className="flex items-center gap-2">
                          <FolderCheck className="w-4 h-4" />
                          <span>Foto Berhasil Tersimpan di Google Drive!</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px]">Auto Sync</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        Hasil foto telah diunggah secara otomatis ke folder publik Google Drive project PWA AI Box.
                      </p>
                      <div className="flex flex-wrap gap-3 pt-1">
                        <a
                          href={driveFolderUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka Folder Google Drive</span>
                        </a>
                        {drivePhotoUrl && (
                          <a
                            href={drivePhotoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center gap-2 transition-colors border border-slate-700"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                            <span>Lihat Link File Langsung</span>
                          </a>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* ACTION DOWNLOAD BUTTONS */}
                  <div className="flex justify-end gap-3 pt-2">
                    <a
                      href={outputImageUrl}
                      download="ghibli_ai_photobox.jpg"
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Foto HD</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="my-auto text-center py-12 px-4 space-y-3 text-slate-500">
                  <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-300">Belum Ada Hasil Generasi</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Pilih foto input di panel kiri, tentukan gaya AI yang diinginkan, lalu klik tombol <strong>Generate Foto Ghibli AI</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
