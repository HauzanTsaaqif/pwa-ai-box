import { NextResponse } from "next/server";
import { google } from "googleapis";
import path from "path";
import fs from "fs";
import { Readable } from "stream";

// Inisialisasi Auth Google API (Mendukung OAuth2 User Token & Service Account)
function getDriveInstance() {
  if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    return google.drive({ version: "v3", auth: oauth2Client });
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

/**
 * Format nama folder: idcustomer_randomkey(4)_tanggal/bulan/tahun
 * Contoh: CUST1024_a8x9_06-09-2026
 */
function generateFolderName(customerId?: string): string {
  const cid = (customerId || `CUST${Math.floor(1000 + Math.random() * 9000)}`).replace(/\s+/g, "");
  const randomKey = Math.random().toString(36).substring(2, 6);
  
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  
  return `${cid}_${randomKey}_${dd}-${mm}-${yyyy}`;
}

export async function POST(req: Request) {
  try {
    const { customerId, targetEmail, imageBase64, fileName } = await req.json();

    const folderName = generateFolderName(customerId);
    const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!parentFolderId || parentFolderId.includes("...")) {
      return NextResponse.json(
        { success: false, error: "GOOGLE_DRIVE_FOLDER_ID di .env.local belum diatur" },
        { status: 400 }
      );
    }

    const drive = getDriveInstance();

    // 1. Pastikan Parent Folder Publik & Berikan Akses Writer ke Apps Script Owner (project.aibox@gmail.com)
    try {
      await drive.permissions.create({
        fileId: parentFolderId,
        requestBody: { role: "reader", type: "anyone" },
        supportsAllDrives: true,
      });
      await drive.permissions.create({
        fileId: parentFolderId,
        requestBody: { role: "writer", type: "user", emailAddress: "project.aibox@gmail.com" },
        supportsAllDrives: true,
        sendNotificationEmail: false,
      });
      if (targetEmail) {
        await drive.permissions.create({
          fileId: parentFolderId,
          requestBody: { role: "reader", type: "user", emailAddress: targetEmail },
          supportsAllDrives: true,
          sendNotificationEmail: false,
        });
      }
    } catch (e) {
      // Parent permission check ignored if already set
    }

    // 2. Buat Subfolder Berformat idcustomer_randomkey(4)_tanggal/bulan/tahun SPESIFIK MILIK USER
    const folderRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
      fields: "id, webViewLink",
      supportsAllDrives: true,
    });

    const folderId = folderRes.data.id;
    if (!folderId) {
      throw new Error("Gagal membuat folder di Google Drive");
    }

    const folderUrl = folderRes.data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`;

    // 3. Set Hak Akses Subfolder SPESIFIK ke PUBLIC (Anyone with link) & Editor ke project.aibox@gmail.com
    await drive.permissions.create({
      fileId: folderId,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });
    try {
      await drive.permissions.create({
        fileId: folderId,
        requestBody: { role: "writer", type: "user", emailAddress: "project.aibox@gmail.com" },
        supportsAllDrives: true,
        sendNotificationEmail: false,
      });
    } catch (gappsPermErr) {
      console.warn("Apps script user permission warning:", gappsPermErr);
    }

    // 4. Berikan akses pembaca eksplisit ke email target
    if (targetEmail) {
      try {
        await drive.permissions.create({
          fileId: folderId,
          requestBody: { role: "reader", type: "user", emailAddress: targetEmail },
          supportsAllDrives: true,
          sendNotificationEmail: false,
        });
      } catch (err) {
        console.warn("User permission warning:", err);
      }
    }

    let publicPhotoUrl = folderUrl;
    let localRelativePath = "";

    // 5. Tentukan Foto (Dari Kamera atau Default assets/logo/logo-rounded.png)
    let photoBuffer: Buffer;
    let targetFileName = fileName || "logo-rounded.png";

    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      photoBuffer = Buffer.from(base64Data, "base64");
    } else {
      const defaultLogoPath = path.join(process.cwd(), "assets", "logo", "logo-rounded.png");
      if (fs.existsSync(defaultLogoPath)) {
        photoBuffer = fs.readFileSync(defaultLogoPath);
      } else {
        photoBuffer = Buffer.from("");
      }
    }

    if (photoBuffer.length > 0) {
      // a. Simpan Foto Lokal di Server PWA (public/uploads/${folderName}/)
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads", folderName);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const localFilePath = path.join(uploadDir, targetFileName);
        fs.writeFileSync(localFilePath, photoBuffer);
        localRelativePath = `/uploads/${folderName}/${targetFileName}`;
        publicPhotoUrl = localRelativePath;
      } catch (localErr) {
        console.warn("Local storage save warning:", localErr);
      }

      // b. Opsi Google Apps Script Bridge (Jika GOOGLE_APPS_SCRIPT_URL diset di .env.local)
      if (process.env.GOOGLE_APPS_SCRIPT_URL) {
        try {
          const gappsRes = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folderId: folderId,
              fileName: targetFileName,
              imageBase64: photoBuffer.toString("base64"),
              mimeType: targetFileName.endsWith(".avif") ? "image/avif" : "image/png",
            }),
          });
          const gappsData = await gappsRes.json();
          if (gappsData.success && (gappsData.fileUrl || gappsData.webViewLink)) {
            publicPhotoUrl = gappsData.fileUrl || gappsData.webViewLink;
            console.log("✅ Photo uploaded to Drive via Google Apps Script:", publicPhotoUrl);
          } else {
            console.warn("⚠️ Apps Script Upload Error:", gappsData.error);
          }
        } catch (gappsErr) {
          console.warn("Apps Script Upload warning:", gappsErr);
        }
      }

      // c. Coba Upload Binary File Langsung ke Google Drive Subfolder (Membutuhkan OAuth / Shared Drive)
      if (publicPhotoUrl === folderUrl || publicPhotoUrl === localRelativePath) {
        try {
          const fileMime = targetFileName.endsWith(".avif") ? "image/avif" : "image/png";
          const fileRes = await drive.files.create({
            requestBody: {
              name: targetFileName,
              parents: [folderId],
              mimeType: fileMime,
            },
            media: {
              mimeType: fileMime,
              body: Readable.from(photoBuffer),
            },
            fields: "id, webViewLink",
            supportsAllDrives: true,
          });
          if (fileRes.data.id) {
            await drive.permissions.create({
              fileId: fileRes.data.id,
              requestBody: { role: "reader", type: "anyone" },
              supportsAllDrives: true,
            });
            publicPhotoUrl = fileRes.data.webViewLink || `https://drive.google.com/uc?export=download&id=${fileRes.data.id}`;
            console.log("✅ Binary file uploaded to Drive directly:", publicPhotoUrl);
          }
        } catch (driveErr: any) {
          console.warn("Direct Drive Upload Info:", driveErr.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      folderName,
      folderId,
      folderUrl,
      publicPhotoUrl,
      localPhotoUrl: localRelativePath,
      publicUrl: folderUrl,
    });
  } catch (error: any) {
    console.error("Google Drive API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses folder Google Drive" },
      { status: 500 }
    );
  }
}
