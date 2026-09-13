import { NextResponse } from "next/server";
import { google } from "googleapis";
import path from "path";
import fs from "fs";
import { Readable } from "stream";

function cleanPrivateKey(key?: string) {
  if (!key) return undefined;
  let k = key.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.substring(1, k.length - 1);
  }
  return k.replace(/\\n/g, "\n");
}

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

  const privateKey = cleanPrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
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
    const { customerId, targetEmail, imageBase64, fileName, images } = await req.json();

    const folderName = generateFolderName(customerId);
    const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // 1. Kumpulkan semua foto yang akan diupload
    let filesToUpload: { base64?: string; buffer?: Buffer; name: string }[] = [];
    
    if (images && Array.isArray(images)) {
      filesToUpload = images.map((img: any) => ({
        base64: img.base64 || img.imageBase64,
        name: img.fileName || img.name || `photo_${Math.random().toString(36).substring(7)}.jpg`
      }));
    } else if (imageBase64) {
      filesToUpload = [{ base64: imageBase64, name: fileName || "photostrip.png" }];
    } else {
      const defaultLogoPath = path.join(process.cwd(), "assets", "logo", "logo-rounded.png");
      if (fs.existsSync(defaultLogoPath)) {
        filesToUpload = [{ buffer: fs.readFileSync(defaultLogoPath), name: "logo-rounded.png" }];
      }
    }

    // 2. Simpan Semua Foto Lokal di Server PWA (sebagai backup)
    let localRelativePath = "";
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const localFolderUrl = `${protocol}://${host}/uploads/${folderName}`;

    for (const file of filesToUpload) {
      let photoBuffer: Buffer | null = null;
      if (file.buffer) {
        photoBuffer = file.buffer;
      } else if (file.base64) {
        try {
          const base64Data = file.base64.replace(/^data:image\/\w+;base64,/, "");
          photoBuffer = Buffer.from(base64Data, "base64");
        } catch (e) {
          photoBuffer = null;
        }
      }

      if (!photoBuffer || photoBuffer.length === 0) continue;

      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads", folderName);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const localFilePath = path.join(uploadDir, file.name);
        fs.writeFileSync(localFilePath, photoBuffer);
        if (!localRelativePath) localRelativePath = `/uploads/${folderName}/${file.name}`;
      } catch (localErr) {
        console.warn("Local storage save warning:", localErr);
      }
    }

    let folderId = "";
    let folderUrl = "";
    let publicPhotoUrl = "";
    let uploadedFileUrls: string[] = [];

    // 3. Coba buat Subfolder di Google Drive via Service Account
    if (parentFolderId && !parentFolderId.includes("...")) {
      try {
        const drive = getDriveInstance();

        try {
          await drive.permissions.create({
            fileId: parentFolderId,
            requestBody: { role: "reader", type: "anyone" },
            supportsAllDrives: true,
          });
        } catch (e) {}

        const folderRes = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentFolderId],
          },
          fields: "id, webViewLink",
          supportsAllDrives: true,
        });

        if (folderRes.data.id) {
          folderId = folderRes.data.id;
          folderUrl = folderRes.data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`;

          try {
            await drive.permissions.create({
              fileId: folderId,
              requestBody: { role: "reader", type: "anyone" },
              supportsAllDrives: true,
            });
          } catch (e) {}

          if (targetEmail) {
            try {
              await drive.permissions.create({
                fileId: folderId,
                requestBody: { role: "reader", type: "user", emailAddress: targetEmail },
                supportsAllDrives: true,
                sendNotificationEmail: false,
              });
            } catch (e) {}
          }
        }
      } catch (driveErr: any) {
        console.warn("Service Account folder creation warning:", driveErr?.message || driveErr);
      }
    }

    // Target Folder ID untuk upload file: Subfolder yang baru dibuat ATAU parentFolderId sebagai fallback
    const targetFolderId = folderId || parentFolderId || "";

    if (targetFolderId && !targetFolderId.includes("...")) {
      if (!folderUrl) {
        folderUrl = `https://drive.google.com/drive/folders/${targetFolderId}`;
      }

      // 4. Upload Setiap Foto ke Google Drive
      for (const file of filesToUpload) {
        let photoBuffer: Buffer | null = null;
        if (file.buffer) {
          photoBuffer = file.buffer;
        } else if (file.base64) {
          try {
            const base64Data = file.base64.replace(/^data:image\/\w+;base64,/, "");
            photoBuffer = Buffer.from(base64Data, "base64");
          } catch (e) {
            photoBuffer = null;
          }
        }

        if (!photoBuffer || photoBuffer.length === 0) continue;

        const targetFileName = file.name;
        let singleFileUrl = "";

        // Opsi A: Google Apps Script Bridge
        if (process.env.GOOGLE_APPS_SCRIPT_URL) {
          try {
            const gappsRes = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                folderId: targetFolderId,
                fileName: targetFileName,
                imageBase64: photoBuffer.toString("base64"),
                mimeType: targetFileName.endsWith(".png") ? "image/png" : "image/jpeg",
              }),
            });
            const gappsData = await gappsRes.json();
            if (gappsData.success && (gappsData.fileUrl || gappsData.webViewLink)) {
              singleFileUrl = gappsData.fileUrl || gappsData.webViewLink;
            }
          } catch (gappsErr) {
            console.warn("Apps Script Upload warning:", gappsErr);
          }
        }

        // Opsi B: Direct Service Account Upload
        if (!singleFileUrl) {
          try {
            const drive = getDriveInstance();
            const fileMime = targetFileName.endsWith(".png") ? "image/png" : "image/jpeg";
            const fileRes = await drive.files.create({
              requestBody: {
                name: targetFileName,
                parents: [targetFolderId],
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
              singleFileUrl = fileRes.data.webViewLink || `https://drive.google.com/file/d/${fileRes.data.id}/view`;
              try {
                await drive.permissions.create({
                  fileId: fileRes.data.id,
                  requestBody: { role: "reader", type: "anyone" },
                  supportsAllDrives: true,
                });
              } catch (e) {}
            }
          } catch (driveErr: any) {
            console.warn("Direct Drive Upload Warning:", driveErr.message);
          }
        }

        if (singleFileUrl) {
          uploadedFileUrls.push(singleFileUrl);
        }
      }
    }

    // Jika ada file yang berhasil diupload ke Google Drive, gunakan file URL tersebut sebagai publicPhotoUrl
    if (uploadedFileUrls.length > 0) {
      // Prioritaskan file photostrip jika ada, atau file pertama
      const photostripUrl = uploadedFileUrls.find((u) => u.includes("photostrip") || u.endsWith(".png"));
      publicPhotoUrl = photostripUrl || uploadedFileUrls[0];
    }

    // Direct Google Drive Fallbacks
    if (!folderUrl) {
      folderUrl = localFolderUrl;
    }
    if (!publicPhotoUrl) {
      publicPhotoUrl = folderUrl;
    }

    return NextResponse.json({
      success: true,
      folderName,
      folderId,
      folderUrl,
      publicPhotoUrl,
      localPhotoUrl: localRelativePath,
      publicUrl: folderUrl,
      uploadedFileUrls,
    });
  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses upload foto" },
      { status: 500 }
    );
  }
}
