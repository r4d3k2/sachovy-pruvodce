// useSpeech.ts — React obal nad speech.ts, aby komponenty zůstaly čisté.
//
// Vrací { supported, speaking, speak, stop, toggle }. Stav `speaking` slouží
// jen pro vizuální indikaci ikonky; skutečnou frontu drží speechSynthesis.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensureVoicesLoaded,
  isSpeechSupported,
  speak as speakRaw,
  stopSpeaking,
} from "./speech";

export interface UseSpeech {
  supported: boolean;
  speaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
  toggle: (text: string) => void;
}

export function useSpeech(): UseSpeech {
  const [supported] = useState(() => isSpeechSupported());
  const [speaking, setSpeaking] = useState(false);
  // Zrcadlo stavu pro toggle — ať callback nezávisí na `speaking` a nemění
  // identitu při každém přehrání.
  const speakingRef = useRef(false);

  const setSpeakingBoth = useCallback((v: boolean) => {
    speakingRef.current = v;
    setSpeaking(v);
  }, []);

  // Hlasy se načítají asynchronně — nastartuj to hned po připojení.
  useEffect(() => {
    if (!supported) return;
    ensureVoicesLoaded();
  }, [supported]);

  // e) Cleanup — odchod z komponenty čtení ruší.
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeakingBoth(false);
  }, [setSpeakingBoth]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text || !text.trim()) return;
      setSpeakingBoth(true);
      speakRaw(text, {
        onEnd: () => setSpeakingBoth(false),
        onError: () => setSpeakingBoth(false),
      });
    },
    [supported, setSpeakingBoth],
  );

  const toggle = useCallback(
    (text: string) => {
      if (speakingRef.current) stop();
      else speak(text);
    },
    [speak, stop],
  );

  return { supported, speaking, speak, stop, toggle };
}
