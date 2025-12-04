"use client";

import VoiceRecorder from "@/app/components/voice/VoiceRecorder";
import { useState } from "react";

export default function VoiceRecorderSection() {
  const [status, setStatus] = useState<string | null>(null);

  const handleAudioReady = async (audio: Blob) => {
    setStatus("Sending audio…");

    try {
      const formData = new FormData();
      formData.append("audio", audio, "input.webm");

      const res = await fetch("/api/VTT", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      setStatus("Audio sent!");
    } catch (err) {
      console.error(err);
      setStatus("Failed to send audio.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <VoiceRecorder onAudioReady={handleAudioReady} />
      {status && (
        <p className="text-xs text-gray-600 font-mono mt-1">{status}</p>
      )}
    </div>
  );
}
