import { NextResponse } from "next/server";
import { sendPhotoboothEmail } from "@/lib/email-service";

export async function POST(req: Request) {
  try {
    const {
      toEmail,
      userName,
      publicPhotoUrl,
      folderUrl,
      folderName,
      imageBase64,
    } = await req.json();

    if (!toEmail || !publicPhotoUrl) {
      return NextResponse.json(
        { success: false, error: "Tujuan email (toEmail) dan publicPhotoUrl wajib diisi" },
        { status: 400 }
      );
    }

    let photoBuffer: Buffer | undefined = undefined;
    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      photoBuffer = Buffer.from(base64Data, "base64");
    }

    const result = await sendPhotoboothEmail({
      toEmail,
      userName: userName || "Pengunjung AI Box",
      publicPhotoUrl,
      folderUrl: folderUrl || publicPhotoUrl,
      folderName: folderName || "AIBox_Photos",
      photoBuffer,
    });

    return NextResponse.json({
      success: true,
      message: "Email berhasil dikirim via SMTP",
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error("API Send Email Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mengirim email" },
      { status: 500 }
    );
  }
}
