import nodemailer from "nodemailer";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

export interface SendPhotoboothEmailParams {
  toEmail: string;
  userName?: string;
  publicPhotoUrl: string;
  folderUrl: string;
  folderName: string;
  photoBuffer?: Buffer; // Buffer gambar foto strip
  photoPath?: string;   // Atau path gambar lokal
}

/**
 * Transporter Nodemailer SMTP
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "lookback43210@gmail.com";
  const pass = process.env.SMTP_PASS || "dfxv whgk hacy iuuc";

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Generates HTML Email Body with AI Box Splash Theme
 */
export function buildPhotoboothEmailHtml({
  userName,
  publicPhotoUrl,
  folderUrl,
  folderName,
  hasRealPreview = false,
}: {
  userName: string;
  publicPhotoUrl: string;
  folderUrl: string;
  folderName: string;
  hasRealPreview?: boolean;
}) {
  const brandName = "AI Box Photobooth";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Foto AI Box Photobooth Anda Siap!</title>
  <style type="text/css">
    body, table, td, div, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse !important; }
    img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
    body { margin:0 !important; padding:0 !important; width:100% !important; background-color: #0f172a; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; }
    
    .wrap-any { word-break:break-word; overflow-wrap:break-word; }

    @media only screen and (max-width:620px) {
      .card { width:100% !important; max-width:100% !important; border-radius:12px !important; }
      .outer-pad { padding:14px 10px !important; }
      .px { padding-left:18px !important; padding-right:18px !important; }
      .py-head { padding-top:28px !important; padding-bottom:24px !important; }
      .py-body { padding-top:24px !important; padding-bottom:24px !important; }
      .h1 { font-size:22px !important; }
      .qr-img { width:160px !important; height:160px !important; }
      .btn { display:block !important; width:100% !important; margin-bottom:10px !important; text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0f172a">
    <tr>
      <td align="center" class="outer-pad" style="padding:36px 16px;">
        
        <!-- MAIN CARD -->
        <table role="presentation" class="card" width="620" cellpadding="0" cellspacing="0" border="0"
               style="width:620px;max-width:620px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(14,165,233,0.35);border:1px solid #38bdf8;">
          
          <!-- HEADER WITH GRADIENT -->
          <tr>
            <td align="center" class="px py-head"
                style="padding:40px 30px;background-color:#0ea5e9;background-image:linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%);">
              <img src="cid:aiboxlogo" alt="${brandName}" width="140"
                   style="display:block;margin:0 auto 16px;width:140px;max-width:70%;height:auto;filter:drop-shadow(0 10px 15px rgba(0,0,0,0.3));" />
              <h1 class="h1 wrap-any" style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px;text-shadow:0 2px 4px rgba(0,0,0,0.2);">
                Foto HD Photobooth Anda Siap! 📸
              </h1>
              <p style="margin:8px 0 0;color:#e0f2fe;font-size:14px;font-weight:500;">
                Terima kasih telah mengabadikan momen spesial bersama AI Box
              </p>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td class="px py-body" style="padding:36px 32px;">
              <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f172a;">
                Halo, <span style="color:#0ea5e9;">${userName}</span>! 👋
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#475569;">
                Sesi foto Anda di <strong>${brandName}</strong> telah selesai diproses dengan kualitas High-Definition. Foto Anda tersimpan dengan aman di folder Google Drive publik kami:
              </p>

              <!-- FOLDER INFO BADGE -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px;">
                <tr>
                  <td style="background-color:#f0f9ff;border:1.5px dashed #0ea5e9;border-radius:12px;padding:16px 20px;text-align:center;">
                    <div style="font-size:11px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
                      📁 ID Folder Google Drive:
                    </div>
                    <div style="font-size:16px;font-weight:800;color:#0f172a;font-family:'Courier New',monospace;">
                      ${folderName}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- QR CODE BLOCK & PREVIEW -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="background-color:#fafafa;border:1px solid #e2e8f0;border-radius:16px;padding:24px 20px;">
                    
                    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">
                      Scan QR Code Ini di Handphone Anda:
                    </div>

                    <!-- QR CODE IMAGE CID -->
                    <img src="cid:qrcodegdrive" alt="QR Code Google Drive" class="qr-img" width="190" height="190"
                         style="display:block;margin:0 auto 16px;width:190px;height:190px;border-radius:12px;border:3px solid #0ea5e9;padding:6px;background-color:#ffffff;box-shadow:0 8px 20px rgba(14,165,233,0.2);" />

                    ${hasRealPreview ? `
                    <!-- PHOTO PREVIEW IMAGE CID -->
                    <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:10px;margin-top:14px;">
                      Preview Hasil Foto Photobooth:
                    </div>
                    <img src="cid:photostrip" alt="Foto Preview" width="320"
                         style="display:block;margin:0 auto;width:100%;max-width:320px;height:auto;border-radius:12px;border:1px solid #cbd5e1;box-shadow:0 4px 12px rgba(0,0,0,0.1);" />
                    ` : ''}

                  </td>
                </tr>
              </table>

              <!-- ACTION BUTTONS (STACKED & FULL WIDTH RESPONSIF UNTUK MOBILE) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center" style="padding:0 5px;">
                    <a href="${folderUrl}" target="_blank" class="btn"
                       style="display:block;width:100%;max-width:100%;box-sizing:border-box;padding:14px 18px;background-color:#0ea5e9;background-image:linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;border-radius:50px;box-shadow:0 8px 20px rgba(14,165,233,0.35);margin-bottom:10px;text-align:center;">
                      📂 Buka Folder Google Drive Publik
                    </a>
                    <a href="${publicPhotoUrl}" target="_blank" class="btn"
                       style="display:block;width:100%;max-width:100%;box-sizing:border-box;padding:14px 18px;background-color:#f1f5f9;color:#0f172a;font-size:14px;font-weight:700;text-decoration:none;border-radius:50px;border:1px solid #cbd5e1;text-align:center;">
                      📥 Buka & Download Foto HD
                    </a>
                  </td>
                </tr>
              </table>

              <!-- LINK ALTERNATIF -->
              <div style="font-size:12px;color:#64748b;line-height:1.6;margin-bottom:20px;text-align:center;">
                Jika tombol tidak dapat diklik, salin link berikut ke browser Anda:<br />
                <a href="${publicPhotoUrl}" style="color:#0ea5e9;word-break:break-all;">${publicPhotoUrl}</a>
              </div>

              <!-- NOTICE -->
              <div style="background-color:#fff7ed;border-left:4px solid #f97316;padding:14px 16px;border-radius:8px;font-size:12px;color:#9a3412;line-height:1.6;">
                <strong>💡 Catatan:</strong> Link Google Drive ini bersifat publik dan berlaku permanen. Anda dapat membagikannya kepada teman dan keluarga kapan saja!
              </div>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="background-color:#0f172a;padding:24px 30px;border-top:1px solid #1e293b;">
              <p style="margin:0 0 6px;color:#f8fafc;font-size:13px;font-weight:800;">
                AI Box Photobooth
              </p>
              <p style="margin:0 0 12px;color:#94a3b8;font-size:11px;">
                Touchless AI-Powered Kiosk Photobooth System
              </p>
              <p style="margin:0;color:#64748b;font-size:10px;">
                © ${new Date().getFullYear()} AI Box Photobooth. All rights reserved.<br />
                Email ini dikirimkan secara otomatis dari sistem PWA AI Box Photobooth.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Kirim Email Photobooth Lengkap dengan Nodemailer SMTP
 */
export async function sendPhotoboothEmail({
  toEmail,
  userName = "Pengunjung AI Box",
  publicPhotoUrl,
  folderUrl,
  folderName,
  photoBuffer,
  photoPath,
}: SendPhotoboothEmailParams) {
  const transporter = createTransporter();

  // 1. Generate QR Code Buffer untuk Link Google Drive Publik Spesifik Subfolder Customer
  const qrCodeBuffer = await QRCode.toBuffer(folderUrl || publicPhotoUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });

  // 2. Tentukan Logo Path
  const logoPath = path.join(process.cwd(), "public", "logo-splash.png");
  const defaultLogoFallback = path.join(process.cwd(), "assets", "logo", "logo-rounded.png");
  const actualLogoPath = fs.existsSync(logoPath) ? logoPath : defaultLogoFallback;

  // 3. Setup Attachments (CID Inline Rendering)
  const attachments: any[] = [
    {
      filename: "logo-splash.png",
      path: actualLogoPath,
      cid: "aiboxlogo",
    },
    {
      filename: "qrcode-drive.png",
      content: qrCodeBuffer,
      cid: "qrcodegdrive",
    },
  ];

  // Attach photo preview hanya jika photoBuffer atau photoPath asli tersedia (bukan logo icon fallback)
  let hasRealPreview = false;
  if (photoBuffer && photoBuffer.length > 50) {
    attachments.push({
      filename: "photostrip.jpg",
      content: photoBuffer,
      cid: "photostrip",
    });
    hasRealPreview = true;
  } else if (photoPath && fs.existsSync(photoPath)) {
    attachments.push({
      filename: "photostrip.jpg",
      path: photoPath,
      cid: "photostrip",
    });
    hasRealPreview = true;
  }

  // 4. Build HTML Template
  const htmlContent = buildPhotoboothEmailHtml({
    userName,
    publicPhotoUrl,
    folderUrl,
    folderName,
    hasRealPreview,
  });

  const senderEmail = process.env.SMTP_USER || "lookback43210@gmail.com";

  // 5. Send Email
  const info = await transporter.sendMail({
    from: `"AI Box Photobooth 📸" <${senderEmail}>`,
    to: toEmail,
    subject: `📸 Foto AI Box Photobooth Anda Siap! (${folderName})`,
    html: htmlContent,
    attachments,
  });

  console.log("Email SMTP successfully sent! Message ID:", info.messageId);
  return { success: true, messageId: info.messageId };
}
