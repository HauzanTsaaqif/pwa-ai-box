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
  X,
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
import LiveFramePreview from "@/components/LiveFramePreview";
import CameraPermissionModal from "@/components/CameraPermissionModal";
import SlotGuideSilhouette from "@/components/SlotGuideSilhouette";
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
  | "welcome_intro"        // Solid 5s welcome screen
  | "gesture_tutorial"     // Interactive hand movement practice screen (To-the-point)
  | "select_package"       // Pilih Paket
  | "select_format"        // Pilih Ukuran / Format
  | "select_theme"         // Pilih Tema / Template
  | "payment_qris"         // Bayar QRIS
  | "pose_ready"           // Pose Ready (Standby - butuh gesture Peace untuk trigger)
  | "countdown"            // Hitung Mundur 5 Detik & Jepret
  | "photo_review_single"  // Review Foto Per Jepretan (Bisa Foto Ulang Foto Ini atau Lanjut)
  | "preview_retake"       // Preview Lengkap Seluruh Strip
  | "processing"           // Processing 300 DPI
  | "print_session"        // Konfirmasi Cetak
  | "upload_digital"       // Upload Digital (Email + Drive)
  | "qr_download"          // QR Download Softcopy
  | "thank_you";           // Terima Kasih & Reset Otomatis

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
  const isInitializingCameraRef = useRef(false);

  // Booth State Machine
  const [mounted, setMounted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<"connecting" | "ready" | "error">("connecting");
  const [cameraErrorMessage, setCameraErrorMessage] = useState("");
  const [sessionOperator, setSessionOperator] = useState("");
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
  const gestureHoldRef = useRef<{ gesture: GestureType; startTime: number }>({ gesture: "none", startTime: 0 });

  const setStep = useCallback((newStep: BoothStep) => {
    stepRef.current = newStep;
    stepEntryTimeRef.current = Date.now();
    dwellCooldownRef.current = Date.now() + 1400; // 1.4s solid cooldown to prevent accidental clicks on new page
    mustExitBeforeSelectRef.current = true; // User must exit previous hover zone first!
    gestureHoldRef.current = { gesture: "none", startTime: 0 };
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
  const capturedPhotosRef = useRef<string[]>([]);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const currentPoseIndexRef = useRef(0);
  const gestureMustResetRef = useRef(false);
  const isProcessingPoseAdvanceRef = useRef(false);
  const [isFramePreviewOpen, setIsFramePreviewOpen] = useState(true);
  const [selectedRetakePose, setSelectedRetakePose] = useState<number>(0);
  const selectedRetakePoseRef = useRef<number>(0);

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
      if (label) label.textContent = "Memilih...";
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
  const tutorialCompletedRef = useRef(false);
  const [voiceStatus, setVoiceStatus] = useState<string>("");

  // Timers & Dynamic Inputs
  const [welcomeCountdown, setWelcomeCountdown] = useState(5);
  const [qrisTimer, setQrisTimer] = useState(5);
  const [photoCountdown, setPhotoCountdown] = useState(5);
  const [isIntermission, setIsIntermission] = useState(false);
  const [intermissionCountdown, setIntermissionCountdown] = useState(3);
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

  // ===== SPEECH RECOGNITION (EMAIL SOUND RECOGNIZER) =====
  const startRecordingVoice = useCallback(() => {
    if (typeof window === "undefined" || isRecordingVoiceRef.current) return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus("Browser tidak mendukung input suara.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "id-ID";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecordingVoice(true);
        isRecordingVoiceRef.current = true;
        setVoiceStatus("Mendengarkan... Ucapkan email Anda");
      };

      recognition.onresult = (event: any) => {
        if (!event.results || !event.results[0] || !event.results[0][0]) return;
        const rawTranscript = event.results[0][0].transcript.toLowerCase();

        // Convert spoken Indonesian numbers & separators into clean email format
        let formatted = rawTranscript
          .replace(/\bnol\b/g, "0")
          .replace(/\bkosong\b/g, "0")
          .replace(/\bsatu\b/g, "1")
          .replace(/\bdua\b/g, "2")
          .replace(/\btiga\b/g, "3")
          .replace(/\bempat\b/g, "4")
          .replace(/\blima\b/g, "5")
          .replace(/\benam\b/g, "6")
          .replace(/\btujuh\b/g, "7")
          .replace(/\bdelapan\b/g, "8")
          .replace(/\bsembilan\b/g, "9")
          .replace(/\s+(at|et|ad|add|a keong|keong|et keong|arroba)\s+/g, "@")
          .replace(/(at|et|ad|add|a keong|keong|et keong)\s*gmail/g, "@gmail")
          .replace(/(at|et|ad|add|a keong|keong|et keong)\s*yahoo/g, "@yahoo")
          .replace(/\s+(dot|titik)\s+/g, ".")
          .replace(/\s+dot\s+/g, ".")
          .replace(/\s+titik\s+/g, ".")
          .replace(/gmail\s+com/g, "gmail.com")
          .replace(/yahoo\s+com/g, "yahoo.com")
          .replace(/\s+/g, "")
          .trim();

        if (formatted) {
          setEmailInput((prev) => {
            if (!prev) return formatted;
            return `${prev}${formatted}`;
          });
          setVoiceStatus(`Terdengar: "${formatted}"`);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e.error);
        if (e.error === "not-allowed") {
          setVoiceStatus("Izin mikrofon ditolak.");
        } else if (e.error === "no-speech") {
          setVoiceStatus("Suara tidak terdengar. Silakan coba lagi.");
        } else {
          setVoiceStatus("Gagal mendengar suara. Silakan coba lagi.");
        }
        setIsRecordingVoice(false);
        isRecordingVoiceRef.current = false;
      };

      recognition.onend = () => {
        setIsRecordingVoice(false);
        isRecordingVoiceRef.current = false;
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition start failed:", err);
      setVoiceStatus("Gagal mengaktifkan mikrofon.");
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
  const initCamera = useCallback(async () => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setSessionOperator(session.username);

    // If camera stream is already active and healthy, reuse directly without querying OS device
    if (
      streamRef.current &&
      streamRef.current.active &&
      streamRef.current.getVideoTracks().some((t) => t.readyState === "live")
    ) {
      if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        try {
          await videoRef.current.play();
        } catch (_) { }
      }
      setCameraReady(true);
      setCameraStatus("ready");
      if (mediaPipeRef.current && videoRef.current) {
        mediaPipeRef.current.setVideo(videoRef.current);
        mediaPipeRef.current.activate();
      }
      return;
    }

    if (isInitializingCameraRef.current) return;
    isInitializingCameraRef.current = true;
    setCameraStatus("connecting");
    setCameraErrorMessage("");

    try {
      if (
        typeof window !== "undefined" &&
        window.isSecureContext === false &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        throw new Error("SECURE_CONTEXT_REQUIRED");
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("MEDIA_DEVICES_NOT_SUPPORTED");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30 },
            facingMode: "user",
          },
          audio: false,
        });
      } catch (firstErr: any) {
        if (firstErr?.name === "NotAllowedError" || firstErr?.name === "PermissionDeniedError") {
          throw firstErr;
        }
        console.warn("Retrying camera with generic video constraint fallback:", firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr: any) {
          if (playErr?.name !== "AbortError") {
            console.warn("Video play error:", playErr);
          }
        }
        setCameraReady(true);
        setCameraStatus("ready");

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

      // Separate MediaPipe Vision initialization so CDN/model download never blocks camera status
      try {
        if (!mediaPipeRef.current) {
          const mp = await MediaPipeManager.create();
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
                const alpha = 0.15; // 85% fresh landmark: zero perceptible latency, instant response
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

            // Direct Index Finger Tip #8 Tracking - Cursor sits precisely on the user's telunjuk
            if (hasHand && activeLandmarks && activeLandmarks[8]) {
              const indexTip = activeLandmarks[8];
              const exactX = (1 - indexTip.x) * 100;
              const exactY = indexTip.y * 100;

              targetCursorPosRef.current = {
                x: exactX,
                y: exactY,
              };
            } else {
              targetCursorPosRef.current = null;
            }

            const canTriggerAction = Date.now() - stepEntryTimeRef.current > 1000;

            if (result.gesture === "none" || !hasHand) {
              lastProcessedGestureRef.current = "none";
              gestureMustResetRef.current = false;
            }

            const isNewGesture =
              result.gesture !== "none" && result.gesture !== lastProcessedGestureRef.current;
            const canTriggerNewGestureAction = canTriggerAction && isNewGesture;

            // GESTURE TUTORIAL STEP: Must pose Peace ✌️ after 100% to proceed!
            if (
              stepRef.current === "gesture_tutorial" &&
              tutorialCompletedRef.current &&
              result.gesture === "peace" &&
              canTriggerNewGestureAction
            ) {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.setStep?.("select_package");
            }

            // POSE READY STEP: Peace Gesture ✌️ Trigger Photo Countdown (Requires Hand Reset)
            if (
              stepRef.current === "pose_ready" &&
              !gestureMustResetRef.current &&
              result.gesture === "peace" &&
              canTriggerNewGestureAction
            ) {
              lastProcessedGestureRef.current = result.gesture;
              gestureMustResetRef.current = true;
              callbacksRef.current.setStep?.("countdown");
            }

            // PHOTO REVIEW SINGLE STEP: Deliberately HOLD Peace ✌️ / Thumbs Up 👍 (Lanjut) or Thumbs Down 👎 (Foto Ulang) for 800ms
            if (stepRef.current === "photo_review_single") {
              const isSettledAfterFlash = Date.now() - stepEntryTimeRef.current > 500; // 500ms cooldown setelah jepret
              if (isSettledAfterFlash) {
                if (result.gesture === "peace" || result.gesture === "thumbs_up") {
                  if (gestureHoldRef.current.gesture !== result.gesture) {
                    gestureHoldRef.current = { gesture: result.gesture, startTime: Date.now() };
                  } else if (Date.now() - gestureHoldRef.current.startTime >= 800) {
                    gestureHoldRef.current = { gesture: "none", startTime: 0 };
                    lastProcessedGestureRef.current = result.gesture;
                    gestureMustResetRef.current = true;
                    callbacksRef.current.handleAcceptAndNextPose?.();
                  }
                } else if (result.gesture === "thumbs_down") {
                  if (gestureHoldRef.current.gesture !== "thumbs_down") {
                    gestureHoldRef.current = { gesture: "thumbs_down", startTime: Date.now() };
                  } else if (Date.now() - gestureHoldRef.current.startTime >= 800) {
                    gestureHoldRef.current = { gesture: "none", startTime: 0 };
                    lastProcessedGestureRef.current = "thumbs_down";
                    gestureMustResetRef.current = true;
                    callbacksRef.current.handleRetakeCurrentPose?.();
                  }
                } else {
                  gestureHoldRef.current = { gesture: "none", startTime: 0 };
                }
              } else {
                gestureHoldRef.current = { gesture: "none", startTime: 0 };
              }
            }

            // PREVIEW / RETAKE STEP: Deliberately HOLD Thumbs Up 👍 (Continue) / Thumbs Down 👎 (Retake) for 800ms
            if (stepRef.current === "preview_retake") {
              const isSettled = Date.now() - stepEntryTimeRef.current > 600;
              if (isSettled) {
                if (result.gesture === "thumbs_up") {
                  if (gestureHoldRef.current.gesture !== "thumbs_up") {
                    gestureHoldRef.current = { gesture: "thumbs_up", startTime: Date.now() };
                  } else if (Date.now() - gestureHoldRef.current.startTime >= 800) {
                    gestureHoldRef.current = { gesture: "none", startTime: 0 };
                    lastProcessedGestureRef.current = "thumbs_up";
                    callbacksRef.current.handleConfirmPreview?.();
                  }
                } else if (result.gesture === "thumbs_down") {
                  if (gestureHoldRef.current.gesture !== "thumbs_down") {
                    gestureHoldRef.current = { gesture: "thumbs_down", startTime: Date.now() };
                  } else if (Date.now() - gestureHoldRef.current.startTime >= 800) {
                    gestureHoldRef.current = { gesture: "none", startTime: 0 };
                    lastProcessedGestureRef.current = "thumbs_down";
                    const targetPose = selectedRetakePoseRef.current ?? 0;
                    callbacksRef.current.handleRetakeSpecificPose?.(targetPose);
                  }
                } else {
                  gestureHoldRef.current = { gesture: "none", startTime: 0 };
                }
              } else {
                gestureHoldRef.current = { gesture: "none", startTime: 0 };
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
        } else if (videoRef.current) {
          mediaPipeRef.current.setVideo(videoRef.current);
          mediaPipeRef.current.activate();
        }
      } catch (mpErr) {
        console.warn("MediaPipe model warning (camera feed remains active):", mpErr);
      }
    } catch (err: any) {
      console.error("Camera/MediaPipe init error:", err);
      setCameraStatus("error");
      if (err?.message === "SECURE_CONTEXT_REQUIRED") {
        setCameraErrorMessage(
          "Kamera memerlukan koneksi aman (HTTPS atau localhost). Akses melalui HTTP diblokir oleh browser demi keamanan."
        );
      } else if (err?.message === "MEDIA_DEVICES_NOT_SUPPORTED") {
        setCameraErrorMessage(
          "Browser Anda tidak mendukung akses kamera langsung (MediaDevices API tidak tersedia)."
        );
      } else if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCameraErrorMessage(
          "Akses kamera ditolak oleh browser. Silakan klik ikon gembok atau kamera di sebelah alamat web (URL) browser dan pilih 'Izinkan' (Allow)."
        );
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setCameraErrorMessage(
          "Tidak ada kamera yang terdeteksi pada perangkat ini. Pastikan webcam terpasang dengan baik."
        );
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        setCameraErrorMessage(
          "Kamera sedang dipakai aplikasi lain (seperti Zoom/Meet/Teams) atau terkunci oleh sistem. Tutup aplikasi tersebut lalu klik Coba Hubungkan Ulang."
        );
      } else {
        setCameraErrorMessage(
          "Kamera tidak dapat diakses. Silakan periksa izin kamera browser dan pastikan tidak ada aplikasi lain yang menggunakan kamera."
        );
      }
    } finally {
      isInitializingCameraRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    initCamera();

    // Listen for browser permission change (e.g. user toggles Allow in browser bar)
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      try {
        navigator.permissions
          .query({ name: "camera" as PermissionName })
          .then((permStatus) => {
            permStatus.onchange = () => {
              if (permStatus.state === "granted") {
                initCamera();
              }
            };
          })
          .catch(() => { });
      } catch (_) { }
    }

    const handleBeforeUnload = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
    };
  }, [initCamera]);

  // ===== 60 FPS HARDWARE ACCELERATED LERP CURSOR LOOP =====
  useEffect(() => {
    let animId: number;
    const loop = () => {
      const target = targetCursorPosRef.current;
      if (target) {
        if (!smoothCursorPosRef.current) {
          smoothCursorPosRef.current = { x: target.x, y: target.y };
        } else {
          // Snappy 0.75 lerp: ultra fast, zero-delay cursor tracking with smooth motion
          smoothCursorPosRef.current.x += (target.x - smoothCursorPosRef.current.x) * 0.75;
          smoothCursorPosRef.current.y += (target.y - smoothCursorPosRef.current.y) * 0.75;
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
          tutorialCompletedRef.current = true;
          // Hand gesture is ready. Do NOT auto-advance; user MUST pose Peace ✌️ to proceed!
        }
      } else {
        if (!tutorialCompletedRef.current) {
          progress = Math.max(0, progress - 8);
          setTutorialProgress(progress);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [step]);

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

      // In preview_retake: Any element with data-retake-index hovered by cursor selects that pose
      if (currentStep === "preview_retake") {
        for (const el of elements) {
          const retakeEl = (el.getAttribute("data-retake-index") ? el : el.closest("[data-retake-index]")) as HTMLElement | null;
          if (retakeEl) {
            const rawIdx = retakeEl.getAttribute("data-retake-index");
            if (rawIdx !== null) {
              const idxNum = parseInt(rawIdx, 10);
              if (!isNaN(idxNum) && selectedRetakePoseRef.current !== idxNum) {
                selectedRetakePoseRef.current = idxNum;
                setSelectedRetakePose(idxNum);
              }
            }
            break;
          }
        }
      }

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
          // Only the preview toggle button (btn-toggle-frame-preview) confirms in 800ms (2x faster)
          // All other buttons, packages, and cards across the app strictly use DWELL_LOCK_MS (1800ms)
          const isPreviewToggle =
            interactiveTarget.getAttribute("data-dwell-id") === "btn-toggle-frame-preview" ||
            interactiveTarget.id === "btn-toggle-frame-preview";
          const targetLockMs = isPreviewToggle ? 800 : DWELL_LOCK_MS;
          const elapsed = Date.now() - dwellStartTimeRef.current;
          const pct = Math.min(100, Math.round((elapsed / targetLockMs) * 100));
          updateDwellProgressDOM(pct, interactiveTarget);

          if (pct >= 100) {
            mustExitBeforeSelectRef.current = true;
            lastSelectedElementRef.current = interactiveTarget;
            clearDwellProgressDOM(interactiveTarget);
            activeTargetRef.current = null;
            activeTargetIdRef.current = null;
            setHoveredItemId(null);

            // Execute click cleanly without double-triggering toggle buttons
            try {
              interactiveTarget.click();
            } catch {
              interactiveTarget.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
            }
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
        currentPoseIndexRef.current = 0;
        setCurrentPoseIndex(0);
        gestureMustResetRef.current = false;
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
            currentPoseIndexRef.current = 0;
            setCurrentPoseIndex(0);
            gestureMustResetRef.current = false;
            setStep("pose_ready");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step, setStep]);

  // Total Poses required for current selection
  const totalPoses = selectedTheme?.defaultPoses || selectedTheme?.slots?.length || selectedPkg?.poses || 3;

  // ===== 7. SINGLE-POSE COUNTDOWN (5 DETIK) & INSTANT REVIEW ENGINE =====
  useEffect(() => {
    if (step !== "countdown") return;

    let timer: NodeJS.Timeout | null = null;
    let cancelled = false;

    // Reset countdown states to 5 seconds
    setPhotoCountdown(5);

    let currentSec = 5;
    timer = setInterval(() => {
      if (cancelled) {
        if (timer) clearInterval(timer);
        return;
      }

      currentSec -= 1;
      setPhotoCountdown(currentSec);

      if (currentSec <= 0) {
        if (timer) clearInterval(timer);

        // Studio Xenon Strobe Flash
        setXenonFlash(true);
        setTimeout(() => setXenonFlash(false), 300);

        // Capture snapshot into target slot synchronously
        const snapshot = captureSnapshot();
        if (snapshot) {
          const targetSlot = currentPoseIndexRef.current;
          const next = [...capturedPhotosRef.current];
          next[targetSlot] = snapshot;
          capturedPhotosRef.current = next;
          setCapturedPhotos(next);
        }

        // Segera jeda dan masuk ke review foto individu (Cek foto dulu, bisa foto ulang atau lanjut)
        setTimeout(() => {
          if (!cancelled) {
            setStep("photo_review_single");
          }
        }, 350);
      }
    }, 1000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [step, captureSnapshot, setStep]);

  // Handler: Foto ulang pose slot ini saja (tidak menghapus pose sebelumnya)
  const handleRetakeCurrentPose = useCallback(() => {
    const targetSlot = currentPoseIndexRef.current;
    const next = [...capturedPhotosRef.current];
    next[targetSlot] = "";
    capturedPhotosRef.current = next;
    setCapturedPhotos(next);
    gestureMustResetRef.current = true;
    lastProcessedGestureRef.current = "none";
    // Kembali ke pose_ready untuk pose ini (TIDAK OTOMATIS HITUNG, menunggu gestur Peace atau klik tombol)
    setStep("pose_ready");
  }, [setStep]);

  // Handler: Foto ulang pose tertentu pilihan user dari pratinjau akhir (fleksibel dan leluasa)
  const handleRetakeSpecificPose = useCallback(
    (poseIdx: number) => {
      currentPoseIndexRef.current = poseIdx;
      setCurrentPoseIndex(poseIdx);
      const next = [...capturedPhotosRef.current];
      next[poseIdx] = "";
      capturedPhotosRef.current = next;
      setCapturedPhotos(next);
      gestureMustResetRef.current = true;
      lastProcessedGestureRef.current = "none";
      setStep("pose_ready");
    },
    [setStep]
  );

  // Handler: Terima foto ini dan lanjut ke pose berikutnya / review strip final
  const handleAcceptAndNextPose = useCallback(() => {
    if (isProcessingPoseAdvanceRef.current) return;
    isProcessingPoseAdvanceRef.current = true;
    setTimeout(() => {
      isProcessingPoseAdvanceRef.current = false;
    }, 1000);

    const photos = capturedPhotosRef.current;
    // Cari apakah masih ada slot foto yang belum diambil (dari indeks 0 sampai totalPoses - 1)
    let nextEmptyIdx = -1;
    for (let i = 0; i < totalPoses; i++) {
      if (!photos[i]) {
        nextEmptyIdx = i;
        break;
      }
    }

    if (nextEmptyIdx !== -1) {
      currentPoseIndexRef.current = nextEmptyIdx;
      setCurrentPoseIndex(nextEmptyIdx);
      gestureMustResetRef.current = true;
      lastProcessedGestureRef.current = "peace";
      // Pindah ke pose_ready slot foto berikutnya (Wajib pose Peace lagi)
      setStep("pose_ready");
    } else {
      // Semua pose sudah lengkap! Lanjut ke processing komposit dan buka preview_retake
      setIsCompositingPreview(true);
      setStep("processing");
    }
  }, [totalPoses, setStep]);

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

      const frame = selectedTheme || FRAMES[0];
      const validPhotos = capturedPhotosRef.current.filter(Boolean);
      compositePhotosIntoFrame(validPhotos, frame).then((base64) => {
        photostripBase64Ref.current = base64;
        setPreviewStripUrl(base64);
        setIsCompositingPreview(false);
        clearInterval(progTimer);
        setProcessProgress(100);
        setTimeout(() => {
          setSelectedRetakePose(0);
          selectedRetakePoseRef.current = 0;
          setStep("preview_retake");
        }, 400);
      });

      return () => clearInterval(progTimer);
    }
  }, [step, selectedTheme, setStep]);

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
    capturedPhotosRef.current = [];
    setPreviewStripUrl("");
    currentPoseIndexRef.current = 0;
    setCurrentPoseIndex(0);
    setIsIntermission(false);
    setEmailInput("");
    setDriveFolderUrl("");
    setDriveFolderName("");
    setIsUploading(false);
    setIsPrinting(false);
    setTutorialProgress(0);
    setTutorialCompleted(false);
    tutorialCompletedRef.current = false;
    gestureMustResetRef.current = false;
    isProcessingPoseAdvanceRef.current = false;
    photostripBase64Ref.current = "";
    lastProcessedGestureRef.current = "none";
    setSelectedRetakePose(0);
    selectedRetakePoseRef.current = 0;
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
    capturedPhotosRef.current = [];
    setPreviewStripUrl("");
    currentPoseIndexRef.current = 0;
    setCurrentPoseIndex(0);
    gestureMustResetRef.current = false;
    isProcessingPoseAdvanceRef.current = false;
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

  const handleDirectLogout = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  const handleAdminLogout = useCallback(async () => {
    const session = getSession();
    if (!session || !adminPassword) return;

    try {
      const valid = await validateAdmin(session.username, adminPassword);
      if (valid) {
        clearSession();
        router.replace("/login");
      } else {
        setAdminError("Kata sandi salah");
        setTimeout(() => setAdminError(""), 2000);
      }
    } catch {
      setAdminError("Terjadi kesalahan jaringan");
      setTimeout(() => setAdminError(""), 2000);
    }
  }, [adminPassword, router]);

  callbacksRef.current = {
    setStep,
    handleConfirmPreview,
    handleRetake,
    handleRetakeCurrentPose,
    handleRetakeSpecificPose,
    handleAcceptAndNextPose,
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

      {/* Hand Skeleton Overlay Canvas (z-[35] to stay visible above z-30 review/step backdrops) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-[35] pointer-events-none"
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

      {/* Custom Animated Camera Pop-Out Permission & Status Modal */}
      <CameraPermissionModal
        status={cameraStatus}
        errorMessage={cameraErrorMessage}
        onRetry={initCamera}
      />

      {/* ===== DYNAMIC FRAME SLOT SILHOUETTE GUIDE (VIGNETTE CUTOUT) ===== */}
      <SlotGuideSilhouette
        slot={
          selectedTheme?.slots?.[
          selectedTheme?.slotMapping
            ? selectedTheme.slotMapping[currentPoseIndex] ?? currentPoseIndex
            : currentPoseIndex % (selectedTheme?.slots?.length || 1)
          ] || selectedTheme?.slots?.[0]
        }
        poseNumber={currentPoseIndex + 1}
        totalPoses={totalPoses}
        active={step === "pose_ready" || step === "countdown"}
      />

      {/* ===== LIVE FRAME PREVIEW DI POJOK KANAN (TOMBOL DI SEBELAH KIRI FRAME DENGAN CHEVRON) ===== */}
      {(step === "pose_ready" || step === "countdown" || step === "photo_review_single") && (
        <div className="fixed right-3 sm:right-4 top-1/2 -translate-y-1/2 z-40 flex flex-row items-center gap-2 pointer-events-auto scale-90 sm:scale-100 origin-right">
          {/* Toggle Button: Tepat di sebelah kiri preview frame, posisi terkunci (tidak melompat saat buka/tutup) */}
          <button
            type="button"
            data-dwell-id="btn-toggle-frame-preview"
            data-dwell-time="800"
            onClick={(e) => {
              e.stopPropagation();
              setIsFramePreviewOpen((prev) => !prev);
            }}
            className="px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-2xl bg-[#10111c]/60 hover:bg-[#1a1d2e] border border-[#292b3b] hover:border-[#f0a25c] text-white text-xs font-mono-tech flex items-center gap-1.5 shadow-xl transition-all cursor-pointer pointer-events-auto select-none backdrop-blur-md active:scale-95 shrink-0"
            title={isFramePreviewOpen ? "Tutup Preview" : "Buka Frame Preview"}
          >
            {isFramePreviewOpen ? (
              <>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#f0a25c]" />
                <span className="text-[11px] sm:text-xs text-[#ced0dc] font-semibold whitespace-nowrap">
                  Tutup
                </span>
              </>
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#f0a25c]" />
                <span className="text-[11px] sm:text-xs text-[#ced0dc] font-semibold whitespace-nowrap">
                  Preview
                </span>
              </>
            )}
          </button>

          {/* Frame Preview Container (Menahan posisi agar tombol di sebelah kiri tidak melompat) */}
          <div
            className={`transition-all duration-300 ease-out origin-right ${isFramePreviewOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
              }`}
          >
            <LiveFramePreview
              frame={selectedTheme || FRAMES[0]}
              capturedPhotos={capturedPhotos}
              currentPoseIndex={currentPoseIndex}
              totalPoses={totalPoses}
              onClose={() => setIsFramePreviewOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ===== RETICLE SENSOR CURSOR (DIRECTLY ATTACHED TO TELUNJUK) ===== */}
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
                    stroke="rgba(240, 162, 92, 0.2)"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    ref={cursorCircleRef}
                    cx="35"
                    cy="35"
                    r="28"
                    stroke="#f0a25c"
                    strokeWidth="3.5"
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
                  className="absolute -bottom-6 px-2 py-0.5 rounded-full bg-black/80 border border-[#292b3b] font-mono-tech text-[9px] font-bold text-[#f0a25c] tracking-wider pointer-events-none shadow"
                >
                  0%
                </div>
              </>
            )}

            {/* Clean minimal pointer dot (No heavy distracting glow) */}
            <div className="relative w-5 h-5 rounded-full border-2 border-[#f0a25c] bg-[#10111c] shadow-md flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>
        </div>
      )}

      {/* ===== REAL-TIME GESTURE FEEDBACK HUD (CLEAN & MINIMALIST) ===== */}
      {cameraReady && step !== "welcome_intro" && step !== "thank_you" && (
        <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-[45] pointer-events-none select-none">
          <div className="px-4 py-2 rounded-xl border border-[#292b3b] bg-[#10111c]/80 backdrop-blur-md shadow-xl flex items-center gap-2.5 transition-all duration-200">
            {/* Minimalist Status Dot */}
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${isHandDetected ? "bg-emerald-400" : "bg-[#454964]"
                }`}
            />

            <span className="font-mono-tech text-xs tracking-wide font-medium text-[#ced0dc]">
              {!isHandDetected ? (
                <span className="text-[#888b9c]">Angkat Tangan ke Kamera</span>
              ) : lastDetectedGesture === "peace" ? (
                <span className="text-white flex items-center gap-1.5">
                  <span>✌️</span>
                  <span>Pose Peace</span>
                </span>
              ) : lastDetectedGesture === "pointing" ? (
                <span className="text-white flex items-center gap-1.5">
                  <span>👆</span>
                  <span>Telunjuk (Kursor)</span>
                </span>
              ) : lastDetectedGesture === "thumbs_up" ? (
                <span className="text-white flex items-center gap-1.5">
                  <span>👍</span>
                  <span>Jempol Atas (Lanjut)</span>
                </span>
              ) : lastDetectedGesture === "thumbs_down" ? (
                <span className="text-white flex items-center gap-1.5">
                  <span>👎</span>
                  <span>Jempol Bawah (Ulang)</span>
                </span>
              ) : lastDetectedGesture === "wave" ? (
                <span className="text-white flex items-center gap-1.5">
                  <span>👋</span>
                  <span>Lambaian Tangan</span>
                </span>
              ) : lastDetectedGesture === "open_palm" ? (
                <span className="text-white flex items-center gap-1.5">
                  <span>🖐️</span>
                  <span>Telapak Terbuka</span>
                </span>
              ) : lastDetectedGesture === "fist" ? (
                <span className="text-white flex items-center gap-1.5">
                  <span>✊</span>
                  <span>Kepalan Tangan</span>
                </span>
              ) : (
                <span className="text-white flex items-center gap-1.5">
                  <span>✋</span>
                  <span>Tangan Terdeteksi</span>
                </span>
              )}
            </span>
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
            {/* Ambient Depth Radial Gradient */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-gradient-to-b from-[#2e3247]/35 to-transparent rounded-full blur-[140px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center max-w-4xl px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <div className="inline-block px-5 py-2 rounded-full bg-[#f0a25c]/15 border border-[#f0a25c]/40 text-[#f0a25c] font-mono-tech text-sm sm:text-base font-bold uppercase tracking-widest mb-6">
                  AI BOX PHOTO STUDIO
                </div>

                <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] text-white mb-6 drop-shadow-[0_8px_35px_rgba(0,0,0,0.9)]">
                  CAPTURE YOUR MOMENTS!
                </h1>

                <p className="text-2xl sm:text-3xl text-white font-bold mb-3 tracking-tight">
                  Studio Bebas Sentuh
                </p>

                <p className="text-lg sm:text-xl text-[#ced0dc] max-w-xl mx-auto leading-relaxed mb-10">
                  Gerakkan telunjuk Anda 👆 sebagai kursor layar.
                </p>
              </motion.div>

              {/* Progress & Start Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-3 px-7 py-4 rounded-2xl bg-[#10111c] border border-[#292b3b] shadow-2xl">
                  <div className="w-5 h-5 rounded-full border-3 border-[#f0a25c] border-t-transparent animate-spin" />
                  <span className="text-base font-mono-tech text-white font-bold">
                    Mulai Dalam <strong className="text-[#f0a25c] text-xl">{welcomeCountdown}s</strong>
                  </span>
                </div>

                <button
                  onClick={() => setStep("gesture_tutorial")}
                  className="px-9 py-4 bg-[#f0a25c] hover:bg-[#ff7b00] text-[#090a12] rounded-2xl font-bold text-base tracking-wider uppercase transition-all shadow-[0_6px_25px_rgba(240,162,92,0.4)]"
                >
                  Mulai Sekarang
                </button>
              </div>
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
              ? "bg-[#090a12]/50 backdrop-blur-none"
              : "bg-[#090a12]/85 backdrop-blur-md"
              }`}
          >
            {/* Top Bar with Skip Option */}
            <div className="w-full max-w-4xl flex items-center justify-between pt-6 sm:pt-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#246cff]/15 border border-[#246cff]/30 text-[#246cff] text-xs font-bold tracking-wider uppercase">
                <Hand className="w-4 h-4" />
                <span>Pemanasan Singkat</span>
              </div>

              <button
                data-dwell-id="btn-skip-tutorial"
                onClick={() => setStep("select_package")}
                className="px-5 py-2.5 rounded-xl bg-[#171927]/90 hover:bg-[#202336] text-[#f0a25c] hover:text-white border border-[#292b3b] font-mono-tech text-xs tracking-wider uppercase font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>Lewati</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Instructions (Vertically lowered for comfort) */}
            <div className="max-w-xl mt-5 sm:mt-8 text-center">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2">
                Arahkan Telunjuk
              </h2>
              <p className="text-[#ced0dc] text-sm sm:text-base leading-relaxed">
                Ujung jari telunjuk adalah kursor. Arahkan ke lingkaran di tengah layar.
              </p>
            </div>

            {/* Central Target Sensor Portal (Enlarged and shifted higher vertically) */}
            <div className="relative my-auto -translate-y-5 sm:-translate-y-0 flex flex-col items-center justify-center">
              <motion.div
                ref={targetCircleRef}
                animate={
                  tutorialCompleted
                    ? { scale: [1, 1.08, 1] }
                    : { scale: [1, 1.04, 1] }
                }
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`relative w-52 h-52 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${tutorialCompleted
                  ? "bg-emerald-500/20 border-emerald-400 shadow-[0_0_55px_rgba(52,211,153,0.6)]"
                  : tutorialProgress > 0
                    ? "bg-[#f0a25c]/15 border-[#f0a25c] shadow-[0_0_40px_rgba(240,162,92,0.45)]"
                    : "bg-[#10111c]/85 border-[#292b3b] shadow-2xl"
                  }`}
              >
                {/* Radial Progress Gauge (Scaled to 208px circle) */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 208 208">
                  <circle
                    cx="104"
                    cy="104"
                    r="94"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="104"
                    cy="104"
                    r="94"
                    stroke={tutorialCompleted ? "#34d399" : "#f0a25c"}
                    strokeWidth="6"
                    strokeDasharray="591"
                    strokeDashoffset={591 - (591 * tutorialProgress) / 100}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-100"
                  />
                </svg>

                {/* Inner Icon & Message */}
                <div className="flex flex-col items-center justify-center text-center p-3 select-none">
                  {tutorialCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-emerald-400 flex flex-col items-center justify-center"
                    >
                      <CheckCircle2 className="w-14 h-14 mb-2" />
                      <span className="font-black text-base text-white uppercase tracking-wider">
                        Sensor Siap!
                      </span>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-5xl mb-2 animate-bounce">👆</span>
                      <span className="text-sm font-black text-white uppercase tracking-wider">
                        {tutorialProgress > 0 ? `${tutorialProgress}%` : "Arahkan Telunjuk"}
                      </span>
                      <span className="text-xs text-[#9b9eaf] mt-0.5">Ke Lingkaran Ini</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Requirement: User MUST pose Peace to proceed when completed (Separated with generous mt) */}
              {tutorialCompleted ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-7 flex flex-col items-center gap-2"
                >
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="px-7 py-3 rounded-2xl bg-[#246cff] text-[#fff] font-bold text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(36,108,255,0.7)] flex items-center gap-2 select-none border border-white/20"
                  >
                    <span>✌️ Pose Peace Untuk Lanjut</span>
                  </motion.div>
                </motion.div>
              ) : (
                <></>
              )}
            </div>

            {/* 3 Informational Steps at the Bottom (Enlarged and shifted higher up) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl sm:max-w-4xl mt-4 sm:mt-6 mb-16 sm:mb-24 pt-4 border-t border-white/10">
              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-all text-left flex items-center gap-4 ${isHandDetected
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10"
                  : "bg-[#10111c]/85 border-[#292b3b] text-[#9b9eaf]"
                  }`}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 ${isHandDetected ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40" : "bg-[#171927] text-[#9b9eaf]"
                    }`}
                >
                  1
                </div>
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-white">Angkat Tangan</div>
                  <div className="text-xs sm:text-sm text-[#9b9eaf] mt-0.5">
                    {isHandDetected ? "✓ Terdeteksi" : "Hadapkan ke kamera"}
                  </div>
                </div>
              </div>

              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-all text-left flex items-center gap-4 ${tutorialProgress > 0
                  ? "bg-[#ff7b00]/15 border-[#ff7b00]/50 text-[#f0a25c] shadow-lg shadow-[#ff7b00]/10"
                  : "bg-[#10111c]/85 border-[#292b3b] text-[#9b9eaf]"
                  }`}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 ${tutorialProgress > 0 ? "bg-[#ff7b00] text-[#090a12] shadow-lg shadow-[#ff7b00]/40" : "bg-[#171927] text-[#9b9eaf]"
                    }`}
                >
                  2
                </div>
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-white">Telunjuk 👆</div>
                  <div className="text-xs sm:text-sm text-[#9b9eaf] mt-0.5">
                    {tutorialProgress > 0 ? `${tutorialProgress}% Terkunci` : "Kursor layar"}
                  </div>
                </div>
              </div>

              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-all text-left flex items-center gap-4 ${tutorialCompleted
                  ? "bg-[#246cff]/20 border-[#246cff]/60 text-[#fff] shadow-lg shadow-[#246cff]/20"
                  : "bg-[#10111c]/85 border-[#292b3b] text-[#9b9eaf]"
                  }`}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 ${tutorialCompleted ? "bg-[#246cff] text-white shadow-lg shadow-[#246cff]/40" : "bg-[#171927] text-[#9b9eaf]"
                    }`}
                >
                  3
                </div>
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-white">Pose Peace ✌️</div>
                  <div className="text-xs sm:text-sm text-[#9b9eaf] mt-0.5">
                    {tutorialCompleted ? "Tunjukkan sekarang!" : "Untuk konfirmasi"}
                  </div>
                </div>
              </div>
            </div>
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
            {/* Top Navigation Bar with Back Button */}
            <div className="w-full max-w-5xl flex items-center justify-between pt-4 sm:pt-6 mb-2">
              <button
                data-dwell-id="btn-back-tutorial"
                onClick={() => setStep("gesture_tutorial")}
                className="px-4 py-2 rounded-xl bg-[#171927]/90 hover:bg-[#202336] text-[#ced0dc] hover:text-white border border-[#292b3b] text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#f0a25c]" />
                <span>Kembali</span>
              </button>

              <div className="text-center flex-1 pr-14 sm:pr-20">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Pilih Paket Foto Studio
                </h2>
                <p className="text-[#9b9eaf] text-xs sm:text-sm mt-0.5">
                  Arahkan kursor telunjuk ke paket pilihan
                </p>
              </div>
            </div>

            {/* 3 Package Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl w-full my-auto">
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
                    className={`relative rounded-3xl p-6 sm:p-7 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border ${isLocked
                      ? "bg-[#10111c]/95 border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl backdrop-blur-md"
                      : isHovered
                        ? "bg-[#10111c]/95 border-[#f0a25c] ring-2 ring-[#f0a25c]/40 shadow-xl backdrop-blur-md"
                        : "bg-[#10111c]/85 border-[#292b3b] hover:border-[#3b3e5b] backdrop-blur-md"
                      }`}
                  >
                    {pkg.badge && (
                      <span className="absolute -top-3 right-5 px-3 py-1 bg-[#f0a25c] text-[#090a12] font-black text-xs tracking-wider uppercase rounded-lg shadow-md">
                        {pkg.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-black text-white">{pkg.name}</h3>
                        <div className="w-9 h-9 rounded-xl bg-[#171927] flex items-center justify-center border border-[#292b3b]">
                          <Camera className="w-5 h-5 text-[#f0a25c]" />
                        </div>
                      </div>

                      <div className="mb-4">
                        <span className="text-3xl sm:text-4xl font-black text-white block tracking-tight">
                          {pkg.price}
                        </span>
                        <span className="text-sm font-semibold text-[#f0a25c] block mt-1">
                          {pkg.poses} Pose Foto Studio
                        </span>
                      </div>

                      <ul className="space-y-2.5 border-t border-[#292b3b] pt-4 mb-5">
                        {pkg.features.map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-2.5 text-sm text-[#e0e2ed]">
                            <CheckCircle2 className="w-4 h-4 text-[#f0a25c] flex-shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      {isHovered && !isLocked && (
                        <div className="w-full bg-[#090a12] h-2 rounded-full overflow-hidden mb-2.5">
                          <div
                            className="dwell-bar bg-[#f0a25c] h-full transition-all duration-75"
                            style={{ width: "0%" }}
                          />
                        </div>
                      )}

                      <div
                        className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase text-center transition-all ${isLocked
                          ? "bg-emerald-500 text-white"
                          : isHovered
                            ? "bg-[#f0a25c] text-[#090a12]"
                            : "bg-[#171927] text-white border border-[#292b3b]"
                          }`}
                      >
                        {isLocked
                          ? "✓ Paket Dipilih!"
                          : isHovered
                            ? <span className="dwell-label">Memilih...</span>
                            : "Pilih Paket"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom spacer (Back button is now at top for ergonomics) */}
            <div className="h-4" />
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
            {/* Top Navigation Bar with Back Button */}
            <div className="w-full max-w-4xl flex items-center justify-between pt-4 sm:pt-6 mb-2">
              <button
                data-dwell-id="btn-back-package"
                onClick={() => setStep("select_package")}
                className="px-4 py-2 rounded-xl bg-[#171927]/90 hover:bg-[#202336] text-[#ced0dc] hover:text-white border border-[#292b3b] text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#f0a25c]" />
                <span>Kembali</span>
              </button>

              <div className="text-center flex-1 pr-14 sm:pr-20">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Pilih Ukuran Format Foto
                </h2>
                <p className="text-[#9b9eaf] text-xs sm:text-sm mt-0.5">
                  Arahkan kursor telunjuk ke ukuran cetak pilihan
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full my-auto">
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
                    className={`relative rounded-3xl p-7 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border ${isLocked
                      ? "bg-[#10111c]/95 border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl backdrop-blur-md"
                      : isHovered
                        ? "bg-[#10111c]/95 border-[#246cff] ring-2 ring-[#246cff]/40 shadow-xl backdrop-blur-md"
                        : "bg-[#10111c]/85 border-[#292b3b] hover:border-[#3b3e5b] backdrop-blur-md"
                      }`}
                  >
                    {fmt.badge && (
                      <span className="absolute -top-3 right-5 px-3 py-1 bg-[#246cff] text-white font-bold text-xs tracking-wider uppercase rounded-lg shadow-md">
                        {fmt.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-black text-white">{fmt.name}</h3>
                        <div className="w-9 h-9 rounded-xl bg-[#171927] flex items-center justify-center border border-[#292b3b]">
                          <Layers className="w-5 h-5 text-[#246cff]" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-mono-tech text-xs text-[#f0a25c] font-bold">
                          Rasio {fmt.ratio}
                        </span>
                        <span className="text-[#9b9eaf] text-xs">•</span>
                        <span className="font-mono-tech text-xs text-[#9b9eaf]">
                          {fmt.dimensions}
                        </span>
                      </div>

                      <p className="text-sm text-[#ced0dc] leading-relaxed mb-6">
                        {fmt.description}
                      </p>
                    </div>

                    <div>
                      {isHovered && !isLocked && (
                        <div className="w-full bg-[#090a12] h-2 rounded-full overflow-hidden mb-2.5">
                          <div
                            className="dwell-bar bg-[#246cff] h-full transition-all duration-75"
                            style={{ width: "0%" }}
                          />
                        </div>
                      )}

                      <div
                        className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase text-center transition-all ${isLocked
                          ? "bg-emerald-500 text-white"
                          : isHovered
                            ? "bg-[#246cff] text-white"
                            : "bg-[#171927] text-white border border-[#292b3b]"
                          }`}
                      >
                        {isLocked
                          ? "✓ Format Dipilih!"
                          : isHovered
                            ? <span className="dwell-label">Memilih...</span>
                            : "Pilih Format"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom spacer */}
            <div className="h-4" />
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
            {/* Top Navigation Bar with Back Button */}
            <div className="w-full max-w-5xl flex items-center justify-between pt-4 sm:pt-6 mb-2">
              <button
                data-dwell-id="btn-back-format"
                onClick={() => setStep("select_format")}
                className="px-4 py-2 rounded-xl bg-[#171927]/90 hover:bg-[#202336] text-[#ced0dc] hover:text-white border border-[#292b3b] text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#f0a25c]" />
                <span>Kembali</span>
              </button>

              <div className="text-center flex-1 pr-14 sm:pr-20">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Pilih Bingkai Foto
                </h2>
                <p className="text-[#9b9eaf] text-xs sm:text-sm mt-0.5">
                  Arahkan kursor telunjuk ke desain bingkai favorit Anda
                </p>
              </div>
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
                          className={`relative rounded-3xl p-5 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between border group ${isLocked
                            ? "bg-[#10111c]/95 border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl backdrop-blur-md"
                            : isHovered
                              ? "bg-[#10111c]/95 border-[#f0a25c] ring-2 ring-[#f0a25c]/40 shadow-xl backdrop-blur-md"
                              : "bg-[#10111c]/85 border-[#292b3b] hover:border-[#3b3e5b] backdrop-blur-md"
                            }`}
                        >
                          {thm.badge && (
                            <span className="absolute -top-3 right-5 px-3 py-1 bg-[#f0a25c] text-[#090a12] font-black text-xs tracking-wider uppercase rounded-lg shadow-md z-10">
                              {thm.badge}
                            </span>
                          )}

                          {/* REAL VISUAL FRAME PREVIEW THUMBNAIL */}
                          <div className="w-full h-48 rounded-2xl mb-3 bg-[#090a12]/95 border border-[#292b3b] overflow-hidden shadow-inner relative flex items-center justify-center p-2 group-hover:border-[#f0a25c]/50 transition-colors">
                            <img
                              src={thm.frameSrc}
                              alt={thm.name}
                              className="h-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                            />
                            <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-lg bg-[#090a12]/80 border border-[#292b3b] text-[11px] font-mono-tech text-[#f0a25c] backdrop-blur-sm font-bold">
                              {thm.slots.length} Foto
                            </span>
                          </div>

                          <div>
                            <h3 className="text-xl font-black text-white mb-1">{thm.name}</h3>
                            <p className="text-xs text-[#ced0dc] leading-relaxed mb-3">
                              {thm.description}
                            </p>
                          </div>

                          <div>
                            {isHovered && !isLocked && (
                              <div className="w-full bg-[#090a12] h-2 rounded-full overflow-hidden mb-2.5">
                                <div
                                  className="dwell-bar bg-[#f0a25c] h-full transition-all duration-75"
                                  style={{ width: "0%" }}
                                />
                              </div>
                            )}

                            <div
                              className={`w-full py-3 rounded-2xl font-bold text-xs tracking-wider uppercase text-center transition-all ${isLocked
                                ? "bg-emerald-500 text-white"
                                : isHovered
                                  ? "bg-[#f0a25c] text-[#090a12]"
                                  : "bg-[#171927] text-white border border-[#292b3b]"
                                }`}
                            >
                              {isLocked
                                ? "✓ Bingkai Dipilih!"
                                : isHovered
                                  ? <span className="dwell-label">Memilih...</span>
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

            {/* Bottom spacer */}
            <div className="h-4" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 6: BAYAR QRIS ================================================ */}
      <AnimatePresence>
        {step === "payment_qris" && selectedPkg && (
          <motion.div
            key="payment_qris"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="absolute inset-0 z-40 bg-[#090a12]/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-full max-w-md flex flex-col items-center justify-center mb-3">
              <button
                data-dwell-id="btn-back-theme"
                onClick={() => setStep("select_theme")}
                className="px-6 py-2 rounded-xl bg-[#171927]/90 hover:bg-[#202336] text-[#ced0dc] hover:text-white border border-[#292b3b] font-medium text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#f0a25c]" />
                <span>Kembali Pilih Bingkai</span>
              </button>
            </div>

            <div className="bg-[#10111c]/95 backdrop-blur-lg rounded-3xl p-7 sm:p-8 max-w-md w-full text-center border border-[#292b3b] shadow-2xl">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <QrCode className="w-6 h-6 text-[#f0a25c]" />
                <span className="text-white font-extrabold text-2xl tracking-tight">
                  Pembayaran QRIS
                </span>
              </div>

              <p className="font-mono-tech text-[#9b9eaf] text-xs tracking-wider uppercase mb-4">
                Scan via BCA, GoPay, OVO, Dana, ShopeePay
              </p>

              <div className="bg-white p-4 rounded-2xl inline-block mb-4 shadow-inner">
                <QRCodeSVG
                  value={`https://qris.id/pay/aibox?amt=${selectedPkg.rawPrice}&pkg=${selectedPkg.id}`}
                  size={160}
                  level="H"
                />
              </div>

              <div className="bg-[#090a12]/90 border border-[#292b3b] rounded-2xl py-3 px-4 mb-4">
                <span className="text-xs text-[#9b9eaf] block uppercase font-mono-tech">
                  {selectedPkg.name} • {selectedFormat.name}
                </span>
                <span className="text-white font-black text-3xl tracking-tight mt-0.5 block">
                  {selectedPkg.price}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 font-mono-tech text-[#ced0dc] text-sm mb-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-[#f0a25c] border-t-transparent rounded-full"
                />
                <span>Memverifikasi Pembayaran ({qrisTimer}s)...</span>
              </div>

              <button
                data-dwell-id="btn-simulate-qris"
                onClick={() => {
                  setCapturedPhotos([]);
                  setCurrentPoseIndex(0);
                  setStep("pose_ready");
                }}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-sm font-bold tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Simulasi Pembayaran Berhasil</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 7: POSE READY (STANDBY - WAITING FOR PEACE GESTURE / BUTTON) = */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* ===== STEP 7: POSE READY (CLEAN CAMERA VIEW - NON-OBSTRUCTIVE) ========== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "pose_ready" && (
          <motion.div
            key="pose_ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 pointer-events-none select-none"
          >
            {/* Top Indicator Pill */}
            <div className="mt-2 px-5 py-2 rounded-full bg-[#10111c]/80 backdrop-blur-md border border-[#292b3b] shadow-lg flex items-center gap-2.5 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-mono-tech text-xs sm:text-sm text-white font-bold tracking-wider uppercase">
                Foto {currentPoseIndex + 1} dari {totalPoses}
              </span>
              <span className="text-[#686b7f]">•</span>
              <span className="text-xs sm:text-sm text-[#f0a25c] font-medium">
                {selectedTheme?.name || "Bingkai Pilihan"}
              </span>
            </div>

            {/* Center Area is Kept 100% COMPLETELY CLEAR for Camera Subject */}
            <div className="flex-1" />

            {/* Bottom Elegant Floating Action Bar */}
            <div className="mb-20 sm:mb-24 flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#10111c]/85 backdrop-blur-md border border-[#292b3b] shadow-2xl pointer-events-auto">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#ced0dc]">
                <span className="text-base">✌️</span>
                <span>Pose <strong className="text-white">Peace</strong> untuk mulai</span>
              </div>

              <div className="w-px h-4 bg-[#292b3b]" />

              <button
                data-dwell-id="btn-start-countdown-manual"
                onClick={() => setStep("countdown")}
                className="px-4 py-1.5 bg-[#246cff] hover:bg-[#3d7eff] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Mulai</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 8: COUNTDOWN 5 DETIK & CAPTURE =============================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "countdown" && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none select-none"
          >
            {isCompositingPreview ? (
              <div className="flex flex-col items-center gap-4 bg-[#10111c]/90 px-8 py-6 rounded-2xl border border-[#292b3b] backdrop-blur-md shadow-2xl">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 border-3 border-[#f0a25c] border-t-transparent rounded-full"
                />
                <span className="text-white font-medium text-sm">Menyusun Foto ke Bingkai...</span>
              </div>
            ) : (
              <motion.div
                key={photoCountdown}
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-8xl sm:text-[11rem] font-black text-white font-mono-tech drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]"
              >
                {photoCountdown > 0 ? photoCountdown : "SMILE!"}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 8B: REVIEW FOTO PER JEPRETAN (CLEAN & ELEGANT) =============== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "photo_review_single" && (
          <motion.div
            key="photo_review_single"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-0 z-30 bg-[#090a12]/85 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-8 text-center"
          >
            {/* Top Ergonomic Navigation Bar */}
            <div className="w-full max-w-4xl flex items-center justify-between gap-3 pt-4 sm:pt-6">
              <button
                data-dwell-id="btn-retake-single-pose"
                onClick={handleRetakeCurrentPose}
                className="px-5 py-3 bg-[#171927]/90 hover:bg-rose-600/90 text-white rounded-2xl border border-[#292b3b] hover:border-rose-500 text-xs sm:text-sm font-semibold tracking-wide transition-all flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span>Foto Ulang (👎)</span>
              </button>

              <div className="px-4 py-2 rounded-xl bg-[#10111c]/90 border border-[#292b3b] text-center hidden sm:block shadow-md">
                <span className="font-mono-tech text-xs text-[#ced0dc] uppercase font-bold tracking-wider">
                  Foto {currentPoseIndex + 1} dari {totalPoses}
                </span>
              </div>

              <button
                data-dwell-id="btn-accept-next-pose"
                onClick={handleAcceptAndNextPose}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-xs sm:text-sm font-semibold tracking-wide transition-all flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>
                  {currentPoseIndex + 1 < totalPoses ? "Lanjut Foto (👍)" : "Selesai (👍)"}
                </span>
              </button>
            </div>

            {/* Center Snapshot Preview (100% Clean Image, No Obstructing Overlay Badge) */}
            <div className="my-auto flex flex-col items-center justify-center max-h-[64vh]">
              {capturedPhotos[currentPoseIndex] ? (
                <div className="relative rounded-3xl overflow-hidden border border-[#292b3b] shadow-2xl bg-[#10111c] max-h-[60vh] p-1.5 flex items-center justify-center">
                  <img
                    src={capturedPhotos[currentPoseIndex]}
                    alt={`Hasil Foto ${currentPoseIndex + 1}`}
                    className="max-h-[58vh] object-contain rounded-2xl"
                  />
                </div>
              ) : (
                <div className="p-8 text-[#9b9eaf] text-sm">Memuat pratinjau foto...</div>
              )}
            </div>

            {/* Subtle Bottom Spacer */}
            <div className="h-2" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ===== STEP 9: PREVIEW LENGKAP HASIL PHOTOSTRIP (CLEAN & MINIMAL) ======== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {step === "preview_retake" && (
          <motion.div
            key="preview_retake"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-0 z-30 bg-[#090a12]/85 backdrop-blur-md flex flex-col items-center justify-between p-6 sm:p-8 text-center"
          >
            {/* Top Action Bar */}
            <div className="w-full max-w-5xl flex items-center justify-between gap-3 pt-4 sm:pt-6">
              <button
                data-dwell-id="btn-retake-all-poses"
                onClick={handleRetake}
                className="px-5 py-2.5 bg-[#171927]/90 hover:bg-[#202336] text-white rounded-xl border border-[#292b3b] text-xs sm:text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 shrink-0"
              >
                <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Foto Ulang Semua</span>
              </button>

              <div className="px-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Pratinjau Hasil Cetak
                </h2>
              </div>

              <button
                data-dwell-id="btn-confirm-print"
                onClick={handleConfirmPreview}
                className="px-6 py-2.5 bg-[#246cff] hover:bg-[#3d7eff] text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg whitespace-nowrap shrink-0 active:scale-95"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>Lanjut Cetak (👍)</span>
              </button>
            </div>

            {/* Main Content Area: Side-by-Side Strip Preview (Left) and Vertical Photo Retake Selector (Right) */}
            <div className="my-auto flex flex-col md:flex-row items-center justify-center gap-6 lg:gap-10 w-full max-w-5xl px-4 py-2">
              {/* KIRI: Pratinjau Photostrip Lengkap (Frame + Foto) */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#292b3b] bg-[#10111c]/90 p-2 max-h-[58vh] flex items-center justify-center">
                  {previewStripUrl || photostripBase64Ref.current ? (
                    <img
                      src={previewStripUrl || photostripBase64Ref.current}
                      alt="Hasil Foto dan Frame"
                      className="max-h-[54vh] object-contain rounded-xl shadow-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-10">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-2 border-[#f0a25c] border-t-transparent rounded-full"
                      />
                      <span className="text-white text-xs">Menyusun strip foto...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* KANAN: Daftar Vertikal Foto untuk Dipilih & Diulang */}
              <div className="flex flex-col w-full max-w-md bg-[#10111c]/95 border border-[#292b3b] rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between pb-3 border-b border-[#292b3b] mb-3">
                  <div className="flex items-center gap-2 text-left">
                    <RotateCcw className="w-4 h-4 text-[#f0a25c]" />
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                      Pilih Foto untuk Diulang
                    </h3>
                  </div>
                  {selectedRetakePose !== null && (
                    <div className="px-2.5 py-0.5 rounded-full bg-[#f0a25c]/15 border border-[#f0a25c]/30 text-[#f0a25c] text-xs font-mono-tech font-bold shrink-0">
                      Foto #{selectedRetakePose + 1}
                    </div>
                  )}
                </div>

                {/* Vertical List of Photo Cards */}
                <div className="flex flex-col gap-2 max-h-[44vh] overflow-y-auto pr-1">
                  {Array.from({ length: totalPoses }).map((_, idx) => {
                    const photo = capturedPhotos[idx];
                    const isSelected = selectedRetakePose === idx;
                    return (
                      <div
                        key={idx}
                        data-retake-index={idx}
                        data-dwell-id={`card-retake-pose-${idx}`}
                        onClick={() => {
                          selectedRetakePoseRef.current = idx;
                          setSelectedRetakePose(idx);
                        }}
                        onMouseEnter={() => {
                          selectedRetakePoseRef.current = idx;
                          setSelectedRetakePose(idx);
                        }}
                        className={`group relative rounded-xl p-2 border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer select-none ${isSelected
                          ? "bg-[#1d2035] border-[#f0a25c] ring-1 ring-[#f0a25c]/40 shadow-md"
                          : "bg-[#151726]/70 border-[#292b3b] hover:border-[#3d4158] hover:bg-[#1a1d2e]"
                          }`}
                      >
                        {/* Thumbnail + Label */}
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-12 rounded-lg overflow-hidden bg-black/70 border border-[#292b3b] shrink-0">
                            {photo ? (
                              <img
                                src={photo}
                                alt={`Pose ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-[#6b6f8a]">
                                Kosong
                              </div>
                            )}
                            <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-black/85 font-mono-tech text-[9px] text-white font-bold">
                              #{idx + 1}
                            </div>
                          </div>

                          <div className="text-left">
                            <span className="text-xs sm:text-sm font-semibold text-white">
                              Foto #{idx + 1}
                            </span>
                          </div>
                        </div>

                        {/* Direct Retake Button */}
                        <button
                          type="button"
                          data-dwell-id={`btn-retake-pose-${idx}`}
                          data-retake-index={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetakeSpecificPose(idx);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${isSelected
                            ? "bg-rose-600 hover:bg-rose-500 text-white shadow"
                            : "bg-[#202336] hover:bg-rose-600/80 text-rose-300 hover:text-white"
                            }`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Ulang</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Streamlined Gesture Helper Pills */}
                <div className="mt-3 pt-3 border-t border-[#292b3b] flex items-center justify-around text-xs text-[#9b9eaf]">
                  <span className="flex items-center gap-1">
                    <span>👎</span>
                    <span>Jempol Bawah: <strong className="text-rose-300">Ulang</strong></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span>👍</span>
                    <span>Jempol Atas: <strong className="text-emerald-300">Lanjut</strong></span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom spacer */}
            <div className="h-2" />
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

              <div className="relative mb-3">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="contoh@gmail.com"
                  className="w-full px-4 py-3 bg-[#090a12] border border-[#292b3b] rounded-xl text-white placeholder:text-[#454964] focus:outline-none focus:border-[#246cff] text-sm pr-12 font-mono-tech"
                />
                <button
                  type="button"
                  data-dwell-id="btn-voice-email"
                  onClick={isRecordingVoice ? stopRecordingVoice : startRecordingVoice}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors cursor-pointer ${isRecordingVoice ? "bg-rose-500 text-white animate-pulse" : "bg-[#171927] text-[#9b9eaf] hover:text-white hover:bg-[#246cff]"
                    }`}
                  title="Voice Input Email"
                >
                  {isRecordingVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {/* Status Voice Recognizer */}
              {isRecordingVoice ? (
                <div className="p-2 mb-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-pulse flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Mendengarkan... Ucapkan email (contoh: "budi123 at gmail dot com")</span>
                </div>
              ) : voiceStatus ? (
                <p className="text-xs text-[#f0a25c] mb-3 font-mono-tech">
                  {voiceStatus}
                </p>
              ) : null}

              {/* Quick Domain Tap / Dwell Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
                {["@gmail.com", "@yahoo.com", "@outlook.com"].map((dom) => (
                  <button
                    key={dom}
                    type="button"
                    data-dwell-id={`domain-${dom}`}
                    onClick={() => {
                      setEmailInput((prev) => {
                        const base = prev.split("@")[0].trim();
                        return base ? `${base}${dom}` : dom;
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#171927] hover:bg-[#246cff] border border-[#292b3b] text-white text-[11px] font-mono-tech transition-colors cursor-pointer"
                  >
                    {dom}
                  </button>
                ))}
                <button
                  type="button"
                  data-dwell-id="btn-clear-email"
                  onClick={() => setEmailInput("")}
                  className="px-2.5 py-1 rounded-lg bg-[#171927] hover:bg-rose-600/80 border border-[#292b3b] text-[#9b9eaf] hover:text-white text-[11px] font-mono-tech transition-colors cursor-pointer"
                >
                  ⌫ Hapus
                </button>
              </div>

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
