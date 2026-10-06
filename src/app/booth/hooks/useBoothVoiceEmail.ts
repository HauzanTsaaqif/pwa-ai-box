"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GestureType } from "@/lib/mediapipe";
import { formatSpokenEmail } from "../utils/formatSpokenEmail";
import type { UseBoothStateApi } from "./useBoothState";
import type { UseBoothServicesApi } from "./useBoothServices";
import type { UseBoothFlowApi } from "./useBoothFlow";

/**
 * Alur input email dengan suara (Step 12 — upload_digital):
 *
 *   idle ──(tangan mengepal)──▶ recording ──(tidak mengepal ≥ 0,3 dtk)──▶ processing ──▶ review
 *     ▲                                                                                     │
 *     └───────────── jempol bawah ditahan 3 dtk (rekam ulang) ◀─────────────────────────────┤
 *                                       jempol atas ditahan 3 dtk ──▶ kirim email & Step 13 ┘
 */
export type VoicePhase = "idle" | "recording" | "processing" | "review";
export type ConfirmGesture = "thumbs_up" | "thumbs_down";

export const VOICE_RELEASE_MS = 300;   // tangan tidak mengepal selama ini → rekaman dihentikan
export const VOICE_CONFIRM_MS = 3000;  // jempol harus ditahan selama ini sebelum aksi dijalankan
const HOLD_GRACE_MS = 250;             // toleransi kedipan deteksi saat menahan jempol
const SOUND_THRESHOLD = 0.06;          // level suara minimum agar dianggap "ada suara"
const PROCESSING_TIMEOUT_MS = 1800;    // cadangan bila recognizer tidak memanggil onend

export interface ConfirmHold {
  gesture: ConfirmGesture;
  progress: number; // 0..1
}

type VoiceDeps = UseBoothStateApi & UseBoothServicesApi & UseBoothFlowApi;

export function useBoothVoiceEmail(booth: VoiceDeps) {
  const {
    step, stepRef, stepEntryTimeRef, callbacksRef, setStep, setEmailInput, emailInputRef,
    setVoiceStatus, handleSendEmail,
  } = booth;

  const [voicePhase, setVoicePhaseState] = useState<VoicePhase>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [soundDetected, setSoundDetected] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [confirmHold, setConfirmHold] = useState<ConfirmHold | null>(null);
  const [voiceManual, setVoiceManual] = useState(false);

  const phaseRef = useRef<VoicePhase>("idle");
  const manualRef = useRef(false); // dimulai lewat tombol → hanya dihentikan lewat tombol
  const recognitionRef = useRef<any>(null);
  const stopRequestedRef = useRef(false);
  const finalTextRef = useRef("");
  const interimTextRef = useRef("");
  const releaseStartRef = useRef(0);
  const finalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdRef = useRef<{ gesture: ConfirmGesture | null; start: number; lastSeen: number; fired: boolean }>({
    gesture: null, start: 0, lastSeen: 0, fired: false,
  });
  const lastHoldPushRef = useRef(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const setPhase = useCallback((phase: VoicePhase) => {
    phaseRef.current = phase;
    setVoicePhaseState(phase);
  }, []);

  // ---------- level suara (animasi mic & deteksi "ada suara") ----------
  const stopMeter = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close().catch(() => { });
    audioCtxRef.current = null;
    setAudioLevel(0);
    setSoundDetected(false);
  }, []);

  const startMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (phaseRef.current !== "recording") {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      micStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buffer = new Uint8Array(analyser.fftSize);
      let lastPush = 0;

      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const level = Math.min(1, Math.sqrt(sum / buffer.length) * 6);
        const now = performance.now();
        if (now - lastPush > 60) {
          lastPush = now;
          setAudioLevel(level);
          setSoundDetected(level > SOUND_THRESHOLD);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Meter opsional: tanpa izin mic tambahan, animasi tetap jalan memakai event recognizer.
    }
  }, []);

  // ---------- hasil rekaman → teks → input email ----------
  const resetHold = useCallback(() => {
    holdRef.current = { gesture: null, start: 0, lastSeen: 0, fired: false };
    setConfirmHold(null);
  }, []);

  const finalize = useCallback(() => {
    if (phaseRef.current !== "processing" && phaseRef.current !== "recording") return;
    if (finalizeTimerRef.current) clearTimeout(finalizeTimerRef.current);
    finalizeTimerRef.current = null;
    stopMeter();
    recognitionRef.current = null;

    const raw = `${finalTextRef.current} ${interimTextRef.current}`.trim();
    const formatted = formatSpokenEmail(raw);
    if (formatted) {
      setEmailInput(formatted); // menggantikan isi input dengan hasil suara
      setVoiceStatus(`Terdengar: "${formatted}"`);
      resetHold();
      setPhase("review");
    } else {
      setVoiceStatus("Suara tidak terdengar. Kepal tangan untuk mencoba lagi.");
      setPhase("idle");
    }
  }, [resetHold, setEmailInput, setPhase, setVoiceStatus, stopMeter]);

  const startRecording = useCallback((manual = false) => {
    if (phaseRef.current === "recording" || phaseRef.current === "processing") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("Browser tidak mendukung input suara.");
      return;
    }

    stopRequestedRef.current = false;
    finalTextRef.current = "";
    interimTextRef.current = "";
    releaseStartRef.current = 0;
    manualRef.current = manual;
    setVoiceManual(manual);
    setLiveTranscript("");
    setVoiceStatus("");
    resetHold();
    setPhase("recording");
    startMeter();

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "id-ID";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalTextRef.current += ` ${result[0].transcript}`;
          else interim += result[0].transcript;
        }
        interimTextRef.current = interim;
        setLiveTranscript(`${finalTextRef.current} ${interim}`.trim());
      };

      recognition.onerror = (e: any) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          stopRequestedRef.current = true;
          stopMeter();
          setVoiceStatus("Izin mikrofon ditolak.");
          setPhase("idle");
        } else if (e.error !== "no-speech" && e.error !== "aborted") {
          console.warn("Speech recognition error:", e.error);
        }
      };

      // Chrome mengakhiri sesi saat hening → sambung lagi sampai user berhenti mengepal.
      recognition.onend = () => {
        if (!stopRequestedRef.current && phaseRef.current === "recording") {
          try { recognition.start(); } catch { /* sudah berjalan */ }
        } else {
          finalize();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition start failed:", err);
      stopMeter();
      setVoiceStatus("Gagal mengaktifkan mikrofon.");
      setPhase("idle");
    }
  }, [finalize, resetHold, setPhase, setVoiceStatus, startMeter, stopMeter]);

  const stopRecording = useCallback(() => {
    if (phaseRef.current !== "recording") return;
    stopRequestedRef.current = true;
    setPhase("processing");
    stopMeter();
    try { recognitionRef.current?.stop(); } catch { /* abaikan */ }
    finalizeTimerRef.current = setTimeout(finalize, PROCESSING_TIMEOUT_MS);
  }, [finalize, setPhase, stopMeter]);

  // ---------- konfirmasi: jempol atas (kirim) / bawah (rekam ulang) ----------
  const confirmSend = useCallback(() => {
    const email = emailInputRef.current.trim();
    if (!email) return;
    handleSendEmail(email);
    setStep("qr_download");
  }, [emailInputRef, handleSendEmail, setStep]);

  const reRecord = useCallback(() => {
    resetHold();
    setLiveTranscript("");
    setVoiceStatus("Kepal tangan untuk merekam ulang.");
    setPhase("idle");
  }, [resetHold, setPhase, setVoiceStatus]);

  const handleConfirmGesture = useCallback((gesture: GestureType, now: number) => {
    const isThumb = gesture === "thumbs_up" || gesture === "thumbs_down";
    if (!isThumb) {
      if (holdRef.current.gesture && now - holdRef.current.lastSeen > HOLD_GRACE_MS) resetHold();
      return;
    }
    if (holdRef.current.gesture !== gesture) {
      holdRef.current = { gesture, start: now, lastSeen: now, fired: false };
    } else {
      holdRef.current.lastSeen = now;
    }
    const hold = holdRef.current;
    if (hold.fired) return;

    const progress = Math.min(1, (now - hold.start) / VOICE_CONFIRM_MS);
    if (now - lastHoldPushRef.current > 50 || progress >= 1) {
      lastHoldPushRef.current = now;
      setConfirmHold({ gesture, progress });
    }
    if (progress >= 1) {
      hold.fired = true;
      if (gesture === "thumbs_up") confirmSend();
      else reRecord();
    }
  }, [confirmSend, reRecord, resetHold]);

  /** Dipanggil setiap frame deteksi MediaPipe selama Step 12 (lihat useBoothCamera). */
  const onVoiceGesture = useCallback((gesture: GestureType) => {
    if (stepRef.current !== "upload_digital") return;
    const now = Date.now();
    const phase = phaseRef.current;

    if (phase === "idle") {
      if (gesture === "fist" && now - stepEntryTimeRef.current > 1000) startRecording(false);
    } else if (phase === "recording") {
      if (manualRef.current) return;
      if (gesture === "fist") {
        releaseStartRef.current = 0;
      } else if (!releaseStartRef.current) {
        releaseStartRef.current = now;
      } else if (now - releaseStartRef.current >= VOICE_RELEASE_MS) {
        releaseStartRef.current = 0;
        stopRecording();
      }
    } else if (phase === "review") {
      handleConfirmGesture(gesture, now);
    }
  }, [handleConfirmGesture, startRecording, stepEntryTimeRef, stepRef, stopRecording]);

  // Daftarkan ke loop gestur kamera (callbacksRef ditimpa useBoothFlow tiap render, jadi tempel ulang di sini).
  callbacksRef.current.onVoiceGesture = onVoiceGesture;

  // Keluar dari Step 12 (tombol Lewati/Kirim, auto-reset) → bersihkan mic & recognizer.
  useEffect(() => {
    if (step === "upload_digital") return undefined;
    stopRequestedRef.current = true;
    try { recognitionRef.current?.abort(); } catch { /* abaikan */ }
    recognitionRef.current = null;
    if (finalizeTimerRef.current) clearTimeout(finalizeTimerRef.current);
    stopMeter();
    resetHold();
    setLiveTranscript("");
    setPhase("idle");
    return undefined;
  }, [step, resetHold, setPhase, stopMeter]);

  return {
    voicePhase, audioLevel, soundDetected, liveTranscript, confirmHold, voiceManual,
    startVoiceRecording: () => startRecording(true),
    stopVoiceRecording: stopRecording,
  };
}

export type UseBoothVoiceEmailApi = ReturnType<typeof useBoothVoiceEmail>;
