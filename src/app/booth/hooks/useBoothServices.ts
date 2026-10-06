"use client";

import { useEffect, useCallback } from "react";
import { FRAMES, compositePhotosIntoFrame } from "@/lib/frames";
import type { UseBoothStateApi } from "./useBoothState";

/** Welcome intro, snapshot kamera, film strip, upload Drive, kirim email */
export function useBoothServices(booth: UseBoothStateApi) {
  const {
    videoRef, selectedTheme, setStep, step, capturedPhotos,
    setWelcomeCountdown, emailInput,
    isUploading, setIsUploading, driveFolderUrl, setDriveFolderUrl, driveFolderName, setDriveFolderName,
    photostripBase64Ref,
  } = booth;

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


  return {
    captureSnapshot, generateFilmStrip, handleStartDriveUpload, handleSendEmail,
  };
}

export type UseBoothServicesApi = ReturnType<typeof useBoothServices>;
