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

  static async create(): Promise<MediaPipeManager> {
    const manager = new MediaPipeManager();
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
    );
    manager.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.55,
      minTrackingConfidence: 0.5,
    });
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
        this.handLandmarker &&
        this.videoRef &&
        this.videoRef.readyState >= 2 &&
        !this.videoRef.paused
      ) {
        this.lastFrameTime = timestamp;
        this.detectGesture(timestamp);
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

// ===== HELPER: DRAW HAND SKELETON CANVAS FOR DEBUG MODE =====
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

  // Draw luminous bone connections in warm studio apricot/amber
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(240, 162, 92, 0.75)";
  ctx.shadowColor = "#f0a25c";
  ctx.shadowBlur = 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const [start, end] of connections) {
    const p1 = landmarks[start];
    const p2 = landmarks[end];
    const x1 = (1 - p1.x) * width;
    const y1 = p1.y * height;
    const x2 = (1 - p2.x) * width;
    const y2 = p2.y * height;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Draw joint nodes and fingertips
  const tips = [4, 8, 12, 16, 20];
  landmarks.forEach((lm, idx) => {
    const x = (1 - lm.x) * width;
    const y = lm.y * height;
    const isTip = tips.includes(idx);

    ctx.beginPath();
    ctx.arc(x, y, isTip ? 5.5 : 3.2, 0, 2 * Math.PI);

    if (idx === 8) {
      // Index fingertip (active pointer)
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#f0a25c";
      ctx.shadowBlur = 12;
    } else if (isTip) {
      ctx.fillStyle = "#f0a25c";
      ctx.shadowColor = "#f0a25c";
      ctx.shadowBlur = 6;
    } else {
      ctx.fillStyle = "rgba(247, 247, 251, 0.9)";
      ctx.shadowBlur = 0;
    }

    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isTip ? "#f0a25c" : "rgba(41, 43, 59, 0.8)";
    ctx.stroke();

    // Subtle outer halo on index finger pointer
    if (idx === 8) {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(240, 162, 92, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  ctx.restore();
}
