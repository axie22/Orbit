import "dotenv/config";
import { AccessToken } from "livekit-server-sdk";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  TrackKind,
  dispose,
  Participant,
  AudioStream,
  AudioFrame,
  RemoteTrack,
} from "@livekit/rtc-node";
import { v1 } from "@google-cloud/speech";

const client = new v1.SpeechClient();

const LIVEKIT_URL = process.env.LIVEKIT_URL ?? "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const ROOM_NAME = process.env.ROOM_NAME ?? "";
const AGENT_IDENTITY = process.env.AGENT_IDENTITY ?? "orbit-agent";

let latestCode = "";

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !ROOM_NAME) {
  console.error(
    "Missing LiveKit env vars. Check LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, ROOM_NAME."
  );
  process.exit(1);
}

async function createAgentToken(roomName: string, identity: string) {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });
  return at.toJwt();
}

type SttCallbacks = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (err: Error) => void;
};

export function startGoogleStreamingStt(
  audioStream: AudioStream,
  callbacks: SttCallbacks = {}
) {
  const request = {
    config: {
      encoding: "LINEAR16" as const,
      sampleRateHertz: 16000,
      languageCode: process.env.GCP_SPEECH_LANGUAGE || "en-US",
      enableAutomaticPunctuation: true,
    },
    interimResults: true,
  };

  let sttAlive = true;

  const recognizeStream = client
    .streamingRecognize(request)
    .on("error", (err: Error) => {
      console.error("STT error:", err);
      sttAlive = false;
      callbacks.onError?.(err);
    })
    .on("end", () => {
      console.log("Google STT stream ended");
      sttAlive = false;
    })
    .on("data", (data: any) => {
      const result = data.results?.[0];
      const alt = result?.alternatives?.[0];
      if (!alt) return;

      const text = alt.transcript as string;

      if (result.isFinal) {
        console.log("[STT final]:", text);
        callbacks.onFinal?.(text);
      } else {
        console.log("[STT partial]:", text);
        callbacks.onPartial?.(text);
      }
    });

  (async () => {
    try {
      for await (const frame of audioStream as AsyncIterable<AudioFrame>) {
        if (!sttAlive) break;

        const buffer = Buffer.from(frame.data.buffer);
        try {
          recognizeStream.write(buffer); // 🔊 audio bytes only
        } catch (err) {
          console.warn("Attempted write after stream closed:", err);
          break;
        }
      }
    } finally {
      if (sttAlive) {
        recognizeStream.end();
      }
    }
  })();

  return recognizeStream;
}

async function main() {
  const token = await createAgentToken(ROOM_NAME, AGENT_IDENTITY);

  const room = new Room();
  await room.connect(LIVEKIT_URL, token, {
    autoSubscribe: true,
    dynacast: true,
  });
  console.log("Connected to room:", room.name);

  room
    .on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
      console.log("Participant connected:", p.identity);
    })
    .on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
      console.log("Participant disconnected:", p.identity);
    })
    .on(RoomEvent.DataReceived, (payload, participant) => {
      const from = participant?.identity ?? "unknown";
      try {
        const json = JSON.parse(new TextDecoder().decode(payload));
        console.log("Data from", from, json);
        if (json.type === "code_update") {
          console.log(
            ">> Code update snippet:",
            (json.code as string).slice(0, 120),
            "…"
          );
          latestCode = json.code;
        }
      } catch (err) {
        console.warn("Failed to parse data from", from, err);
      }
    })
    .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      const ids = speakers.map((s) => s.identity).join(", ");
      console.log("Active speakers:", ids || "(none)");
    })
    .on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (publication.kind === TrackKind.KIND_AUDIO) {
          console.log(
            `Subscribed to audio track from ${participant.identity}, source=${publication.source}`
          );

          // Create an AudioStream from the track at 16kHz mono
          const audioStream = new AudioStream(track, 16000, 1);

          // Start STT
          startGoogleStreamingStt(audioStream, {
            onPartial: (text) => {
              // Optional: you can ignore partials for now
              console.log(`[STT partial][${participant.identity}]:`, text);
            },
            onFinal: (text) => {
              console.log(`[STT final][${participant.identity}]:`, text);
              // here is where we will call your LLM API next
              // e.g. send { transcript: text, code: latestCode, room: room.name } to /api/chat
            },
            onError: (err) => {
              console.error("STT error:", err);
            },
          });
        }
      }
    )
    .on(RoomEvent.Disconnected, async () => {
      console.log("Disconnected from room, cleaning up");
      await dispose();
      process.exit(0);
    });

  process.on("SIGINT", async () => {
    console.log("SIGINT received, disconnecting");
    await room.disconnect();
    await dispose();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Worker error:", err);
  process.exit(1);
});
