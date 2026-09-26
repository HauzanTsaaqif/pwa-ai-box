export interface FrameSlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameTemplate {
  id: string;
  formatId: "strip_2x6" | "double_4x6";
  name: string;
  tagline: string;
  frameSrc: string;
  width: number;
  height: number;
  slots: FrameSlot[];
  slotMapping?: number[]; // Custom mapping of photo pose index to slot
  defaultPoses: number;
  badge?: string;
  description: string;
  bgHex: string;
  textHex: string;
  accentHex: string;
  borderHex: string;
}

export type ThemeItem = FrameTemplate;

export interface FormatItem {
  id: "strip_2x6" | "double_4x6";
  name: string;
  ratio: string;
  dimensions: string;
  description: string;
  badge?: string;
  aspectPreview: string; // Tailwind aspect class for UI
}

export const FORMATS: FormatItem[] = [
  {
    id: "strip_2x6",
    name: "Classic Strip (2x6 Inch)",
    ratio: "2:6 Vertikal",
    dimensions: "600 × 1800 px (300 DPI)",
    description: "Format photobooth strip vertikal klasik terfavorit, pas untuk bookmark dan saku.",
    badge: "Terpopuler",
    aspectPreview: "aspect-[1/3]",
  },
  {
    id: "double_4x6",
    name: "Postcard / Double Strip (4x6 Inch)",
    ratio: "4:6 Studio",
    dimensions: "1200 × 1800 px (300 DPI)",
    description: "Format kartu foto studio 4x6 inch, mendukung kolase pesta dan strip ganda siap potong.",
    badge: "Studio Edition",
    aspectPreview: "aspect-[2/3]",
  },
];

export const FRAMES: FrameTemplate[] = [
  // ===== FRAMES UKURAN 2x6 INCH =====
  {
    id: "love_frame1",
    formatId: "strip_2x6",
    name: "Romantic Love (2x6)",
    tagline: "SWEET ROMANCE // LOVE EDITION",
    frameSrc: "/frames/love_frame1.png",
    width: 600,
    height: 1800,
    defaultPoses: 3,
    badge: "Favorit",
    description: "Bingkai 2x6 strip manis bernuansa cinta dengan 3 slot foto vertikal.",
    bgHex: "#ffe4e6",
    textHex: "#881337",
    accentHex: "#f43f5e",
    borderHex: "#fecdd3",
    slots: [
      { x: 74, y: 94, width: 456, height: 307 },
      { x: 91, y: 553, width: 418, height: 482 },
      { x: 82, y: 1173, width: 437, height: 276 },
    ],
  },
  {
    id: "loves_frame1",
    formatId: "strip_2x6",
    name: "Heart Loves (2x6)",
    tagline: "PURE HEART // DUO POSE",
    frameSrc: "/frames/loves_frame1.png",
    width: 600,
    height: 1800,
    defaultPoses: 2,
    badge: "2 Pose",
    description: "Bingkai 2x6 minimalis bernuansa hati dengan 2 slot foto proporsional.",
    bgHex: "#fff1f2",
    textHex: "#9f1239",
    accentHex: "#fb7185",
    borderHex: "#ffe4e6",
    slots: [
      { x: 123, y: 140, width: 354, height: 497 },
      { x: 121, y: 793, width: 358, height: 493 },
    ],
  },

  // ===== FRAMES UKURAN 4x6 INCH =====
  {
    id: "anniversary_frame2",
    formatId: "double_4x6",
    name: "Happy Anniversary (4x6)",
    tagline: "ANNIVERSARY CELEBRATION // SPECIAL DAY",
    frameSrc: "/frames/anniversary_frame2.png",
    width: 1200,
    height: 1800,
    defaultPoses: 3,
    badge: "Spesial",
    description: "Bingkai 4x6 perayaan romantis dengan 3 slot foto artistik asimetris.",
    bgHex: "#fdf2f8",
    textHex: "#831843",
    accentHex: "#ec4899",
    borderHex: "#fbcfe8",
    slots: [
      { x: 147, y: 207, width: 461, height: 460 },
      { x: 719, y: 703, width: 388, height: 520 },
      { x: 174, y: 1104, width: 345, height: 463 },
    ],
  },
  {
    id: "kado_frame2",
    formatId: "double_4x6",
    name: "Gift Party / Kado (4x6)",
    tagline: "BIRTHDAY GIFT // PARTY MOMENTS",
    frameSrc: "/frames/kado_frame2.png",
    width: 1200,
    height: 1800,
    defaultPoses: 4,
    badge: "Party 4 Pose",
    description: "Bingkai 4x6 tema kado dan pesta meriah dengan 4 slot foto kolase.",
    bgHex: "#eff6ff",
    textHex: "#1e3a8a",
    accentHex: "#3b82f6",
    borderHex: "#bfdbfe",
    slots: [
      { x: 155, y: 281, width: 446, height: 522 },
      { x: 651, y: 376, width: 352, height: 394 },
      { x: 153, y: 834, width: 568, height: 426 },
      { x: 735, y: 823, width: 408, height: 398 },
    ],
  },
  {
    id: "musik_frame2",
    formatId: "double_4x6",
    name: "Music Festival Double Strip (4x6)",
    tagline: "MUSIC BEAT // DOUBLE STRIP EDITION",
    frameSrc: "/frames/musik_frame2.png",
    width: 1200,
    height: 1800,
    defaultPoses: 4,
    badge: "Double Strip (8 Foto)",
    description: "Bingkai 4x6 ganda (2 strip berdampingan siap potong tengah jadi dua strip 2x6).",
    bgHex: "#0f172a",
    textHex: "#f8fafc",
    accentHex: "#38bdf8",
    borderHex: "#334155",
    slots: [
      // Kolom Kiri
      { x: 42, y: 86, width: 530, height: 305 },
      // Kolom Kanan
      { x: 628, y: 86, width: 530, height: 305 },
      // Baris 2 Kiri
      { x: 42, y: 441, width: 530, height: 305 },
      // Baris 2 Kanan
      { x: 628, y: 441, width: 530, height: 305 },
      // Baris 3 Kiri
      { x: 42, y: 795, width: 530, height: 305 },
      // Baris 3 Kanan
      { x: 628, y: 795, width: 530, height: 305 },
      // Baris 4 Kiri
      { x: 42, y: 1150, width: 530, height: 305 },
      // Baris 4 Kanan
      { x: 628, y: 1150, width: 530, height: 305 },
    ],
    // Pose 1 -> Slot 0 & 1, Pose 2 -> Slot 2 & 3, Pose 3 -> Slot 4 & 5, Pose 4 -> Slot 6 & 7
    slotMapping: [0, 0, 1, 1, 2, 2, 3, 3],
  },
];

export const THEMES = FRAMES;

/**
 * Composite photo URLs into the selected frame PNG.
 * 
 * Prinsip Kerja:
 * 1. Buat canvas seukuran frame asli (300 DPI).
 * 2. Gambar setiap foto pada slot transparannya dengan perhitungan cover (object-fit)
 *    ditambah sedikit bleed (2-3px) agar tidak ada celah garis putih di pinggir.
 * 3. Gambar Frame PNG transparan tepat di atas semua foto (Layer teratas).
 *    Bagian frame yang bermotif/solid otomatis menutupi pinggiran foto dengan rapi,
 *    sedangkan lubang transparan menampilkan foto di bawahnya secara presisi!
 */
export async function compositePhotosIntoFrame(
  photoUrls: string[],
  frame: FrameTemplate
): Promise<string> {
  return new Promise((resolve) => {
    if (!photoUrls || photoUrls.length === 0) {
      resolve("");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve("");
      return;
    }

    const frameImg = new Image();
    frameImg.crossOrigin = "anonymous";

    const loadedImgs: HTMLImageElement[] = [];
    let loadedCount = 0;
    let frameLoaded = false;

    const render = () => {
      if (!frameLoaded || loadedCount !== photoUrls.length) return;

      // 1. Bersihkan canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background dasar (jika ada bagian foto yang transparan)
      ctx.fillStyle = frame.bgHex || "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Helper function gambar foto pas ke slot dengan object-fit: cover dan bleed
      const drawCover = (
        img: HTMLImageElement,
        slot: FrameSlot,
        bleed = 3
      ) => {
        const bx = Math.max(0, slot.x - bleed);
        const by = Math.max(0, slot.y - bleed);
        const bw = slot.width + bleed * 2;
        const bh = slot.height + bleed * 2;

        const imgRatio = img.width / img.height;
        const slotRatio = bw / bh;

        let sx = 0;
        let sy = 0;
        let sWidth = img.width;
        let sHeight = img.height;

        if (imgRatio > slotRatio) {
          sWidth = img.height * slotRatio;
          sx = (img.width - sWidth) / 2;
        } else {
          sHeight = img.width / slotRatio;
          sy = (img.height - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, bx, by, bw, bh);
      };

      // 2. Gambar setiap foto ke slot masing-masing (Layer Bawah)
      const slots = frame.slots;
      slots.forEach((slot, slotIdx) => {
        let photoIndex = slotIdx % loadedImgs.length;
        if (frame.slotMapping && frame.slotMapping[slotIdx] !== undefined) {
          photoIndex = frame.slotMapping[slotIdx] % loadedImgs.length;
        }
        const photoImg = loadedImgs[photoIndex];
        if (photoImg) {
          drawCover(photoImg, slot);
        }
      });

      // 3. Gambar Frame PNG di layer paling atas (Layer Atas)
      ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

      // Selesai: export ke base64 JPEG resolusi studio
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };

    frameImg.onload = () => {
      frameLoaded = true;
      render();
    };
    frameImg.onerror = () => {
      console.error("Gagal memuat file frame:", frame.frameSrc);
      frameLoaded = true;
      render();
    };
    frameImg.src = frame.frameSrc;

    photoUrls.forEach((url, i) => {
      const pImg = new Image();
      pImg.crossOrigin = "anonymous";
      pImg.onload = () => {
        loadedImgs[i] = pImg;
        loadedCount++;
        render();
      };
      pImg.onerror = () => {
        console.error("Gagal memuat foto ke-", i + 1);
        loadedCount++;
        render();
      };
      pImg.src = url;
    });
  });
}
