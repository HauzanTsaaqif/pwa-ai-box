import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageBase64, prompt, style = "ghibli", useDemo = false } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "Gambar input wajib diunggah." },
        { status: 400 }
      );
    }

    // Jika pengguna meminta Mode Simulasi / Demo
    if (useDemo) {
      return NextResponse.json({
        success: true,
        isDemo: true,
        outputImageUrl: "/sample/strip.png",
        promptUsed: prompt || "Simulasi Studio Ghibli Anime",
        style,
        executionTimeMs: 1200,
        message: "Mode Simulasi Ghibli AI Aktif (Gunakan API Key asli untuk hasil real-time Fal.ai)",
      });
    }

    const falKey = process.env.FAL_KEY?.trim();

    if (!falKey || falKey === "your_fal_ai_api_key_here") {
      return NextResponse.json(
        {
          success: false,
          isConfigured: false,
          error: "FAL_KEY belum dikonfigurasi di file .env.local.",
          instructions:
            "Silakan buat API Key di https://fal.ai (Dashboard > Keys) lalu salin ke .env.local sebagai FAL_KEY. Atau aktifkan Mode Simulasi Demo.",
        },
        { status: 400 }
      );
    }

    // Tentukan prompt default berdasarkan style yang dipilih
    let finalPrompt = prompt || "Studio Ghibli style anime portrait, vibrant pastel watercolor, Hayao Miyazaki aesthetic, beautiful lighting, 8k resolution";
    if (style === "cyberpunk") {
      finalPrompt = "Cyberpunk style portrait, neon glowing lights, futuristic city background, highly detailed 8k";
    } else if (style === "pixar") {
      finalPrompt = "Pixar 3D animated character portrait, Disney Pixar style, soft subsurface scattering, cute expression";
    } else if (style === "retro90s") {
      finalPrompt = "90s retro anime style, Sailor Moon aesthetic, vintage hand drawn cel shading, nostalgic VHS texture";
    }

    // Siapkan data URI gambar
    let formattedImage = imageBase64;
    if (!formattedImage.startsWith("data:image")) {
      formattedImage = `data:image/jpeg;base64,${formattedImage}`;
    }

    // Panggil REST API Fal.ai (Fast SDXL Image-to-Image / Flux)
    const falEndpoint = "https://fal.run/fal-ai/fast-sdxl/image-to-image";

    const response = await fetch(falEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: formattedImage,
        prompt: finalPrompt,
        strength: 0.65,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        sync_mode: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fal.ai API Error Response:", errorText);

      // Deteksi khusus jika akun terkunci karena butuh TOP_UP
      if (response.status === 403 && errorText.includes("TOP_UP")) {
        return NextResponse.json(
          {
            success: false,
            isLocked: true,
            error: "Akun Fal.ai Terkunci (Reason: TOP_UP).",
            instructions:
              "Fal.ai mewajibkan minimal top-up saldo $1 - $5 pada Billing Dashboard (https://fal.ai/dashboard/billing) untuk membuka kuncian API Key. Atau, klik tombol 'Gunakan Mode Simulasi Demo' di bawah untuk tetap mencoba seluruh alur photobooth hingga upload Google Drive secara gratis.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Fal.ai Error (${response.status}): ${errorText || "Gagal menghasilkan gambar."}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Ekstraksi URL gambar hasil generasi
    let outputImageUrl = "";
    if (data.images && data.images.length > 0) {
      outputImageUrl = data.images[0].url;
    } else if (data.image && data.image.url) {
      outputImageUrl = data.image.url;
    }

    if (!outputImageUrl) {
      return NextResponse.json(
        { success: false, error: "Tidak menerima URL gambar dari Fal.ai API." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      outputImageUrl,
      promptUsed: finalPrompt,
      style,
      executionTimeMs: data.timings?.inference || 2500,
    });
  } catch (error: any) {
    console.error("Fal.ai Generation Route Exception:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Terjadi kesalahan internal saat generasi gambar.",
      },
      { status: 500 }
    );
  }
}

