/**
 * Mengubah ucapan bahasa Indonesia/Inggris menjadi format email.
 * Contoh: "budi satu dua tiga at gmail dot com" → "budi123@gmail.com"
 */
export function formatSpokenEmail(transcript: string): string {
  return transcript
    .toLowerCase()
    .replace(/\bnol\b/g, "0")
    .replace(/\bkosong\b/g, "0")
    .replace(/\bsatu\b/g, "1")
    .replace(/\bdua\b/g, "2")
    .replace(/\btiga\b/g, "3")
    .replace(/\bempat\b/g, "4")
    .replace(/\blima\b/g, "5")
    .replace(/\benam\b/g, "6")
    .replace(/\btujuh\b/g, "7")
    .replace(/\bdelapan\b/g, "8")
    .replace(/\bsembilan\b/g, "9")
    .replace(/\s+(at|et|ad|add|a keong|keong|et keong|arroba)\s+/g, "@")
    .replace(/(at|et|ad|add|a keong|keong|et keong)\s*gmail/g, "@gmail")
    .replace(/(at|et|ad|add|a keong|keong|et keong)\s*yahoo/g, "@yahoo")
    .replace(/\s+(dot|titik)\s+/g, ".")
    .replace(/gmail\s+com/g, "gmail.com")
    .replace(/yahoo\s+com/g, "yahoo.com")
    .replace(/\s+/g, "")
    .trim();
}
