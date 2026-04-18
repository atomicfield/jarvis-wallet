"use client";

import { useState, useCallback, useRef } from "react";

interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined") return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    fetch("/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((res) => {
        if (!res.ok)
          throw new Error(`TTS request failed: ${res.status} ${res.statusText}`);
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;

        setIsSpeaking(true);

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          objectUrlRef.current = null;
        };
        audio.onerror = () => {
          console.error(
            "[TTS] Audio playback error:",
            audio.error?.message,
            "code:",
            audio.error?.code,
          );
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          objectUrlRef.current = null;
        };

        audio.play().catch((err: unknown) => {
          console.error(
            "[TTS] audio.play() rejected (autoplay policy or decode error):",
            err,
          );
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          objectUrlRef.current = null;
          audioRef.current = null;
        });
      })
      .catch((err: unknown) => {
        console.error("[TTS] Fetch or blob error:", err);
        setIsSpeaking(false);
      });
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}
