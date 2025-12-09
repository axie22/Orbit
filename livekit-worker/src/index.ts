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
  AudioSource,
  LocalAudioTrack,
  TrackSource,
  TrackPublishOptions,
} from "@livekit/rtc-node";
import { v1 } from "@google-cloud/speech";
import { v1 as ttsV1 } from "@google-cloud/text-to-speech";
import express from "express";

const app = express();
app.use(express.json());

const client = new v1.SpeechClient();
const ttsClient = new ttsV1.TextToSpeechClient();

const LIVEKIT_URL = process.env.LIVEKIT_URL ?? "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const AGENT_IDENTITY_PREFIX = process.env.AGENT_IDENTITY ?? "orbit-agent";

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error(
    "Missing LiveKit env vars. Check LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET."
  );
  process.exit(1);
}

// --- TTS Functions ---
async function synthesizeSpeech(text: string): Promise<Buffer> {
  try {
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: "en-US",
        name: "en-US-Neural2-J", // Male voice
        ssmlGender: "MALE" as const,
      },
      audioConfig: {
        audioEncoding: "LINEAR16" as const,
        sampleRateHertz: 16000,
      },
    });

    if (!response.audioContent) {
      throw new Error("No audio content in TTS response");
    }

    console.log(`[TTS] Synthesized ${text.length} characters`);
    return Buffer.from(response.audioContent as Uint8Array);
  } catch (err) {
    console.error("[TTS] Synthesis error:", err);
    throw err;
  }
}

async function playAudioInRoom(
  audioBuffer: Buffer,
  session: RoomSession
): Promise<void> {
  try {
    if (!session.audioSource) {
      session.audioSource = new AudioSource(16000, 1);
    }

    if (!session.audioTrack) {
      session.audioTrack = LocalAudioTrack.createAudioTrack(
        "ai-voice",
        session.audioSource
      );
      await session.room.localParticipant!.publishTrack(
        session.audioTrack,
        new TrackPublishOptions({})
      );
      console.log(`[${session.roomName}] Published AI audio track`);
    }

    // Convert Buffer to Int16Array
    const int16Array = new Int16Array(
      audioBuffer.buffer,
      audioBuffer.byteOffset,
      audioBuffer.length / 2
    );

    // Feed audio in chunks to avoid buffer overflow
    const FRAME_SIZE = 480; // 30ms at 16kHz
    const numFrames = Math.ceil(int16Array.length / FRAME_SIZE);

    console.log(
      `[TTS] Playing ${int16Array.length} samples (${numFrames} frames)`
    );

    for (let i = 0; i < numFrames; i++) {
      const start = i * FRAME_SIZE;
      const end = Math.min(start + FRAME_SIZE, int16Array.length);
      const frameData = int16Array.slice(start, end);

      // Create AudioFrame
      const audioFrame = new AudioFrame(
        frameData,
        16000,
        1,
        frameData.length
      );

      await session.audioSource.captureFrame(audioFrame);

      // Small delay to match real-time playback (30ms per frame)
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    console.log(`[TTS] Finished playing audio`);
  } catch (err) {
    console.error("[TTS] Playback error:", err);
    throw err;
  }
}

class RoomSession {
  roomName: string;
  identity: string;
  room: Room;
  latestCode: string = "";
  sttStreams: Map<string, any> = new Map();
  audioSource: AudioSource | null = null;
  audioTrack: LocalAudioTrack | null = null;

  constructor(roomName: string) {
    this.roomName = roomName;
    this.identity = `${AGENT_IDENTITY_PREFIX}-${Math.random().toString(36).substring(7)}`;
    this.room = new Room();
  }

  async start() {
    const token = await this.createAgentToken(this.roomName, this.identity);

    await this.room.connect(LIVEKIT_URL, token, {
      autoSubscribe: true,
      dynacast: true,
    });
    console.log(`[${this.roomName}] Connected as ${this.identity}`);

    this.room
      .on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
        console.log(`[${this.roomName}] Participant connected:`, p.identity);
      })
      .on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
        console.log(`[${this.roomName}] Participant disconnected:`, p.identity);
      })
      .on(RoomEvent.DataReceived, (payload, participant) => {
        const from = participant?.identity ?? "unknown";
        try {
          const json = JSON.parse(new TextDecoder().decode(payload));
          if (json.type === "code_update") {
            this.latestCode = json.code;
            console.log(`[${this.roomName}] Code update from ${from}`);
          }
        } catch (err) {
          // ignore non-json
        }
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
              `[${this.roomName}] Subscribed to audio from ${participant.identity}`
            );
            this.handleAudioTrack(track, participant);
          }
        }
      )
      .on(RoomEvent.Disconnected, () => {
        console.log(`[${this.roomName}] Disconnected`);
        this.cleanup();
      });
  }

  async createAgentToken(roomName: string, identity: string) {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      ttl: 60 * 60,
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    return at.toJwt();
  }

  handleAudioTrack(track: RemoteTrack, participant: RemoteParticipant) {
    const audioStream = new AudioStream(track, 16000, 1);
    const sttStream = startGoogleStreamingStt(audioStream, {
      onFinal: async (text) => {
        console.log(`[STT final][${participant.identity}]:`, text);

        try {
          // TEMPORARY: Hardcoded response for testing TTS
          // const response = await fetch("http://web-app:3000/api/llm-chat", { ... });

          console.log(`[LLM Proxy] Skipped fetch for testing.`);
          const aiReply = "This is a hardcoded response. I am effectively speaking back to you to test the audio synthesis system.";
          console.log(`[LLM Response]:`, aiReply);

          // Synthesize and play audio
          const audioBuffer = await synthesizeSpeech(aiReply);
          await playAudioInRoom(audioBuffer, this);
        } catch (err) {
          console.error(`[LLM/TTS Error]:`, err);
        }
      },
      onError: (err) => {
        console.error(`[STT error][${participant.identity}]:`, err);
      },
    });
    this.sttStreams.set(participant.identity, sttStream);
  }

  cleanup() {
    this.sttStreams.forEach((stream) => stream.end());
    this.sttStreams.clear();
    // Room disconnect is handled by the event or caller
  }

  async stop() {
    await this.room.disconnect();
    this.cleanup();
  }
}


type SttCallbacks = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (err: Error) => void;
};

function startGoogleStreamingStt(
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
        callbacks.onPartial?.(text);
      }
    });

  (async () => {
    try {
      for await (const frame of audioStream as AsyncIterable<AudioFrame>) {
        if (!sttAlive) break;
        const buffer = Buffer.from(frame.data.buffer);
        try {
          recognizeStream.write(buffer);
        } catch (err) {
          break;
        }
      }
    } finally {
      if (sttAlive) recognizeStream.end();
    }
  })();

  return recognizeStream;
}

// --- Server ---

const sessions = new Map<string, RoomSession>();

app.post("/join", async (req, res) => {
  const { roomName } = req.body;
  if (!roomName) {
    res.status(400).json({ error: "Missing roomName" });
    return;
  }

  if (sessions.has(roomName)) {
    console.log(`Already in room ${roomName}`);
    res.json({ message: "Already joined", roomName });
    return;
  }

  try {
    const session = new RoomSession(roomName);
    await session.start();
    sessions.set(roomName, session);

    // Auto-cleanup if room disconnects
    session.room.on(RoomEvent.Disconnected, () => {
      sessions.delete(roomName);
    });

    res.json({ message: "Joined room", roomName, identity: session.identity });
  } catch (err: any) {
    console.error("Failed to join room:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Worker service listening on port ${PORT}`);
});

// Cleanup on exit
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  for (const session of sessions.values()) {
    await session.stop();
  }
  await dispose();
  process.exit(0);
});
