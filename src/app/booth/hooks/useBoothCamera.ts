"use client";

import { useEffect, useCallback } from "react";
import { Hand, Camera } from "lucide-react";
import { getSession } from "@/lib/auth";
import { MediaPipeManager, drawHandSkeleton, type GestureResult } from "@/lib/mediapipe";
import { ACTIVE_FPS } from "../constants";
import type { UseBoothStateApi } from "./useBoothState";
import type { UseBoothServicesApi } from "./useBoothServices";

/** Inisialisasi kamera + MediaPipe dan loop deteksi tangan */
export function useBoothCamera(booth: UseBoothStateApi & UseBoothServicesApi) {
  const {
    router, videoRef, canvasRef, mediaPipeRef, streamRef, dwellTimerRef,
    isInitializingCameraRef, setMounted, setCameraReady, setCameraStatus, setCameraErrorMessage, setSessionOperator,
    stepRef, stepEntryTimeRef, lastProcessedGestureRef, gestureHoldRef, gestureMustResetRef, selectedRetakePoseRef,
    setLastDetectedGesture, lastDetectedGestureRef, setIsHandDetected, isHandDetectedRef, targetCursorPosRef, callbacksRef,
    tutorialCompletedRef, smoothedLandmarksRef,
  } = booth;

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

            // UPLOAD DIGITAL STEP: email lewat suara — kepalan (rekam) → lepas 0,3 dtk (selesai) →
            // jempol atas/bawah ditahan 3 dtk (kirim / rekam ulang). Lihat hooks/useBoothVoiceEmail.ts
            if (stepRef.current === "upload_digital") {
              callbacksRef.current.onVoiceGesture?.(result.gesture);
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


  return {
    initCamera,
  };
}

export type UseBoothCameraApi = ReturnType<typeof useBoothCamera>;
