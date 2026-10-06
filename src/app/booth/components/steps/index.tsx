"use client";

import Step01Welcome from "./Step01Welcome";
import Step02GestureTutorial from "./Step02GestureTutorial";
import Step03SelectPackage from "./Step03SelectPackage";
import Step04SelectFormat from "./Step04SelectFormat";
import Step05SelectTheme from "./Step05SelectTheme";
import Step06PaymentQris from "./Step06PaymentQris";
import Step07PoseReady from "./Step07PoseReady";
import Step08Countdown from "./Step08Countdown";
import Step08bPhotoReview from "./Step08bPhotoReview";
import Step09PreviewStrip from "./Step09PreviewStrip";
import Step10Processing from "./Step10Processing";
import Step11PrintConfirm from "./Step11PrintConfirm";
import Step12UploadDigital from "./Step12UploadDigital";
import Step13QrDownload from "./Step13QrDownload";
import Step14ThankYou from "./Step14ThankYou";
import type { BoothController } from "../../hooks/useBooth";

/** Seluruh langkah booth, berurutan sesuai alur (hanya step aktif yang tampil lewat AnimatePresence di tiap file). */
export default function BoothSteps({ booth }: { booth: BoothController }) {
  return (
    <>
      <Step01Welcome booth={booth} />
      <Step02GestureTutorial booth={booth} />
      <Step03SelectPackage booth={booth} />
      <Step04SelectFormat booth={booth} />
      <Step05SelectTheme booth={booth} />
      <Step06PaymentQris booth={booth} />
      <Step07PoseReady booth={booth} />
      <Step08Countdown booth={booth} />
      <Step08bPhotoReview booth={booth} />
      <Step09PreviewStrip booth={booth} />
      <Step10Processing booth={booth} />
      <Step11PrintConfirm booth={booth} />
      <Step12UploadDigital booth={booth} />
      <Step13QrDownload booth={booth} />
      <Step14ThankYou booth={booth} />
    </>
  );
}
