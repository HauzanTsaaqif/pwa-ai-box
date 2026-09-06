import { NextResponse } from "next/server";
import { sendPhotoboothEmail } from "@/lib/email-service";
import path from "path";
import fs from "fs";

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

    if (!toEmail) {
      return NextResponse.json(
        { success: false, error: "Tujuan email (toEmail) wajib diisi" },
        { status: 400 }
      );
    }

    let photoBuffer: Buffer | undefined = undefined;
    if (imageBase64 && imageBase64.length > 50) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      photoBuffer = Buffer.from(base64Data, "base64");
    } else {
      const logoPath = path.join(process.cwd(), "assets", "logo", "logo-rounded.png");
      if (fs.existsSync(logoPath)) {
        photoBuffer = fs.readFileSync(logoPath);
      }
    }

    const finalFolderUrl = folderUrl || publicPhotoUrl || "https://drive.google.com/drive/folders/1IrNwnqXQjo4fG2InPIAWZMgE7n8dmj0K";
    const finalPhotoUrl = publicPhotoUrl || finalFolderUrl;

    const result = await sendPhotoboothEmail({
      toEmail,
      userName: userName || "Pengunjung AI Box",
      publicPhotoUrl: finalPhotoUrl,
      folderUrl: finalFolderUrl,
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
