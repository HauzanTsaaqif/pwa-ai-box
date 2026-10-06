import { Download } from "lucide-react";
import Logo from "@/components/Logo";

// ===== CONSTANTS & ENVIRONMENT CONTROLS =====
export const HIDDEN_TAP_THRESHOLD = 5;
export const HIDDEN_TAP_TIMEOUT = 3000;
export const IDLE_FPS = 10;
export const ACTIVE_FPS = 20; // 20 FPS detection + 60 FPS lerp ensures video feed never stutters
export const IS_DEBUG = process.env.NEXT_PUBLIC_DEBUG_MODE === "true";
export const ENABLE_PAYMENT = process.env.NEXT_PUBLIC_ENABLE_PAYMENT !== "false";
export const FREE_MODE_POSES = parseInt(process.env.NEXT_PUBLIC_FREE_MODE_POSES || "4", 10);

// ===== BOOTH STEPS =====
export type BoothStep =
  | "welcome_intro"        // Solid 5s welcome screen
  | "gesture_tutorial"     // Interactive hand movement practice screen (To-the-point)
  | "select_package"       // Pilih Paket
  | "select_format"        // Pilih Ukuran / Format
  | "select_theme"         // Pilih Tema / Template
  | "payment_qris"         // Bayar QRIS
  | "pose_ready"           // Pose Ready (Standby - butuh gesture Peace untuk trigger)
  | "countdown"            // Hitung Mundur 5 Detik & Jepret
  | "photo_review_single"  // Review Foto Per Jepretan (Bisa Foto Ulang Foto Ini atau Lanjut)
  | "preview_retake"       // Preview Lengkap Seluruh Strip
  | "processing"           // Processing 300 DPI
  | "print_session"        // Konfirmasi Cetak
  | "upload_digital"       // Upload Digital (Email + Drive)
  | "qr_download"          // QR Download Softcopy
  | "thank_you";           // Terima Kasih & Reset Otomatis

// ===== DATA DEFINITIONS =====
export interface PackageItem {
  id: string;
  name: string;
  price: string;
  rawPrice: number;
  poses: number;
  badge?: string;
  description: string;
  features: string[];
}

export const PACKAGES: PackageItem[] = [
  {
    id: "basic",
    name: "Basic Strip",
    price: "Rp 25.000",
    rawPrice: 25000,
    poses: 3,
    description: "Sesi foto esensial untuk 1-2 orang",
    features: ["3 Pose Foto HD", "Digital Download QR", "Lighting Studio Presisi"],
  },
  {
    id: "popular",
    name: "Popular AI",
    price: "Rp 35.000",
    rawPrice: 35000,
    poses: 4,
    badge: "Paling Laris",
    description: "Favorit pengunjung dengan 4 pose lengkap",
    features: ["4 Pose Foto HD", "Semua Tema Estetik", "Kirim Email + Download QR"],
  },
  {
    id: "vip",
    name: "VIP Unlimited",
    price: "Rp 50.000",
    rawPrice: 50000,
    poses: 6,
    badge: "VIP Studio",
    description: "Keseruan maksimal untuk grup & party",
    features: ["6 Pose Multi-Frame", "Kustom Frame & Logo", "Softcopy HD + Print Siap"],
  },
];
