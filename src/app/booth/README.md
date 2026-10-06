# Booth (`/booth`)

Halaman photobooth kiosk dikontrol dengan gestur tangan (MediaPipe). Alur: Step 1 → 14.

```
booth/
├─ page.tsx                      Titik masuk: useBooth() + susunan tampilan
├─ constants.ts                  Tipe BoothStep / PackageItem, konstanta env, PACKAGES
│
├─ hooks/                        LOGIKA — dipanggil berurutan oleh useBooth.ts
│  ├─ useBooth.ts                Menggabungkan semua hook di bawah → BoothController
│  ├─ useBoothState.ts        1  State & ref (kamera, step, pilihan, kursor, timer, input)
│  ├─ useBoothServices.ts     2  Intro welcome, snapshot, film strip, upload Drive, kirim email
│  ├─ useBoothCamera.ts       3  Kamera + MediaPipe, loop deteksi gestur per step
│  ├─ useBoothGestures.ts     4  Kursor 60 FPS, tutorial, dwell-click, pilih paket/format/tema
│  ├─ useBoothFlow.ts         5  Timer, jepret, review, processing, auto-reset, admin
│  └─ useBoothVoiceEmail.ts   6  Step 12: email dengan suara (kepal → bicara → jempol)
│
├─ components/                   TAMPILAN
│  ├─ BoothOverlays.tsx          Feed kamera, kanvas tangan, flash, HUD gestur, kursor
│  ├─ AdminDialog.tsx            Dialog admin tersembunyi (5 ketukan di pojok kanan atas)
│  ├─ GestureIcon.tsx            Gestur → ikon Phosphor (pengganti emoji)
│  ├─ steps/                     Satu file per step, berurutan: index.tsx → Step01 … Step14
│  └─ voice/                     Overlay mic & indikator jempol untuk Step 12
│
└─ utils/formatSpokenEmail.ts    "budi satu dua at gmail dot com" → budi12@gmail.com
```

Alur data: `page.tsx → useBooth() → booth (BoothController)` lalu tiap komponen
mengambil yang dibutuhkan lewat `const { … } = booth`.

## Step 12 — email dengan suara
1. Step dimulai: MediaPipe aktif. **Kepal tangan** → layar menghitam, mic muncul dan bereaksi pada suara.
2. **Tangan tidak mengepal selama 0,3 detik** → rekaman berhenti, suara dikonversi ke teks dan **menggantikan** isi input email.
3. **Jempol atas** ditahan 3 detik → kirim email & lanjut Step 13. **Jempol bawah** ditahan 3 detik → rekam ulang (kembali ke langkah 1).
Konstanta waktu: `VOICE_RELEASE_MS` dan `VOICE_CONFIRM_MS` di `hooks/useBoothVoiceEmail.ts`.

Ikon memakai [Phosphor Icons](https://phosphoricons.com) (MIT) untuk gestur dan Lucide untuk ikon umum — keduanya gratis untuk penggunaan komersial.
