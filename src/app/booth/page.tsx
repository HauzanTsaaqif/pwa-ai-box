"use client";

import { useBooth } from "./hooks/useBooth";
import BoothOverlays from "./components/BoothOverlays";
import BoothSteps from "./components/steps";
import AdminDialog from "./components/AdminDialog";

export type { BoothStep, PackageItem } from "./constants";

/**
 * Halaman photobooth kiosk.
 *  - Logika    : hooks/useBooth (state → services → camera → gestures → flow)
 *  - Tampilan  : components/BoothOverlays, components/steps (Step01…Step14), components/AdminDialog
 * Peta lengkap ada di README.md.
 */
export default function BoothPage() {
  const booth = useBooth();

  return (
    <div className="relative w-screen h-screen bg-[#090a12] text-[#f7f7fb] overflow-hidden select-none font-sans">
      <BoothOverlays booth={booth} />
      <BoothSteps booth={booth} />
      <AdminDialog booth={booth} />
    </div>
  );
}
