"use client";

import { useEffect, useCallback } from "react";
import { FRAMES, compositePhotosIntoFrame } from "@/lib/frames";
import { getSession, clearSession, validateAdmin } from "@/lib/auth";
import { HIDDEN_TAP_THRESHOLD, HIDDEN_TAP_TIMEOUT } from "../constants";
import type { UseBoothStateApi } from "./useBoothState";
import type { UseBoothServicesApi } from "./useBoothServices";
import type { UseBoothCameraApi } from "./useBoothCamera";
import type { UseBoothGesturesApi } from "./useBoothGestures";

/** Timer QRIS, hitung mundur & jepret, review pose, processing, auto-reset, admin */
export function useBoothFlow(booth: UseBoothStateApi & UseBoothServicesApi & UseBoothCameraApi & UseBoothGesturesApi) {
  const {
    router, mediaPipeRef, streamRef, lastProcessedGestureRef, selectedPkg, setSelectedPkg,
    selectedTheme, setStep, step, setCapturedPhotos, capturedPhotosRef, setCurrentPoseIndex,
    currentPoseIndexRef, gestureMustResetRef, isProcessingPoseAdvanceRef, setSelectedRetakePose, selectedRetakePoseRef, callbacksRef,
    setTutorialProgress, setTutorialCompleted, tutorialCompletedRef, setQrisTimer, setPhotoCountdown, setIsIntermission,
    previewStripUrl, setPreviewStripUrl, setIsCompositingPreview, setProcessProgress, setIsPrinting, setQrTimer,
    setThankYouTimer, setXenonFlash, setEmailInput, setIsUploading, setDriveFolderUrl, setDriveFolderName,
    photostripBase64Ref, setShowAdminDialog, adminPassword, setAdminError, setHiddenTapCount, captureSnapshot,
    handleStartDriveUpload,
  } = booth;

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
  };


  return {
    totalPoses, handleRetakeCurrentPose, handleRetakeSpecificPose, handleAcceptAndNextPose, handleResetToWelcome, handleConfirmPreview,
    handleRetake, handleSimulatePrint, cleanup, handleHiddenTap, handleDirectLogout, handleAdminLogout,
  };
}

export type UseBoothFlowApi = ReturnType<typeof useBoothFlow>;
