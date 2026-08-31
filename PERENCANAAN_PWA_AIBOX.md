# 📋 Perencanaan Komprehensif: PWA AI Photobox

> **Versi:** 1.0.0  
> **Tanggal:** 29 Agustus 2026  
> **Project:** pwa-aibox — AI-Powered Photobox PWA dengan MediaPipe Hand Gesture  
> **Framework:** Next.js 16 + React 19 + TypeScript + Tailwind CSS v4  
> **Database:** Firebase Firestore  
> **Storage:** Firebase Cloud Storage + Google Drive API (hybrid)

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Arsitektur Sistem](#2-arsitektur-sistem)
3. [Tech Stack Final](#3-tech-stack-final)
4. [Desain Sistem & Color Palette](#4-desain-sistem--color-palette)
5. [Struktur Project](#5-struktur-project)
6. [Alur Aplikasi Detail](#6-alur-aplikasi-detail)
7. [Strategi PWA & Caching](#7-strategi-pwa--caching)
8. [Strategi Performa MediaPipe](#8-strategi-performa-mediapipe)
9. [Integrasi Payment Gateway (QRIS)](#9-integrasi-payment-gateway-qris)
10. [Integrasi Firebase Firestore](#10-integrasi-firebase-firestore)
11. [Sistem Pengiriman Foto](#11-sistem-pengiriman-foto)
12. [Rencana Pengembangan Bertahap](#12-rencana-pengembangan-bertahap)
13. [Keamanan & Admin](#13-keamanan--admin)
14. [Checklist Persiapan Non-Teknis](#14-checklist-persiapan-non-teknis)

---

## 1. Ringkasan Eksekutif

**PWA AI Photobox** adalah aplikasi photobox interaktif berbasis Progressive Web App (PWA) yang ditenagai oleh AI Computer Vision (MediaPipe Hand Gesture) untuk mendeteksi gestur tangan sebagai trigger utama. Seluruh pemrosesan AI dilakukan secara **client-side (Edge Computing)** menggunakan WebAssembly & WebGL, sehingga:

- ✅ **Zero server compute cost** — tidak perlu GPU server untuk inferensi AI
- ✅ **Ultra-low latency** — deteksi gestur real-time tanpa round-trip ke server
- ✅ **Offline-capable** — setelah caching awal, aplikasi berjalan mandiri
- ✅ **Plug-and-play** — cukup buka URL HTTPS, tanpa instalasi

### Target Perangkat
- iPad (generasi terbaru) — target utama
- Laptop/PC Windows & Mac dengan webcam
- Android tablet dengan browser Chromium modern

---

## 2. Arsitektur Sistem

### 2.1 Diagram Arsitektur High-Level

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT DEVICE (Browser)                    │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Next.js PWA │  │  MediaPipe   │  │  Canvas/Konva.js         │ │
│  │  (React 19)  │  │  Hand Track  │  │  Image Compositing       │ │
│  │  Tailwind v4 │  │  (WASM/WebGL)│  │  (Frame + Photo + WM)    │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘ │
│         │                 │                       │                │
│         │    ┌────────────┴───────────┐           │                │
│         │    │  Gesture Detection     │           │                │
│         │    │  • Wave (start)        │           │                │
│         │    │  • Open palm (select)  │           │                │
│         │    │  • Fist (confirm)      │           │                │
│         │    │  • Peace (next/prev)   │           │                │
│         │    └────────────────────────┘           │                │
│         │                                         │                │
│  ┌──────┴─────────────────────────────────────────┴──────────┐   │
│  │  Service Worker (PWA Cache)                                │   │
│  │  • Cache-first untuk assets statis                        │   │
│  │  • Network-first untuk API calls                          │   │
│  │  • Pre-cache halaman idle & core flow                     │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (only when needed)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        CLOUD SERVICES                             │
│                                                                   │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ Vercel/Netlify │  │ Firebase Firestore│  │ Firebase Storage │  │
│  │ (Static Host)  │  │ (User/Package/    │  │ (Photo Results)  │  │
│  │ CDN for Assets │  │  Payment/Photo    │  │ + Google Drive   │  │
│  │                │  │  Session Data)    │  │ (Backup Mirror)  │  │
│  └────────────────┘  └──────────────────┘  └────────┬────────┘  │
│                                                     │            │
│  ┌────────────────┐  ┌──────────────────┐           │            │
│  │ Payment Gateway│  │ Email Service    │◄──────────┘            │
│  │ (Tripay/Midtrans│  │ (Resend/SendGrid │                        │
│  │  QRIS)         │  │  untuk kirim link│                        │
│  └────────────────┘  └──────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Prinsip Arsitektur

| Prinsip | Implementasi |
|---------|-------------|
| **Client-Side AI** | MediaPipe Hand Landmarker via WASM/WebGL, inferensi 100% di browser |
| **Offline-First** | Service Worker cache seluruh core flow (idle → photoshoot → result) |
| **Serverless Backend** | Next.js API Routes untuk operasi ringan (verify payment, send email) |
| **Stateless Client** | State disimpan di Firestore, client hanya cache session token |
| **Progressive Enhancement** | Fitur dasar jalan tanpa internet, fitur lanjutan (payment, email) perlu koneksi |

---

## 3. Tech Stack Final

### 3.1 Core Dependencies

| Kategori | Teknologi | Versi | Alasan |
|----------|-----------|-------|--------|
| **Framework** | Next.js (App Router) | 16.3+ | API Routes built-in, SSR/SSG hybrid, PWA ready |
| **UI Library** | React | 19.2+ | Concurrent rendering, server components |
| **Styling** | Tailwind CSS | v4 | Utility-first, JIT, zero-runtime CSS |
| **AI Vision** | `@mediapipe/tasks-vision` | 1.0.1 | Hand landmark detection, WASM + WebGL |
| **Canvas** | Konva.js + React-Konva | 10.3+ / 19.2+ | Layer-based canvas, image compositing, frame overlay |
| **3D (opsional)** | Three.js | 0.185+ | Background effects, particle animations |
| **PWA** | `next-pwa` / `@serwist/next` | latest | Service Worker generation, precaching |
| **Animations** | Framer Motion | 11+ | Declarative animations, gesture-based |
| **Icons** | Lucide React | latest | Lightweight, tree-shakeable icons |
| **Font** | Google Fonts (Poppins + Inter) | — | Clean, modern, rounded (lihat §4) |

### 3.2 Backend & Cloud

| Kategori | Teknologi | Alasan |
|----------|-----------|--------|
| **Database** | Firebase Firestore | NoSQL, real-time, free tier generous, sudah ada service account |
| **Storage Foto** | Firebase Cloud Storage | Sudah satu ekosistem dengan Firestore, 5GB free |
| **Storage Backup** | Google Drive API | Free 15GB, auto-upload via service account, shareable link |
| **Email Service** | Resend | 100 email/hari gratis, React Email template, modern DX |
| **Payment Gateway** | Tripay (QRIS) | Biaya rendah, support QRIS, webhook callback |
| **Hosting** | Vercel (Hobby) | Free, auto-deploy dari Git, Edge Network, HTTPS |

### 3.3 Dev Tools

| Kategori | Teknologi |
|----------|-----------|
| **Linting** | ESLint 9 + `eslint-config-next` |
| **Formatting** | Prettier |
| **Type Checking** | TypeScript 5 (strict mode) |
| **Git Hooks** | Husky + lint-staged |

---

## 4. Desain Sistem & Color Palette

### 4.1 Color Palette (Neon Blue × Vivid Purple — Dark Mode)

Mengusung tema **dark mode** dengan kontras tinggi agar kamera dan efek neon/geometri terlihat menyala. Warna primary **Neon Blue** memberikan kesan futuristik dan bersih, sementara aksen **Vivid Purple** menambahkan sentuhan dekoratif yang elegan.

```
┌─────────────────────────────────────────────────────────┐
│  COLOR SYSTEM — "AI Box Photobox"                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  PRIMARY & ACCENT                                       │
│  ┌──────────┐  ┌──────────┐                             │
│  │ #38BDF8  │  │ #8B5CF6  │                             │
│  │ Neon Blue│  │ Vivid    │                             │
│  │ Primary  │  │ Purple   │                             │
│  │          │  │ Accent   │                             │
│  └──────────┘  └──────────┘                             │
│                                                         │
│  BACKGROUND & TEXT                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ #0F172A  │  │ #1E293B  │  │ #F8FAFC  │              │
│  │ Slate 900│  │ Slate 800│  │ Slate 50 │              │
│  │ Dark BG  │  │ Card BG  │  │ Text     │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│  SEMANTIC                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ #10B981  │  │ #EF4444  │  │ #F59E0B  │              │
│  │ Emerald  │  │ Red 500  │  │ Amber    │              │
│  │ Success  │  │ Error    │  │ Warning  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│  GLASS MORPHISM                                         │
│  ┌────────────────────────────────────┐                 │
│  │ bg: rgba(15, 23, 42, 0.6)         │                 │
│  │ backdrop-filter: blur(20px)        │                 │
│  │ border: rgba(56, 189, 248, 0.15)   │                 │
│  └────────────────────────────────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Tailwind Config (Theme Extension)

```typescript
// tailwind.config.ts (jika menggunakan v4, via CSS @theme)
colors: {
  // Primary — Neon Blue
  'primary': '#38BDF8',
  'primary-light': '#7DD3FC',
  'primary-dark': '#0284C7',

  // Accent — Vivid Purple
  'accent': '#8B5CF6',
  'accent-light': '#A78BFA',
  'accent-dark': '#7C3AED',

  // Dark theme (Slate-based)
  'dark': '#0F172A',
  'dark-card': '#1E293B',
  'dark-glass': 'rgba(15, 23, 42, 0.6)',

  // Light / Text
  'light': '#F8FAFC',
  'light-muted': '#94A3B8',

  // Semantic
  'success': '#10B981',
  'error': '#EF4444',
  'warning': '#F59E0B',
}
```

### 4.3 Tipografi

| Penggunaan | Font | Weight | Style |
|-----------|------|--------|-------|
| **Heading (H1-H3)** | Poppins | 600-800 | Bold, rounded, modern |
| **Body Text** | Inter | 400-500 | Clean, highly readable |
| **Code/Mono** | JetBrains Mono | 400 | Untuk debug info, FPS counter |
| **Display/Logo** | Poppins | 700-800 | Untuk branding "AI Box" |

```css
/* Font import via next/font */
import { Poppins, Inter, JetBrains_Mono } from 'next/font/google';

const poppins = Poppins({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins' 
});

const inter = Inter({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter' 
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono'
});
```

### 4.4 Design System Principles

**Gabungan dari 2 Style Sample:**

| Elemen | Style A (Clean Minimalis) | Style B (Dark Dashboard) | **Gabungan Final** |
|--------|--------------------------|--------------------------|---------------------|
| Background | Putih/Abu terang | Hitam pekat | **Dark Slate (#0F172A → #1E293B)** |
| Cards | Putih rounded | Kartu gelap kontras | **Glass morphism cards (blur + semi-transparent)** |
| Aksen | Biru terang | Oranye terang | **Neon Blue (#38BDF8) + Vivid Purple (#8B5CF6)** |
| Tombol | Rounded corners | Solid color | **Rounded-full + Neon Blue bg + glow effect** |
| Sidebar | — | Hitam sidebar | **Bottom sheet / floating nav (mobile-first)** |
| Camera Feed | — | Live feed multi-size | **Full-screen overlay + rounded PIP** |
| Sudut | Rounded (12-16px) | Sharp | **Rounded (12-24px) — modern & friendly** |

### 4.5 Komponen UI Kunci

```
┌─────────────────────────────────────────────────────────┐
│  KOMPONEN DESIGN SYSTEM                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  BUTTON                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │  [ Primary Gradient ]│  │  [ Glass Outline    ]│     │
│  │  bg-gradient + glow  │  │  border + blur bg   │     │
│  │  rounded-full        │  │  rounded-xl         │     │
│  └──────────────────────┘  └──────────────────────┘     │
│                                                         │
│  CARD                                                    │
│  ┌────────────────────────────────────┐                 │
│  │  glass bg + backdrop-blur-xl       │                 │
│  │  border: primary/15                │                 │
│  │  rounded-2xl                       │                 │
│  │  shadow-lg shadow-primary/10       │                 │
│  └────────────────────────────────────┘                 │
│                                                         │
│  MODAL / POPUP                                           │
│  ┌────────────────────────────────────┐                 │
│  │  Overlay: bg-dark/80 + blur-sm     │                 │
│  │  Content: glass card + animate-in  │                 │
│  │  Animasi: scale(0.95→1) + fade     │                 │
│  └────────────────────────────────────┘                 │
│                                                         │
│  CAMERA PREVIEW                                          │
│  ┌────────────────────────────────────┐                 │
│  │  Full screen video                 │                 │
│  │  Overlay: gradient-dark (top+bot)  │                 │
│  │  Watermark: logo-rounded (bottom)  │                 │
│  │  opacity: 30%                      │                 │
│  └────────────────────────────────────┘                 │
│                                                         │
│  GESTURE INDICATOR (HUD)                                 │
│  ┌────────────────────────────────────┐                 │
│  │  Floating hand icon + pulse ring   │                 │
│  │  Text: "Lambaikan tangan 👋"       │                 │
│  │  Animasi: bounce + glow pulse      │                 │
│  └────────────────────────────────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 5