"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FORMATS, THEMES, FormatItem, ThemeItem } from "@/lib/frames";
import { MediaPipeManager, type GestureType } from "@/lib/mediapipe";
import { type BoothStep, type PackageItem } from "../constants";

/** State & refs: kamera, langkah, pilihan paket/format/tema, kursor, timer, input */
export function useBoothState() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaPipeRef = useRef<MediaPipeManager | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const [isUploading, setIsUploading] = useState(false);
  const [driveFolderUrl, setDriveFolderUrl] = useState("");
  const [driveFolderName, setDriveFolderName] = useState("");
  const photostripBase64Ref = useRef<string>("");

  // Admin Modal State
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [hiddenTapCount, setHiddenTapCount] = useState(0);


  return {
    router, videoRef, canvasRef, mediaPipeRef, streamRef, dwellTimerRef,
    isInitializingCameraRef, mounted, setMounted, cameraReady, setCameraReady,
    cameraStatus, setCameraStatus, cameraErrorMessage, setCameraErrorMessage, sessionOperator, setSessionOperator,
    stepState, setStepState, stepRef, stepEntryTimeRef, lastProcessedGestureRef, selectedPkg,
    setSelectedPkg, selectedFormat, setSelectedFormat, selectedTheme, setSelectedTheme, themePage,
    setThemePage, lockedSelectionId, setLockedSelectionId, dwellCooldownRef, isTransitioningRef, mustExitBeforeSelectRef,
    lastSelectedElementRef, activeTargetRef, activeTargetIdRef, dwellStartTimeRef, gestureHoldRef, setStep,
    step, capturedPhotos, setCapturedPhotos, capturedPhotosRef, currentPoseIndex, setCurrentPoseIndex,
    currentPoseIndexRef, gestureMustResetRef, isProcessingPoseAdvanceRef, isFramePreviewOpen, setIsFramePreviewOpen, selectedRetakePose,
    setSelectedRetakePose, selectedRetakePoseRef, lastDetectedGesture, setLastDetectedGesture, lastDetectedGestureRef, isHandDetected,
    setIsHandDetected, isHandDetectedRef, cursorPosRef, targetCursorPosRef, smoothCursorPosRef, cursorRef,
    cursorCircleRef, cursorPercentRef, targetCircleRef, callbacksRef, hoveredItemId, setHoveredItemId,
    updateDwellProgressDOM, clearDwellProgressDOM, tutorialProgress, setTutorialProgress, tutorialCompleted, setTutorialCompleted,
    tutorialCompletedRef, voiceStatus, setVoiceStatus, welcomeCountdown, setWelcomeCountdown, qrisTimer,
    setQrisTimer, photoCountdown, setPhotoCountdown, isIntermission, setIsIntermission, intermissionCountdown,
    setIntermissionCountdown, previewStripUrl, setPreviewStripUrl, isCompositingPreview, setIsCompositingPreview, smoothedLandmarksRef,
    processProgress, setProcessProgress, printCopies, setPrintCopies, isPrinting, setIsPrinting,
    qrTimer, setQrTimer, thankYouTimer, setThankYouTimer, xenonFlash, setXenonFlash,
    emailInputState, setEmailInputState, emailInputRef, setEmailInput, emailInput,
    isUploading, setIsUploading, driveFolderUrl, setDriveFolderUrl,
    driveFolderName, setDriveFolderName, photostripBase64Ref, showAdminDialog, setShowAdminDialog, adminPassword,
    setAdminPassword, adminError, setAdminError, hiddenTapCount, setHiddenTapCount,
  };
}

export type UseBoothStateApi = ReturnType<typeof useBoothState>;
