"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseVoiceReturn {
  transcript: string;
  isListening: boolean;
  confidence: number;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
}

/**
 * Custom hook for voice input using Web Speech API with Whisper fallback.
 * Provides real-time speech-to-text transcription.
 */
export function useVoice(): UseVoiceReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micPermissionGrantedRef = useRef(false);
  const isSupported =
    typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const mapVoiceError = useCallback((errorCode: string) => {
    if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
      return "Microphone access is blocked. Enable microphone permission in Telegram/browser settings.";
    }
    if (errorCode === "audio-capture") {
      return "No microphone was detected on this device.";
    }
    if (errorCode === "network") {
      return "Network error while starting voice recognition.";
    }
    return `Speech recognition error: ${errorCode}`;
  }, []);

  const setMicTracksEnabled = useCallback((enabled: boolean) => {
    const stream = mediaStreamRef.current;
    if (!stream) {
      return;
    }

    stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }, []);

  const ensureMicrophonePermission = useCallback(async () => {
    if (micPermissionGrantedRef.current && mediaStreamRef.current?.active) {
      return true;
    }

    try {
      if (navigator.permissions?.query) {
        const permissionStatus = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        if (permissionStatus.state === "denied") {
          setError(mapVoiceError("not-allowed"));
          return false;
        }
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Microphone access is not supported in this browser.");
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      micPermissionGrantedRef.current = true;
      setMicTracksEnabled(false);
      setError(null);
      return true;
    } catch (permissionError) {
      const message = mapVoiceError("not-allowed");
      setError(message);
      console.warn("[useVoice]", message, permissionError);
      return false;
    }
  }, [mapVoiceError, setMicTracksEnabled]);

  const startListening = useCallback(() => {
    void (async () => {
      const hasPermission = await ensureMicrophonePermission();
      if (!hasPermission) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError("Speech recognition not supported in this browser");
        return;
      }

      // Stop any existing recognition
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        setTranscript("");
        setMicTracksEnabled(true);
        // Haptic feedback when speech starts
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            setConfidence(result[0].confidence);
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error === "aborted" || event.error === "no-speech") {
          setMicTracksEnabled(false);
          setIsListening(false);
          return;
        }

        const message = mapVoiceError(event.error);
        setError(message);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          micPermissionGrantedRef.current = false;
          console.warn("[useVoice]", message);
        } else {
          console.error("[useVoice]", message);
        }
        setMicTracksEnabled(false);
        setIsListening(false);
      };

      recognition.onend = () => {
        setMicTracksEnabled(false);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (startError) {
        const message = mapVoiceError("not-allowed");
        setError(message);
        setIsListening(false);
        console.warn("[useVoice]", message, startError);
      }
    })();
  }, [ensureMicrophonePermission, mapVoiceError, setMicTracksEnabled]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setMicTracksEnabled(false);
    setIsListening(false);
    // Haptic feedback when speech stops
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");
  }, [setMicTracksEnabled]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setConfidence(0);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  return {
    transcript,
    isListening,
    confidence,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
  };
}
