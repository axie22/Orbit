"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect, useState, useCallback } from "react";
import CodeEditor from "@/app/components/CodeEditor";
import { RoomEvent, DataPacket_Kind, ConnectionState } from "livekit-client";

type PracticeSessionProps = {
  problemId: string;
  initialCode: string;
};

export default function PracticeSession({
  problemId,
  initialCode,
}: PracticeSessionProps) {
  const [token, setToken] = useState("");
  const [code, setCode] = useState(initialCode);

  // Generate a random username for the session once
  const [username] = useState(
    () => `user-${Math.random().toString(36).slice(2, 7)}`
  );
  const [roomName] = useState(() => `practice-${problemId}-${username}`);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(
          `/api/token?room=${roomName}&username=${username}`
        );
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [roomName, username]);

  if (!token) {
    return (
      <div className="w-full h-full flex items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
        <span className="text-sm text-slate-500 font-medium">
          Connecting to live session…
        </span>
      </div>
    );
  }

  const livekiturl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!livekiturl) {
    return (
      <div>
        <h1>Missing the LIVEKIT URL</h1>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      className="w-full h-full"
      style={{ width: "100%", height: "100%" }}
    >
      <SessionContent initialCode={initialCode} code={code} setCode={setCode} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function SessionContent({
  initialCode,
  code,
  setCode,
}: {
  initialCode: string;
  code: string;
  setCode: (code: string) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [lastSentCode, setLastSentCode] = useState(initialCode);

  // Debounce logic for sending code
  useEffect(() => {
    if (!localParticipant) return;

    const timeoutId = window.setTimeout(async () => {
      if (code === lastSentCode) return;

      try {
        const data = new TextEncoder().encode(
          JSON.stringify({ type: "code_update", code })
        );

        await localParticipant.publishData(data, {
          reliable: true,
        });

        setLastSentCode(code);
        console.log("Sent code update to room");
      } catch (err) {
        // LiveKit will throw here if the room/PC is already closed.
        // We just log and ignore so it doesn't crash the UI.
        console.warn("Failed to publish code update:", err);
      }
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [code, lastSentCode, localParticipant]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between bg-white px-4 py-3 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-slate-700">
            Live Session Active
          </span>
        </div>

        <ControlBar
          variation="minimal"
          controls={{
            microphone: true,
            camera: false,
            screenShare: false,
            chat: false,
          }}
          className="!bg-transparent !shadow-none !border-none !p-0 !gap-2"
        />
      </div>

      <div className="flex-1">
        <CodeEditor
          language="python"
          initialCode={initialCode}
          onCodeChange={setCode}
        />
      </div>
    </div>
  );
}
