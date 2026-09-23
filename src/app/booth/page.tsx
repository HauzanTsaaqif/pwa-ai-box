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
  ShieldCheck,
  Maximize2,
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

// ===== 12-STEP EXACT USER FLOW =====
export type BoothStep =
  | "idle"             // IDLE / HOME (with welcome guide)
  | "select_package"   // Pilih Paket
  | "select_format"    // Pilih Ukuran / Format
  | "select_theme"     // Pilih Tema / Template
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
  bgHex: string;
  textHex: string;
  accentHex: string;
  borderHex: string;
  description: string;
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

const DEFAULT_FREE_PACKAGE: PackageItem = {
  id: "free_session",
  name: "Free Photobooth Session",
  price: "Gratis (Free Mode)",
  rawPrice: 0,
  poses: FREE_MODE_POSES,
  description: "Mode Uji Coba / Sesi Bebas",
  features: [`${FREE_MODE_POSES} Pose Foto HD`, "Digital Download QR Code", "Kontrol Gestur Tangan"],
};

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
    bgHex: "#090a12",
    textHex: "#f7f7fb",
    accentHex: "#9b9eaf",
    borderHex: "#292b3b",
    description: "Monokrom mewah & editorial kelas studio.",
  },
  {
    id: "honey",
    name: "Warm Honey Studio",
    bgHex: "#14110f",
    textHex: "#fff7ed",
    accentHex: "#f0a25c",
    borderHex: "#452e1f",
    description: "Nuansa hangat kuning-mustard estetik & bersahabat.",
  },
  {
    id: "midnight",
    name: "Midnight Royal",
    bgHex: "#0a0e1a",
    textHex: "#ffffff",
    accentHex: "#246cff",
    borderHex: "#1e2c4f",
    description: "Biru malam elegan dengan aksen royal blue.",
  },
  {
    id: "pastel",
    name: "Pastel Dream",
    bgHex: "#1c1421",
    textHex: "#fdf2f8",
    accentHex: "#f472b6",
    borderHex: "#3b2344",
    description: "Sentuhan lembut manis untuk momen ceria.",
  },
];

export default function BoothPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaPipeRef = useRef<MediaPipeManager | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const waveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Booth State Machine
  const [mounted, setMounted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [stepState, setStepState] = useState<BoothStep>("idle");
  const stepRef = useRef<BoothStep>("idle");
  const stepEntryTimeRef = useRef<number>(Date.now());
  const lastProcessedGestureRef = useRef<GestureType>("none");

  // Selection States
  const [selectedPkg, setSelectedPkg] = useState<PackageItem | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatItem>(FORMATS[0]);
  const [selectedTheme, setSelectedTheme] = useState<ThemeItem>(THEMES[0]);

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
  const [waveDetected, setWaveDetected] = useState(false);
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef<any>({});
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);

  // Timers & Dynamic Inputs
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

  // ===== SPEECH RECOGNITION (VOICE-TO-TEXT WITH FIST GESTURE ✊) =====
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
      } catch {}
    }
    setIsRecordingVoice(false);
    isRecordingVoiceRef.current = false;
  }, []);

  // ===== CANVAS COMPOSITING (ADAPTS TO FORMAT & THEME) =====
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
        ctx.font = "bold 42px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("AI BOX PHOTOBOOTH", canvasWidth / 2, 70);

        ctx.fillStyle = theme.accentHex;
        ctx.font = "500 20px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText("CAPTURE YOUR ESSENCE // STUDIO EDITION", canvasWidth / 2, 105);

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
                // Vertical Stack
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
                // 2 Columns Grid
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
                // Square Grid
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
              ctx.font = "italic 22px -apple-system, BlinkMacSystemFont, sans-serif";
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

          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.clientWidth || 1280;
            canvasRef.current.height = videoRef.current.clientHeight || 720;
          }
        }

        const mp = await MediaPipeManager.create();
        if (cancelled) {
          mp.destroy();
          return;
        }

        mediaPipeRef.current = mp;

        if (videoRef.current) {
          mp.setVideo(videoRef.current);
        }

        // Set up MediaPipe Callback
        mp.onGesture((result: GestureResult) => {
          setLastDetectedGesture(result.gesture);

          // Draw Debug Skeleton Overlay if enabled
          if (IS_DEBUG && canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
              drawHandSkeleton(
                ctx,
                result.landmarks,
                canvasRef.current.width,
                canvasRef.current.height,
                result.gesture
              );
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

          // 1. IDLE STEP: Wave Hand to Start
          if (stepRef.current === "idle" && result.gesture === "wave" && canTriggerNewGestureAction) {
            setWaveDetected(true);
            if (!waveTimerRef.current) {
              mediaPipeRef.current?.setTargetFPS(ACTIVE_FPS);
              waveTimerRef.current = setTimeout(() => {
                waveTimerRef.current = null;
                setWaveDetected(false);
                lastProcessedGestureRef.current = result.gesture;
                callbacksRef.current.setStep?.("select_package");
              }, 900);
            }
          }

          // 2. POSE READY STEP: Peace Gesture ✌️ Trigger Photo Countdown
          if (stepRef.current === "pose_ready" && result.gesture === "peace" && canTriggerNewGestureAction) {
            lastProcessedGestureRef.current = result.gesture;
            callbacksRef.current.setStep?.("countdown");
          }

          // 3. PREVIEW / RETAKE STEP: Thumbs Up 👍 (Continue) / Thumbs Down 👎 (Retake)
          if (stepRef.current === "preview_retake" && canTriggerNewGestureAction) {
            if (result.gesture === "thumbs_up") {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.handleConfirmPreview?.();
            } else if (result.gesture === "thumbs_down") {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.handleRetake?.();
            }
          }

          // 4. UPLOAD DIGITAL STEP: Voice input with Fist ✊ and Open Palm 🖐️
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

        mp.setTargetFPS(IDLE_FPS);
        mp.activate();
      } catch (err) {
        console.error("Camera/MediaPipe init error:", err);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
      if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
      cleanup();
    };
  }, [router]);

  // ===== ROBUST DWELL HOVER CLICK WITH COOLDOWN & CONFIRMATION DELAY =====
  useEffect(() => {
    const hoverInterval = setInterval(() => {
      const currentStep = stepRef.current;
      const currentPos = cursorPosRef.current;

      // Only allow hover dwell on selection steps
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

  // ===== SELECTION HANDLERS WITH CLEAR LOCK-IN PAUSE =====
  const handleSelectPackage = (pkg: PackageItem) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setLockedSelectionId(pkg.id);
    setSelectedPkg(pkg);
    setHoveredItemId(null);
    setDwellProgress(0);
    if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);

    // Brief confirmation pause (800ms) so user sees checkmark before next step
    setTimeout(() => {
      isTransitioningRef.current = false;
      setStep("select_format");
    }, 850);
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
    }, 850);
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
    }, 850);
  };

  // ===== QRIS PAYMENT SIMULATION TIMER =====
  useEffect(() => {
    if (step === "payment_qris") {
      setQrisTimer(5);
      const interval = setInterval(() => {
        setQrisTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Payment success! Proceed to pose ready
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

            // Execute Camera Snapshot Capture with Studio Xenon Flash
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
                  // All poses captured! Go to Preview / Retake
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
      setProcessProgress(10);
      const progTimer = setInterval(() => {
        setProcessProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progTimer);
            return 90;
          }
          return prev + 25;
        });
      }, 300);

      // Generate composite canvas
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

  // ===== QR DOWNLOAD TIMEOUT (20S) -> AUTO TO THANK YOU =====
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

  // ===== THANK YOU AUTO-RESET (5S) -> IDLE =====
  useEffect(() => {
    if (step === "thank_you") {
      setThankYouTimer(5);
      const interval = setInterval(() => {
        setThankYouTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleResetToIdle();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step]);

  // ===== RESET STATE TO IDLE =====
  const handleResetToIdle = () => {
    setSelectedPkg(null);
    setCapturedPhotos([]);
    setCurrentPoseIndex(0);
    setEmailInput("");
    setDriveFolderUrl("");
    setDriveFolderName("");
    setIsUploading(false);
    setIsPrinting(false);
    photostripBase64Ref.current = "";
    lastProcessedGestureRef.current = "none";
    setStep("idle");
  };

  // Preview Actions
  const handleConfirmPreview = () => {
    setStep("processing");
  };

  const handleRetake = () => {
    setCapturedPhotos([]);
    setCurrentPoseIndex(0);
    setStep("pose_ready");
  };

  // Print Action
  const handleSimulatePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      handleStartDriveUpload();
      setStep("upload_digital");
    }, 2800);
  };

  // ===== ADMIN & CLEANUP =====
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

  // Set Callbacks for MediaPipe
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

      {/* ===== CAMERA BACKGROUND FEED ===== */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-feed absolute inset-0 -scale-x-100 filter brightness-[1.02] contrast-[1.04]"
      />

      {/* Debug Skeleton Canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-10 pointer-events-none ${IS_DEBUG ? "block" : "hidden"}`}
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
      <div className="camera-bracket-tl opacity-60 pointer-events-none z-30" />
      <div className="camera-bracket-tr opacity-60 pointer-events-none z-30" />
      <div className="camera-bracket-bl opacity-60 pointer-events-none z-30" />
      <div className="camera-bracket-br opacity-60 pointer-events-none z-30" />

      {/* ===== TOP STATUS BAR ===== */}
      <header className="absolute top-5 inset-x-8 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-[#10111c]/90 rounded-xl border border-[#292b3b] pointer-events-auto shadow-md">
            <span className="w-2 h-2 rounded-full bg-[#f0a25c] animate-pulse" />
            <span className="font-mono-tech text-[11px] font-bold text-white tracking-widest uppercase">
              AIBOX // OPTICS
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

        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#10111c]/90 rounded-xl border border-[#292b3b] pointer-events-auto shadow-md">
          <div className={`w-2 h-2 rounded-full ${!ENABLE_PAYMENT ? "bg-emerald-400" : "bg-[#246cff]"} animate-pulse`} />
          <span className="font-mono-tech text-white text-[11px] font-medium tracking-wider uppercase">
            {!ENABLE_PAYMENT ? `FREE MODE (${FREE_MODE_POSES} POSES)` : "KIOSK READY"}
          </span>
        </div>
      </header>

      {/* ===== RETICLE SENSOR CURSOR ===== */}
      {cameraReady && (
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

      {/* ========================================================== */}
      {/* ===== STEP 1: IDLE / HOME (WELCOME & ONBOARDING GUIDE) ===== */}
      {/* ========================================================== */}
      <AnimatePresence mode="wait">
        {step === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute inset-0 flex flex-col items-center justify-between z-20 py-12 px-6 sm:px-12 text-center"
          >
            <div className="h-6" />

            {/* Central Welcome Info */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center gap-4 max-w-2xl relative"
            >
              <div className="relative mb-2">
                <Logo size="lg" variant="splash" animated priority />
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#ff7b00]/10 border border-[#ff7b00]/25 text-[#f0a25c] text-xs font-semibold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[#ff7b00]" />
                <span>Touchless Photobox Experience</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-[-0.05em] leading-[0.98]">
                Selamat Datang di<br />
                <span className="text-[#f0a25c]">AI Box Photobooth</span>
              </h1>

              <p className="text-[#9b9eaf] text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                Nikmati pengalaman foto modern tanpa sentuh layar. Cukup lambaikan tangan untuk
                memilih paket, tentukan format favorit, dan dapatkan cetakan HD instan.
              </p>

              {/* 3 Quick Step Pills */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-lg mt-2">
                <div className="p-3 bg-[#10111c]/80 rounded-xl border border-[#292b3b] text-left">
                  <span className="font-mono-tech text-[10px] text-[#f0a25c] font-bold block mb-1">01</span>
                  <span className="text-xs font-semibold text-white block">Lambaikan Tangan</span>
                  <span className="text-[10px] text-[#9b9eaf]">Mulai sesi interaktif</span>
                </div>
                <div className="p-3 bg-[#10111c]/80 rounded-xl border border-[#292b3b] text-left">
                  <span className="font-mono-tech text-[10px] text-[#246cff] font-bold block mb-1">02</span>
                  <span className="text-xs font-semibold text-white block">Pilih Tema & Format</span>
                  <span className="text-[10px] text-[#9b9eaf]">Sentuh atau arahkan sensor</span>
                </div>
                <div className="p-3 bg-[#10111c]/80 rounded-xl border border-[#292b3b] text-left">
                  <span className="font-mono-tech text-[10px] text-emerald-400 font-bold block mb-1">03</span>
                  <span className="text-xs font-semibold text-white block">Pose & Cetak</span>
                  <span className="text-[10px] text-[#9b9eaf]">Cetak & unduh via QR</span>
                </div>
              </div>
            </motion.div>

            {/* Bottom Wave Action Pod */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div
                onClick={() => setStep("select_package")}
                className="flex items-center gap-4 px-6 py-3.5 bg-[#10111c] rounded-2xl border border-[#292b3b] shadow-2xl hover:border-[#f0a25c]/50 transition-all cursor-pointer"
              >
                <motion.div
                  animate={{ rotate: [0, 16, -16, 16, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="w-12 h-12 rounded-xl bg-[#246cff] flex items-center justify-center text-white font-bold shadow-md shadow-[#246cff]/25"
                >
                  <Hand className="w-6 h-6" />
                </motion.div>

                <div className="text-left pr-2">
                  <h3 className="text-white font-bold text-base leading-tight">
                    Lambaikan Tangan Ke Kamera
                  </h3>
                  <p className="font-mono-tech text-[#9b9eaf] text-[11px] tracking-wider uppercase mt-0.5">
                    Atau Sentuh Di Sini Untuk Mulai
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#f0a25c]" />
              </div>

              {waveDetected && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-xl flex items-center gap-2 whitespace-nowrap"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>Lambaian Terdeteksi! Memulai...</span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* ===== STEP 2: PILIH PAKET (1, 2, 3) ===================== */}
      {/* ========================================================== */}
      <AnimatePresence>
        {step === "select_package" && (
          <motion.div
            key="select_package"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#ff7b00]/10 border border-[#ff7b00]/25 text-[#f0a25c] font-mono-tech text-xs tracking-wider uppercase mb-2">
                <span>Langkah 1 Dari 4</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Pilih Paket Foto
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm mt-1">
                Arahkan sensor tangan atau sentuh langsung kartu paket
              </p>
            </div>

            {/* Package Cards */}
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
                    className={`relative rounded-2xl p-6 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border ${
                      isLocked
                        ? "bg-[#171927] border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl"
                        : isHovered
                        ? "bg-[#171927] border-[#f0a25c] ring-2 ring-[#f0a25c]/40 shadow-xl"
                        : "bg-[#10111c] border-[#292b3b] hover:border-[#3b3e5b]"
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
                      {/* Dwell Progress Bar */}
                      {isHovered && !isLocked && (
                        <div className="w-full bg-[#090a12] h-1.5 rounded-full overflow-hidden mb-2">
                          <div
                            className="bg-[#f0a25c] h-full transition-all duration-75"
                            style={{ width: `${dwellProgress}%` }}
                          />
                        </div>
                      )}

                      <div
                        className={`w-full py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase text-center transition-all ${
                          isLocked
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
              onClick={() => setStep("idle")}
              className="text-[#9b9eaf] hover:text-white font-mono-tech text-xs tracking-wider uppercase transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Layar Standby
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* ===== STEP 3: PILIH UKURAN / FORMAT ====================== */}
      {/* ========================================================== */}
      <AnimatePresence>
        {step === "select_format" && (
          <motion.div
            key="select_format"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#246cff]/10 border border-[#246cff]/25 text-[#246cff] font-mono-tech text-xs tracking-wider uppercase mb-2">
                <span>Langkah 2 Dari 4</span>
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
                    className={`relative rounded-2xl p-6 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border ${
                      isLocked
                        ? "bg-[#171927] border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl"
                        : isHovered
                        ? "bg-[#171927] border-[#246cff] ring-2 ring-[#246cff]/40 shadow-xl"
                        : "bg-[#10111c] border-[#292b3b] hover:border-[#3b3e5b]"
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
                        className={`w-full py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase text-center transition-all ${
                          isLocked
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

      {/* ========================================================== */}
      {/* ===== STEP 4: PILIH TEMA / TEMPLATE ====================== */}
      {/* ========================================================== */}
      <AnimatePresence>
        {step === "select_theme" && (
          <motion.div
            key="select_theme"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#ff7b00]/10 border border-[#ff7b00]/25 text-[#f0a25c] font-mono-tech text-xs tracking-wider uppercase mb-2">
                <span>Langkah 3 Dari 4</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Pilih Tema / Template Bingkai
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm mt-1">
                Pilih palet estetika untuk bingkai cetak foto Anda
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full my-auto">
              {THEMES.map((thm) => {
                const isHovered = hoveredItemId === thm.id;
                const isLocked = lockedSelectionId === thm.id;

                return (
                  <motion.div
                    key={thm.id}
                    data-dwell-id={thm.id}
                    onClick={() => handleSelectTheme(thm)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative rounded-2xl p-5 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border ${
                      isLocked
                        ? "bg-[#171927] border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl"
                        : isHovered
                        ? "bg-[#171927] border-[#f0a25c] ring-2 ring-[#f0a25c]/40 shadow-xl"
                        : "bg-[#10111c] border-[#292b3b] hover:border-[#3b3e5b]"
                    }`}
                  >
                    <div>
                      {/* Theme Visual Palette Swatch */}
                      <div
                        className="w-full h-20 rounded-xl mb-3 border p-2 flex flex-col justify-between"
                        style={{
                          backgroundColor: thm.bgHex,
                          borderColor: thm.borderHex,
                        }}
                      >
                        <span
                          className="font-mono-tech text-[10px] uppercase font-bold"
                          style={{ color: thm.accentHex }}
                        >
                          AI BOX STUDIO
                        </span>
                        <div className="flex gap-1.5">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: thm.accentHex }}
                          />
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: thm.textHex }}
                          />
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-white mb-1">{thm.name}</h3>
                      <p className="text-xs text-[#9b9eaf] leading-relaxed mb-4">
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
                        className={`w-full py-2 rounded-xl font-semibold text-xs tracking-wider uppercase text-center transition-all ${
                          isLocked
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

            <button
              onClick={() => setStep("select_format")}
              className="text-[#9b9eaf] hover:text-white font-mono-tech text-xs tracking-wider uppercase transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Pilih Format
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* ===== STEP 5: BAYAR QRIS ================================ */}
      {/* ========================================================== */}
      <AnimatePresence>
        {step === "payment_qris" && selectedPkg && (
          <motion.div
            key="payment_qris"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c] rounded-2xl p-7 max-w-sm w-full text-center border border-[#292b3b] shadow-2xl">
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

              <div className="bg-[#090a12] border border-[#292b3b] rounded-xl py-2 px-3 mb-4">
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
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-semibold tracking-wide transition-all"
              >
                Simulasi Bayar Berhasil (Klik)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* ===== STEP 6: POSE READY (STANDBY BEFORE COUNTDOWN) ===== */}
      {/* ========================================================== */}
      <AnimatePresence>
        {step === "pose_ready" && (
          <motion.div
            key="pose_ready"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-8 text-center"
          >
            {/* Top Pose Indicator */}
            <div className="mt-8 px-6 py-2 rounded-xl bg-[#10111c]/90 border border-[#292b3b] shadow-lg">
              <span className="font-mono-tech text-xs text-[#f0a25c] uppercase font-bold tracking-widest">
                POSE {currentPoseIndex + 1} DARI {selectedPkg?.poses || 3}
              </span>
            </div>

            {/* Central Guidance */}
            <div className="max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-[#f0a25c]/15 text-[#f0a25c] border border-[#f0a25c]/30 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <PeaceIcon className="w-9 h-9" />
              </div>

              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Bersiap Berpose!
              </h2>
              <p className="text-[#9b9eaf] text-sm leading-relaxed mb-6">
                Beri gestur Peace ✌️ ke arah kamera atau sentuh tombol di bawah untuk memulai
                hitung mundur 3 detik.
              </p>

              <button
                onClick={() => setStep("countdown")}
                className="px-8 py-3.5 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-[#246cff]/25 transition-all inline-flex items-center gap-2.5"
              >
                <Camera className="w-4 h-4" />
                <span>Mulai Foto Sekarang (3s)</span>
              </button>
            </div>

            <div className="h-8" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* ===== STEP 7: COUNTDOWN & CAPTURE ======================= */}
      {/* ========================================================== */}
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

            <span className="font-mono-tech text-xs text-[#f0a25c] tracking-widest uppercase mt-4">
              POSE {currentPoseIndex + 1} DARI {selectedPkg?.poses || 3}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* ===== STEP 8: PREVIEW / RETAKE ========================== */}
      {/* ========================================================== */}
      <AnimatePresence>
        {step === "preview_retake" && (
          <motion.div
            key="preview_retake"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            <div className="mt-4">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Preview Hasil Foto
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm mt-1">
                Periksa hasil tangkapan pose Anda. Anda dapat mengulangi jika belum puas.
              </p>
            </div>

            {/* Captured Photos Grid */}
            <div className="flex flex-wrap items-center justify-center gap-4 max-w-4xl w-full my-auto overflow-y-auto max-h-[55vh] p-2">
              {capturedPhotos.map((photoUrl, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl overflow-hidden border border-[#292b3b] shadow-lg w-44 sm:w-52 aspect-[4/3] bg-[#10111c]"
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

            {/* Actions: Retake or Confirm */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md">
              <button
                onClick={handleRetake}
                className="w-full sm:w-auto px-6 py-3 bg-[#171927] hover:bg-[#202336] text-white rounded-xl border border-[#292b3b] font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2"
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

      {/* ========================================================== */}
      {/* ===== STEP 9: PROCESSING ================================ */}
      {/* ========================================================== */}
      <AnimatePresence>
        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c] rounded-2xl p-8 max-w-sm w-full text-center border border-[#292b3b] shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#f0a25c]/15 text-[#f0a25c] border border-[#f0a25c]/30 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-7 h-7 animate-pulse" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1">
                Merangkai Foto HD 300 DPI
              </h3>
              <p className="text-xs text-[#9b9eaf] mb-5">
                Menerapkan template {selectedTheme.name} & resolusi cetak studio...
              </p>

              {/* Progress Bar */}
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

      {/* ========================================================== */}
      {/* ===== STEP 10: PRINT SESSION ============================ */}
      {/* ========================================================== */}
      <AnimatePresence>
        {step === "print_session" && (
          <motion.div
            key="print_session"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 text-center"
          >
            <div className="mt-4">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Cetak Foto Fisik
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm mt-1">
                Siapkan cetakan fisik berkualitas laboratorium studio
              </p>
            </div>

            {/* Assembled Photostrip Preview */}
            <div className="max-w-xs w-full my-auto p-3 bg-[#10111c] rounded-2xl border border-[#292b3b] shadow-2xl">
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

            {/* Print Action Buttons */}
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

      {/* ========================================================== */}
      {/* ===== STEP 11: UPLOAD DIGITAL (EMAIL + DRIVE) ============ */}
      {/* ========================================================== */}
      <AnimatePresence>
        {step === "upload_digital" && (
          <motion.div
            key="upload_digital"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c] rounded-2xl p-7 max-w-md w-full text-center border border-[#292b3b] shadow-2xl">
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
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                    isRecordingVoice ? "bg-rose-500 text-white" : "text-[#9b9eaf] hover:text-white"
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

              {/* Action Buttons */}
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

      {/* ========================================================== */}
      {/* ===== STEP 12: QR DOWNLOAD ============================== */}
      {/* ========================================================== */}
      <AnimatePresence>
        {step === "qr_download" && (
          <motion.div
            key="qr_download"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c] rounded-2xl p-7 max-w-sm w-full text-center border border-[#292b3b] shadow-2xl">
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

      {/* ========================================================== */}
      {/* ===== STEP 13: THANK YOU / RESET ======================== */}
      {/* ========================================================== */}
      <AnimatePresence>
        {step === "thank_you" && (
          <motion.div
            key="thank_you"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4 text-center"
          >
            <div className="bg-[#10111c] rounded-2xl p-9 max-w-md w-full border border-[#292b3b] shadow-2xl">
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
                onClick={handleResetToIdle}
                className="w-full py-3 bg-[#f0a25c] hover:bg-[#ff7b00] text-[#090a12] rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                Mulai Sesi Baru ({thankYouTimer}s)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* ===== HIDDEN ADMIN DIALOG =============================== */}
      {/* ========================================================== */}
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
