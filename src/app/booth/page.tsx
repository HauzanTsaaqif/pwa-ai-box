"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hand,
  CheckCircle2,
  Sparkles,
  Camera,
  QrCode,
  ThumbsUp,
  ThumbsDown,
  Zap,
  ArrowLeft,
  Check,
  Mic,
  MicOff,
  Printer,
  Mail,
  RotateCcw,
  Download,
  Layers,
  Palette,
  CreditCard,
  Heart,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Target,
} from "lucide-react";

function PeaceIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 12V4a1.5 1.5 0 0 1 3 0v6.5" />
      <path d="M12 10.5V2a1.5 1.5 0 0 1 3 0v8.5" />
      <path d="M15 11a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-3a1.5 1.5 0 0 1 3 0" />
    </svg>
  );
}

import { isLoggedIn, getSession, clearSession, validateAdmin } from "@/lib/auth";
import {
  MediaPipeManager,
  drawHandSkeleton,
  type GestureResult,
  type GestureType,
} from "@/lib/mediapipe";
import Logo from "@/components/Logo";
import { QRCodeSVG } from "qrcode.react";

// ===== CONSTANTS & ENVIRONMENT CONTROLS =====
const HIDDEN_TAP_THRESHOLD = 5;
const HIDDEN_TAP_TIMEOUT = 3000;
const IDLE_FPS = 6;
const ACTIVE_FPS = 15;
const IS_DEBUG = process.env.NEXT_PUBLIC_DEBUG_MODE === "true";
const ENABLE_PAYMENT = process.env.NEXT_PUBLIC_ENABLE_PAYMENT !== "false";
const FREE_MODE_POSES = parseInt(process.env.NEXT_PUBLIC_FREE_MODE_POSES || "4", 10);

// ===== BOOTH STEPS =====
export type BoothStep =
  | "welcome_intro"    // Solid 5s welcome screen
  | "gesture_tutorial" // Interactive hand movement practice screen
  | "select_package"   // Pilih Paket (80-90% opacity overlay)
  | "select_format"    // Pilih Ukuran / Format (80-90% opacity overlay)
  | "select_theme"     // Pilih Tema / Template (Visual frame mockups with pagination)
  | "payment_qris"     // Bayar QRIS
  | "pose_ready"       // Pose Ready (Standby before countdown)
  | "countdown"        // Countdown & Capture
  | "preview_retake"   // Preview / Retake
  | "processing"       // Processing 300 DPI
  | "print_session"    // Print confirmation
  | "upload_digital"   // Upload Digital (Email + Drive)
  | "qr_download"      // QR Download
  | "thank_you";       // Thank You / Reset

// ===== DATA DEFINITIONS =====
export interface PackageItem {
  id: string;
  name: string;
  price: string;
  rawPrice: number;
  poses: number;
  badge?: string;
  description: string;
  features: string[];
}

export interface FormatItem {
  id: string;
  name: string;
  ratio: string;
  description: string;
  badge?: string;
}

export interface ThemeItem {
  id: string;
  name: string;
  tagline: string;
  bgHex: string;
  textHex: string;
  accentHex: string;
  borderHex: string;
  description: string;
  styleVariant: "noir" | "honey" | "midnight" | "pastel" | "vintage" | "kodak";
}

const PACKAGES: PackageItem[] = [
  {
    id: "basic",
    name: "Basic Strip",
    price: "Rp 25.000",
    rawPrice: 25000,
    poses: 3,
    description: "Sesi foto esensial untuk 1-2 orang",
    features: ["3 Pose Foto HD", "Digital Download QR", "Lighting Studio Presisi"],
  },
  {
    id: "popular",
    name: "Popular AI",
    price: "Rp 35.000",
    rawPrice: 35000,
    poses: 4,
    badge: "Paling Laris",
    description: "Favorit pengunjung dengan 4 pose lengkap",
    features: ["4 Pose Foto HD", "Semua Tema Estetik", "Kirim Email + Download QR"],
  },
  {
    id: "vip",
    name: "VIP Unlimited",
    price: "Rp 50.000",
    rawPrice: 50000,
    poses: 6,
    badge: "VIP Studio",
    description: "Keseruan maksimal untuk grup & party",
    features: ["6 Pose Multi-Frame", "Kustom Frame & Logo", "Softcopy HD + Print Siap"],
  },
];

const FORMATS: FormatItem[] = [
  {
    id: "strip_2x6",
    name: "Classic Strip (2x6)",
    ratio: "2:6 Vertikal",
    description: "Format photobox klasik terfavorit, ideal untuk saku & bookmark.",
    badge: "Terpopuler",
  },
  {
    id: "postcard_4x6",
    name: "Wide Postcard (4x6)",
    ratio: "4:6 Landscape",
    description: "Format kartu pos estetik dengan bidang foto luas untuk grup.",
  },
  {
    id: "square_4x4",
    name: "Square Grid (4x4)",
    ratio: "1:1 Kotak",
    description: "Format grid modern estetik untuk feed Instagram & album.",
  },
];

const THEMES: ThemeItem[] = [
  {
    id: "noir",
    name: "Minimalist Noir",
    tagline: "STUDIO NOIR // EDITORIAL",
    bgHex: "#090a12",
    textHex: "#f7f7fb",
    accentHex: "#9b9eaf",
    borderHex: "#292b3b",
    description: "Monokrom mewah & editorial kelas galeri.",
    styleVariant: "noir",
  },
  {
    id: "honey",
    name: "Warm Honey Studio",
    tagline: "HONEY MOMENTS // WARM TONE",
    bgHex: "#14110f",
    textHex: "#fff7ed",
    accentHex: "#f0a25c",
    borderHex: "#452e1f",
    description: "Nuansa hangat kuning-mustard estetik & bersahabat.",
    styleVariant: "honey",
  },
  {
    id: "midnight",
    name: "Midnight Royal",
    tagline: "NIGHTFALL EDITION // CYBER",
    bgHex: "#0a0e1a",
    textHex: "#ffffff",
    accentHex: "#246cff",
    borderHex: "#1e2c4f",
    description: "Biru malam elegan dengan aksen royal blue.",
    styleVariant: "midnight",
  },
  {
    id: "pastel",
    name: "Pastel Dream",
    tagline: "CHERRY BLOSSOM // SWEET",
    bgHex: "#1c1421",
    textHex: "#fdf2f8",
    accentHex: "#f472b6",
    borderHex: "#3b2344",
    description: "Sentuhan lembut manis untuk momen ceria.",
    styleVariant: "pastel",
  },
  {
    id: "vintage",
    name: "Vintage Y2K",
    tagline: "Y2K DIGITAL ARCHIVE // 2000s",
    bgHex: "#12141c",
    textHex: "#e2e8f0",
    accentHex: "#38bdf8",
    borderHex: "#334155",
    description: "Sentuhan retro futuristik dengan stempel cyber Y2K.",
    styleVariant: "vintage",
  },
  {
    id: "kodak",
    name: "Classic Film 35mm",
    tagline: "ANALOG EMULSION // ISO 400",
    bgHex: "#181512",
    textHex: "#fef3c7",
    accentHex: "#fbbf24",
    borderHex: "#422006",
    description: "Bingkai film analog vintage dengan perforasi rol film.",
    styleVariant: "kodak",
  },
];

export default function BoothPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaPipeRef = useRef<MediaPipeManager | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Booth State Machine
  const [mounted, setMounted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [stepState, setStepState] = useState<BoothStep>("welcome_intro");
  const stepRef = useRef<BoothStep>("welcome_intro");
  const stepEntryTimeRef = useRef<number>(Date.now());
  const lastProcessedGestureRef = useRef<GestureType>("none");

  // Selection States
  const [selectedPkg, setSelectedPkg] = useState<PackageItem | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatItem>(FORMATS[0]);
  const [selectedTheme, setSelectedTheme] = useState<ThemeItem>(THEMES[0]);
  const [themePage, setThemePage] = useState<number>(0);

  // Selection Locking & Dwell Cooldown
  const [lockedSelectionId, setLockedSelectionId] = useState<string | null>(null);
  const dwellCooldownRef = useRef<number>(0);
  const isTransitioningRef = useRef<boolean>(false);

  const setStep = useCallback((newStep: BoothStep) => {
    stepRef.current = newStep;
    stepEntryTimeRef.current = Date.now();
    dwellCooldownRef.current = Date.now() + 1000; // 1s cooldown on every step change
    setLockedSelectionId(null);
    setStepState(newStep);
  }, []);
  const step = stepState;

  // Photo Capture & Selection State
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);

  // Gesture & Cursor Tracking State
  const [lastDetectedGesture, setLastDetectedGesture] = useState<GestureType>("none");
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef<any>({});
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);

  // Interactive Gesture Tutorial State
  const [tutorialProgress, setTutorialProgress] = useState(0);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Timers & Dynamic Inputs
  const [welcomeCountdown, setWelcomeCountdown] = useState(5);
  const [qrisTimer, setQrisTimer] = useState(5);
  const [photoCountdown, setPhotoCountdown] = useState(3);
  const [processProgress, setProcessProgress] = useState(0);
  const [printCopies, setPrintCopies] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [qrTimer, setQrTimer] = useState(20);
  const [thankYouTimer, setThankYouTimer] = useState(5);
  const [xenonFlash, setXenonFlash] = useState(false);

  // Email & Upload
  const [emailInputState, setEmailInputState] = useState("");
  const emailInputRef = useRef("");
  const setEmailInput = useCallback((val: string | ((prev: string) => string)) => {
    if (typeof val === "function") {
      setEmailInputState((prev) => {
        const newVal = val(prev);
        emailInputRef.current = newVal;
        return newVal;
      });
    } else {
      emailInputRef.current = val;
      setEmailInputState(val);
    }
  }, []);
  const emailInput = emailInputState;
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const isRecordingVoiceRef = useRef(false);

  const [isUploading, setIsUploading] = useState(false);
  const [driveFolderUrl, setDriveFolderUrl] = useState("");
  const [driveFolderName, setDriveFolderName] = useState("");
  const photostripBase64Ref = useRef<string>("");

  // Admin Modal State
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [hiddenTapCount, setHiddenTapCount] = useState(0);

  // ===== 1. WELCOME SCREEN 5-SECOND SOLID INTRO =====
  useEffect(() => {
    if (step === "welcome_intro") {
      setWelcomeCountdown(5);
      const timer = setInterval(() => {
        setWelcomeCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setStep("gesture_tutorial");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step, setStep]);

  // ===== CAMERA SNAPSHOT HELPER =====
  const captureSnapshot = useCallback(() => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Horizontal mirror to match video feed view
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.92);
  }, []);

  // ===== SPEECH RECOGNITION =====
  const startRecordingVoice = useCallback(() => {
    if (typeof window === "undefined" || isRecordingVoiceRef.current) return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "id-ID";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const rawTranscript = event.results[0][0].transcript.toLowerCase();
        let formatted = rawTranscript
          .replace(/\s+at\s+/g, "@")
          .replace(/\s+et\s+/g, "@")
          .replace(/\s+dot\s+/g, ".")
          .replace(/\s+titik\s+/g, ".")
          .replace(/\s+/g, "");

        setEmailInput((prev) => (prev ? `${prev}${formatted}` : formatted));
      };

      recognition.onend = () => {
        setIsRecordingVoice(false);
        isRecordingVoiceRef.current = false;
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
      setIsRecordingVoice(true);
      isRecordingVoiceRef.current = true;
    } catch {
      setIsRecordingVoice(false);
      isRecordingVoiceRef.current = false;
    }
  }, [setEmailInput]);

  const stopRecordingVoice = useCallback(() => {
    if (speechRecognitionRef.current && isRecordingVoiceRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch { }
    }
    setIsRecordingVoice(false);
    isRecordingVoiceRef.current = false;
  }, []);

  // ===== CANVAS COMPOSITING (300 DPI MULTI-THEME ENGINE) =====
  const generateFilmStrip = useCallback(
    async (photoUrls: string[]): Promise<string> => {
      return new Promise((resolve) => {
        if (photoUrls.length === 0) return resolve("");
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve("");

        const theme = selectedTheme || THEMES[0];
        const format = selectedFormat || FORMATS[0];

        let canvasWidth = 800;
        let canvasHeight = 1800;

        if (format.id === "postcard_4x6") {
          canvasWidth = 1800;
          canvasHeight = 1200;
        } else if (format.id === "square_4x4") {
          canvasWidth = 1400;
          canvasHeight = 1400;
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Background
        ctx.fillStyle = theme.bgHex;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Border frame
        ctx.strokeStyle = theme.borderHex;
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, canvasWidth - 14, canvasHeight - 14);

        // Header Text
        ctx.fillStyle = theme.textHex;
        ctx.font = "bold 40px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("AI BOX PHOTOBOOTH", canvasWidth / 2, 70);

        ctx.fillStyle = theme.accentHex;
        ctx.font = "600 19px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText(theme.tagline || "CAPTURE YOUR ESSENCE // STUDIO EDITION", canvasWidth / 2, 105);

        const drawImageCover = (
          image: HTMLImageElement,
          x: number,
          y: number,
          w: number,
          h: number
        ) => {
          const imgRatio = image.width / image.height;
          const targetRatio = w / h;
          let sx = 0;
          let sy = 0;
          let sWidth = image.width;
          let sHeight = image.height;

          if (imgRatio > targetRatio) {
            sWidth = image.height * targetRatio;
            sx = (image.width - sWidth) / 2;
          } else {
            sHeight = image.width / targetRatio;
            sy = (image.height - sHeight) / 2;
          }

          ctx.drawImage(image, sx, sy, sWidth, sHeight, x, y, w, h);
        };

        let loaded = 0;
        const imgs: HTMLImageElement[] = [];

        photoUrls.forEach((url, i) => {
          const img = new Image();
          img.onload = () => {
            loaded++;
            imgs[i] = img;
            if (loaded === photoUrls.length) {
              if (format.id === "strip_2x6") {
                const padX = 40;
                const padY = 24;
                const startY = 135;
                const availableH = canvasHeight - startY - 90;
                const singleH = (availableH - padY * (photoUrls.length - 1)) / photoUrls.length;
                const singleW = canvasWidth - padX * 2;

                imgs.forEach((loadedImg, idx) => {
                  const y = startY + idx * (singleH + padY);
                  drawImageCover(loadedImg, padX, y, singleW, singleH);
                });
              } else if (format.id === "postcard_4x6") {
                const cols = 2;
                const rows = Math.ceil(photoUrls.length / 2);
                const pad = 30;
                const startY = 140;
                const cellW = (canvasWidth - pad * 3) / cols;
                const cellH = (canvasHeight - startY - 90 - pad * (rows - 1)) / rows;

                imgs.forEach((loadedImg, idx) => {
                  const col = idx % cols;
                  const row = Math.floor(idx / cols);
                  const x = pad + col * (cellW + pad);
                  const y = startY + row * (cellH + pad);
                  drawImageCover(loadedImg, x, y, cellW, cellH);
                });
              } else {
                const cols = 2;
                const pad = 30;
                const startY = 140;
                const cellW = (canvasWidth - pad * 3) / cols;
                const cellH = (canvasHeight - startY - 90 - pad) / 2;

                imgs.forEach((loadedImg, idx) => {
                  if (idx >= 4) return;
                  const col = idx % cols;
                  const row = Math.floor(idx / cols);
                  const x = pad + col * (cellW + pad);
                  const y = startY + row * (cellH + pad);
                  drawImageCover(loadedImg, x, y, cellW, cellH);
                });
              }

              // Footer
              ctx.fillStyle = theme.accentHex;
              ctx.font = "italic 20px -apple-system, BlinkMacSystemFont, sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(
                `Elevated by aibox • ${new Date().toLocaleDateString("id-ID")}`,
                canvasWidth / 2,
                canvasHeight - 35
              );

              resolve(canvas.toDataURL("image/jpeg", 0.94));
            }
          };
          img.src = url;
        });
      });
    },
    [selectedFormat, selectedTheme]
  );

  // ===== GOOGLE DRIVE UPLOAD HANDLER =====
  const handleStartDriveUpload = useCallback(async () => {
    if (isUploading) return;
    setIsUploading(true);

    let urls = capturedPhotos.filter(Boolean);
    if (urls.length === 0) return;

    let imagesToUpload = urls.map((url, i) => ({
      base64: url,
      fileName: `pose_${i + 1}.jpg`,
    }));

    if (photostripBase64Ref.current) {
      imagesToUpload.push({
        base64: photostripBase64Ref.current,
        fileName: "photostrip.jpg",
      });
    }

    try {
      const driveRes = await fetch("/api/upload-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: "AIBOX_GUEST",
          images: imagesToUpload,
        }),
      });

      const driveData = await driveRes.json();
      if (driveData.success) {
        setDriveFolderUrl(driveData.folderUrl || driveData.publicUrl || "");
        setDriveFolderName(driveData.folderName || "AIBox_Photos");
      }
    } catch (err) {
      console.error("Failed to upload to Google Drive:", err);
    } finally {
      setIsUploading(false);
    }
  }, [capturedPhotos, isUploading]);

  // ===== EMAIL SEND HANDLER =====
  const handleSendEmail = useCallback(
    async (emailTarget?: string) => {
      const target = (emailTarget !== undefined ? emailTarget : emailInput).trim();
      if (!target || !driveFolderUrl) return;

      let finalTarget = target;
      if (!finalTarget.includes("@")) {
        finalTarget += "@gmail.com";
      }

      try {
        await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toEmail: finalTarget,
            userName: "Sahabat AI Box",
            publicPhotoUrl: driveFolderUrl,
            folderUrl: driveFolderUrl,
            folderName: driveFolderName || "AIBox_Photos",
            imageBase64: photostripBase64Ref.current,
          }),
        });
      } catch (err) {
        console.error("Failed to send email:", err);
      }
    },
    [emailInput, driveFolderUrl, driveFolderName]
  );

  // ===== INIT CAMERA & MEDIAPIPE =====
  useEffect(() => {
    setMounted(true);

    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);

          if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
          }
        }

        const handleResize = () => {
          if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
          }
        };
        window.addEventListener("resize", handleResize);

        const mp = await MediaPipeManager.create();
        if (cancelled) {
          mp.destroy();
          window.removeEventListener("resize", handleResize);
          return;
        }

        mediaPipeRef.current = mp;

        if (videoRef.current) {
          mp.setVideo(videoRef.current);
        }

        // Set up MediaPipe Callback
        mp.onGesture((result: GestureResult) => {
          setLastDetectedGesture(result.gesture);

          // Draw full hand skeleton on canvas
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
              if (result.landmarks && result.landmarks.length >= 21) {
                drawHandSkeleton(
                  ctx,
                  result.landmarks,
                  canvasRef.current.width,
                  canvasRef.current.height,
                  IS_DEBUG ? result.gesture : ""
                );
              } else {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }
            }
          }

          // Track Hand Gesture Cursor Position (Index Finger Tip #8)
          if (result.landmarks && result.landmarks[8]) {
            const indexTip = result.landmarks[8];
            const px = (1 - indexTip.x) * 100;
            const py = indexTip.y * 100;
            cursorPosRef.current = { x: px, y: py };
            if (cursorRef.current) {
              cursorRef.current.style.left = `${px}%`;
              cursorRef.current.style.top = `${py}%`;
              cursorRef.current.style.opacity = "1";
            }
          } else {
            cursorPosRef.current = null;
            if (cursorRef.current) {
              cursorRef.current.style.opacity = "0";
            }
          }

          const canTriggerAction = Date.now() - stepEntryTimeRef.current > 1000;

          if (result.gesture === "none") {
            lastProcessedGestureRef.current = "none";
          }

          const isNewGesture =
            result.gesture !== "none" && result.gesture !== lastProcessedGestureRef.current;
          const canTriggerNewGestureAction = canTriggerAction && isNewGesture;

          // POSE READY STEP: Peace Gesture ✌️ Trigger Photo Countdown
          if (stepRef.current === "pose_ready" && result.gesture === "peace" && canTriggerNewGestureAction) {
            lastProcessedGestureRef.current = result.gesture;
            callbacksRef.current.setStep?.("countdown");
          }

          // PREVIEW / RETAKE STEP: Thumbs Up 👍 (Continue) / Thumbs Down 👎 (Retake)
          if (stepRef.current === "preview_retake" && canTriggerNewGestureAction) {
            if (result.gesture === "thumbs_up") {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.handleConfirmPreview?.();
            } else if (result.gesture === "thumbs_down") {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.handleRetake?.();
            }
          }

          // UPLOAD DIGITAL STEP: Voice input with Fist ✊ and Open Palm 🖐️
          if (stepRef.current === "upload_digital") {
            if (result.gesture === "fist" && canTriggerNewGestureAction) {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.startRecordingVoice?.();
            } else if (result.gesture === "open_palm" && canTriggerNewGestureAction) {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.stopRecordingVoice?.();
            }
          }
        });

        mp.setTargetFPS(ACTIVE_FPS);
        mp.activate();
      } catch (err) {
        console.error("Camera/MediaPipe init error:", err);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
      cleanup();
    };
  }, [router]);

  // ===== INTERACTIVE GESTURE TUTORIAL / WARM-UP DETECTION =====
  useEffect(() => {
    if (step !== "gesture_tutorial") return;

    let progress = 0;
    const interval = setInterval(() => {
      const pos = cursorPosRef.current;
      if (!pos) {
        setTutorialProgress(0);
        return;
      }

      // Check if cursor is near center target zone (around x: 50%, y: 56%)
      const dx = pos.x - 50;
      const dy = pos.y - 56;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 15) {
        // Hand is hovering inside the tutorial target circle!
        progress = Math.min(100, progress + 12);
        setTutorialProgress(progress);

        if (progress >= 100) {
          clearInterval(interval);
          setTutorialCompleted(true);
          setTimeout(() => {
            setStep("select_package");
          }, 900);
        }
      } else {
        progress = Math.max(0, progress - 8);
        setTutorialProgress(progress);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [step, setStep]);

  // ===== ROBUST DWELL HOVER CLICK WITH COOLDOWN & CONFIRMATION DELAY =====
  useEffect(() => {
    const hoverInterval = setInterval(() => {
      const currentStep = stepRef.current;
      const currentPos = cursorPosRef.current;

      const isSelectionStep =
        currentStep === "select_package" ||
        currentStep === "select_format" ||
        currentStep === "select_theme";

      if (!isSelectionStep || !currentPos || Date.now() < dwellCooldownRef.current || isTransitioningRef.current) {
        if (hoveredItemId) {
          setHoveredItemId(null);
          setDwellProgress(0);
          if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
        }
        return;
      }

      const elements = document.elementsFromPoint(
        (currentPos.x / 100) * window.innerWidth,
        (currentPos.y / 100) * window.innerHeight
      );

      const itemElem = elements.find((el) => el.getAttribute("data-dwell-id"));

      if (itemElem) {
        const itemId = itemElem.getAttribute("data-dwell-id");
        if (itemId && itemId !== hoveredItemId) {
          setHoveredItemId(itemId);
          setDwellProgress(0);

          if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);

          let startTime = Date.now();
          dwellTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, Math.round((elapsed / 1300) * 100)); // 1.3s dwell
            setDwellProgress(pct);

            if (pct >= 100) {
              clearInterval(dwellTimerRef.current!);
              itemElem.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            }
          }, 40);
        }
      } else {
        if (hoveredItemId) {
          setHoveredItemId(null);
          setDwellProgress(0);
          if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
        }
      }
    }, 80);

    return () => clearInterval(hoverInterval);
  }, [hoveredItemId]);

  // ===== SELECTION HANDLERS WITH CONFIRMATION PAUSE =====
  const handleSelectPackage = (pkg: PackageItem) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setLockedSelectionId(pkg.id);
    setSelectedPkg(pkg);
    setHoveredItemId(null);
    setDwellProgress(0);
    if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);

    setTimeout(() => {
      isTransitioningRef.current = false;
      setStep("select_format");
    }, 800);
  };

  const handleSelectFormat = (fmt: FormatItem) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setLockedSelectionId(fmt.id);
    setSelectedFormat(fmt);
    setHoveredItemId(null);
    setDwellProgress(0);
    if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);

    setTimeout(() => {
      isTransitioningRef.current = false;
      setStep("select_theme");
    }, 800);
  };

  const handleSelectTheme = (thm: ThemeItem) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setLockedSelectionId(thm.id);
    setSelectedTheme(thm);
    setHoveredItemId(null);
    setDwellProgress(0);
    if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);

    setTimeout(() => {
      isTransitioningRef.current = false;
      if (!ENABLE_PAYMENT) {
        setCapturedPhotos([]);
        setCurrentPoseIndex(0);
        setStep("pose_ready");
      } else {
        setStep("payment_qris");
      }
    }, 800);
  };

  // ===== QRIS PAYMENT SIMULATION TIMER =====
  useEffect(() => {
    if (step === "payment_qris") {
      setQrisTimer(5);
      const interval = setInterval(() => {
        setQrisTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCapturedPhotos([]);
            setCurrentPoseIndex(0);
            setStep("pose_ready");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step, setStep]);

  // ===== PHOTO COUNTDOWN & SNAPSHOT CAPTURE ENGINE =====
  useEffect(() => {
    if (step === "countdown") {
      setPhotoCountdown(3);

      const interval = setInterval(() => {
        setPhotoCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);

            // Studio Xenon Flash
            setXenonFlash(true);
            setTimeout(() => setXenonFlash(false), 300);

            const snapshot = captureSnapshot();
            if (snapshot) {
              setCapturedPhotos((prevPhotos) => {
                const updated = [...prevPhotos, snapshot];
                const totalPoses = selectedPkg?.poses || 3;

                if (updated.length < totalPoses) {
                  setCurrentPoseIndex(updated.length);
                  setTimeout(() => setStep("pose_ready"), 700);
                } else {
                  setTimeout(() => setStep("preview_retake"), 700);
                }
                return updated;
              });
            } else {
              setTimeout(() => setStep("preview_retake"), 500);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step, captureSnapshot, selectedPkg, setStep]);

  // ===== PROCESSING (CANVAS COMPOSITING 300 DPI) =====
  useEffect(() => {
    if (step === "processing") {
      setProcessProgress(15);
      const progTimer = setInterval(() => {
        setProcessProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progTimer);
            return 90;
          }
          return prev + 25;
        });
      }, 300);

      generateFilmStrip(capturedPhotos).then((base64) => {
        photostripBase64Ref.current = base64;
        clearInterval(progTimer);
        setProcessProgress(100);
        setTimeout(() => {
          setStep("print_session");
        }, 500);
      });

      return () => clearInterval(progTimer);
    }
  }, [step, capturedPhotos, generateFilmStrip, setStep]);

  // ===== QR DOWNLOAD AUTO-RESET (20S) =====
  useEffect(() => {
    if (step === "qr_download") {
      setQrTimer(20);
      const interval = setInterval(() => {
        setQrTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setStep("thank_you");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step, setStep]);

  // ===== THANK YOU AUTO-RESET (5S) =====
  useEffect(() => {
    if (step === "thank_you") {
      setThankYouTimer(5);
      const interval = setInterval(() => {
        setThankYouTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleResetToWelcome();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step]);

  // Reset State to Welcome Intro
  const handleResetToWelcome = () => {
    setSelectedPkg(null);
    setCapturedPhotos([]);
    setCurrentPoseIndex(0);
    setEmailInput("");
    setDriveFolderUrl("");
    setDriveFolderName("");
    setIsUploading(false);
    setIsPrinting(false);
    setTutorialProgress(0);
    setTutorialCompleted(false);
    photostripBase64Ref.current = "";
    lastProcessedGestureRef.current = "none";
    setStep("welcome_intro");
  };

  const handleConfirmPreview = () => {
    setStep("processing");
  };

  const handleRetake = () => {
    setCapturedPhotos([]);
    setCurrentPoseIndex(0);
    setStep("pose_ready");
  };

  const handleSimulatePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      handleStartDriveUpload();
      setStep("upload_digital");
    }, 2800);
  };

  // ADMIN
  const cleanup = useCallback(() => {
    mediaPipeRef.current?.destroy();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  }, []);

  const handleHiddenTap = useCallback(() => {
    setHiddenTapCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= HIDDEN_TAP_THRESHOLD) {
        setShowAdminDialog(true);
        return 0;
      }
      setTimeout(() => setHiddenTapCount(0), HIDDEN_TAP_TIMEOUT);
      return newCount;
    });
  }, []);

  const handleAdminLogout = useCallback(async () => {
    const session = getSession();
    if (!session || !adminPassword) return;

    try {
      const valid = await validateAdmin(session.username, adminPassword);
      if (valid) {
        clearSession();
        router.replace("/login");
      } else {
        setAdminError("Password salah");
        setTimeout(() => setAdminError(""), 2000);
      }
    } catch {
      setAdminError("Terjadi kesalahan");
      setTimeout(() => setAdminError(""), 2000);
    }
  }, [adminPassword, router]);

  callbacksRef.current = {
    setStep,
    handleConfirmPreview,
    handleRetake,
    startRecordingVoice,
    stopRecordingVoice,
  };

  return (
    <div className="relative w-screen h-screen bg-[#090a12] text-[#f7f7fb] overflow-hidden select-none font-sans">
      {/* Hidden 5-Tap Admin Trigger (Top-Right Corner) */}
      <div
        onClick={handleHiddenTap}
        className="absolute top-0 right-0 w-24 h-24 z-50 cursor-pointer opacity-0"
        title="Admin tap zone"
      />

      {/* ===== CAMERA BACKGROUND FEED (ALWAYS ACTIVE IN BACKGROUND) ===== */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-feed absolute inset-0 -scale-x-100 filter brightness-[1.02] contrast-[1.04]"
      />

      {/* Hand Skeleton Overlay Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-20 pointer-events-none"
      />

      {/* Xenon Studio Flash FX */}
      <AnimatePresence>
        {xenonFlash && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="absolute inset-0 bg-white z-[90] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Dark Studio Vignette Overlay */}
      <div className="absolute inset-0 camera-vignette pointer-events-none" />

      {/* Framing Corner Brackets */}
      <div className="camera-bracket-tl opacity-50 pointer-events-none z-30" />
      <div className="camera-bracket-tr opacity-50 pointer-events-none z-30" />
      <div className="camera-bracket-bl opacity-50 pointer-events-none z-30" />
      <div className="camera-bracket-br opacity-50 pointer-events-none z-30" />

      {/* ===== TOP STATUS BAR (Visible except on welcome intro) ===== */}
      {step !== "welcome_intro" && (
        <header className="absolute top-5 inset-x-8 z-30 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-[#10111c]/85 backdrop-blur-md rounded-xl border border-[#292b3b] pointer-events-auto shadow-md">
              <span className="w-2 h-2 rounded-full bg-[#f0a25c] animate-pulse" />
              <span className="font-mono-tech text-[11px] font-bold text-white tracking-widest uppercase">
                AIBOX
              </span>
            </div>

            {lastDetectedGesture !== "none" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-3 py-1 bg-[#ff7b00]/15 border border-[#ff7b00]/30 rounded-xl font-mono-tech text-[10px] text-[#f0a25c] tracking-wider uppercase font-bold"
              >
                GESTURE: {lastDetectedGesture.toUpperCase()}
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#10111c]/85 backdrop-blur-md rounded-xl border border-[#292b3b] pointer-events-auto shadow-md">
            <div className={`w-2 h-2 rounded-full ${!ENABLE_PAYMENT ? "bg-emerald-400" : "bg-[#246cff]"} animate-pulse`} />
            <span className="font-mono-tech text-white text-[11px] font-medium tracking-wider uppercase">
              {!ENABLE_PAYMENT ? `FREE MODE (${FREE_MODE_POSES} POSES)` : "KIOSK READY"}
            </span>
          </div>
        </header>
      )}

      {/* ===== RETICLE SENSOR CURSOR ===== */}
      {cameraReady && step !== "welcome_intro" && (
        <div
          ref={cursorRef}
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150 opacity-0"
          style={{ width: "70px", height: "70px" }}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {hoveredItemId && (
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle
                  cx="35"
                  cy="35"
                  r="30"
                  stroke="rgba(240, 162, 92, 0.2)"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="35"
                  cy="35"
                  r="30"
                  stroke="#f0a25c"
                  strokeWidth="3.5"
                  strokeDasharray="188"
                  strokeDashoffset={188 - (188 * dwellProgress) / 100}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-75 drop-shadow-[0_0_8px_#f0a25c]"
                />
              </svg>
            )}

            <div className="w-6 h-6 rounded-full border border-[#f0a25c] bg-[#10111c]/70 backdrop-blur-md flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#f0a25c] animate-ping" />
              <div className="w-1.5 h-1.5 rounded-full bg-white absolute" />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== STEP 1: HALAMAN SELAMAT DATANG (SOLID BG, BERTAHAN 5 DETIK) ======= */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {step === "welcome_intro" && (
          <motion.div
            key="welcome_intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-50 bg-[#090a12] flex flex-col items-center justify-between p-8 sm:p-14 text-center select-none"
          >
            <div className="h-4" />

            <div className="flex flex-col items-center max-w-2xl">
              <div className="mb-4">
                <Logo size="lg" variant="splash" animated priority />
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#ff7b00]/10 border border-[#ff7b00]/25 text-[#f0a25c] text-xs font-semibold tracking-wider uppercase mb-5">
                <Sparkles className="w-3.5 h-3.5 text-[#ff7b00]" />
                <span>AI Box Photobooth Experience</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-[-0.06em] leading-[0.96] mb-5">
                Capture Your Essence,<br />
                <span className="text-[#f0a25c]">Elevated by aibox.</span>
              </h1>

              <p className="text-[#9b9eaf] text-base sm:text-lg max-w-lg mx-auto leading-relaxed mb-8">
                Selamat datang di studio photobox masa depan. Seluruh sistem dikendalikan dengan
                gestur tangan pintar tanpa menyentuh layar. Bersiaplah untuk momen terbaik Anda!
              </p>

              {/* 5-Second Circular Progress Ring & Timer */}
              <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-[#10111c] border border-[#292b3b]">
                <div className="w-4 h-4 rounded-full border-2 border-[#f0a25c] border-t-transparent animate-spin" />
                <span className="text-xs font-mono-tech text-white font-medium">
                  Memulai Dalam <strong className="text-[#f0a25c]">{welcomeCountdown} Detik</strong>...
                </span>
              </div>
            </div>

            {/* Skip Button */}
            <button
              onClick={() => setStep("gesture_tutorial")}
              className="text-xs font-semibold text-[#9b9eaf] hover:text-white transition-colors flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10111c] border border-[#292b3b]"
            >
              <span>Lewati Sambutan</span>
              <ChevronRight className="w-4 h-4 text-[#f0a25c]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 2: LATIHAN GERAK-GERAKKAN TANGAN (INTERACTIVE WARM-UP) ====== */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {step === "gesture_tutorial" && (
          <motion.div
            key="gesture_tutorial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-[#090a12]/75 backdrop-blur-sm flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            {/* Top Prompt */}
            <div className="mt-8 max-w-md">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#246cff]/15 border border-[#246cff]/30 text-[#246cff] text-xs font-semibold tracking-wider uppercase mb-2">
                <Hand className="w-3.5 h-3.5" />
                <span>Pemanasan Sensor Tangan</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
                Coba Gerak-Gerakkan Tangan Anda!
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm leading-relaxed">
                Arahkan telapak tangan ke depan kamera dan bawa lingkaran sensor ke target di bawah.
              </p>
            </div>

            {/* Central Target Sensor Portal */}
            <div className="relative my-auto flex flex-col items-center justify-center">
              <motion.div
                animate={
                  tutorialCompleted
                    ? { scale: [1, 1.15, 1] }
                    : { scale: [1, 1.05, 1] }
                }
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`relative w-44 h-44 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${tutorialCompleted
                  ? "bg-emerald-500/20 border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.5)]"
                  : tutorialProgress > 0
                    ? "bg-[#f0a25c]/15 border-[#f0a25c] shadow-[0_0_35px_rgba(240,162,92,0.4)]"
                    : "bg-[#10111c]/80 border-[#292b3b] shadow-2xl"
                  }`}
              >
                {/* Radial Progress Gauge */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="88"
                    cy="88"
                    r="80"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="88"
                    cy="88"
                    r="80"
                    stroke={tutorialCompleted ? "#34d399" : "#f0a25c"}
                    strokeWidth="5"
                    strokeDasharray="502"
                    strokeDashoffset={502 - (502 * tutorialProgress) / 100}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-100"
                  />
                </svg>

                {/* Inner Icon & Message */}
                <div className="flex flex-col items-center justify-center text-center p-4">
                  {tutorialCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-emerald-400 flex flex-col items-center"
                    >
                      <CheckCircle2 className="w-12 h-12 mb-1" />
                      <span className="font-bold text-xs text-white uppercase tracking-wider">
                        Sensor Terhubung!
                      </span>
                    </motion.div>
                  ) : (
                    <>
                      <Hand className="w-10 h-10 text-[#f0a25c] mb-1.5 animate-bounce" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {tutorialProgress > 0 ? `${tutorialProgress}%` : "Arahkan Tangan"}
                      </span>
                      <span className="text-[10px] text-[#9b9eaf]">Ke Lingkaran Ini</span>
                    </>
                  )}
                </div>
              </motion.div>

              <span className="font-mono-tech text-xs text-[#9b9eaf] mt-4">
                Lingkaran kursor akan otomatis mengikuti posisi jari Anda
              </span>
            </div>

            {/* Skip Button */}
            <button
              onClick={() => setStep("select_package")}
              className="text-xs font-semibold text-[#9b9eaf] hover:text-white transition-colors flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10111c]/90 border border-[#292b3b]"
            >
              <span>Lewati Latihan ➔</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 3: PILIH PAKET (80-90% OPACITY OVERLAY) ====================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "select_package" && (
          <motion.div
            key="select_package"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute inset-0 z-30 bg-[#090a12]/80 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#ff7b00]/10 border border-[#ff7b00]/25 text-[#f0a25c] font-mono-tech text-xs tracking-wider uppercase mb-2">
                <span>Langkah 1 Dari 3</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Pilih Paket Foto
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm mt-1">
                Arahkan sensor tangan atau sentuh langsung kartu paket
              </p>
            </div>

            {/* 3 Package Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full my-auto">
              {PACKAGES.map((pkg) => {
                const isHovered = hoveredItemId === pkg.id;
                const isLocked = lockedSelectionId === pkg.id;

                return (
                  <motion.div
                    key={pkg.id}
                    data-dwell-id={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative rounded-2xl p-6 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border ${isLocked
                      ? "bg-[#10111c]/90 border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl backdrop-blur-md"
                      : isHovered
                        ? "bg-[#10111c]/90 border-[#f0a25c] ring-2 ring-[#f0a25c]/40 shadow-xl backdrop-blur-md"
                        : "bg-[#10111c]/85 border-[#292b3b] hover:border-[#3b3e5b] backdrop-blur-md"
                      }`}
                  >
                    {pkg.badge && (
                      <span className="absolute -top-3 right-4 px-2.5 py-0.5 bg-[#f0a25c] text-[#090a12] font-bold text-[10px] tracking-wider uppercase rounded-md shadow-sm">
                        {pkg.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                        <div className="w-8 h-8 rounded-lg bg-[#171927] flex items-center justify-center border border-[#292b3b]">
                          <Camera className="w-4 h-4 text-[#f0a25c]" />
                        </div>
                      </div>

                      <div className="mb-4">
                        <span className="text-2xl sm:text-3xl font-extrabold text-white block">
                          {pkg.price}
                        </span>
                        <span className="text-xs text-[#9b9eaf] block mt-0.5">
                          {pkg.poses} Pose Foto Studio
                        </span>
                      </div>

                      <ul className="space-y-2 border-t border-[#292b3b] pt-3 mb-4">
                        {pkg.features.map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs text-[#ced0dc]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#f0a25c] flex-shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      {isHovered && !isLocked && (
                        <div className="w-full bg-[#090a12] h-1.5 rounded-full overflow-hidden mb-2">
                          <div
                            className="bg-[#f0a25c] h-full transition-all duration-75"
                            style={{ width: `${dwellProgress}%` }}
                          />
                        </div>
                      )}

                      <div
                        className={`w-full py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase text-center transition-all ${isLocked
                          ? "bg-emerald-500 text-white font-bold"
                          : isHovered
                            ? "bg-[#f0a25c] text-[#090a12] font-bold"
                            : "bg-[#171927] text-white border border-[#292b3b]"
                          }`}
                      >
                        {isLocked
                          ? "✓ Terpilih!"
                          : isHovered
                            ? `Mengunci (${dwellProgress}%)...`
                            : "Pilih Paket"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <button
              onClick={() => setStep("gesture_tutorial")}
              className="text-[#9b9eaf] hover:text-white font-mono-tech text-xs tracking-wider uppercase transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Latihan Sensor
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 4: PILIH UKURAN / FORMAT (80-90% OPACITY OVERLAY) ============ */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "select_format" && (
          <motion.div
            key="select_format"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute inset-0 z-30 bg-[#090a12]/80 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#246cff]/10 border border-[#246cff]/25 text-[#246cff] font-mono-tech text-xs tracking-wider uppercase mb-2">
                <span>Langkah 2 Dari 3</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Pilih Ukuran / Format Foto
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm mt-1">
                Tentukan format hasil akhir photostrip Anda
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full my-auto">
              {FORMATS.map((fmt) => {
                const isHovered = hoveredItemId === fmt.id;
                const isLocked = lockedSelectionId === fmt.id;

                return (
                  <motion.div
                    key={fmt.id}
                    data-dwell-id={fmt.id}
                    onClick={() => handleSelectFormat(fmt)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative rounded-2xl p-6 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border ${isLocked
                      ? "bg-[#10111c]/90 border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl backdrop-blur-md"
                      : isHovered
                        ? "bg-[#10111c]/90 border-[#246cff] ring-2 ring-[#246cff]/40 shadow-xl backdrop-blur-md"
                        : "bg-[#10111c]/85 border-[#292b3b] hover:border-[#3b3e5b] backdrop-blur-md"
                      }`}
                  >
                    {fmt.badge && (
                      <span className="absolute -top-3 right-4 px-2.5 py-0.5 bg-[#246cff] text-white font-bold text-[10px] tracking-wider uppercase rounded-md shadow-sm">
                        {fmt.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-bold text-white">{fmt.name}</h3>
                        <div className="w-8 h-8 rounded-lg bg-[#171927] flex items-center justify-center border border-[#292b3b]">
                          <Layers className="w-4 h-4 text-[#246cff]" />
                        </div>
                      </div>

                      <span className="font-mono-tech text-xs text-[#f0a25c] font-semibold block mb-3">
                        Rasio {fmt.ratio}
                      </span>

                      <p className="text-xs text-[#9b9eaf] leading-relaxed mb-6">
                        {fmt.description}
                      </p>
                    </div>

                    <div>
                      {isHovered && !isLocked && (
                        <div className="w-full bg-[#090a12] h-1.5 rounded-full overflow-hidden mb-2">
                          <div
                            className="bg-[#246cff] h-full transition-all duration-75"
                            style={{ width: `${dwellProgress}%` }}
                          />
                        </div>
                      )}

                      <div
                        className={`w-full py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase text-center transition-all ${isLocked
                          ? "bg-emerald-500 text-white font-bold"
                          : isHovered
                            ? "bg-[#246cff] text-white font-bold"
                            : "bg-[#171927] text-white border border-[#292b3b]"
                          }`}
                      >
                        {isLocked
                          ? "✓ Format Dipilih!"
                          : isHovered
                            ? `Mengunci (${dwellProgress}%)...`
                            : "Pilih Format"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <button
              onClick={() => setStep("select_package")}
              className="text-[#9b9eaf] hover:text-white font-mono-tech text-xs tracking-wider uppercase transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Pilih Paket
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 5: PILIH TEMA / TEMPLATE (VISUAL MOCKUPS & CAROUSEL PAGINATION) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "select_theme" && (
          <motion.div
            key="select_theme"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute inset-0 z-30 bg-[#090a12]/80 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            <div className="mt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#ff7b00]/10 border border-[#ff7b00]/25 text-[#f0a25c] font-mono-tech text-xs tracking-wider uppercase mb-1.5">
                <span>Langkah 3 Dari 3</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Pilih Tema Bingkai Visual
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm mt-0.5">
                Gunakan tombol navigasi ◀ / ▶ atau sentuh kartu untuk memilih
              </p>
            </div>

            {/* Template Cards Grid with 3 items per page */}
            <div className="relative w-full max-w-5xl my-auto flex items-center justify-between gap-3">
              {/* Previous Page Button (Can be hovered with gesture or clicked) */}
              <button
                data-dwell-id="prev_theme"
                onClick={() => setThemePage((prev) => Math.max(0, prev - 1))}
                disabled={themePage === 0}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${themePage === 0
                  ? "opacity-30 cursor-not-allowed border-[#292b3b] text-[#9b9eaf]"
                  : "bg-[#10111c]/90 hover:bg-[#171927] border-[#292b3b] text-white shadow-xl hover:border-[#f0a25c]"
                  }`}
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Displayed Themes for Current Page */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1">
                {THEMES.slice(themePage * 3, themePage * 3 + 3).map((thm) => {
                  const isHovered = hoveredItemId === thm.id;
                  const isLocked = lockedSelectionId === thm.id;

                  return (
                    <motion.div
                      key={thm.id}
                      data-dwell-id={thm.id}
                      onClick={() => handleSelectTheme(thm)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative rounded-2xl p-5 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border ${isLocked
                        ? "bg-[#10111c]/95 border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl backdrop-blur-md"
                        : isHovered
                          ? "bg-[#10111c]/95 border-[#f0a25c] ring-2 ring-[#f0a25c]/40 shadow-xl backdrop-blur-md"
                          : "bg-[#10111c]/85 border-[#292b3b] hover:border-[#3b3e5b] backdrop-blur-md"
                        }`}
                    >
                      {/* MINI VISUAL PHOTOSTRIP FRAME MOCKUP */}
                      <div
                        className="w-full aspect-[4/3] rounded-xl mb-3 border-2 p-2 flex flex-col justify-between overflow-hidden shadow-inner relative"
                        style={{
                          backgroundColor: thm.bgHex,
                          borderColor: thm.borderHex,
                        }}
                      >
                        {/* Mini Header in mockup */}
                        <div className="flex items-center justify-between border-b pb-1" style={{ borderColor: thm.borderHex }}>
                          <span
                            className="font-mono-tech text-[8px] uppercase font-bold tracking-wider"
                            style={{ color: thm.accentHex }}
                          >
                            AI BOX
                          </span>
                          <span
                            className="font-mono-tech text-[7px] uppercase"
                            style={{ color: thm.accentHex }}
                          >
                            HD 300 DPI
                          </span>
                        </div>

                        {/* Simulated Photo Placeholders */}
                        <div className="grid grid-cols-2 gap-1.5 my-auto">
                          <div className="aspect-[4/3] rounded bg-white/10 flex items-center justify-center border border-white/10">
                            <Camera className="w-3 h-3 text-white/40" />
                          </div>
                          <div className="aspect-[4/3] rounded bg-white/10 flex items-center justify-center border border-white/10">
                            <Camera className="w-3 h-3 text-white/40" />
                          </div>
                        </div>

                        {/* Mini Footer */}
                        <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: thm.borderHex }}>
                          <span className="text-[7px]" style={{ color: thm.textHex }}>
                            {thm.name}
                          </span>
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: thm.accentHex }}
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white mb-0.5">{thm.name}</h3>
                        <p className="text-[11px] text-[#9b9eaf] leading-relaxed mb-3">
                          {thm.description}
                        </p>
                      </div>

                      <div>
                        {isHovered && !isLocked && (
                          <div className="w-full bg-[#090a12] h-1.5 rounded-full overflow-hidden mb-2">
                            <div
                              className="bg-[#f0a25c] h-full transition-all duration-75"
                              style={{ width: `${dwellProgress}%` }}
                            />
                          </div>
                        )}

                        <div
                          className={`w-full py-2 rounded-xl font-semibold text-xs tracking-wider uppercase text-center transition-all ${isLocked
                            ? "bg-emerald-500 text-white font-bold"
                            : isHovered
                              ? "bg-[#f0a25c] text-[#090a12] font-bold"
                              : "bg-[#171927] text-white border border-[#292b3b]"
                            }`}
                        >
                          {isLocked
                            ? "✓ Tema Dipilih!"
                            : isHovered
                              ? `Mengunci (${dwellProgress}%)...`
                              : "Pilih Tema"}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                data-dwell-id="next_theme"
                onClick={() => setThemePage((prev) => Math.min(1, prev + 1))}
                disabled={themePage === 1}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${themePage === 1
                  ? "opacity-30 cursor-not-allowed border-[#292b3b] text-[#9b9eaf]"
                  : "bg-[#10111c]/90 hover:bg-[#171927] border-[#292b3b] text-white shadow-xl hover:border-[#f0a25c]"
                  }`}
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Pagination Dots & Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("select_format")}
                className="text-[#9b9eaf] hover:text-white font-mono-tech text-xs tracking-wider uppercase transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Format
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#10111c] border border-[#292b3b] rounded-lg">
                <span className="font-mono-tech text-[10px] text-[#9b9eaf]">
                  Koleksi Tema: <strong className="text-white">{themePage + 1} / 2</strong>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 6: BAYAR QRIS ================================================ */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "payment_qris" && selectedPkg && (
          <motion.div
            key="payment_qris"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="absolute inset-0 z-40 bg-[#090a12]/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c]/90 backdrop-blur-lg rounded-2xl p-7 max-w-sm w-full text-center border border-[#292b3b] shadow-2xl">
              <div className="flex items-center justify-center gap-2 mb-1">
                <QrCode className="w-5 h-5 text-[#f0a25c]" />
                <span className="text-white font-bold text-xl tracking-tight">
                  Pembayaran QRIS
                </span>
              </div>

              <p className="font-mono-tech text-[#9b9eaf] text-[11px] tracking-wider uppercase mb-4">
                Scan via BCA, GoPay, OVO, Dana, ShopeePay
              </p>

              <div className="bg-white p-3 rounded-xl inline-block mb-3 shadow-inner">
                <QRCodeSVG
                  value={`https://qris.id/pay/aibox?amt=${selectedPkg.rawPrice}&pkg=${selectedPkg.id}`}
                  size={150}
                  level="H"
                />
              </div>

              <div className="bg-[#090a12]/90 border border-[#292b3b] rounded-xl py-2 px-3 mb-4">
                <span className="text-[10px] text-[#9b9eaf] block uppercase">
                  {selectedPkg.name} • {selectedFormat.name}
                </span>
                <span className="text-white font-bold text-2xl tracking-tight">
                  {selectedPkg.price}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 font-mono-tech text-[#9b9eaf] text-xs mb-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3.5 h-3.5 border-2 border-[#f0a25c] border-t-transparent rounded-full"
                />
                <span>Memverifikasi Pembayaran ({qrisTimer}s)...</span>
              </div>

              <button
                onClick={() => {
                  setCapturedPhotos([]);
                  setCurrentPoseIndex(0);
                  setStep("pose_ready");
                }}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md"
              >
                Simulasi Bayar Berhasil (Klik)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 7: POSE READY (STANDBY BEFORE COUNTDOWN) ===================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "pose_ready" && (
          <motion.div
            key="pose_ready"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-8 text-center"
          >
            <div className="mt-8 px-6 py-2 rounded-xl bg-[#10111c]/85 backdrop-blur-md border border-[#292b3b] shadow-lg">
              <span className="font-mono-tech text-xs text-[#f0a25c] uppercase font-bold tracking-widest">
                POSE {currentPoseIndex + 1} DARI {selectedPkg?.poses || 3}
              </span>
            </div>

            <div className="max-w-md bg-[#10111c]/80 backdrop-blur-md p-6 rounded-2xl border border-[#292b3b] shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#f0a25c]/15 text-[#f0a25c] border border-[#f0a25c]/30 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <PeaceIcon className="w-8 h-8" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1.5 tracking-tight">
                Bersiap Berpose!
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm leading-relaxed mb-5">
                Beri gestur Peace ✌️ ke arah kamera atau sentuh tombol di bawah untuk memulai
                hitung mundur 3 detik.
              </p>

              <button
                onClick={() => setStep("countdown")}
                className="w-full py-3.5 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#246cff]/25 transition-all inline-flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Mulai Foto Sekarang (3s)</span>
              </button>
            </div>

            <div className="h-8" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 8: COUNTDOWN & CAPTURE ======================================= */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "countdown" && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center"
          >
            <motion.div
              key={photoCountdown}
              initial={{ scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-8xl sm:text-9xl font-black text-white font-mono-tech drop-shadow-[0_0_40px_rgba(240,162,92,0.6)]"
            >
              {photoCountdown > 0 ? photoCountdown : "SMILE!"}
            </motion.div>

            <span className="font-mono-tech text-xs text-[#f0a25c] tracking-widest uppercase mt-4 px-3 py-1 bg-[#10111c]/80 rounded-lg">
              POSE {currentPoseIndex + 1} DARI {selectedPkg?.poses || 3}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 9: PREVIEW / RETAKE (80-90% OPACITY OVERLAY) ================= */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "preview_retake" && (
          <motion.div
            key="preview_retake"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 bg-[#090a12]/80 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            <div className="mt-4">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Preview Hasil Foto
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm mt-1">
                Periksa hasil tangkapan pose Anda. Anda dapat mengulangi jika belum puas.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 max-w-4xl w-full my-auto overflow-y-auto max-h-[55vh] p-2">
              {capturedPhotos.map((photoUrl, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl overflow-hidden border border-[#292b3b] shadow-lg w-44 sm:w-52 aspect-[4/3] bg-[#10111c]/90"
                >
                  <img
                    src={photoUrl}
                    alt={`Pose ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-[#090a12]/80 text-[10px] font-mono-tech text-white">
                    Pose {idx + 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md">
              <button
                onClick={handleRetake}
                className="w-full sm:w-auto px-6 py-3 bg-[#171927]/90 hover:bg-[#202336] text-white rounded-xl border border-[#292b3b] font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span>Foto Ulang (Retake)</span>
              </button>

              <button
                onClick={handleConfirmPreview}
                className="w-full sm:w-auto px-7 py-3 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#246cff]/25"
              >
                <Check className="w-4 h-4" />
                <span>Lanjut Cetak & Simpan</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 10: PROCESSING (300 DPI CANVAS COMPOSITING) ================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="absolute inset-0 z-40 bg-[#090a12]/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c]/90 backdrop-blur-lg rounded-2xl p-8 max-w-sm w-full text-center border border-[#292b3b] shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#f0a25c]/15 text-[#f0a25c] border border-[#f0a25c]/30 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-7 h-7 animate-pulse" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1">
                Merangkai Foto HD 300 DPI
              </h3>
              <p className="text-xs text-[#9b9eaf] mb-5">
                Menerapkan template {selectedTheme.name} & resolusi cetak studio...
              </p>

              <div className="w-full bg-[#090a12] h-2 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-[#f0a25c] h-full transition-all duration-300"
                  style={{ width: `${processProgress}%` }}
                />
              </div>

              <span className="font-mono-tech text-xs text-[#f0a25c] font-bold">
                {processProgress}% SELESAI
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 11: PRINT CONFIRMATION ======================================= */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "print_session" && (
          <motion.div
            key="print_session"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 bg-[#090a12]/80 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            <div className="mt-4">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Cetak Foto Fisik
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm mt-1">
                Siapkan cetakan fisik berkualitas laboratorium studio
              </p>
            </div>

            <div className="max-w-xs w-full my-auto p-3 bg-[#10111c]/90 backdrop-blur-md rounded-2xl border border-[#292b3b] shadow-2xl">
              {photostripBase64Ref.current && (
                <div className="relative rounded-xl overflow-hidden shadow-md max-h-72 flex justify-center">
                  <img
                    src={photostripBase64Ref.current}
                    alt="Assembled Strip"
                    className="max-h-72 object-contain"
                  />
                  {isPrinting && (
                    <motion.div
                      initial={{ top: "0%" }}
                      animate={{ top: "100%" }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute left-0 right-0 h-1 bg-[#f0a25c] shadow-[0_0_12px_#f0a25c]"
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#292b3b] text-xs">
                <span className="text-[#9b9eaf]">Jumlah Cetak:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrintCopies(Math.max(1, printCopies - 1))}
                    className="w-6 h-6 rounded bg-[#171927] border border-[#292b3b] text-white flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold text-white font-mono-tech">{printCopies}</span>
                  <button
                    onClick={() => setPrintCopies(printCopies + 1)}
                    className="w-6 h-6 rounded bg-[#171927] border border-[#292b3b] text-white flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md">
              <button
                disabled={isPrinting}
                onClick={handleSimulatePrint}
                className="w-full sm:w-auto px-7 py-3 bg-[#f0a25c] hover:bg-[#ff7b00] text-[#090a12] rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Printer className="w-4 h-4" />
                <span>{isPrinting ? "Mencetak Foto..." : `Cetak ${printCopies} Lembar`}</span>
              </button>

              <button
                onClick={() => {
                  handleStartDriveUpload();
                  setStep("upload_digital");
                }}
                className="w-full sm:w-auto px-6 py-3 bg-[#171927] hover:bg-[#202336] text-white rounded-xl border border-[#292b3b] font-semibold text-xs tracking-wider uppercase transition-all"
              >
                Lewati Cetak Fisik ➔
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 12: UPLOAD DIGITAL (EMAIL + DRIVE) =========================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "upload_digital" && (
          <motion.div
            key="upload_digital"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="absolute inset-0 z-40 bg-[#090a12]/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c]/90 backdrop-blur-lg rounded-2xl p-7 max-w-md w-full text-center border border-[#292b3b] shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-[#246cff]/15 text-[#246cff] border border-[#246cff]/30 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1">
                Kirim File HD ke Email Anda
              </h3>
              <p className="text-xs text-[#9b9eaf] mb-5">
                Masukkan email Anda atau gunakan suara (Kepal tangan ✊ untuk bicara)
              </p>

              <div className="relative mb-4">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="contoh@gmail.com"
                  className="w-full px-4 py-3 bg-[#090a12] border border-[#292b3b] rounded-xl text-white placeholder:text-[#454964] focus:outline-none focus:border-[#246cff] text-sm"
                />
                <button
                  type="button"
                  onClick={isRecordingVoice ? stopRecordingVoice : startRecordingVoice}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${isRecordingVoice ? "bg-rose-500 text-white" : "text-[#9b9eaf] hover:text-white"
                    }`}
                  title="Voice Input Email"
                >
                  {isRecordingVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {isRecordingVoice && (
                <p className="text-[11px] text-[#f0a25c] mb-3 animate-pulse">
                  Mendengarkan... Ucapkan alamat email Anda dengan jelas
                </p>
              )}

              <div className="flex gap-2.5">
                <button
                  onClick={() => setStep("qr_download")}
                  className="flex-1 py-3 bg-[#171927] hover:bg-[#202336] text-[#9b9eaf] hover:text-white rounded-xl text-xs font-semibold uppercase tracking-wider border border-[#292b3b] transition-all"
                >
                  Lewati Email
                </button>

                <button
                  onClick={() => {
                    handleSendEmail(emailInput);
                    setStep("qr_download");
                  }}
                  className="flex-1 py-3 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#246cff]/25"
                >
                  Kirim & Download
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 13: QR DOWNLOAD ============================================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "qr_download" && (
          <motion.div
            key="qr_download"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="absolute inset-0 z-40 bg-[#090a12]/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c]/90 backdrop-blur-lg rounded-2xl p-7 max-w-sm w-full text-center border border-[#292b3b] shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                <Download className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1">
                Scan Untuk Download
              </h3>
              <p className="text-xs text-[#9b9eaf] mb-4">
                Buka kamera HP Anda dan scan QR Code di bawah untuk menyimpan seluruh file foto HD
              </p>

              <div className="bg-white p-3.5 rounded-xl inline-block mb-3 shadow-inner">
                <QRCodeSVG
                  value={driveFolderUrl || "https://drive.google.com"}
                  size={160}
                  level="H"
                />
              </div>

              <p className="font-mono-tech text-[10px] text-[#9b9eaf] mb-4">
                File otomatis tersimpan di Google Drive Vault
              </p>

              <div className="flex items-center justify-center gap-2 font-mono-tech text-xs text-[#f0a25c] mb-4">
                <span>Auto-Reset Dalam {qrTimer}s</span>
              </div>

              <button
                onClick={() => setStep("thank_you")}
                className="w-full py-3 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#246cff]/25"
              >
                Selesai & Ambil Foto ➔
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 14: THANK YOU / RESET ======================================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "thank_you" && (
          <motion.div
            key="thank_you"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-40 bg-[#090a12]/85 backdrop-blur-md flex items-center justify-center p-4 text-center"
          >
            <div className="bg-[#10111c]/90 backdrop-blur-lg rounded-2xl p-9 max-w-md w-full border border-[#292b3b] shadow-2xl">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-16 h-16 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4"
              >
                <Heart className="w-8 h-8 fill-rose-400" />
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Terima Kasih!
              </h2>
              <p className="text-sm text-[#9b9eaf] leading-relaxed mb-6">
                Terima kasih telah berfoto di AI Box Photobooth. Jangan lupa ambil hasil cetak Anda
                di slot mesin printer!
              </p>

              <button
                onClick={handleResetToWelcome}
                className="w-full py-3 bg-[#f0a25c] hover:bg-[#ff7b00] text-[#090a12] rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                Mulai Sesi Baru ({thankYouTimer}s)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== HIDDEN ADMIN DIALOG =============================================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAdminDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c] rounded-2xl p-6 max-w-xs w-full border border-[#292b3b] text-center shadow-2xl">
              <ShieldCheck className="w-8 h-8 text-[#f0a25c] mx-auto mb-2" />
              <h3 className="text-lg font-bold text-white mb-3">Admin Console Exit</h3>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Masukkan Password"
                className="w-full px-3 py-2 bg-[#090a12] border border-[#292b3b] rounded-xl text-white text-sm mb-3 text-center focus:outline-none focus:border-[#246cff]"
              />
              {adminError && <p className="text-xs text-rose-400 mb-2">{adminError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAdminDialog(false);
                    setAdminPassword("");
                  }}
                  className="flex-1 py-2 bg-[#171927] text-[#9b9eaf] rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={handleAdminLogout}
                  className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
                >
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
