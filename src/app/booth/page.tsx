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
  }, []);

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
              ctx.drawImage(loadedImg, padding, y, imgWidth, imgHeight);
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
    if (driveFolderUrl || isUploading) return;
    setIsUploading(true);

    let selectedUrls = selectedPhotoIndices.map(idx => capturedPhotos[idx]).filter(Boolean);
    if (selectedUrls.length === 0) selectedUrls = [capturedPhotos[0]].filter(Boolean);
    
    let imagesToUpload = selectedUrls.map((url, i) => ({
      base64: url,
      fileName: `pose_${i+1}.jpg`
    }));

    const gridBase64 = await generateFilmStrip(selectedUrls);
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
  }, [capturedPhotos, selectedPhotoIndices, driveFolderUrl, isUploading]);

  // ===== HANDLE SEND EMAIL & FINISH TO QR DOWNLOAD =====
  const handleSendEmailAndFinish = useCallback(async (targetEmailInput?: string) => {
    setStep("qr_download");
    const targetEmailToUse = targetEmailInput !== undefined ? targetEmailInput : emailInput;

    let photoDataUrl = capturedPhotos[0] || "";
    if (selectedPhotoIndices.length > 0 && capturedPhotos.length > 0) {
      photoDataUrl = capturedPhotos[selectedPhotoIndices[0]] || capturedPhotos[0];
    }

    const emailToSend = targetEmailToUse.trim();
    if (emailToSend && (emailToSend.includes("@") || emailToSend.length > 3)) {
      let finalEmailTarget = emailToSend;
      if (!finalEmailTarget.includes("@")) {
        finalEmailTarget += "@gmail.com";
      }

      try {
        await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toEmail: finalEmailTarget,
            userName: "LAPLACE_ZERO",
            publicPhotoUrl: driveFolderUrl || "https://ai-box.id",
            folderUrl: driveFolderUrl || "https://ai-box.id",
            folderName: driveFolderName || "AIBox_Photos",
          }),
        });
      } catch (err) {
        console.error("Failed to send email:", err);
      }
    }
  }, [capturedPhotos, selectedPhotoIndices, emailInput, driveFolderUrl, driveFolderName]);

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

          // 3. IDLE STEP: Active Wave Motion Trigger
          if (stepRef.current === "idle" && result.gesture === "wave" && canTriggerAction) {
            setWaveDetected(true);
            if (!waveTimerRef.current) {
              mediaPipeRef.current?.setTargetFPS(ACTIVE_FPS);
              waveTimerRef.current = setTimeout(() => {
                waveTimerRef.current = null;
                setWaveDetected(false);
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
          if (stepRef.current === "pose_ready" && result.gesture === "peace" && canTriggerAction) {
            callbacksRef.current.setStep?.("countdown");
          }

          // 5. CONFIRM & PRINT CONFIRM STEP: Thumbs Up 👍 & Thumbs Down 👎
          if (stepRef.current === "confirm" && canTriggerAction) {
            if (result.gesture === "thumbs_up") {
              callbacksRef.current.handleConfirmYes?.();
            } else if (result.gesture === "thumbs_down") {
              callbacksRef.current.handleConfirmNo?.();
            }
          }

          if (stepRef.current === "print_confirm" && canTriggerAction) {
            if (result.gesture === "thumbs_up") {
              callbacksRef.current.handleStartDriveUpload?.();
              callbacksRef.current.setStep?.("email_input");
            } else if (result.gesture === "thumbs_down") {
              callbacksRef.current.setStep?.("select_photos");
            }
          }

          // 6. EMAIL INPUT STEP: Fist ✊ (Start Voice) & Open Palm 🖐️ (Stop Voice)
          if (stepRef.current === "email_input" && canTriggerAction) {
            if (result.gesture === "fist") {
              startRecordingVoice();
            } else if (result.gesture === "open_palm") {
              stopRecordingVoice();
            } else if (result.gesture === "thumbs_up") {
              callbacksRef.current.handleSendEmailAndFinish?.(emailInputRef.current);
            }
          }

          // 7. SCROLL SUPPORT FOR SELECT_PHOTOS
          if (stepRef.current === "select_photos") {
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
  }, [router, startRecordingVoice, stopRecordingVoice]);

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

            // Execute Camera Snapshot Capture
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

      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 camera-overlay" />

      {/* ===== RELOCATED DEBUG STATUS BADGE (TOP RIGHT) ===== */}
      <div className="absolute top-6 right-8 z-30 flex items-center gap-3 px-4 py-2 glass-dark rounded-full border border-white/10">
        <div className={`w-2.5 h-2.5 rounded-full ${!ENABLE_PAYMENT ? "bg-emerald-400" : "bg-red-500"} animate-pulse`} />
        <span className="text-white/90 text-xs font-bold tracking-wider uppercase">
          AI Photobooth {IS_DEBUG ? "• [DEBUG ON]" : !ENABLE_PAYMENT ? `• Free Mode (${FREE_MODE_POSES} Poses)` : "• Ready"}
        </span>
      </div>

      {/* ===== GESTURE HAND CURSOR OVERLAY ===== */}
      {(step === "packages" || step === "select_photos") && (
        <div
          ref={cursorRef}
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 opacity-0"
          style={{ left: `50%`, top: `50%` }}
        >
          <div className="relative flex items-center justify-center">
            {hoveredPkgId && (
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeDasharray="163"
                  strokeDashoffset={163 - (163 * dwellProgress) / 100}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-75"
                />
              </svg>
            )}

            <div className="w-8 h-8 rounded-full bg-sky-400/80 border-2 border-white shadow-[0_0_20px_#0ea5e9] flex items-center justify-center animate-pulse">
              <MousePointer2 className="w-4 h-4 text-dark fill-white" />
            </div>
          </div>
        </div>
      )}

      {/* ===== IDLE STEP ===== */}
      <AnimatePresence mode="wait">
        {step === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.4 } }}
            className="absolute inset-0 flex flex-col items-center justify-between z-20 py-12 px-6 sm:px-12 text-center"
          >
            <div className="h-10" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 max-w-4xl"
            >
              <div className="flex-shrink-0">
                <Logo size="xl" variant="splash" animated priority />
              </div>

              <div className="text-center md:text-left">
                <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight drop-shadow-xl mb-3">
                  <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-orange-400 bg-clip-text text-transparent">
                    AI Box Photobooth
                  </span>
                </h1>
                <p className="text-white/80 text-lg sm:text-xl font-light tracking-wide">
                  Sentuhan masa depan tanpa menekan tombol
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <div className="flex items-center gap-5 px-7 py-4.5 glass-dark rounded-full border border-sky-400/30 shadow-[0_10px_40px_rgba(14,165,233,0.25)]">
                <motion.div
                  animate={{ rotate: [0, 20, -20, 20, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/40 flex-shrink-0"
                >
                  <Hand className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
                </motion.div>

                <div className="text-left pr-3">
                  <h3 className="text-white font-bold text-lg sm:text-2xl leading-tight">
                    Lambaikan Tangan Ke Kamera
                  </h3>
                  <p className="text-sky-200/80 text-xs sm:text-sm mt-0.5">
                    Gerakkan tangan kekiri & kekanan untuk memulai
                  </p>
                </div>
              </div>

              {waveDetected && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="absolute -top-16 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-emerald-500 text-white rounded-full font-bold text-sm shadow-xl flex items-center gap-2 border border-emerald-400 whitespace-nowrap"
                >
                  <motion.div
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 0.4, repeat: Infinity }}
                    className="w-2.5 h-2.5 rounded-full bg-white"
                  />
                  Lambaikan Tangan Terdeteksi! Menyiapkan...
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== PACKAGE SELECTION STEP ===== */}
      <AnimatePresence>
        {step === "packages" && (
          <motion.div
            key="packages"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-12 text-center"
          >
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-sky-500/20 border border-sky-400/40 rounded-full text-sky-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Sistem Kursor Gestur Aktif
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Pilih Paket Photobooth Anda
              </h2>
              <p className="text-white/70 text-sm sm:text-base mt-1">
                Arahkan jari/kursor atau klik pada kartu paket yang anda inginkan
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
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    className={`relative rounded-3xl p-7 border backdrop-blur-xl bg-gradient-to-b ${
                      pkg.gradient
                    } cursor-pointer transition-all duration-200 text-left flex flex-col justify-between shadow-2xl ${
                      isHovered
                        ? "ring-4 ring-sky-400 shadow-[0_0_40px_rgba(14,165,233,0.4)]"
                        : ""
                    }`}
                  >
                    {pkg.badge && (
                      <span className="absolute -top-3 right-6 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs rounded-full shadow-md">
                        {pkg.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-black text-white">
                          {pkg.name}
                        </h3>
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                          <Camera className={`w-5 h-5 ${pkg.accentColor}`} />
                        </div>
                      </div>

                      <div className="mb-5">
                        <span className="text-3xl font-black text-white">
                          {pkg.price}
                        </span>
                        <span className="text-white/60 text-xs block mt-0.5 font-medium">
                          {pkg.poses} Pose Foto Strip HD
                        </span>
                      </div>

                      <ul className="space-y-2.5 border-t border-white/10 pt-4 mb-6">
                        {pkg.features.map((feat, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2.5 text-xs text-white/90 font-medium"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-auto">
                      {isHovered && (
                        <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mb-3">
                          <div
                            className="bg-sky-400 h-full transition-all duration-75"
                            style={{ width: `${dwellProgress}%` }}
                          />
                        </div>
                      )}

                      <div className="w-full py-3 bg-white text-dark font-extrabold text-sm rounded-xl text-center shadow-lg group-hover:bg-sky-400 transition-colors">
                        {isHovered
                          ? `Menyeleksi (${dwellProgress}%)...`
                          : "Pilih Paket Ini"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <button
              onClick={() => setStep("idle")}
              className="text-white/60 hover:text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Layar Utama
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== CONFIRMATION STEP ===== */}
      <AnimatePresence>
        {step === "confirm" && selectedPkg && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="glass-dark rounded-3xl p-8 sm:p-10 max-w-md w-full text-center border border-sky-400/40 shadow-[0_0_60px_rgba(14,165,233,0.35)]">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/40 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black text-white mb-1">
                Konfirmasi Pilihan Paket
              </h3>
              <p className="text-white/70 text-sm mb-6">
                Anda memilih <span className="font-bold text-sky-300">{selectedPkg.name}</span> seharga{" "}
                <span className="font-bold text-emerald-400">{selectedPkg.price}</span> ({selectedPkg.poses} Pose).
              </p>

              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 mb-6 text-left space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-bold">
                    <ThumbsUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-white font-bold text-sm block">
                      👍 Thumbs Up (Jempol Ke Atas)
                    </span>
                    <span className="text-emerald-300 text-xs">
                      Setuju & Lanjut Pembayaran
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-white/10 pt-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/40 text-red-400 flex items-center justify-center font-bold">
                    <ThumbsDown className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-white font-bold text-sm block">
                      👎 Thumbs Down (Jempol Ke Bawah)
                    </span>
                    <span className="text-red-300 text-xs">
                      Batal & Kembali Pilih Paket
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleConfirmNo}
                  className="flex-1 py-3 bg-white/10 text-white hover:bg-white/20 rounded-xl font-bold text-sm transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  <ThumbsDown className="w-4 h-4 text-red-400" />
                  Batal (👎)
                </button>

                <button
                  onClick={handleConfirmYes}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Lanjut Bayar (👍)
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="glass-dark rounded-3xl p-8 sm:p-10 max-w-sm w-full text-center border border-emerald-400/40 shadow-[0_0_60px_rgba(16,185,129,0.35)]">
              <div className="flex items-center justify-center gap-2 mb-3">
                <QrCode className="w-6 h-6 text-emerald-400" />
                <span className="text-white font-extrabold text-xl">
                  Pembayaran QRIS
                </span>
              </div>

              <p className="text-white/70 text-xs mb-4">
                Scan QRIS dengan e-Wallet atau M-Banking Anda
              </p>

              <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-200 inline-block mb-4">
                <svg
                  viewBox="0 0 200 200"
                  className="w-44 h-44 mx-auto"
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
                    d="M80 20h15v20H80zM100 20h20v15h-20zM80 50h35v15H80zM20 80h20v25H20zM50 80h15v40H50zM80 80h40v15H80zM130 80h15v20h-15zM160 80h20v40h-20zM80 110h20v20H80zM110 110h35v15h-35zM80 140h15v40H80zM105 140h35v20h-35zM150 140h30v40h-30z"
                    fill="#0f172a"
                  />
                </svg>
                <span className="text-dark font-extrabold text-xs block mt-2 tracking-widest uppercase">
                  NMID: ID102030405060
                </span>
              </div>

              <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-xl py-2.5 px-4 mb-4">
                <span className="text-emerald-300 text-xs block">Total Tagihan:</span>
                <span className="text-white font-black text-2xl">
                  {selectedPkg.price}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 text-white/80 text-xs font-medium">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full"
                />
                <span>Memverifikasi Pembayaran Otomatis ({qrisTimer}s)...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== PAID SUCCESS CELEBRATION STEP ===== */}
      <AnimatePresence>
        {step === "paid_success" && selectedPkg && (
          <motion.div
            key="paid_success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="glass-dark rounded-3xl p-10 max-w-sm w-full text-center border border-emerald-400 shadow-[0_0_80px_rgba(16,185,129,0.5)]">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/40"
              >
                <Check className="w-12 h-12 stroke-[3]" />
              </motion.div>

              <h2 className="text-3xl font-black text-white mb-2">
                Pembayaran Berhasil! 🎉
              </h2>
              <p className="text-emerald-200 text-sm font-medium mb-4">
                Paket <span className="font-bold text-white">{selectedPkg.name}</span> aktif.
              </p>
              <p className="text-white/60 text-xs">
                Menyiapkan kamera untuk sesi foto...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== POSE READY STEP (CLEAN FLOATING TOP CARD, NO OVERLAY BLUR) ===== */}
      <AnimatePresence>
        {step === "pose_ready" && selectedPkg && (
          <motion.div
            key="pose_ready"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-10 inset-x-0 z-40 flex flex-col items-center pointer-events-none px-4"
          >
            <div className="glass-dark rounded-full px-6 py-3 border border-sky-400/40 shadow-2xl flex items-center gap-4 pointer-events-auto">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 flex-shrink-0"
              >
                <PeaceIcon className="w-6 h-6" />
              </motion.div>

              <div className="text-left pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-sky-300 font-bold text-xs uppercase tracking-wider">
                    Pose {currentPoseIndex + 1} dari {selectedPkg.poses}
                  </span>
                </div>
                <h3 className="text-white font-extrabold text-base sm:text-lg leading-tight">
                  Tunjukkan Gestur Peace (✌️) Untuk Ambil Foto
                </h3>
              </div>

              <button
                onClick={() => setStep("countdown")}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-extrabold rounded-full transition-all shadow-md ml-2"
              >
                Klik Foto (Manual)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== PHOTO COUNTDOWN STEP (CLEAN CRISP CAMERA FEED, NO HEAVY BLUR) ===== */}
      <AnimatePresence>
        {step === "countdown" && selectedPkg && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/20 p-4 text-center pointer-events-none"
          >
            <div className="absolute top-8 px-6 py-2.5 glass-dark rounded-full border border-sky-400/40 text-sky-300 font-bold text-sm uppercase tracking-wider">
              Pose {currentPoseIndex + 1} dari {selectedPkg.poses}
            </div>

            <motion.div
              key={photoCountdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="text-8xl sm:text-9xl font-black text-white drop-shadow-[0_0_50px_#0ea5e9] mb-4 flex items-center justify-center gap-4"
            >
              {photoCountdown > 0 ? (
                photoCountdown
              ) : (
                <>
                  <Camera className="w-20 h-20 text-sky-400 animate-bounce" />
                  <span>SMILE!</span>
                </>
              )}
            </motion.div>

            <p className="text-white/90 text-lg sm:text-xl font-medium drop-shadow-md">
              {photoCountdown > 0
                ? "Bersiap untuk berpose!"
                : "Mengambil foto HD..."}
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
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 text-center bg-dark/95 overflow-y-auto"
          >
            <div className="mt-2">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Pilih Foto Untuk Cetak Film Strip
              </h2>
              <p className="text-white/70 text-sm mt-1">
                Gunakan kursor gestur atau klik foto yang ingin anda tampilkan di cetakan
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
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className={`relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer border-2 transition-all ${
                        isSelected
                          ? "border-sky-400 ring-4 ring-sky-400/50 shadow-lg shadow-sky-500/30"
                          : "border-white/20 opacity-60 hover:opacity-100"
                      } ${isHovered ? "ring-4 ring-amber-400 scale-105" : ""}`}
                    >
                      <img
                        src={photoUrl}
                        alt={`Pose ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-md text-white font-bold text-xs">
                        Pose #{idx + 1}
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 w-7 h-7 bg-sky-400 rounded-full flex items-center justify-center text-dark font-black shadow-md">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Live Film Strip Preview Column */}
              <div className="w-44 bg-slate-900/90 rounded-2xl p-3 border border-white/20 shadow-2xl flex flex-col items-center flex-shrink-0">
                <div className="flex items-center gap-1.5 mb-2">
                  <Logo size="sm" variant="rounded" animated={false} />
                  <span className="text-white text-[10px] font-bold">AI BOX STRIP</span>
                </div>

                <div className="space-y-2 w-full">
                  {selectedPhotoIndices.map((pIdx) => (
                    <div
                      key={pIdx}
                      className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-white/20 bg-slate-800"
                    >
                      <img
                        src={capturedPhotos[pIdx]}
                        alt={`Strip pose ${pIdx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                <span className="text-white/40 text-[9px] mt-3 font-semibold uppercase tracking-widest">
                  Ready to Print
                </span>
              </div>
            </div>

            {/* Action Bar with Hover-Click data-action-id attributes */}
            <div className="flex gap-4">
              <button
                data-action-id="retake"
                onClick={() => {
                  setCapturedPhotos([]);
                  setCurrentPoseIndex(0);
                  setStep("pose_ready");
                }}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all border flex items-center gap-2 ${
                  hoveredPkgId === "action-retake"
                    ? "bg-sky-500 text-white border-sky-400 ring-4 ring-sky-400/50 scale-105"
                    : "bg-white/10 hover:bg-white/20 text-white border-white/10"
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                Foto Ulang
              </button>

              <button
                data-action-id="print"
                onClick={() => {
                  handleStartDriveUpload();
                  setStep("print_confirm");
                }}
                disabled={selectedPhotoIndices.length === 0}
                className={`px-8 py-3 rounded-xl font-black text-sm transition-all shadow-xl flex items-center gap-2 disabled:opacity-50 ${
                  hoveredPkgId === "action-print"
                    ? "bg-emerald-500 text-white ring-4 ring-emerald-400/50 scale-105"
                    : "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sky-500/30"
                }`}
              >
                <Printer className="w-4 h-4" />
                Cetak Film Strip ({selectedPhotoIndices.length} Foto)
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
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="glass-dark rounded-3xl p-8 sm:p-10 max-w-md w-full text-center border border-sky-400/40 shadow-[0_0_60px_rgba(14,165,233,0.35)]">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/40 flex items-center justify-center mx-auto mb-4">
                <Printer className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black text-white mb-1">
                Konfirmasi Cetak Foto
              </h3>
              <p className="text-white/70 text-sm mb-6">
                Cetak {selectedPhotoIndices.length} foto terpilih ke mesin printer sekarang?
              </p>

              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 mb-6 text-left space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-bold">
                    <ThumbsUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-white font-bold text-sm block">
                      👍 Thumbs Up (Setuju)
                    </span>
                    <span className="text-emerald-300 text-xs">
                      Lanjut Input Email & Cetak
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-white/10 pt-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/40 text-red-400 flex items-center justify-center font-bold">
                    <ThumbsDown className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-white font-bold text-sm block">
                      👎 Thumbs Down (Batal)
                    </span>
                    <span className="text-red-300 text-xs">
                      Kembali Pilih Foto
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep("select_photos")}
                  className="flex-1 py-3 bg-white/10 text-white hover:bg-white/20 rounded-xl font-bold text-sm transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  <ThumbsDown className="w-4 h-4 text-red-400" />
                  Batal (👎)
                </button>

                <button
                  onClick={() => {
                    handleStartDriveUpload();
                    setStep("email_input");
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Lanjut Cetak (👍)
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== EMAIL INPUT STEP (VOICE-TO-TEXT WITH FIST / OPEN PALM) ===== */}
      <AnimatePresence>
        {step === "email_input" && (
          <motion.div
            key="email_input"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="glass-dark rounded-3xl p-8 sm:p-10 max-w-md w-full text-center border border-purple-400/40 shadow-[0_0_60px_rgba(168,85,247,0.35)]">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-400/40 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black text-white mb-1">
                Kirim Soft Copy Email
              </h3>
              <p className="text-white/70 text-xs mb-6">
                Bicara atau ketik alamat email anda untuk menerima file foto HD
              </p>

              {/* Voice Control Guide */}
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 mb-5 text-left space-y-2">
                <div className="flex items-center justify-between text-xs text-white/90">
                  <span className="font-bold flex items-center gap-2">
                    <span className="text-lg">✊</span> Mengepal (Fist): Mulai Rekam
                  </span>
                  <span className="text-purple-300 font-semibold">Voice-to-Text</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/90 border-t border-white/10 pt-2">
                  <span className="font-bold flex items-center gap-2">
                    <span className="text-lg">🖐️</span> Terbuka (Open Palm): Stop Rekam
                  </span>
                </div>
              </div>

              {/* Email Text Input Field */}
              <div className="relative mb-6">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="contoh: user@gmail.com"
                  className="w-full px-5 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm font-medium"
                />

                <button
                  onClick={isRecordingVoice ? stopRecordingVoice : startRecordingVoice}
                  className={`absolute right-2 top-2 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isRecordingVoice
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-purple-500/40 hover:bg-purple-500/60 text-purple-200"
                  }`}
                >
                  {isRecordingVoice ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      Merekam...
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
              <div className="flex gap-4">
                <button
                  onClick={() => handleSendEmailAndFinish("")}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-all border border-white/10"
                >
                  Lewati Email
                </button>

                <button
                  onClick={() => handleSendEmailAndFinish(emailInput)}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-1.5"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Kirim & Cetak (👍)
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FINAL QR CODE DOWNLOAD STEP (5 SEC AUTO-RESET) ===== */}
      <AnimatePresence>
        {step === "qr_download" && (
          <motion.div
            key="qr_download"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="glass-dark rounded-3xl p-8 sm:p-10 max-w-sm w-full text-center border border-sky-400/40 shadow-[0_0_80px_rgba(14,165,233,0.4)]">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/40 flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">
                Unduh Foto Digital HD
              </h2>
              <p className="text-white/70 text-xs mb-5">
                Scan QR Code di bawah untuk menyimpan file foto ke smartphone anda
              </p>

              {/* QR Code & Drive Link */}
              {isUploading ? (
                <div className="py-8 text-center space-y-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full mx-auto"
                  />
                  <p className="text-xs text-sky-200 font-semibold animate-pulse">
                    Memproses & Mengunggah ke Google Drive...
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-200 inline-block mb-4">
                    <QRCodeSVG
                      value={driveFolderUrl || "https://ai-box.id"}
                      size={180}
                      className="mx-auto"
                    />
                    <span className="text-dark font-extrabold text-[10px] block mt-2 tracking-wider uppercase">
                      {driveFolderName || "Google Drive Folder"}
                    </span>
                  </div>

                  {driveFolderUrl && (
                    <div className="mb-4">
                      <a
                        href={driveFolderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                      >
                        📂 Buka Google Drive Publik
                      </a>
                    </div>
                  )}
                </>
              )}

              <div className="bg-sky-500/20 border border-sky-400/40 rounded-xl py-2 px-4 mb-4">
                <span className="text-sky-300 text-xs font-semibold">
                  Foto Sedang Dicetak di Printer 🖨️
                </span>
              </div>

              {/* Auto Reset Countdown */}
              <div className="flex items-center justify-center gap-2 text-white/70 text-xs font-medium">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full"
                />
                <span>Kembali ke Layar Utama dalam {qrTimer}s...</span>
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

      {/* ===== ADMIN LOGOUT DIALOG ===== */}
      <AnimatePresence>
        {showAdminDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-dark"
            >
              <div className="flex items-center gap-3 mb-6">
                <Logo size="sm" variant="rounded" animated={false} />
                <div>
                  <h3 className="font-bold text-dark text-lg">Admin Logout</h3>
                  <p className="text-light-muted text-xs">
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark placeholder:text-light-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mb-4"
                autoFocus
              />

              {adminError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-sm mb-3"
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
                  className="flex-1 py-2.5 bg-gray-100 text-dark rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleAdminLogout}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
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
