# 📋 PERENCANAAN LENGKAP: PWA AI BOX PHOTOBOOTH
> **Versi:** 2.0.0  
> **Tanggal:** 30 Agustus 2026  
> **Status:** Final & Siap Dikembangkan  
> **Framework:** Next.js 16 App Router + React 19 + TypeScript + Tailwind CSS v4

---

## 🎯 INTISARI KONSEP UTAMA
Sistem **Photobooth AI 100% Client-Side PWA** dengan:
- ✅ Semua pemrosesan AI & gambar berjalan di browser pengguna (Edge Computing)
- ✅ Zero server compute cost — hanya hosting statis + Firestore
- ✅ Offline-first setelah caching awal
- ✅ Kontrol penuh menggunakan Hand Gesture MediaPipe (tanpa sentuh layar)
- ✅ Optimasi performa ekstrem untuk penggunaan 24/7 di perangkat kiosk

---

## 🏗️ ARSITEKTUR SISTEM FINAL

### Stack Teknologi Terpilih
| Kategori | Teknologi | Alasan |
|---|---|---|
| **Frontend** | Next.js 16 App Router | API Routes built-in, PWA ready, Edge Runtime |
| **AI Vision** | `@mediapipe/tasks-vision@1.0.1` | Hand Landmark Detection WASM/WebGL |
| **Canvas** | Konva.js + React-Konva | Compositing gambar 300DPI, layer management |
| **Styling** | Tailwind CSS v4 | Zero runtime, performa maksimal |
| **Animasi** | Framer Motion 11 | Deklaratif, smooth 60fps |
| **Database** | Firebase Firestore | Real-time, free tier murah |
| **Storage Foto** | Google Drive API | ✅ **GRATIS 15GB**, auto share link, tidak ada batasan bandwidth |
| **Email** | Resend | 100 email/hari GRATIS |
| **Payment** | Tripay QRIS | Biaya terendah 0.7% + Rp 100 net, KYC perorangan cepat, webhook SHA256 real-time |
| **PWA** | `@serwist/next` | Service Worker modern, precaching optimal |
| **Hosting** | Vercel Hobby | GRATIS, Edge CDN, HTTPS otomatis |

> ✅ **Rekomendasi Storage:** Google Drive adalah pilihan TERBAIK saat ini. Tidak ada biaya storage, tidak ada biaya bandwidth download, link permanen, dan bisa diakses publik. Jauh lebih murah dan efektif dibanding Firebase Storage / S3.

---

## 🏗️ HASIL RISET & KOMPARASI PAYMENT GATEWAY (TRIPAY vs MIDTRANS vs XENDIT)

Berdasarkan studi kelayakan bisnis & teknis (tersimpan dalam dokumen PDF `LAPORAN_KOMPARASI_PAYMENT_GATEWAY_AIBOX.pdf`):

### Ringkasan Perbandingan
1. **TRIPAY (Pemenang Terpilih - 9.5/10):**
   - **MDR QRIS:** 0.7% + Rp 100 flat (Net). Penarikan dana (Disbursal) Rp 5.000 flat.
   - **Alasan:** Registrasi perorangan/UMKM sangat cepat (1x24 jam), API REST paling ringan tanpa JS SDK eksternal, Webhook HMAC SHA256 cepat & stabil.
2. **MIDTRANS (Sekunder - 8.8/10):**
   - **MDR QRIS:** 0.7% + PPN 11% (~0.777%). Disbursal Rp 5.000 flat.
   - **Alasan:** Reputasi GoTo Group tinggi, namun verifikasi akun bisnis/NPWP lebih ketat.
3. **XENDIT (Skala Enterprise Franchise - 8.5/10):**
   - **MDR QRIS:** 0.7% + PPN 11% (~0.777%). Fitur XenPlatform split payment.
   - **Alasan:** Sangat bagus jika di masa depan AI Box Photobooth membuka 50+ jaringan franchise waralaba.

---

## 🔧 LANGKAH PERSIAPAN INTEGRASI

### 1. Payment Gateway Tripay
✅ **Yang perlu disiapkan:**
- Daftar akun Tripay di https://tripay.co.id
- Verifikasi KTP & Rekening (proses 1x24 jam)
- Ambil Merchant Code, API Key, dan Private Key dari Sandbox/Production Dashboard
- Daftarkan Webhook Callback URL ke endpoint `/api/payment/webhook`
- Minimal deposit Rp 100.000 untuk testing transaksi real

> 💡 Biaya transaksi QRIS Tripay adalah **0.7% + Rp 100** net per transaksi. Ini adalah solusi paling hemat & efisien untuk kiosk PWA photobooth.

### 2. Google Drive API
✅ **Yang perlu disiapkan:**
- Buat Project di Google Cloud Console
- Aktifkan Google Drive API
- Buat Service Account dan download JSON key
- Buat folder di Google Drive pribadi
- Share folder tersebut ke email service account dengan akses Editor
- Semua foto akan otomatis terupload ke folder ini

### 3. Firebase Firestore
✅ **Yang perlu disiapkan:**
- Gunakan project yang sudah ada: `esp32-smartdoor`
- Buat collection: `admin`, `packages`, `transactions`, `sessions`
- Atur security rules agar hanya admin yang bisa menulis
- Aktifkan Anonymous Authentication

---

## 📧 HASIL INTEGRASI GOOGLE DRIVE & SMTP EMAIL (FIXED & TESTED)

1. **Pembuat Subfolder Otomatis Google Drive:**
   - Format penamaan: `idcustomer_randomkey(4)_tanggal/bulan/tahun` (contoh: `LAPLACE_ZERO_24za_06-09-2026`).
   - Hak akses diatur secara otomatis ke **PUBLIC (Anyone with link)** dan **Explicit Reader Permission** untuk email target (`laplacezero1@gmail.com`), sehingga link dan QR code dapat diakses 100% tanpa meminta izin atau login terhalang (*Fixed Private Link Issue*).
2. **Integrasi SMTP Email & Desain HTML Responsive:**
   - Email dikirim melalui Nodemailer SMTP (`lookback43210@gmail.com`).
   - Desain HTML modern responsif mengadopsi tema `@public/logo-splash.png` (Sky Blue `#0EA5E9`, Ocean Blue `#1E40AF`, Dark Slate `#0F172A`).
   - Lampiran CID otomatis: Logo Splash (`cid:aiboxlogo`), QR Code Google Drive (`cid:qrcodegdrive`), dan Hasil Foto Strip HD (`cid:photostrip`) langsung tampil di dalam body email (*Fixed Missing Image Issue*).
   - Pengujian sukses terkirim ke `laplacezero1@gmail.com` dengan Message ID: `<2f858691-c8a3-1169-8eb5-2bf99296e116@gmail.com>`.

---

## 📅 ROADMAP PENGEMBANGAN BERTAHAP

| Tahap | Durasi | Fitur |
|---|---|---|
| **1** | 1 Hari | Inisialisasi project Next.js, setup Tailwind, PWA |
| **2** | 2 Hari | Integrasi MediaPipe Hand Tracking, halaman idle |
| **3** | 1 Hari | Login admin, Firestore integration |
| **4** | 2 Hari | Sesi photoshoot, canvas compositing |
| **5** | 2 Hari | Payment Gateway Tripay QRIS |
| **6** | 1 Hari | Google Drive upload + SMTP Email (Selesai & Tested ✅) |
| **7** | 1 Hari | Animasi, polishing UI, optimasi performa |
| **Total** | **10 Hari** | ✅ Semua fitur selesai |

---

## ✅ CHECKLIST FINAL
- [x] Pembuatan folder Google Drive otomatis format `idcustomer_randomkey(4)_tanggal/bulan/tahun`
- [x] Upload foto & penentuan izin publik (anyone reader)
- [x] Pengiriman email SMTP dengan desain HTML responsive tema AI Box
- [x] Pengiriman QR Code & link folder ke target email (`laplacezero1@gmail.com`)
- [x] Pengujian end-to-end sistem berhasil 100%

---

> 📌 Dokumen ini adalah panduan utama pengembangan. Semua keputusan teknis sudah dioptimalkan untuk biaya terendah, performa tertinggi, dan pengalaman pengguna terbaik.
