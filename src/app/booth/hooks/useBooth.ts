"use client";

import { useBoothState, type UseBoothStateApi } from "./useBoothState";
import { useBoothServices, type UseBoothServicesApi } from "./useBoothServices";
import { useBoothCamera, type UseBoothCameraApi } from "./useBoothCamera";
import { useBoothGestures, type UseBoothGesturesApi } from "./useBoothGestures";
import { useBoothFlow, type UseBoothFlowApi } from "./useBoothFlow";
import { useBoothVoiceEmail } from "./useBoothVoiceEmail";

/** Gabungan seluruh state, efek, dan handler booth (urutan pemanggilan hook dipertahankan). */
export function useBooth() {
  const s0 = useBoothState();
  const s1 = useBoothServices({ ...s0 });
  const s2 = useBoothCamera({ ...s0, ...s1 });
  const s3 = useBoothGestures({ ...s0, ...s1, ...s2 });
  const s4 = useBoothFlow({ ...s0, ...s1, ...s2, ...s3 });

  const s5 = useBoothVoiceEmail({ ...s0, ...s1, ...s2, ...s3, ...s4 });

  return { ...s0, ...s1, ...s2, ...s3, ...s4, ...s5 };
}

export type BoothController = ReturnType<typeof useBooth>;
