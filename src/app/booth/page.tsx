"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hand,
  LogOut,
  Lock,
  CheckCircle2,
  Sparkles,
  Camera,
  QrCode,
  ThumbsUp,
  ThumbsDown,
  MousePointer2,
  Zap,
  ArrowLeft,
  Check,
  Mic,
  MicOff,
  Printer,
  Mail,
  RotateCcw,
  Download,
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

export type BoothStep =
  | "idle"
  | "packages"
  | "confirm"
  | "qris"
  | "paid_success"
  | "pose_ready"
  | "countdown"
  | "select_photos"
  | "print_confirm"
  | "email_input"
  | "qr_download";

interface PackageItem {
  id: string;
  name: string;
  price: string;
  rawPrice: number;
  poses: number;
  badge?: string;
  gradient: string;
  accentColor: string;
  features: string[];
}

const PACKAGES: PackageItem[] = [
  {
    id: "basic",
    name: "Basic Strip",
    price: "Rp 25.000",
    rawPrice: 25000,
    poses: 3,
    gradient: "from-sky-500/20 to-blue-600/20 border-sky-400/40",
    accentColor: "text-sky-400",
    features: ["3 Pose Film Strip", "Digital Download QR Code", "Lighting HD Presisi"],
  },
  {
    id: "popular",
    name: "Popular AI",
    price: "Rp 35.000",
    rawPrice: 35000,
    poses: 4,
    badge: "Paling Laris",
    gradient: "from-orange-500/20 to-amber-600/20 border-amber-400/50",
    accentColor: "text-amber-400",
    features: [
      "4 Pose Film Strip",
      "Pilihan AI Aesthetic Filter",
      "Kirim Email HD + Download QR",
    ],
  },
  {
    id: "vip",
    name: "VIP Unlimited",
    price: "Rp 50.000",
    rawPrice: 50000,
    poses: 6,
    badge: "VIP Custom",
    gradient: "from-purple-500/20 to-indigo-600/20 border-purple-400/50",
    accentColor: "text-purple-400",
    features: [
      "6 Pose Multi-Strip",
      "Semua Bingkai Kustom AI",
      "Soft Copy HD Email + Print Ready",
    ],
  },
];

const DEFAULT_FREE_PACKAGE: PackageItem = {
  id: "free_session",
  name: "Free Photobooth Session",
  price: "Gratis (Free Mode)",
  rawPrice: 0,
  poses: FREE_MODE_POSES,
  gradient: "from-sky-500/20 to-blue-600/20 border-sky-400/40",
  accentColor: "text-sky-400",
  features: [
    `${FREE_MODE_POSES} Pose Film Strip`,
    "Digital Download QR Code",
    "Sentuhan Gestur Tangan AI",
  ],
};

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
  const emailPendingTargetRef = useRef<string | null>(null);
  const setStep = useCallback((newStep: BoothStep) => {
    stepRef.current = newStep;
    stepEntryTimeRef.current = Date.now();
    setStepState(newStep);
  }, []);
  const step = stepState;
  const [selectedPkg, setSelectedPkg] = useState<PackageItem | null>(null);

  // Photo Capture & Selection State
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [selectedPhotoIndices, setSelectedPhotoIndices] = useState<number[]>([]);

  // Gesture & Cursor Tracking State
  const [lastDetectedGesture, setLastDetectedGesture] = useState<GestureType>("none");
  const [waveDetected, setWaveDetected] = useState(false);
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef<any>({});
  const [hoveredPkgId, setHoveredPkgId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);

  // Timers & Inputs State
  const [qrisTimer, setQrisTimer] = useState(5);
  const [photoCountdown, setPhotoCountdown] = useState(3);
  const [qrTimer, setQrTimer] = useState(15);
  const [xenonFlash, setXenonFlash] = useState(false);
  
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

  // Upload & Drive State
  const [isUploading, setIsUploading] = useState(false);
  const [driveFolderUrl, setDriveFolderUrl] = useState("");
  const [driveFolderName, setDriveFolderName] = useState("");

  // Admin Modal State
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [hiddenTapCount, setHiddenTapCount] = useState(0);

  const photostripBase64Ref = useRef<string>("");

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

    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser");
      return;
    }

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
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
      setIsRecordingVoice(false);
      isRecordingVoiceRef.current = false;
    }
  }, [setEmailInput]);

  const stopRecordingVoice = useCallback(() => {
    if (speechRecognitionRef.current && isRecordingVoiceRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (err) {
        console.warn("Failed to stop speech recognition:", err);
      }
    }
    setIsRecordingVoice(false);
    isRecordingVoiceRef.current = false;
  }, []);

  // ===== HANDLE UPLOAD TO GOOGLE DRIVE =====
  const generateFilmStrip = async (photoUrls: string[]): Promise<string> => {
    return new Promise((resolve) => {
      if (photoUrls.length === 0) return resolve("");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("");

      const imgWidth = 600;
      const imgHeight = 450;
      const padding = 20;
      const headerHeight = 80;
      const footerHeight = 80;

      canvas.width = imgWidth + padding * 2;
      canvas.height = headerHeight + footerHeight + (imgHeight * photoUrls.length) + (padding * (photoUrls.length - 1));

      ctx.fillStyle = "#0f172a"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 30px Arial";
      ctx.textAlign = "center";
      ctx.fillText("AI BOX PHOTOGRAPHIC", canvas.width / 2, 50);

      // Fit-Crop (Object-Fit: Cover) helper for 2D Canvas
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
            imgs.forEach((loadedImg, idx) => {
              const y = headerHeight + (imgHeight * idx) + (padding * idx);
              drawImageCover(loadedImg, padding, y, imgWidth, imgHeight);
            });
            ctx.font = "italic 16px Arial";
            ctx.fillStyle = "#94a3b8";
            ctx.fillText("Capture your best moments", canvas.width / 2, canvas.height - 30);
            resolve(canvas.toDataURL("image/jpeg", 0.9));
          }
        };
        img.src = url;
      });
    });
  };

  const handleStartDriveUpload = useCallback(async () => {
    if (isUploading) return;
    setIsUploading(true);

    let selectedUrls = selectedPhotoIndices.map(idx => capturedPhotos[idx]).filter(Boolean);
    if (selectedUrls.length === 0) selectedUrls = [capturedPhotos[0]].filter(Boolean);
    
    let imagesToUpload = selectedUrls.map((url, i) => ({
      base64: url,
      fileName: `pose_${i+1}.jpg`
    }));

    const gridBase64 = await generateFilmStrip(selectedUrls);
    photostripBase64Ref.current = gridBase64;
    if (gridBase64) {
      imagesToUpload.push({ base64: gridBase64, fileName: "photostrip.jpg" });
    }

    try {
      const driveRes = await fetch("/api/upload-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: "LAPLACE_ZERO",
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
  }, [capturedPhotos, selectedPhotoIndices, isUploading]);

  // ===== HANDLE SEND EMAIL & FINISH TO QR DOWNLOAD =====
  const handleSendEmailAndFinish = useCallback((targetEmailInput?: string) => {
    setStep("qr_download");
    const targetEmailToUse = targetEmailInput !== undefined ? targetEmailInput : emailInput;
    emailPendingTargetRef.current = targetEmailToUse.trim();
  }, [emailInput, setStep]);

  // ===== EFFECT: SEND EMAIL WHEN UPLOAD FINISHES =====
  useEffect(() => {
    if (step === "qr_download" && !isUploading && driveFolderUrl && emailPendingTargetRef.current) {
      const emailToSend = emailPendingTargetRef.current;
      emailPendingTargetRef.current = null; // consume it so we only send once

      if (emailToSend && (emailToSend.includes("@") || emailToSend.length > 3)) {
        let finalEmailTarget = emailToSend;
        if (!finalEmailTarget.includes("@")) {
          finalEmailTarget += "@gmail.com";
        }
        fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toEmail: finalEmailTarget,
            userName: "LAPLACE_ZERO",
            publicPhotoUrl: driveFolderUrl,
            folderUrl: driveFolderUrl,
            folderName: driveFolderName || "AIBox_Photos",
            imageBase64: photostripBase64Ref.current,
          }),
        }).catch((err) => console.error("Failed to send email:", err));
      }
    }
  }, [step, isUploading, driveFolderUrl, driveFolderName]);

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

          // 1. Draw Debug Skeleton Overlay if IS_DEBUG is enabled
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

          // 2. Track Hand Gesture Cursor Position (Index Finger Tip landmark 8)
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

          const canTriggerAction = (Date.now() - stepEntryTimeRef.current) > 1000;
          
          if (result.gesture === "none") {
            lastProcessedGestureRef.current = "none";
          }
          
          const isNewGesture = result.gesture !== "none" && result.gesture !== lastProcessedGestureRef.current;
          const canTriggerNewGestureAction = canTriggerAction && isNewGesture;

          // 3. IDLE STEP: Active Wave Motion Trigger
          if (stepRef.current === "idle" && result.gesture === "wave" && canTriggerNewGestureAction) {
            setWaveDetected(true);
            if (!waveTimerRef.current) {
              mediaPipeRef.current?.setTargetFPS(ACTIVE_FPS);
              waveTimerRef.current = setTimeout(() => {
                waveTimerRef.current = null;
                setWaveDetected(false);
                lastProcessedGestureRef.current = result.gesture;
                if (!ENABLE_PAYMENT) {
                  // Skip payment flow completely! Auto-select free package with FREE_MODE_POSES
                  callbacksRef.current.setSelectedPkg?.(DEFAULT_FREE_PACKAGE);
                  callbacksRef.current.setCapturedPhotos?.([]);
                  callbacksRef.current.setCurrentPoseIndex?.(0);
                  callbacksRef.current.setStep?.("pose_ready");
                } else {
                  callbacksRef.current.setStep?.("packages");
                }
              }, 1000);
            }
          }

          // 4. POSE READY STEP: Peace Gesture ✌️ Trigger Photo Countdown
          if (stepRef.current === "pose_ready" && result.gesture === "peace" && canTriggerNewGestureAction) {
            lastProcessedGestureRef.current = result.gesture;
            callbacksRef.current.setStep?.("countdown");
          }

          // 5. CONFIRM & PRINT CONFIRM STEP: Thumbs Up 👍 & Thumbs Down 👎
          if (stepRef.current === "confirm" && canTriggerNewGestureAction) {
            if (result.gesture === "thumbs_up") {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.handleConfirmYes?.();
            } else if (result.gesture === "thumbs_down") {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.handleConfirmNo?.();
            }
          }

          if (stepRef.current === "print_confirm" && canTriggerNewGestureAction) {
            if (result.gesture === "thumbs_up") {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.handleStartDriveUpload?.();
              callbacksRef.current.setStep?.("email_input");
            } else if (result.gesture === "thumbs_down") {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.setStep?.("select_photos");
            }
          }

          // 6. EMAIL INPUT STEP: Fist ✊ (Start Voice) & Open Palm 🖐️ (Stop Voice)
          if (stepRef.current === "email_input") {
            const canSubmitEmailGesture = (Date.now() - stepEntryTimeRef.current) > 2000;
            if (result.gesture === "fist" && canTriggerNewGestureAction) {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.startRecordingVoice?.();
            } else if (result.gesture === "open_palm" && canTriggerNewGestureAction) {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.stopRecordingVoice?.();
            } else if (result.gesture === "thumbs_up" && canSubmitEmailGesture && isNewGesture) {
              lastProcessedGestureRef.current = result.gesture;
              callbacksRef.current.handleSendEmailAndFinish?.(emailInputRef.current);
            }
          }

          // 7. SCROLL SUPPORT FOR SELECT_PHOTOS (Allow continuous firing so we check canTriggerAction instead of canTriggerNewGestureAction)
          if (stepRef.current === "select_photos" && canTriggerAction) {
            if (result.gesture === "fist") {
              callbacksRef.current.scrollContainerRef?.current?.scrollBy({ top: 30, behavior: "auto" });
            } else if (result.gesture === "open_palm") {
              callbacksRef.current.scrollContainerRef?.current?.scrollBy({ top: -30, behavior: "auto" });
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
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      cleanup();
    };
  }, [router]);

  // ===== DWELL HOVER CLICK SIMULATION FOR PACKAGES, PHOTO SELECTION, & ACTIONS =====
  useEffect(() => {
    const hoverInterval = setInterval(() => {
      const currentStep = stepRef.current;
      const currentPos = cursorPosRef.current;

      if ((currentStep !== "packages" && currentStep !== "select_photos") || !currentPos) {
        if (hoveredPkgId) {
          setHoveredPkgId(null);
          setDwellProgress(0);
          if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
        }
        return;
      }

      const elements = document.elementsFromPoint(
        (currentPos.x / 100) * window.innerWidth,
        (currentPos.y / 100) * window.innerHeight
      );

      const pkgElem = elements.find((el) => el.getAttribute("data-package-id"));
      const photoElem = elements.find((el) => el.getAttribute("data-photo-index"));
      const actionElem = elements.find((el) => el.getAttribute("data-action-id"));

      if (pkgElem && currentStep === "packages") {
        const pkgId = pkgElem.getAttribute("data-package-id");
        if (pkgId && pkgId !== hoveredPkgId) {
          setHoveredPkgId(pkgId);
          setDwellProgress(0);

          if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);

          let startTime = Date.now();
          dwellTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, Math.round((elapsed / 1200) * 100));
            setDwellProgress(pct);

            if (pct >= 100) {
              clearInterval(dwellTimerRef.current!);
              const targetPkg = PACKAGES.find((p) => p.id === pkgId);
              if (targetPkg) callbacksRef.current.handleSelectPackage?.(targetPkg);
            }
          }, 50);
        }
      } else if (photoElem && currentStep === "select_photos") {
        const idxStr = photoElem.getAttribute("data-photo-index");
        if (idxStr !== null) {
          const pIdx = parseInt(idxStr, 10);
          if (`photo-${pIdx}` !== hoveredPkgId) {
            setHoveredPkgId(`photo-${pIdx}`);
            setDwellProgress(0);

            if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);

            let startTime = Date.now();
            dwellTimerRef.current = setInterval(() => {
              const elapsed = Date.now() - startTime;
              const pct = Math.min(100, Math.round((elapsed / 1200) * 100));
              setDwellProgress(pct);

              if (pct >= 100) {
                clearInterval(dwellTimerRef.current!);
                togglePhotoSelection(pIdx);
              }
            }, 50);
          }
        }
      } else if (actionElem && currentStep === "select_photos") {
        const actId = actionElem.getAttribute("data-action-id");
        if (actId && `action-${actId}` !== hoveredPkgId) {
          setHoveredPkgId(`action-${actId}`);
          setDwellProgress(0);

          if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);

          let startTime = Date.now();
          dwellTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, Math.round((elapsed / 1200) * 100));
            setDwellProgress(pct);

            if (pct >= 100) {
              clearInterval(dwellTimerRef.current!);
              if (actId === "print") {
                callbacksRef.current.handleStartDriveUpload?.();
                callbacksRef.current.setStep?.("print_confirm");
              } else if (actId === "retake") {
                callbacksRef.current.setCapturedPhotos?.([]);
                callbacksRef.current.setCurrentPoseIndex?.(0);
                callbacksRef.current.setStep?.("pose_ready");
              }
            }
          }, 50);
        }
      } else {
        if (hoveredPkgId) {
          setHoveredPkgId(null);
          setDwellProgress(0);
          if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
        }
      }
    }, 100);

    return () => clearInterval(hoverInterval);
  }, [hoveredPkgId, togglePhotoSelection]);

  // ===== QRIS 5-SECOND BYPASS TIMER =====
  useEffect(() => {
    if (step === "qris") {
      setQrisTimer(5);
      const interval = setInterval(() => {
        setQrisTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setStep("paid_success");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step]);

  // ===== PAID SUCCESS -> POSE READY TRANSITION =====
  useEffect(() => {
    if (step === "paid_success") {
      const timer = setTimeout(() => {
        setCapturedPhotos([]);
        setCurrentPoseIndex(0);
        setStep("pose_ready");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

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
                  setTimeout(() => setStep("pose_ready"), 600);
                } else {
                  // All poses captured! Prepare photo selection state
                  const defaultSelected = Array.from({ length: totalPoses }, (_, i) => i);
                  setSelectedPhotoIndices(defaultSelected);
                  setTimeout(() => setStep("select_photos"), 600);
                }
                return updated;
              });
            } else {
              setStep("pose_ready");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step, captureSnapshot, selectedPkg]);

  // ===== FINAL QR CODE DOWNLOAD AUTO-RESET TIMER (15 SECONDS) =====
  useEffect(() => {
    if (step === "qr_download") {
      setQrTimer(15);
      const interval = setInterval(() => {
        setQrTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            resetAllToIdle();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step]);

  // ===== ACTION HANDLERS =====
  function resetAllToIdle() {
    setStep("idle");
    setSelectedPkg(null);
    setCapturedPhotos([]);
    setCurrentPoseIndex(0);
    setSelectedPhotoIndices([]);
    setEmailInput("");
    setIsRecordingVoice(false);
    setWaveDetected(false);
    setDriveFolderUrl("");
    setDriveFolderName("");
    setIsUploading(false);
    emailPendingTargetRef.current = null;
    photostripBase64Ref.current = "";
    lastProcessedGestureRef.current = "none";
    if (waveTimerRef.current) {
      clearTimeout(waveTimerRef.current);
      waveTimerRef.current = null;
    }
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
  }

  function handleSelectPackage(pkg: PackageItem) {
    const activePkg = !ENABLE_PAYMENT
      ? { ...pkg, poses: FREE_MODE_POSES, price: "Gratis (Free Mode)" }
      : pkg;
    setSelectedPkg(activePkg);
    setHoveredPkgId(null);
    setDwellProgress(0);
    if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);

    if (!ENABLE_PAYMENT) {
      setCapturedPhotos([]);
      setCurrentPoseIndex(0);
      setStep("pose_ready");
    } else {
      setStep("confirm");
    }
  }

  function handleConfirmYes() {
    if (!ENABLE_PAYMENT) {
      setCapturedPhotos([]);
      setCurrentPoseIndex(0);
      setStep("pose_ready");
    } else {
      setStep("qris");
    }
  }

  function handleConfirmNo() {
    setSelectedPkg(null);
    setStep("packages");
  }

  function togglePhotoSelection(index: number) {
    setSelectedPhotoIndices((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  }

  // ===== CLEANUP =====
  const cleanup = useCallback(() => {
    mediaPipeRef.current?.destroy();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  }, []);

  // ===== HIDDEN ADMIN ESCAPE =====
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

  // ===== ADMIN LOGOUT =====
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
    handleStartDriveUpload,
    handleSendEmailAndFinish,
    handleConfirmYes,
    handleConfirmNo,
    handleSelectPackage,
    setCapturedPhotos,
    setCurrentPoseIndex,
    setStep,
    setSelectedPkg,
    scrollContainerRef,
    startRecordingVoice,
    stopRecordingVoice,
  };

  if (!mounted) return null;

  return (
    <div className="relative w-full h-screen bg-dark overflow-hidden select-none font-sans">
      {/* Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover camera-feed transform -scale-x-100"
      />

      {/* Debug Skeleton Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none z-20 ${
          IS_DEBUG ? "block" : "hidden"
        }`}
      />

      {/* Studio Xenon Flash Screen Flare */}
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

      {/* Camera Viewfinder Optical Corner Brackets (Warm Mustard Accent) */}
      <div className="camera-bracket-tl opacity-75 pointer-events-none z-30" />
      <div className="camera-bracket-tr opacity-75 pointer-events-none z-30" />
      <div className="camera-bracket-bl opacity-75 pointer-events-none z-30" />
      <div className="camera-bracket-br opacity-75 pointer-events-none z-30" />

      {/* Center Precision Framing Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none z-20 opacity-20">
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-amber-400" />
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-amber-400" />
      </div>

      {/* ===== TOP TELEMETRY HUD BAR ===== */}
      <header className="absolute top-6 inset-x-8 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 glass-midnight rounded-lg border border-white/10 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
            <span className="font-mono-tech text-[11px] font-bold text-zinc-300 tracking-widest uppercase">
              SAAKA AIBOX // OPTICS
            </span>
          </div>

          {lastDetectedGesture !== "none" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3 py-1 bg-amber-500/15 border border-amber-400/40 rounded-lg font-mono-tech text-[10px] text-amber-300 tracking-wider uppercase font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            >
              GESTURE: {lastDetectedGesture.toUpperCase()}
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 glass-midnight rounded-lg border border-white/10 pointer-events-auto">
          <div className={`w-2 h-2 rounded-full ${!ENABLE_PAYMENT ? "bg-emerald-400" : "bg-blue-400"} animate-pulse`} />
          <span className="font-mono-tech text-white/90 text-[11px] font-medium tracking-wider uppercase">
            {IS_DEBUG ? "TELEMETRY [DEBUG]" : !ENABLE_PAYMENT ? `FREE MODE (${FREE_MODE_POSES} POSES)` : "KIOSK READY"}
          </span>
        </div>
      </header>

      {/* ===== SPATIAL RETICLE (WARM MUSTARD & DEEP BLUE ACCENTS) ===== */}
      {(step === "packages" || step === "select_photos") && (
        <div
          ref={cursorRef}
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200"
          style={{ left: `50%`, top: `50%` }}
        >
          <div className="relative flex items-center justify-center w-20 h-20">
            {/* Outer Rotating Dotted Camera Sight */}
            <div className="absolute inset-0 rounded-full border border-dashed border-amber-400/50 animate-spin-slow" />

            {/* Dwell Progress Radial Gauge */}
            {hoveredPkgId && (
              <svg className="absolute inset-0 w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="rgba(245, 158, 11, 0.2)"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#f59e0b"
                  strokeWidth="3.5"
                  strokeDasharray="213"
                  strokeDashoffset={213 - (213 * dwellProgress) / 100}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-75 drop-shadow-[0_0_8px_#f59e0b]"
                />
              </svg>
            )}

            {/* Inner Precision Crosshair */}
            <div className="w-8 h-8 rounded-full border border-amber-300/80 bg-obsidian-900/60 backdrop-blur-md flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping" />
              <div className="w-1.5 h-1.5 rounded-full bg-white absolute" />
            </div>

            {/* Optical Target Ticks */}
            <div className="absolute -top-1 w-1 h-2 bg-amber-400/80" />
            <div className="absolute -bottom-1 w-1 h-2 bg-amber-400/80" />
            <div className="absolute -left-1 h-1 w-2 bg-amber-400/80" />
            <div className="absolute -right-1 h-1 w-2 bg-amber-400/80" />
          </div>
        </div>
      )}

      {/* ===== IDLE STEP (AMBIENT RADAR SONAR & WAVE GUIDE) ===== */}
      <AnimatePresence mode="wait">
        {step === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.35 } }}
            className="absolute inset-0 flex flex-col items-center justify-between z-20 py-14 px-6 sm:px-12 text-center"
          >
            <div className="h-6" />

            {/* Central Branding with Ambient Mustard Sonar Ping */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center gap-5 max-w-4xl relative"
            >
              <div className="relative mb-2">
                <div className="absolute -inset-8 rounded-full bg-amber-500/10 animate-sonar-mustard pointer-events-none" />
                <div className="absolute -inset-16 rounded-full bg-blue-500/10 animate-sonar-mustard [animation-delay:1.4s] pointer-events-none" />

                <div className="relative">
                  <Logo size="xl" variant="splash" animated priority />
                </div>
              </div>

              <div>
                <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight drop-shadow-2xl font-display mb-2">
                  AI Box Photobooth
                </h1>
                <p className="font-mono-tech text-amber-400 text-xs sm:text-sm tracking-[0.25em] uppercase font-semibold">
                  Touchless Studio Photobox Experience
                </p>
              </div>
            </motion.div>

            {/* Bottom Wave Guide Floating Pod */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="flex items-center gap-5 px-7 py-4 glass-midnight rounded-2xl border border-amber-400/30 shadow-[0_10px_40px_rgba(245,158,11,0.15)]">
                <motion.div
                  animate={{ rotate: [0, 18, -18, 18, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0 text-obsidian-950 font-bold"
                >
                  <Hand className="w-7 h-7 sm:w-8 sm:h-8" />
                </motion.div>

                <div className="text-left pr-3">
                  <h3 className="text-white font-display font-extrabold text-lg sm:text-xl leading-tight">
                    Lambaikan Tangan Ke Kamera
                  </h3>
                  <p className="font-mono-tech text-zinc-400 text-xs mt-0.5 tracking-wider uppercase">
                    Wave Hand Left to Right to Start
                  </p>
                </div>
              </div>

              {waveDetected && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="absolute -top-14 left-1/2 -translate-x-1/2 px-5 py-2 bg-emerald-500 text-white rounded-lg font-display font-extrabold text-xs shadow-xl flex items-center gap-2 border border-emerald-400 whitespace-nowrap"
                >
                  <motion.div
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 0.4, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-white"
                  />
                  <span>Lambaian Terdeteksi! Menyiapkan...</span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== PACKAGE SELECTION STEP (MIDNIGHT CARDS WITH MUSTARD ACCENTS) ===== */}
      <AnimatePresence>
        {step === "packages" && (
          <motion.div
            key="packages"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-12 text-center"
          >
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 glass-midnight rounded-md text-amber-400 font-mono-tech text-xs tracking-widest uppercase mb-2.5 border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Touchless Selection System Active
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
                Pilih Paket Photobooth
              </h2>
              <p className="font-mono-tech text-zinc-400 text-xs sm:text-sm mt-1 tracking-wider uppercase">
                Arahkan Reticle Sensor atau Klik Kartu Pilihan
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full my-auto">
              {PACKAGES.map((pkg) => {
                const isHovered = hoveredPkgId === pkg.id;
                return (
                  <motion.div
                    key={pkg.id}
                    data-package-id={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative rounded-2xl p-7 cursor-pointer transition-all duration-300 text-left flex flex-col justify-between ${
                      isHovered
                        ? "glass-midnight glow-mustard-border ring-1 ring-amber-400/60 shadow-[0_0_40px_rgba(245,158,11,0.3)]"
                        : "glass-midnight hover:border-white/20 shadow-2xl"
                    }`}
                  >
                    {pkg.badge && (
                      <span className="absolute -top-3 right-5 px-3 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-obsidian-950 font-display font-extrabold text-[10px] tracking-wider uppercase rounded-md shadow-md">
                        {pkg.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-extrabold text-white font-display">
                          {pkg.name}
                        </h3>
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                          <Camera className="w-5 h-5 text-amber-400" />
                        </div>
                      </div>

                      <div className="mb-5">
                        <span className="text-3xl sm:text-4xl font-black text-white font-display">
                          {pkg.price}
                        </span>
                        <span className="font-mono-tech text-zinc-400 text-xs block mt-1 tracking-wider uppercase">
                          {pkg.poses} Pose Film Strip Studio
                        </span>
                      </div>

                      <ul className="space-y-2.5 border-t border-white/10 pt-4 mb-6">
                        {pkg.features.map((feat, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2.5 text-xs text-zinc-200 font-medium"
                          >
                            <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-auto">
                      {isHovered && (
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-3">
                          <div
                            className="bg-amber-400 h-full transition-all duration-75 shadow-[0_0_8px_#f59e0b]"
                            style={{ width: `${dwellProgress}%` }}
                          />
                        </div>
                      )}

                      <div
                        className={`w-full py-3 rounded-xl font-display font-extrabold text-xs tracking-wider uppercase text-center transition-all ${
                          isHovered
                            ? "bg-amber-400 text-obsidian-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                            : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                        }`}
                      >
                        {isHovered ? `Mengunci Pilihan (${dwellProgress}%)...` : "Pilih Paket"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <button
              onClick={() => setStep("idle")}
              className="text-zinc-400 hover:text-white font-mono-tech text-xs tracking-wider uppercase transition-colors flex items-center gap-2 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Layar Standby
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== CONFIRMATION STEP (DUAL GESTURE DOCK) ===== */}
      <AnimatePresence>
        {step === "confirm" && selectedPkg && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="glass-midnight rounded-2xl p-8 max-w-lg w-full text-center border border-white/15 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-400/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Zap className="w-7 h-7" />
              </div>

              <h3 className="text-2xl font-extrabold text-white font-display mb-1.5">
                Konfirmasi Pesanan
              </h3>
              <p className="text-zinc-300 text-sm mb-6 font-light">
                Paket <span className="font-bold text-amber-400">{selectedPkg.name}</span> seharga{" "}
                <span className="font-bold text-emerald-400">{selectedPkg.price}</span> ({selectedPkg.poses} Pose).
              </p>

              {/* Dual Visual Gesture Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-left">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500 text-obsidian-950 flex items-center justify-center font-bold">
                      <ThumbsUp className="w-4 h-4" />
                    </div>
                    <span className="text-emerald-300 font-display font-extrabold text-xs tracking-wider uppercase">
                      Lanjut Bayar
                    </span>
                  </div>
                  <span className="font-mono-tech text-[11px] text-zinc-300">
                    👍 Jempol Ke Atas
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold">
                      <ThumbsDown className="w-4 h-4" />
                    </div>
                    <span className="text-rose-300 font-display font-extrabold text-xs tracking-wider uppercase">
                      Batal / Ganti
                    </span>
                  </div>
                  <span className="font-mono-tech text-[11px] text-zinc-300">
                    👎 Jempol Ke Bawah
                  </span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex gap-3.5">
                <button
                  onClick={handleConfirmNo}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-zinc-300 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  <ThumbsDown className="w-4 h-4 text-rose-400" />
                  Batal (Manual)
                </button>

                <button
                  onClick={handleConfirmYes}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-obsidian-950 rounded-xl font-display font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Lanjut Bayar (Manual)
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== QRIS SIMULATION STEP ===== */}
      <AnimatePresence>
        {step === "qris" && selectedPkg && (
          <motion.div
            key="qris"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="glass-midnight rounded-2xl p-8 max-w-sm w-full text-center border border-amber-400/30 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <QrCode className="w-5 h-5 text-amber-400" />
                <span className="text-white font-display font-extrabold text-xl tracking-tight">
                  Pembayaran QRIS
                </span>
              </div>

              <p className="font-mono-tech text-zinc-400 text-[11px] tracking-wider uppercase mb-4">
                Scan QRIS via BCA, GoPay, OVO, Dana
              </p>

              <div className="bg-white p-4 rounded-xl shadow-2xl border border-white/20 inline-block mb-4 relative">
                <svg
                  viewBox="0 0 200 200"
                  className="w-40 h-40 mx-auto"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="200" height="200" fill="white" />
                  <path
                    d="M10 10h60v60H10zM130 10h60v60h-60zM10 130h60v60H10z"
                    fill="black"
                  />
                  <path
                    d="M25 25h30v30H25zM145 25h30v30h-30zM25 145h30v30H25z"
                    fill="white"
                  />
                  <path
                    d="M32 32h16v16H32zM152 32h16v16h-16zM32 152h16v16H32z"
                    fill="black"
                  />
                  <path
                    d="M80 20h15v20H80zM100 20h20v15h-20zM80 50h35v15H80zM20 80h20v25H20z"
                    fill="#070b14"
                  />
                </svg>
                <span className="text-obsidian-950 font-mono-tech font-extrabold text-[10px] block mt-1 tracking-widest uppercase">
                  NMID: ID102030405060
                </span>
              </div>

              <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl py-2 px-4 mb-4">
                <span className="font-mono-tech text-amber-300 text-[10px] block uppercase tracking-wider">
                  Total Tagihan:
                </span>
                <span className="text-white font-display font-extrabold text-2xl tracking-tight">
                  {selectedPkg.price}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 font-mono-tech text-zinc-400 text-xs">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full"
                />
                <span>Auto-Verifying Settlement ({qrisTimer}s)...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== PAID SUCCESS STEP ===== */}
      <AnimatePresence>
        {step === "paid_success" && selectedPkg && (
          <motion.div
            key="paid_success"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="glass-midnight rounded-2xl p-9 max-w-sm w-full text-center border border-emerald-400/40 shadow-[0_0_60px_rgba(16,185,129,0.3)]">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="w-18 h-18 rounded-xl bg-emerald-500 text-obsidian-950 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
              >
                <Check className="w-9 h-9 stroke-[3]" />
              </motion.div>

              <h2 className="text-3xl font-extrabold text-white font-display mb-1">
                Pembayaran Berhasil
              </h2>
              <p className="font-mono-tech text-emerald-300 text-xs tracking-wider uppercase mb-3">
                Paket {selectedPkg.name} Aktif
              </p>
              <p className="text-zinc-400 text-xs font-light">
                Mempersiapkan lensa studio untuk sesi foto...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== POSE READY STEP (TOP MINIMAL FLOATING CAPSULE) ===== */}
      <AnimatePresence>
        {step === "pose_ready" && selectedPkg && (
          <motion.div
            key="pose_ready"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-8 inset-x-0 z-40 flex flex-col items-center pointer-events-none px-4"
          >
            <div className="glass-midnight rounded-xl px-5 py-3 border border-amber-400/40 shadow-2xl flex items-center gap-3.5 pointer-events-auto">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 text-obsidian-950 flex items-center justify-center shadow-md flex-shrink-0"
              >
                <PeaceIcon className="w-5 h-5" />
              </motion.div>

              <div className="text-left pr-2">
                <span className="font-mono-tech text-amber-300 font-bold text-[10px] uppercase tracking-wider block">
                  Pose #{currentPoseIndex + 1} / {selectedPkg.poses}
                </span>
                <h3 className="text-white font-display font-extrabold text-sm sm:text-base leading-tight">
                  Tunjukkan Gestur Peace (✌️) Untuk Mulai
                </h3>
              </div>

              <button
                onClick={() => setStep("countdown")}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-obsidian-950 text-xs font-display font-extrabold rounded-lg transition-all shadow-[0_0_12px_rgba(245,158,11,0.4)] ml-1"
              >
                Klik Foto
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== PHOTO COUNTDOWN STEP (STUDIO SHUTTER DIAL) ===== */}
      <AnimatePresence>
        {step === "countdown" && selectedPkg && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/25 p-4 text-center pointer-events-none"
          >
            <div className="absolute top-8 px-4 py-1.5 glass-midnight rounded-md border border-amber-400/30 font-mono-tech text-amber-300 text-xs font-bold uppercase tracking-widest">
              Pose #{currentPoseIndex + 1} / {selectedPkg.poses}
            </div>

            {/* Rotating Aperture Shutter Ring */}
            <div className="relative flex items-center justify-center w-60 h-60 sm:w-72 sm:h-72 mb-4">
              <div className="absolute inset-0 rounded-full border border-dashed border-amber-400/40 animate-spin-slow" />
              <div className="absolute inset-5 rounded-full border border-white/10" />

              <motion.div
                key={photoCountdown}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1.15, opacity: 1 }}
                exit={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 0.75, ease: "easeOut" }}
                className="text-8xl sm:text-9xl font-black text-white font-display drop-shadow-[0_0_50px_#f59e0b] flex items-center justify-center gap-3"
              >
                {photoCountdown > 0 ? (
                  photoCountdown
                ) : (
                  <>
                    <Camera className="w-18 h-18 text-amber-400 animate-bounce" />
                    <span>SMILE!</span>
                  </>
                )}
              </motion.div>
            </div>

            <p className="font-mono-tech text-amber-200 text-sm sm:text-base font-medium tracking-wider uppercase drop-shadow-md">
              {photoCountdown > 0 ? "STRIKE A POSE!" : "CAPTURING STUDIO SHOT..."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== SELECT PHOTOS GRID STEP ===== */}
      <AnimatePresence>
        {step === "select_photos" && selectedPkg && (
          <motion.div
            key="select_photos"
            ref={scrollContainerRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 text-center bg-obsidian-950/95 backdrop-blur-2xl overflow-y-auto"
          >
            <div className="mt-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
                Kurasi Foto Film Strip
              </h2>
              <p className="font-mono-tech text-zinc-400 text-xs sm:text-sm mt-1 tracking-wider uppercase">
                Gunakan Reticle Sensor atau Klik Foto untuk Menyeleksi
              </p>
            </div>

            {/* Grid Showcase & Live Film Strip Preview */}
            <div className="flex flex-col md:flex-row gap-8 max-w-5xl w-full my-auto items-center justify-center">
              {/* Photos Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                {capturedPhotos.map((photoUrl, idx) => {
                  const isSelected = selectedPhotoIndices.includes(idx);
                  const isHovered = hoveredPkgId === `photo-${idx}`;

                  return (
                    <motion.div
                      key={idx}
                      data-photo-index={idx}
                      onClick={() => togglePhotoSelection(idx)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative rounded-xl overflow-hidden aspect-[4/3] cursor-pointer border transition-all duration-200 ${
                        isSelected
                          ? "border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.3)]"
                          : "border-white/10 opacity-60 hover:opacity-100"
                      } ${isHovered ? "ring-2 ring-amber-300 scale-[1.03]" : ""}`}
                    >
                      <img
                        src={photoUrl}
                        alt={`Pose ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-obsidian-950/80 backdrop-blur-md rounded font-mono-tech text-white font-bold text-[9px] tracking-wider uppercase border border-white/10">
                        SHOT #{idx + 1}
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-obsidian-950 font-black shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Physical Film Strip Tray Preview */}
              <div className="w-48 bg-obsidian-900/90 rounded-2xl p-3 border border-white/15 shadow-2xl flex flex-col items-center flex-shrink-0 relative">
                <div className="flex items-center gap-2 mb-2.5">
                  <Logo size="sm" variant="rounded" animated={false} />
                  <span className="font-mono-tech text-amber-400 text-[10px] font-bold tracking-wider uppercase">
                    AI BOX STRIP
                  </span>
                </div>

                <div className="space-y-2 w-full">
                  {selectedPhotoIndices.map((pIdx) => (
                    <div
                      key={pIdx}
                      className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-white/20 bg-obsidian-950 shadow-md"
                    >
                      <img
                        src={capturedPhotos[pIdx]}
                        alt={`Strip pose ${pIdx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-2 border-t border-white/10 w-full text-center">
                  <span className="font-mono-tech text-zinc-400 text-[9px] font-semibold uppercase tracking-widest block">
                    300 DPI // PRINT READY
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex gap-3.5">
              <button
                data-action-id="retake"
                onClick={() => {
                  setCapturedPhotos([]);
                  setCurrentPoseIndex(0);
                  setStep("pose_ready");
                }}
                className={`px-6 py-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all border flex items-center gap-2 ${
                  hoveredPkgId === "action-retake"
                    ? "bg-amber-400 text-obsidian-950 border-amber-400 ring-2 ring-amber-400/50 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                    : "bg-white/10 hover:bg-white/15 text-white border-white/10"
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                Ambil Ulang (Retake)
              </button>

              <button
                data-action-id="print"
                onClick={() => {
                  handleStartDriveUpload();
                  setStep("print_confirm");
                }}
                disabled={selectedPhotoIndices.length === 0}
                className={`px-8 py-3 rounded-xl font-display font-extrabold text-xs uppercase tracking-wider transition-all shadow-xl flex items-center gap-2 disabled:opacity-50 ${
                  hoveredPkgId === "action-print"
                    ? "bg-emerald-400 text-obsidian-950 ring-2 ring-emerald-400/50 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                    : "bg-gradient-to-r from-amber-500 to-amber-600 text-obsidian-950 shadow-[0_0_20px_rgba(245,158,11,0.35)]"
                }`}
              >
                <Printer className="w-4 h-4" />
                Cetak Strip ({selectedPhotoIndices.length} Foto)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== PRINT CONFIRMATION STEP ===== */}
      <AnimatePresence>
        {step === "print_confirm" && (
          <motion.div
            key="print_confirm"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="glass-midnight rounded-2xl p-8 max-w-lg w-full text-center border border-white/15 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-400/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Printer className="w-7 h-7" />
              </div>

              <h3 className="text-2xl font-extrabold text-white font-display mb-1.5">
                Konfirmasi Cetak Hardcopy
              </h3>
              <p className="text-zinc-300 text-sm mb-6 font-light">
                Cetak {selectedPhotoIndices.length} pose terpilih ke mesin printer sekarang?
              </p>

              {/* Dual Visual Gesture Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-left">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500 text-obsidian-950 flex items-center justify-center font-bold">
                      <ThumbsUp className="w-4 h-4" />
                    </div>
                    <span className="text-emerald-300 font-display font-extrabold text-xs tracking-wider uppercase">
                      Lanjut Cetak
                    </span>
                  </div>
                  <span className="font-mono-tech text-[11px] text-zinc-300">
                    👍 Jempol Ke Atas
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold">
                      <ThumbsDown className="w-4 h-4" />
                    </div>
                    <span className="text-rose-300 font-display font-extrabold text-xs tracking-wider uppercase">
                      Ganti Foto
                    </span>
                  </div>
                  <span className="font-mono-tech text-[11px] text-zinc-300">
                    👎 Jempol Ke Bawah
                  </span>
                </div>
              </div>

              <div className="flex gap-3.5">
                <button
                  onClick={() => setStep("select_photos")}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-zinc-300 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  <ThumbsDown className="w-4 h-4 text-rose-400" />
                  Batal (Manual)
                </button>

                <button
                  onClick={() => {
                    handleStartDriveUpload();
                    setStep("email_input");
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-obsidian-950 rounded-xl font-display font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Lanjut Cetak (Manual)
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== EMAIL INPUT STEP ===== */}
      <AnimatePresence>
        {step === "email_input" && (
          <motion.div
            key="email_input"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="glass-midnight rounded-2xl p-8 max-w-md w-full text-center border border-white/15 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-400/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Mail className="w-7 h-7" />
              </div>

              <h3 className="text-2xl font-extrabold text-white font-display mb-1.5">
                Kirim Soft Copy HD
              </h3>
              <p className="font-mono-tech text-zinc-400 text-xs tracking-wider uppercase mb-5">
                Ucapkan atau ketik alamat email Anda
              </p>

              {/* Voice Gesture Guide */}
              <div className="p-4 rounded-xl bg-obsidian-900/80 border border-white/10 mb-5 text-left space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-200">
                  <span className="font-semibold flex items-center gap-2">
                    <span className="text-base">✊</span> Mengepal: Mulai Rekam
                  </span>
                  <span className="font-mono-tech text-amber-400 text-[10px] font-bold">VOICE-INPUT</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-300 border-t border-white/10 pt-2">
                  <span className="font-semibold flex items-center gap-2">
                    <span className="text-base">🖐️</span> Terbuka: Stop Rekam
                  </span>
                </div>

                {isRecordingVoice && (
                  <div className="flex items-center justify-center gap-1.5 py-2.5 border-t border-white/10">
                    {[0.2, 0.5, 0.8, 0.4, 0.9, 0.3, 0.7, 0.4].map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: ["6px", "24px", "6px"] }}
                        transition={{
                          duration: 0.6 + h * 0.4,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.08,
                        }}
                        className="w-1 bg-amber-400 rounded-full shadow-[0_0_6px_#f59e0b]"
                      />
                    ))}
                    <span className="ml-3 font-mono-tech text-amber-400 text-xs font-bold animate-pulse">
                      LISTENING...
                    </span>
                  </div>
                )}
              </div>

              {/* Email Text Input Field */}
              <div className="relative mb-5">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="contoh: user@gmail.com"
                  className="w-full px-4 py-3 bg-obsidian-900/90 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 font-mono-tech text-sm font-medium"
                />

                <button
                  onClick={isRecordingVoice ? stopRecordingVoice : startRecordingVoice}
                  className={`absolute right-2 top-2 px-3 py-1 rounded-lg text-xs font-mono-tech font-bold flex items-center gap-1.5 transition-all ${
                    isRecordingVoice
                      ? "bg-rose-500 text-white animate-pulse"
                      : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30"
                  }`}
                >
                  {isRecordingVoice ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      Bicara
                    </>
                  )}
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3.5">
                <button
                  onClick={() => handleSendEmailAndFinish("")}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-zinc-300 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
                >
                  Lewati Email
                </button>

                <button
                  onClick={() => handleSendEmailAndFinish(emailInput)}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-obsidian-950 rounded-xl font-display font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Kirim & Selesai (👍)
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FINAL QR CODE DOWNLOAD STEP ===== */}
      <AnimatePresence>
        {step === "qr_download" && (
          <motion.div
            key="qr_download"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="glass-midnight rounded-2xl p-8 max-w-sm w-full text-center border border-amber-400/30 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-400/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Download className="w-7 h-7" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display mb-1">
                Unduh Foto Digital HD
              </h2>
              <p className="font-mono-tech text-zinc-400 text-[11px] tracking-wider uppercase mb-4">
                Scan QR Code di bawah dengan smartphone
              </p>

              {/* Holographic QR Pod with Mustard Scanline */}
              {isUploading ? (
                <div className="py-6 text-center space-y-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full mx-auto"
                  />
                  <p className="font-mono-tech text-xs text-amber-400 font-bold uppercase tracking-wider animate-pulse">
                    SYNCING GOOGLE DRIVE...
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white p-4 rounded-xl shadow-2xl border border-white/20 inline-block mb-3.5 relative overflow-hidden group">
                    <div className="absolute left-0 right-0 h-0.5 bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-scanline-mustard z-10 pointer-events-none" />

                    <QRCodeSVG
                      value={driveFolderUrl || (typeof window !== "undefined" ? window.location.href : "https://ai-box.id")}
                      size={175}
                      className="mx-auto"
                    />
                    <span className="text-obsidian-950 font-mono-tech font-extrabold text-[10px] block mt-1.5 tracking-widest uppercase">
                      {driveFolderName || "Google Drive Public Folder"}
                    </span>
                  </div>

                  {driveFolderUrl && (
                    <div className="mb-3">
                      <a
                        href={driveFolderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 rounded-lg font-mono-tech font-bold text-[11px] tracking-wider uppercase transition-all"
                      >
                        📂 Buka Google Drive Folder
                      </a>
                    </div>
                  )}
                </>
              )}

              <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg py-2 px-3.5 mb-3.5">
                <span className="font-mono-tech text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  Foto Sedang Dicetak di Printer 🖨️
                </span>
              </div>

              {/* Auto Reset Countdown */}
              <div className="flex items-center justify-center gap-2 font-mono-tech text-zinc-400 text-xs">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full"
                />
                <span>Reset Standby dalam {qrTimer}s...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HIDDEN ADMIN ESCAPE (Bottom Right) ===== */}
      <button
        onClick={handleHiddenTap}
        className="absolute bottom-4 right-4 w-16 h-16 z-50 opacity-0 cursor-pointer"
        aria-label="Hidden admin button"
      />

      {/* ===== ADMIN LOGOUT DIALOG (MIDNIGHT MODAL) ===== */}
      <AnimatePresence>
        {showAdminDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-midnight rounded-2xl p-7 max-w-sm w-full shadow-2xl border border-white/15 text-white"
            >
              <div className="flex items-center gap-3 mb-5">
                <Logo size="sm" variant="rounded" animated={false} />
                <div>
                  <h3 className="font-display font-extrabold text-white text-lg">
                    Admin Logout
                  </h3>
                  <p className="font-mono-tech text-zinc-400 text-xs uppercase tracking-wider">
                    Masukkan password admin
                  </p>
                </div>
              </div>

              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Password admin"
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogout()}
                className="w-full px-3.5 py-2.5 bg-obsidian-900/90 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 font-mono-tech text-sm mb-3.5"
                autoFocus
              />

              {adminError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-rose-400 font-mono-tech text-xs mb-3"
                >
                  {adminError}
                </motion.p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAdminDialog(false);
                    setAdminPassword("");
                    setAdminError("");
                  }}
                  className="flex-1 py-2.5 bg-white/10 text-zinc-300 rounded-xl font-display font-bold text-xs uppercase tracking-wider hover:bg-white/15 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleAdminLogout}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-display font-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== LOADING STATE ===== */}
      <AnimatePresence>
        {!cameraReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-dark"
          >
            <Logo size="lg" variant="splash" animated />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-sky-400/20 border-t-sky-400 rounded-full my-6"
            />
            <p className="text-white/80 text-lg font-medium">
              Mengakses Kamera & Sensor Gestur...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
