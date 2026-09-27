"use client";

import {
  HandLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

export type GestureType =
  | "none"
  | "wave"
  | "open_palm"
  | "fist"
  | "peace"
  | "pointing"
  | "thumbs_up"
  | "thumbs_down";

export interface GestureResult {
  gesture: GestureType;
  landmarks: NormalizedLandmark[];
  handedness: "Left" | "Right";
  confidence: number;
}

export class MediaPipeManager {
  private handLandmarker: HandLandmarker | null = null;
  private isActive: boolean = false;
  private animationId: number | null = null;
  private lastGesture: GestureType = "none";
  private gestureStableCount: number = 0;
  private onGestureCallback: ((gesture: GestureResult) => void) | null = null;
  private targetFPS: number = 30;
  private frameInterval: number = 1000 / 30;
  private lastFrameTime: number = 0;
  private videoRef: HTMLVideoElement | null = null;

  private isDetecting: boolean = false;

  static async create(): Promise<MediaPipeManager> {
    const manager = new MediaPipeManager();
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
    );
    try {
      manager.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch (err) {
      console.warn("GPU delegate creation failed, fallback to CPU:", err);
      manager.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    }
    return manager;
  }

  setVideo(video: HTMLVideoElement): void {
    this.videoRef = video;
  }

  onGesture(callback: (gesture: GestureResult) => void): void {
    this.onGestureCallback = callback;
  }

  setTargetFPS(fps: number): void {
    this.targetFPS = Math.max(2, Math.min(30, fps));
    this.frameInterval = 1000 / this.targetFPS;
  }

  activate(): void {
    if (this.isActive || !this.handLandmarker || !this.videoRef) return;
    this.isActive = true;
    this.startLoop();
  }

  deactivate(): void {
    this.isActive = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  isActivated(): boolean {
    return this.isActive;
  }

  private startLoop(): void {
    const loop = (timestamp: number) => {
      if (!this.isActive) return;

      const elapsed = timestamp - this.lastFrameTime;
      if (
        elapsed >= this.frameInterval &&
        !this.isDetecting &&
        this.handLandmarker &&
        this.videoRef &&
        this.videoRef.readyState >= 2 &&
        !this.videoRef.paused
      ) {
        this.lastFrameTime = timestamp;
        this.isDetecting = true;
        try {
          this.detectGesture(timestamp);
        } finally {
          this.isDetecting = false;
        }
      }

      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private detectGesture(timestamp: number): void {
    if (
      !this.handLandmarker ||
      !this.videoRef ||
      this.videoRef.readyState < 2 ||
      this.videoRef.currentTime === 0
    ) {
      return;
    }

    try {
      const validTimestamp =
        typeof timestamp === "number" && timestamp > 0
          ? Math.round(timestamp)
          : Math.round(performance.now());

      // Direct video feed inference to eliminate GPU->CPU->GPU texture readback stalls
      const result = this.handLandmarker.detectForVideo(
        this.videoRef,
        validTimestamp
      );

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];
        const worldLandmarks = result.worldLandmarks?.[0];
        const handedness =
          result.handedness?.[0]?.[0]?.categoryName === "Left"
            ? "Left"
            : "Right";

        const gesture = this.classifyGesture(landmarks, worldLandmarks);

        if (gesture === this.lastGesture) {
          this.gestureStableCount++;
        } else {
          this.lastGesture = gesture;
          this.gestureStableCount = 0;
        }

        if (
          (gesture === "wave" ||
            gesture === "thumbs_up" ||
            gesture === "thumbs_down" ||
            this.gestureStableCount >= 2) &&
          this.onGestureCallback
        ) {
          this.onGestureCallback({
            gesture,
            landmarks,
            handedness,
            confidence: result.handedness?.[0]?.[0]?.score ?? 0,
          });
        }
      } else {
        // Hand lost or offscreen: immediately notify callback so skeleton is wiped
        this.lastGesture = "none";
        this.gestureStableCount = 0;
        if (this.onGestureCallback) {
          this.onGestureCallback({
            gesture: "none",
            landmarks: [],
            handedness: "Right",
            confidence: 0,
          });
        }
      }
    } catch (err) {
      console.warn("MediaPipe detection frame skipped:", err);
    }
  }

  private classifyGesture(
    landmarks: NormalizedLandmark[],
    _worldLandmarks?: NormalizedLandmark[]
  ): GestureType {
    if (landmarks.length < 21) return "none";

    // 1. WAVE MOTION DETECTION
    const waveDetected = this.detectWave(landmarks);
    if (waveDetected) return "wave";

    const fingersExtended = this.getFingersExtended(landmarks);

    // THUMBS UP: Thumb pointing UP, all other 4 fingers folded
    if (
      landmarks[4].y < landmarks[3].y &&
      landmarks[4].y < landmarks[5].y &&
      !fingersExtended[1] &&
      !fingersExtended[2] &&
      !fingersExtended[3] &&
      !fingersExtended[4]
    )
      return "thumbs_up";

    // THUMBS DOWN: Thumb pointing DOWN, all other 4 fingers folded
    if (
      landmarks[4].y > landmarks[3].y &&
      landmarks[4].y > landmarks[17].y &&
      !fingersExtended[1] &&
      !fingersExtended[2] &&
      !fingersExtended[3] &&
      !fingersExtended[4]
    )
      return "thumbs_down";

    // Static OPEN PALM
    const extendedCount = fingersExtended.filter(Boolean).length;
    if (extendedCount >= 4) return "open_palm";

    // FIST: no fingers extended
    if (fingersExtended.every((f) => !f)) return "fist";

    // PEACE: index + middle extended only
    if (
      !fingersExtended[0] &&
      fingersExtended[1] &&
      fingersExtended[2] &&
      !fingersExtended[3] &&
      !fingersExtended[4]
    )
      return "peace";

    // POINTING: only index extended
    if (
      !fingersExtended[0] &&
      fingersExtended[1] &&
      !fingersExtended[2] &&
      !fingersExtended[3] &&
      !fingersExtended[4]
    )
      return "pointing";

    return "none";
  }

  private getFingersExtended(landmarks: NormalizedLandmark[]): boolean[] {
    const tips = [4, 8, 12, 16, 20];
    const pipJoints = [3, 6, 10, 14, 18];

    return tips.map((tip, i) => {
      if (i === 0) {
        const thumbTip = landmarks[tip];
        const indexMcp = landmarks[5];
        const distance = Math.sqrt(
          (thumbTip.x - indexMcp.x) ** 2 + (thumbTip.y - indexMcp.y) ** 2
        );
        return distance > 0.1;
      }
      return landmarks[tip].y < landmarks[pipJoints[i]].y;
    });
  }

  private xHistory: number[] = [];
  private lastWaveTime: number = 0;

  private detectWave(landmarks: NormalizedLandmark[]): boolean {
    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const currentX = (wrist.x + indexMcp.x) / 2;
    const now = Date.now();

    this.xHistory.push(currentX);
    if (this.xHistory.length > 12) {
      this.xHistory.shift();
    }

    if (this.xHistory.length < 6) return false;
    if (now - this.lastWaveTime < 800) return false;

    const minX = Math.min(...this.xHistory);
    const maxX = Math.max(...this.xHistory);
    const totalDisplacement = maxX - minX;

    let directionChanges = 0;
    let currentDir = 0;

    for (let i = 1; i < this.xHistory.length; i++) {
      const diff = this.xHistory[i] - this.xHistory[i - 1];
      if (Math.abs(diff) > 0.005) {
        const dir = diff > 0 ? 1 : -1;
        if (currentDir !== 0 && dir !== currentDir) {
          directionChanges++;
        }
        currentDir = dir;
      }
    }

    if (totalDisplacement >= 0.045 && directionChanges >= 1) {
      this.xHistory = [];
      this.lastWaveTime = now;
      return true;
    }

    return false;
  }

  destroy(): void {
    this.deactivate();
    this.handLandmarker?.close();
    this.handLandmarker = null;
  }
}

// ===== HELPER: HIGH-PERFORMANCE DUAL-PASS HAND SKELETON CANVAS =====
export function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  _gestureName: string = ""
): void {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  if (!landmarks || landmarks.length < 21) {
    ctx.restore();
    return;
  }

  const connections = [
    [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
    [1, 2], [2, 3], [3, 4],
    [5, 6], [6, 7], [7, 8],
    [9, 10], [10, 11], [11, 12],
    [13, 14], [14, 15], [15, 16],
    [17, 18], [18, 19], [19, 20],
  ];

  // Batch calculate screen positions once
  const coords: { x: number; y: number }[] = new Array(21);
  for (let i = 0; i < 21; i++) {
    const lm = landmarks[i];
    coords[i] = {
      x: (1 - lm.x) * width,
      y: lm.y * height,
    };
  }

  // --- PASS 1: AMBIENT NEON OUTER GLOW (Zero Gaussian Blur Overhead) ---
  ctx.lineWidth = 5.5;
  ctx.strokeStyle = "rgba(240, 162, 92, 0.28)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const [start, end] of connections) {
    const p1 = coords[start];
    const p2 = coords[end];
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  }
  ctx.stroke();

  // --- PASS 2: SOLID CORE BONES ---
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "rgba(255, 230, 205, 0.95)";
  ctx.beginPath();
  for (const [start, end] of connections) {
    const p1 = coords[start];
    const p2 = coords[end];
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  }
  ctx.stroke();

  // --- PASS 3: JOINT NODES & ACTIVE POINTER ---
  const tips = [4, 8, 12, 16, 20];
  for (let idx = 0; idx < 21; idx++) {
    const p = coords[idx];
    const isTip = tips.includes(idx);

    if (idx === 8) {
      // Index finger tip (active cursor pointer): glowing halo ring + bright core
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(240, 162, 92, 0.35)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 5.5, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#f0a25c";
      ctx.stroke();
    } else if (isTip) {
      // Fingertips: apricot glow + solid node
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(240, 162, 92, 0.3)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "#f0a25c";
      ctx.fill();
    } else {
      // Knuckles and joints
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.8, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(247, 247, 251, 0.85)";
      ctx.fill();
    }
  }

  ctx.restore();
}
