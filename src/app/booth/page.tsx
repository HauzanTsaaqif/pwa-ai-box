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
import {
  FORMATS,
  FRAMES,
  THEMES,
  FormatItem,
  FrameTemplate,
  ThemeItem,
  compositePhotosIntoFrame,
} from "@/lib/frames";

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
const IDLE_FPS = 10;
const ACTIVE_FPS = 20; // 20 FPS detection + 60 FPS lerp ensures video feed never stutters
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
  const mustExitBeforeSelectRef = useRef<boolean>(false);
  const lastSelectedElementRef = useRef<HTMLElement | null>(null);
  const activeTargetRef = useRef<HTMLElement | null>(null);
  const activeTargetIdRef = useRef<string | null>(null);
  const dwellStartTimeRef = useRef<number>(0);
  const [welcomeFlash, setWelcomeFlash] = useState<boolean>(true);

  useEffect(() => {
    const t = setTimeout(() => setWelcomeFlash(false), 450);
    return () => clearTimeout(t);
  }, []);

  const setStep = useCallback((newStep: BoothStep) => {
    stepRef.current = newStep;
    stepEntryTimeRef.current = Date.now();
    dwellCooldownRef.current = Date.now() + 800; // 0.8s cooldown on every step change
    mustExitBeforeSelectRef.current = true; // User must exit previous hover zone first!
    if (activeTargetRef.current) {
      clearDwellProgressDOM(activeTargetRef.current);
    }
    activeTargetRef.current = null;
    activeTargetIdRef.current = null;
    setLockedSelectionId(null);
    setHoveredItemId(null);
    setStepState(newStep);
  }, []);
  const step = stepState;

  // Photo Capture & Selection State
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);

  // Gesture & Cursor Tracking State
  const [lastDetectedGesture, setLastDetectedGesture] = useState<GestureType>("none");
  const lastDetectedGestureRef = useRef<GestureType>("none");
  const [isHandDetected, setIsHandDetected] = useState<boolean>(false);
  const isHandDetectedRef = useRef<boolean>(false);
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null);
  const targetCursorPosRef = useRef<{ x: number; y: number } | null>(null);
  const smoothCursorPosRef = useRef<{ x: number; y: number } | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorCircleRef = useRef<SVGCircleElement>(null);
  const cursorPercentRef = useRef<HTMLDivElement>(null);
  const targetCircleRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef<any>({});
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Direct DOM updates for zero-re-render dwell progress
  const updateDwellProgressDOM = (pct: number, target: HTMLElement | null) => {
    if (cursorCircleRef.current) {
      cursorCircleRef.current.style.strokeDashoffset = `${176 - (176 * pct) / 100}`;
    }
    if (cursorPercentRef.current) {
      cursorPercentRef.current.textContent = `${pct}%`;
    }
    if (target) {
      const bar = target.querySelector(".dwell-bar") as HTMLElement | null;
      if (bar) bar.style.width = `${pct}%`;
      const label = target.querySelector(".dwell-label") as HTMLElement | null;
      if (label) label.textContent = `Mengunci (${pct}%)...`;
    }
  };

  const clearDwellProgressDOM = (target: HTMLElement | null) => {
    if (cursorCircleRef.current) {
      cursorCircleRef.current.style.strokeDashoffset = "176";
    }
    if (cursorPercentRef.current) {
      cursorPercentRef.current.textContent = "0%";
    }
    if (target) {
      const bar = target.querySelector(".dwell-bar") as HTMLElement | null;
      if (bar) bar.style.width = "0%";
      const label = target.querySelector(".dwell-label") as HTMLElement | null;
      if (label) label.textContent = "Pilih";
    }
  };

  // Interactive Gesture Tutorial State
  const [tutorialProgress, setTutorialProgress] = useState(0);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Timers & Dynamic Inputs
  const [welcomeCountdown, setWelcomeCountdown] = useState(5);
  const [qrisTimer, setQrisTimer] = useState(5);
  const [photoCountdown, setPhotoCountdown] = useState(3);
  const [isIntermission, setIsIntermission] = useState(false);
  const [intermissionCountdown, setIntermissionCountdown] = useState(2);
  const [previewStripUrl, setPreviewStripUrl] = useState<string>("");
  const [isCompositingPreview, setIsCompositingPreview] = useState(false);
  const smoothedLandmarksRef = useRef<any[] | null>(null);
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

  // ===== CANVAS COMPOSITING (300 DPI REAL FRAME ENGINE) =====
  const generateFilmStrip = useCallback(
    async (photoUrls: string[]): Promise<string> => {
      const frame = selectedTheme || FRAMES[0];
      return compositePhotosIntoFrame(photoUrls, frame);
    },
    [selectedTheme]
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
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, min: 24 },
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
          const hasHand = Boolean(result.landmarks && result.landmarks.length >= 21);
          if (hasHand !== isHandDetectedRef.current) {
            isHandDetectedRef.current = hasHand;
            setIsHandDetected(hasHand);
          }

          if (result.gesture !== lastDetectedGestureRef.current) {
            lastDetectedGestureRef.current = result.gesture;
            setLastDetectedGesture(result.gesture);
          }

          // Smooth landmarks with Exponential Moving Average (EMA) to eliminate micro-jitter ("anti-wiggly")
          let activeLandmarks = result.landmarks;
          if (hasHand && result.landmarks) {
            if (!smoothedLandmarksRef.current || smoothedLandmarksRef.current.length !== result.landmarks.length) {
              smoothedLandmarksRef.current = result.landmarks.map((l) => ({ ...l }));
            } else {
              const alpha = 0.65; // High stability + zero perceived latency
              smoothedLandmarksRef.current = result.landmarks.map((l, i) => {
                const prev = smoothedLandmarksRef.current![i];
                return {
                  x: prev.x * alpha + l.x * (1 - alpha),
                  y: prev.y * alpha + l.y * (1 - alpha),
                  z: (prev.z ?? 0) * alpha + (l.z ?? 0) * (1 - alpha),
                };
              });
            }
            activeLandmarks = smoothedLandmarksRef.current;
          } else {
            smoothedLandmarksRef.current = null;
          }

          // Draw full hand skeleton on canvas using smoothed landmarks
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
              if (hasHand && activeLandmarks) {
                drawHandSkeleton(
                  ctx,
                  activeLandmarks,
                  canvasRef.current.width,
                  canvasRef.current.height
                );
              } else {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }
            }
          }

          // Track Hand Gesture Cursor Position using smoothed Index Finger Tip #8
          if (hasHand && activeLandmarks && activeLandmarks[8]) {
            const indexTip = activeLandmarks[8];
            targetCursorPosRef.current = {
              x: (1 - indexTip.x) * 100,
              y: indexTip.y * 100,
            };
          } else {
            targetCursorPosRef.current = null;
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

  // ===== 60 FPS HARDWARE ACCELERATED LERP CURSOR LOOP =====
  useEffect(() => {
    let animId: number;
    const loop = () => {
      const target = targetCursorPosRef.current;
      if (target) {
        if (!smoothCursorPosRef.current) {
          smoothCursorPosRef.current = { x: target.x, y: target.y };
        } else {
          // Lerp factor 0.45: smooth out camera jitter, instant response, 60fps buttery movement
          smoothCursorPosRef.current.x += (target.x - smoothCursorPosRef.current.x) * 0.45;
          smoothCursorPosRef.current.y += (target.y - smoothCursorPosRef.current.y) * 0.45;
        }
        cursorPosRef.current = smoothCursorPosRef.current;
        if (cursorRef.current) {
          const screenX = (smoothCursorPosRef.current.x / 100) * window.innerWidth;
          const screenY = (smoothCursorPosRef.current.y / 100) * window.innerHeight;
          cursorRef.current.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;
          cursorRef.current.style.opacity = "1";
        }
      } else {
        smoothCursorPosRef.current = null;
        cursorPosRef.current = null;
        if (cursorRef.current) {
          cursorRef.current.style.opacity = "0";
        }
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ===== INTERACTIVE GESTURE TUTORIAL / WARM-UP DETECTION (DYNAMIC BOUNDING RECT) =====
  useEffect(() => {
    if (step !== "gesture_tutorial") return;

    let progress = 0;
    const interval = setInterval(() => {
      const pos = cursorPosRef.current;
      if (!pos) {
        setTutorialProgress(0);
        return;
      }

      let inTarget = false;
      if (targetCircleRef.current) {
        const rect = targetCircleRef.current.getBoundingClientRect();
        const cursorScreenX = (pos.x / 100) * window.innerWidth;
        const cursorScreenY = (pos.y / 100) * window.innerHeight;
        const circleCenterX = rect.left + rect.width / 2;
        const circleCenterY = rect.top + rect.height / 2;
        const radius = rect.width / 2;
        const dist = Math.hypot(cursorScreenX - circleCenterX, cursorScreenY - circleCenterY);
        inTarget = dist <= radius;
      } else {
        const dx = pos.x - 50;
        const dy = pos.y - 50;
        inTarget = Math.sqrt(dx * dx + dy * dy) < 15;
      }

      if (inTarget) {
        // Hand is hovering directly inside the tutorial target circle
        progress = Math.min(100, progress + 10);
        setTutorialProgress(progress);

        if (progress >= 100) {
          clearInterval(interval);
          setTutorialCompleted(true);
          setTimeout(() => {
            setStep("select_package");
          }, 800);
        }
      } else {
        progress = Math.max(0, progress - 8);
        setTutorialProgress(progress);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [step, setStep]);

  // ===== ZERO-RE-RENDER UNIVERSAL DWELL HOVER CLICK WITH 1.8s DELIBERATE LOCK =====
  useEffect(() => {
    const DWELL_LOCK_MS = 1800; // 1.8s deliberate lock to prevent accidental quick triggers

    const hoverInterval = setInterval(() => {
      const currentStep = stepRef.current;
      const currentPos = cursorPosRef.current;

      const nonClickableSteps =
        currentStep === "welcome_intro" ||
        currentStep === "gesture_tutorial" ||
        currentStep === "countdown" ||
        currentStep === "processing";

      if (nonClickableSteps || !currentPos || Date.now() < dwellCooldownRef.current || isTransitioningRef.current) {
        if (activeTargetRef.current) {
          clearDwellProgressDOM(activeTargetRef.current);
          activeTargetRef.current = null;
          activeTargetIdRef.current = null;
          setHoveredItemId(null);
        }
        return;
      }

      const screenX = (currentPos.x / 100) * window.innerWidth;
      const screenY = (currentPos.y / 100) * window.innerHeight;
      const elements = document.elementsFromPoint(screenX, screenY);

      let interactiveTarget: HTMLElement | null = null;
      for (const el of elements) {
        // Support cards with data-dwell-id, buttons, and custom button roles
        const card = (el.getAttribute("data-dwell-id") ? el : el.closest("[data-dwell-id]")) as HTMLElement | null;
        if (card) {
          interactiveTarget = card;
          break;
        }
        const btn = (el.tagName === "BUTTON" ? el : el.closest("button")) as HTMLElement | null;
        if (btn && !(btn as HTMLButtonElement).disabled) {
          interactiveTarget = btn;
          break;
        }
        const roleBtn = (el.getAttribute("role") === "button" ? el : el.closest('[role="button"]')) as HTMLElement | null;
        if (roleBtn) {
          interactiveTarget = roleBtn;
          break;
        }
      }

      // Check Re-Arming System: If user just selected something, they must exit that box first!
      if (mustExitBeforeSelectRef.current) {
        if (
          interactiveTarget &&
          (interactiveTarget === lastSelectedElementRef.current ||
            lastSelectedElementRef.current?.contains(interactiveTarget) ||
            interactiveTarget.contains(lastSelectedElementRef.current as Node))
        ) {
          // Hand is still inside previous box: keep idle, do not dwell
          if (activeTargetRef.current) {
            clearDwellProgressDOM(activeTargetRef.current);
            activeTargetRef.current = null;
            activeTargetIdRef.current = null;
            setHoveredItemId(null);
          }
          return;
        } else {
          // Hand exited previous box into open space or another zone: re-arm!
          mustExitBeforeSelectRef.current = false;
          lastSelectedElementRef.current = null;
        }
      }

      if (interactiveTarget) {
        const targetId =
          interactiveTarget.getAttribute("data-dwell-id") ||
          interactiveTarget.id ||
          interactiveTarget.getAttribute("aria-label") ||
          interactiveTarget.textContent?.trim().slice(0, 20) ||
          "interactive-target";

        if (interactiveTarget !== activeTargetRef.current) {
          // New target hovered
          if (activeTargetRef.current) {
            clearDwellProgressDOM(activeTargetRef.current);
          }
          activeTargetRef.current = interactiveTarget;
          activeTargetIdRef.current = targetId;
          dwellStartTimeRef.current = Date.now();
          setHoveredItemId(targetId);
          updateDwellProgressDOM(0, interactiveTarget);
        } else {
          // Continuing hover on the same target: increment progress smoothly via DOM (NO React re-render)
          const elapsed = Date.now() - dwellStartTimeRef.current;
          const pct = Math.min(100, Math.round((elapsed / DWELL_LOCK_MS) * 100));
          updateDwellProgressDOM(pct, interactiveTarget);

          if (pct >= 100) {
            mustExitBeforeSelectRef.current = true;
            lastSelectedElementRef.current = interactiveTarget;
            clearDwellProgressDOM(interactiveTarget);
            activeTargetRef.current = null;
            activeTargetIdRef.current = null;
            setHoveredItemId(null);

            // Execute click with both synthetic MouseEvent and native .click()
            try {
              interactiveTarget.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
              interactiveTarget.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
              interactiveTarget.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
            } catch (err) { }
            interactiveTarget.click();
          }
        }
      } else {
        // Open space: clear dwell and re-arm
        mustExitBeforeSelectRef.current = false;
        lastSelectedElementRef.current = null;
        if (activeTargetRef.current) {
          clearDwellProgressDOM(activeTargetRef.current);
          activeTargetRef.current = null;
          activeTargetIdRef.current = null;
          setHoveredItemId(null);
        }
      }
    }, 25);

    return () => clearInterval(hoverInterval);
  }, []);

  // ===== SELECTION HANDLERS WITH CONFIRMATION PAUSE =====
  const handleSelectPackage = (pkg: PackageItem) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setLockedSelectionId(pkg.id);
    setSelectedPkg(pkg);
    setHoveredItemId(null);
    if (activeTargetRef.current) clearDwellProgressDOM(activeTargetRef.current);
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
    const matchingFrames = FRAMES.filter((f) => f.formatId === fmt.id);
    if (matchingFrames.length > 0) {
      setSelectedTheme(matchingFrames[0]);
    }
    setThemePage(0);
    setHoveredItemId(null);
    if (activeTargetRef.current) clearDwellProgressDOM(activeTargetRef.current);
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
    if (activeTargetRef.current) clearDwellProgressDOM(activeTargetRef.current);
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

  // ===== AUTOMATED MULTI-POSE COUNTDOWN & COMPOSITING ENGINE =====
  useEffect(() => {
    if (step !== "countdown") return;

    let timer: NodeJS.Timeout | null = null;
    let cancelled = false;

    // Reset countdown states
    setPhotoCountdown(3);
    setIsIntermission(false);

    // Number of poses is determined by the selected frame's slots / defaultPoses
    const totalPoses = selectedTheme?.defaultPoses || selectedTheme?.slots?.length || 3;
    const collected: string[] = [];

    const runCountdownForPose = (poseIdx: number) => {
      if (cancelled) return;
      setCurrentPoseIndex(poseIdx);
      setIsIntermission(false);
      setPhotoCountdown(3);

      let currentSec = 3;
      timer = setInterval(() => {
        if (cancelled) {
          if (timer) clearInterval(timer);
          return;
        }

        currentSec -= 1;
        setPhotoCountdown(currentSec);

        if (currentSec <= 0) {
          if (timer) clearInterval(timer);

          // Studio Xenon Flash
          setXenonFlash(true);
          setTimeout(() => setXenonFlash(false), 300);

          // Capture snapshot
          const snapshot = captureSnapshot();
          if (snapshot) {
            collected.push(snapshot);
            setCapturedPhotos([...collected]);
          }

          // Check if more poses needed for this frame
          if (collected.length < totalPoses && !cancelled) {
            // Short 2s intermission to change pose
            setIsIntermission(true);
            setIntermissionCountdown(2);
            let interSec = 2;

            timer = setInterval(() => {
              if (cancelled) {
                if (timer) clearInterval(timer);
                return;
              }
              interSec -= 1;
              setIntermissionCountdown(interSec);
              if (interSec <= 0) {
                if (timer) clearInterval(timer);
                runCountdownForPose(collected.length);
              }
            }, 1000);
          } else if (!cancelled) {
            // All poses captured! Immediately composite photo + frame for instant preview
            setIsCompositingPreview(true);
            const frame = selectedTheme || FRAMES[0];
            compositePhotosIntoFrame(collected, frame).then((base64) => {
              if (cancelled) return;
              photostripBase64Ref.current = base64;
              setPreviewStripUrl(base64);
              setIsCompositingPreview(false);
              setStep("preview_retake");
            });
          }
        }
      }, 1000);
    };

    runCountdownForPose(0);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [step, selectedTheme, captureSnapshot, setStep]);

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
    setPreviewStripUrl("");
    setCurrentPoseIndex(0);
    setIsIntermission(false);
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
    if (photostripBase64Ref.current || previewStripUrl) {
      setStep("print_session");
    } else {
      setStep("processing");
    }
  };

  const handleRetake = () => {
    setCapturedPhotos([]);
    setPreviewStripUrl("");
    setCurrentPoseIndex(0);
    setIsIntermission(false);
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
        className="camera-feed absolute inset-0 -scale-x-100 will-change-transform"
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

      {/* ===== TOP STATUS BAR ===== */}
      {step !== "welcome_intro" && lastDetectedGesture !== "none" && (
        <header className="absolute top-5 left-8 z-30 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-3 py-1 bg-[#ff7b00]/15 border border-[#ff7b00]/30 rounded-xl font-mono-tech text-[10px] text-[#f0a25c] tracking-wider uppercase font-bold shadow-md"
          >
            GESTURE: {lastDetectedGesture.toUpperCase()}
          </motion.div>
        </header>
      )}

      {/* ===== RETICLE SENSOR CURSOR ===== */}
      {cameraReady && step !== "welcome_intro" && (
        <div
          ref={cursorRef}
          className="fixed top-0 left-0 pointer-events-none z-50 -ml-[35px] -mt-[35px] transition-opacity duration-150 opacity-0 will-change-transform"
          style={{ width: "70px", height: "70px" }}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {hoveredItemId && (
              <>
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 70 70">
                  <circle
                    cx="35"
                    cy="35"
                    r="28"
                    stroke="rgba(240, 162, 92, 0.25)"
                    strokeWidth="3.5"
                    fill="none"
                  />
                  <circle
                    ref={cursorCircleRef}
                    cx="35"
                    cy="35"
                    r="28"
                    stroke="#f0a25c"
                    strokeWidth="4"
                    strokeDasharray="176"
                    strokeDashoffset={176}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-75"
                  />
                </svg>
                {/* Dwell percentage lock pill */}
                <div
                  ref={cursorPercentRef}
                  className="absolute -bottom-6 px-2 py-0.5 rounded-full bg-black/90 border border-[#f0a25c]/50 font-mono-tech text-[9px] font-bold text-[#f0a25c] tracking-wider pointer-events-none shadow-md"
                >
                  0%
                </div>
              </>
            )}

            {/* Pointer Dot with purely circular radial glow (zero rectangular border artifacts) */}
            <div className="relative w-6 h-6 rounded-full border-2 border-[#f0a25c] bg-[#10111c] shadow-[0_0_16px_rgba(240,162,92,0.9)] flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f0a25c] animate-ping opacity-60" />
              <div className="w-2 h-2 rounded-full bg-white absolute shadow-[0_0_6px_#ffffff]" />
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
            className="absolute inset-0 z-50 bg-[#090a12] flex flex-col items-center justify-center p-6 sm:p-12 text-center select-none overflow-hidden"
          >
            {/* Camera Shutter Flash Strobe (Kepretan Kamera) on Mount */}
            <AnimatePresence>
              {welcomeFlash && (
                <motion.div
                  initial={{ opacity: 0.95 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="absolute inset-0 bg-white z-[60] pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* Ambient Depth Radial Gradient */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-gradient-to-b from-[#2e3247]/30 to-transparent rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center max-w-3xl px-4">

              {/* Viewfinder Target Framing Around Title */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative p-6 sm:p-8"
              >
                {/* Viewfinder Corner Brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#f0a25c]/70 pointer-events-none" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#f0a25c]/70 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#f0a25c]/70 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#f0a25c]/70 pointer-events-none" />

                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.06em] leading-[0.96] text-white">
                  <span className="block drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                    Capture Your Moments!
                  </span>
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="text-[#9b9eaf] text-sm sm:text-base max-w-lg mx-auto leading-relaxed mb-8 mt-2"
              >
                Selamat datang di studio photobox masa depan. Seluruh sistem dikendalikan dengan
                gestur tangan pintar tanpa menyentuh layar. Bersiaplah untuk momen terbaik Anda!
              </motion.p>

              {/* 5-Second Progress Pill */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45 }}
                className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-[#10111c] border border-[#292b3b] shadow-2xl"
              >
                <div className="w-4 h-4 rounded-full border-2 border-[#f0a25c] border-t-transparent animate-spin" />
                <span className="text-xs font-mono-tech text-white font-medium">
                  Memulai Dalam <strong className="text-[#f0a25c]">{welcomeCountdown} Detik</strong>...
                </span>
              </motion.div>
            </div>
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
            className={`absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 text-center transition-all duration-500 ${isHandDetected
              ? "bg-[#090a12]/45 backdrop-blur-none"
              : "bg-[#090a12]/80 backdrop-blur-md"
              }`}
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
                {isHandDetected
                  ? "Bagus! Skeleton tangan terdeteksi. Bawa kursor ke dalam lingkaran target."
                  : "Arahkan tangan ke depan kamera sampai skeleton terdeteksi."}
              </p>
            </div>

            {/* Central Target Sensor Portal */}
            <div className="relative my-auto flex flex-col items-center justify-center">
              <motion.div
                ref={targetCircleRef}
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
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
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
                <div className="flex flex-col items-center justify-center text-center p-4 select-none">
                  {tutorialCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-emerald-400 flex flex-col items-center justify-center"
                    >
                      <CheckCircle2 className="w-12 h-12 mb-1" />
                      <span className="font-bold text-xs text-white uppercase tracking-wider">
                        Sensor Terhubung!
                      </span>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <Hand className="w-10 h-10 text-[#f0a25c] mb-1.5 animate-bounce" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {tutorialProgress > 0 ? `${tutorialProgress}%` : "Arahkan Tangan"}
                      </span>
                      <span className="text-[10px] text-[#9b9eaf]">Ke Lingkaran Ini</span>
                    </div>
                  )}
                </div>
              </motion.div>

              <span className="font-mono-tech text-xs text-[#9b9eaf] mt-4">
                Lingkaran kursor akan otomatis mengikuti posisi jari Anda
              </span>
            </div>

            {/* Bottom spacer for balance */}
            <div className="h-6" />
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
                            className="dwell-bar bg-[#f0a25c] h-full transition-all duration-75"
                            style={{ width: "0%" }}
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
                            ? <span className="dwell-label">Mengunci (0%)...</span>
                            : "Pilih Paket"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mb-8 sm:mb-12 pb-2">
              <button
                onClick={() => setStep("gesture_tutorial")}
                className="text-[#9b9eaf] hover:text-white font-mono-tech text-xs tracking-wider uppercase transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Kembali</span>
              </button>
            </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full my-auto">
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
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-white">{fmt.name}</h3>
                        <div className="w-8 h-8 rounded-lg bg-[#171927] flex items-center justify-center border border-[#292b3b]">
                          <Layers className="w-4 h-4 text-[#246cff]" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-mono-tech text-xs text-[#f0a25c] font-semibold">
                          Rasio {fmt.ratio}
                        </span>
                        <span className="text-[#9b9eaf] text-xs">•</span>
                        <span className="font-mono-tech text-xs text-[#9b9eaf]">
                          {fmt.dimensions}
                        </span>
                      </div>

                      <p className="text-xs text-[#9b9eaf] leading-relaxed mb-6">
                        {fmt.description}
                      </p>
                    </div>

                    <div>
                      {isHovered && !isLocked && (
                        <div className="w-full bg-[#090a12] h-1.5 rounded-full overflow-hidden mb-2">
                          <div
                            className="dwell-bar bg-[#246cff] h-full transition-all duration-75"
                            style={{ width: "0%" }}
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
                            ? <span className="dwell-label">Mengunci (0%)...</span>
                            : "Pilih Format"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mb-8 sm:mb-12 pb-2">
              <button
                onClick={() => setStep("select_package")}
                className="text-[#9b9eaf] hover:text-white font-mono-tech text-xs tracking-wider uppercase transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Kembali</span>
              </button>
            </div>
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
                Pilih Bingkai Foto ({selectedFormat?.name || "Semua"})
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm mt-0.5">
                Pilih desain frame favorit untuk dicetak langsung pada kertas foto
              </p>
            </div>

            {/* Template Cards Grid filtered by selectedFormat */}
            {(() => {
              const availableFrames = FRAMES.filter(
                (f) => !selectedFormat || f.formatId === selectedFormat.id
              );
              const maxPerPage = 3;
              const totalPages = Math.ceil(availableFrames.length / maxPerPage) || 1;
              const pagedFrames = availableFrames.slice(
                themePage * maxPerPage,
                themePage * maxPerPage + maxPerPage
              );

              return (
                <div className="relative w-full max-w-5xl my-auto flex items-center justify-between gap-3">
                  {/* Previous Page Button */}
                  {totalPages > 1 && (
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
                  )}

                  {/* Displayed Themes for Current Format */}
                  <div
                    className={`grid gap-5 flex-1 ${pagedFrames.length === 2
                      ? "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto"
                      : "grid-cols-1 md:grid-cols-3"
                      }`}
                  >
                    {pagedFrames.map((thm) => {
                      const isHovered = hoveredItemId === thm.id;
                      const isLocked = lockedSelectionId === thm.id;

                      return (
                        <motion.div
                          key={thm.id}
                          data-dwell-id={thm.id}
                          onClick={() => handleSelectTheme(thm)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative rounded-2xl p-5 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border group ${isLocked
                            ? "bg-[#10111c]/95 border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl backdrop-blur-md"
                            : isHovered
                              ? "bg-[#10111c]/95 border-[#f0a25c] ring-2 ring-[#f0a25c]/40 shadow-xl backdrop-blur-md"
                              : "bg-[#10111c]/85 border-[#292b3b] hover:border-[#3b3e5b] backdrop-blur-md"
                            }`}
                        >
                          {thm.badge && (
                            <span className="absolute -top-3 right-4 px-2.5 py-0.5 bg-[#f0a25c] text-[#090a12] font-bold text-[10px] tracking-wider uppercase rounded-md shadow-sm z-10">
                              {thm.badge}
                            </span>
                          )}

                          {/* REAL VISUAL FRAME PREVIEW THUMBNAIL */}
                          <div className="w-full h-48 rounded-xl mb-3 bg-[#090a12]/95 border border-[#292b3b] overflow-hidden shadow-inner relative flex items-center justify-center p-2 group-hover:border-[#f0a25c]/50 transition-colors">
                            <img
                              src={thm.frameSrc}
                              alt={thm.name}
                              className="h-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                            />
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#090a12]/80 border border-[#292b3b] text-[10px] font-mono-tech text-[#f0a25c] backdrop-blur-sm">
                              {thm.slots.length} Foto
                            </span>
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
                                  className="dwell-bar bg-[#f0a25c] h-full transition-all duration-75"
                                  style={{ width: "0%" }}
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
                                ? "✓ Bingkai Dipilih!"
                                : isHovered
                                  ? <span className="dwell-label">Mengunci (0%)...</span>
                                  : "Pilih Bingkai"}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Next Page Button */}
                  {totalPages > 1 && (
                    <button
                      data-dwell-id="next_theme"
                      onClick={() => setThemePage((prev) => Math.min(totalPages - 1, prev + 1))}
                      disabled={themePage >= totalPages - 1}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${themePage >= totalPages - 1
                        ? "opacity-30 cursor-not-allowed border-[#292b3b] text-[#9b9eaf]"
                        : "bg-[#10111c]/90 hover:bg-[#171927] border-[#292b3b] text-white shadow-xl hover:border-[#f0a25c]"
                        }`}
                      title="Halaman Selanjutnya"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Navigation back */}
            <div className="mb-8 sm:mb-12 pb-2">
              <button
                onClick={() => setStep("select_format")}
                className="text-[#9b9eaf] hover:text-white font-mono-tech text-xs tracking-wider uppercase transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Kembali</span>
              </button>
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
                SESI FOTO • {selectedTheme?.defaultPoses || selectedTheme?.slots?.length || selectedPkg?.poses || 3} POSE
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
                Kamera akan mengambil otomatis {selectedTheme?.defaultPoses || selectedTheme?.slots?.length || selectedPkg?.poses || 3} pose berturut-turut.
                Beri gestur Peace ✌️ atau klik tombol untuk mulai.
              </p>

              <button
                onClick={() => setStep("countdown")}
                className="w-full py-3.5 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#246cff]/25 transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span>Mulai Foto</span>
              </button>
            </div>

            <div className="mb-8 sm:mb-14 pb-2" />
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
            {isCompositingPreview ? (
              <div className="flex flex-col items-center gap-4 bg-[#10111c]/90 px-8 py-6 rounded-2xl border border-[#292b3b] backdrop-blur-md shadow-2xl">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 border-3 border-[#f0a25c] border-t-transparent rounded-full"
                />
                <span className="text-white font-bold text-base">Merangkai Foto & Bingkai...</span>
              </div>
            ) : isIntermission ? (
              <div className="flex flex-col items-center gap-2 bg-[#10111c]/90 px-8 py-6 rounded-2xl border border-[#292b3b] backdrop-blur-md shadow-2xl text-center">
                <span className="text-[#f0a25c] font-bold text-lg uppercase tracking-wider">
                  Ganti Gaya Berikutnya!
                </span>
                <span className="text-white text-xs">
                  Pose {currentPoseIndex + 2} dari {selectedTheme?.defaultPoses || selectedTheme?.slots?.length || 3}
                </span>
                <span className="text-5xl font-black font-mono-tech text-white mt-1">
                  {intermissionCountdown}
                </span>
              </div>
            ) : (
              <>
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
                  POSE {currentPoseIndex + 1} DARI {selectedTheme?.defaultPoses || selectedTheme?.slots?.length || 3}
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 9: PREVIEW / RETAKE (FOTO + FRAME COMPOSITE) ================= */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "preview_retake" && (
          <motion.div
            key="preview_retake"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 bg-[#090a12]/85 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-8 text-center"
          >
            <div className="mt-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Preview Hasil Foto
              </h2>
              <p className="text-[#9b9eaf] text-xs sm:text-sm mt-0.5">
                Foto Anda telah dipasang ke dalam bingkai pilihan
              </p>
            </div>

            {/* Assembled Photostrip (Photo + Frame) Preview */}
            <div className="my-auto flex items-center justify-center max-w-full max-h-[50vh] p-2">
              {previewStripUrl || photostripBase64Ref.current ? (
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#292b3b] bg-[#10111c]/90 max-h-[48vh] flex items-center justify-center p-1.5">
                  <img
                    src={previewStripUrl || photostripBase64Ref.current}
                    alt="Hasil Foto dan Frame"
                    className="max-h-[46vh] object-contain rounded-xl shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 border-3 border-[#f0a25c] border-t-transparent rounded-full"
                  />
                  <span className="text-white text-sm">Merangkai preview bingkai...</span>
                </div>
              )}
            </div>

            {/* Ergonomic Lifted 1-Row Action Buttons */}
            <div className="flex flex-row items-center justify-center gap-4 w-full max-w-md mb-8 sm:mb-14 pb-2">
              <button
                onClick={handleRetake}
                className="flex-1 px-6 py-3.5 bg-[#171927]/90 hover:bg-[#202336] text-white rounded-xl border border-[#292b3b] font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-md"
              >
                <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Foto Ulang</span>
              </button>

              <button
                onClick={handleConfirmPreview}
                className="flex-1 px-7 py-3.5 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#246cff]/25 whitespace-nowrap"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>Lanjut Cetak</span>
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

            <div className="flex flex-row items-center justify-center gap-4 w-full max-w-md mb-8 sm:mb-14 pb-2">
              <button
                disabled={isPrinting}
                onClick={handleSimulatePrint}
                className="flex-1 px-7 py-3.5 bg-[#f0a25c] hover:bg-[#ff7b00] text-[#090a12] rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg whitespace-nowrap"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>{isPrinting ? "Mencetak..." : "Cetak Foto"}</span>
              </button>

              <button
                onClick={() => {
                  handleStartDriveUpload();
                  setStep("upload_digital");
                }}
                className="flex-1 px-6 py-3.5 bg-[#171927] hover:bg-[#202336] text-white rounded-xl border border-[#292b3b] font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>Lewati Cetak</span>
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
            <div className="bg-[#10111c]/90 backdrop-blur-lg rounded-2xl p-7 max-w-md w-full text-center border border-[#292b3b] shadow-2xl mb-8 sm:mb-12">
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

              <div className="flex flex-row gap-3">
                <button
                  onClick={() => setStep("qr_download")}
                  className="flex-1 py-3.5 bg-[#171927] hover:bg-[#202336] text-[#9b9eaf] hover:text-white rounded-xl text-xs font-semibold uppercase tracking-wider border border-[#292b3b] transition-all whitespace-nowrap"
                >
                  Lewati
                </button>

                <button
                  onClick={() => {
                    handleSendEmail(emailInput);
                    setStep("qr_download");
                  }}
                  className="flex-1 py-3.5 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#246cff]/25 whitespace-nowrap"
                >
                  Kirim Email
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
            <div className="bg-[#10111c]/90 backdrop-blur-lg rounded-2xl p-7 max-w-sm w-full text-center border border-[#292b3b] shadow-2xl mb-8 sm:mb-12">
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
                className="w-full py-3.5 bg-[#246cff] hover:bg-[#4d87ff] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#246cff]/25 whitespace-nowrap"
              >
                Selesai
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
