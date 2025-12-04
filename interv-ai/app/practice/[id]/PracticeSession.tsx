"use client";

import {
    LiveKitRoom,
    RoomAudioRenderer,
    ControlBar,
    useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect, useState, useCallback } from "react";
import CodeEditor from "@/app/components/CodeEditor";
import { RoomEvent, DataPacket_Kind } from "livekit-client";

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
    const [username] = useState(() => `user-${Math.random().toString(36).slice(2, 7)}`);
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

    if (token === "") {
        return <div>Connecting to session...</div>;
    }

    return (
        <LiveKitRoom
            video={false}
            audio={true}
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            data-lk-theme="default"
            style={{ height: "100%" }}
        >
            <SessionContent
                initialCode={initialCode}
                code={code}
                setCode={setCode}
            />
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
    const [lastSentCode, setLastSentCode] = useState(initialCode);

    // Debounce logic for sending code
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (code !== lastSentCode && localParticipant) {
                const data = new TextEncoder().encode(
                    JSON.stringify({ type: "code_update", code })
                );
                localParticipant.publishData(data, { reliable: true });
                setLastSentCode(code);
                console.log("Sent code update to room");
            }
        }, 2000); // 2 second debounce

        return () => clearTimeout(timeoutId);
    }, [code, lastSentCode, localParticipant]);

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">Live Session Active</span>
                </div>
                <ControlBar variation="minimal" controls={{ microphone: true, camera: false, screenShare: false, chat: false }} />
            </div>

            <CodeEditor
                language="python"
                initialCode={initialCode}
                onCodeChange={setCode}
            />
        </div>
    );
}
