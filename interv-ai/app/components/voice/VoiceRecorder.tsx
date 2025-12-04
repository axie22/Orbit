"use client";

import { useState, useRef, useEffect } from "react";

interface VoiceRecorderProps {
  onAudioReady: (audio: Blob) => void;
}

export default function VoiceRecorder({ onAudioReady }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Request microphone permission
  useEffect(() => {
    const requestPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setHasPermission(true);
      } catch (err) {
        console.error(err);
        setError("Microphone access denied.");
        setHasPermission(false);
      }
    };

    requestPermission();

    // Cleanup on unmount
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = () => {
    if (!mediaStreamRef.current) {
      setError("No microphone stream available.");
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(mediaStreamRef.current, {
      mimeType: "audio/webm",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      onAudioReady(blob);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();

    setIsRecording(true);
    setError(null);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="flex flex-col items-center gap-3 mt-4">
      {/* Error message */}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Mic permission issue */}
      {!hasPermission && !error && (
        <p className="text-gray-600 text-sm">Requesting microphone access…</p>
      )}

      {/* Main button */}
      <button
        disabled={!hasPermission}
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-5 py-2 rounded-md text-white font-medium transition
          ${
            isRecording
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-600 hover:bg-blue-700"
          }
          disabled:bg-gray-400 disabled:cursor-not-allowed
        `}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 text-red-600 font-mono text-sm">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          Recording…
        </div>
      )}
    </div>
  );
}
