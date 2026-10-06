"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Hand, Check } from "lucide-react";
import { FRAMES, FormatItem, ThemeItem } from "@/lib/frames";
import { type PackageItem, ENABLE_PAYMENT } from "../constants";
import type { UseBoothStateApi } from "./useBoothState";
import type { UseBoothServicesApi } from "./useBoothServices";
import type { UseBoothCameraApi } from "./useBoothCamera";

/** Kursor 60 FPS, tutorial gerakan, dwell-click, handler pilih paket/format/tema */
export function useBoothGestures(booth: UseBoothStateApi & UseBoothServicesApi & UseBoothCameraApi) {
  const {
    dwellTimerRef, stepRef, setSelectedPkg, setSelectedFormat, setSelectedTheme, setThemePage,
    setLockedSelectionId, dwellCooldownRef, isTransitioningRef, mustExitBeforeSelectRef, lastSelectedElementRef, activeTargetRef,
    activeTargetIdRef, dwellStartTimeRef, setStep, step, setCapturedPhotos, setCurrentPoseIndex,
    currentPoseIndexRef, gestureMustResetRef, setSelectedRetakePose, selectedRetakePoseRef, cursorPosRef, targetCursorPosRef,
    smoothCursorPosRef, cursorRef, targetCircleRef, setHoveredItemId, updateDwellProgressDOM, clearDwellProgressDOM,
    setTutorialProgress, setTutorialCompleted, tutorialCompletedRef,
  } = booth;

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


  return {
    handleSelectPackage, handleSelectFormat, handleSelectTheme,
  };
}

export type UseBoothGesturesApi = ReturnType<typeof useBoothGestures>;
