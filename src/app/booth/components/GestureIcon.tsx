import {
  Hand,
  HandFist,
  HandPalm,
  HandPeace,
  HandPointing,
  HandWaving,
  ThumbsDown,
  ThumbsUp,
  type Icon,
} from "@phosphor-icons/react";
import type { GestureType } from "@/lib/mediapipe";

/** Gestur MediaPipe → ikon Phosphor (menggantikan emoji agar tampil konsisten di semua perangkat). */
const GESTURE_ICONS: Record<GestureType, Icon> = {
  none: Hand,
  wave: HandWaving,
  open_palm: HandPalm,
  fist: HandFist,
  peace: HandPeace,
  pointing: HandPointing,
  thumbs_up: ThumbsUp,
  thumbs_down: ThumbsDown,
};

interface GestureIconProps {
  gesture: GestureType;
  className?: string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
}

export default function GestureIcon({ gesture, className = "w-4 h-4", weight = "fill" }: GestureIconProps) {
  const IconComponent = GESTURE_ICONS[gesture];
  return <IconComponent weight={weight} className={className} aria-hidden="true" />;
}
