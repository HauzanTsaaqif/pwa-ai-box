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
  private targetFPS: number = 15;
  private frameInterval: number = 1000 / 15;
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
      numHands: 2,
      minHandDetectionConfidence: 0.6,
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
  gestureName: string = ""
): void {
  if (!landmarks || landmarks.length < 21) return;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const connections = [
    [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
    [1, 2], [2, 3], [3, 4],
    [5, 6], [6, 7], [7, 8],
    [9, 10], [10, 11], [11, 12],
    [13, 14], [14, 15], [15, 16],
    [17, 18], [18, 19], [19, 20],
  ];

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#0ea5e9";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 8;

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

  const tips = [4, 8, 12, 16, 20];
  landmarks.forEach((lm, idx) => {
    const x = (1 - lm.x) * width;
    const y = lm.y * height;

    ctx.beginPath();
    ctx.arc(x, y, tips.includes(idx) ? 7 : 4, 0, 2 * Math.PI);

    if (idx === 0) {
      ctx.fillStyle = "#ef4444";
    } else if (tips.includes(idx)) {
      ctx.fillStyle = "#f97316";
    } else {
      ctx.fillStyle = "#10b981";
    }

    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  });

  // Render Debug Banner on TOP RIGHT so it does not block top-left status badges
  if (gestureName) {
    const boxWidth = 260;
    const boxHeight = 36;
    const boxX = width - boxWidth - 16;
    const boxY = 16;

    ctx.shadowBlur = 0;
    ctx.font = "bold 14px Inter, monospace";
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = "#0ea5e9";
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`[DEBUG] Gesture: ${gestureName}`, boxX + 12, boxY + 24);
  }

  ctx.restore();
}
