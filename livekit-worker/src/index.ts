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

import express from "express";
import fs from "fs";

// HANDLE GOOGLE AUTH FOR NON-GCP ENVIRONMENTS (DigitalOcean)
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  const credentialsPath = "./google-credentials.json";
  fs.writeFileSync(credentialsPath, process.env.GOOGLE_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  console.log("Detected GOOGLE_CREDENTIALS_JSON, wrote to", credentialsPath);
}


// two added imports for LLM integration
import { getProblemContext } from "./db";
import { generateAiResponseStream } from "./llm";
import { synthesizeSpeechStream } from "./tts";

const app = express();
app.use(express.json());

const client = new v1.SpeechClient();


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


async function playAudioInRoom(
  audioStream: AsyncIterable<Buffer>,
  session: RoomSession,
  interactionId: number
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

    let leftover: Buffer | null = null;

    for await (const chunk of audioStream) {
      // Interruption Check
      if (session.currentInteractionId !== interactionId) {
        console.log(`[TTS] Interrupted! Aborting playback for ID ${interactionId}`);
        break;
      }

      // Concatenate leftover bytes from previous chunk
      let combinedChunk: Buffer = leftover ? Buffer.concat([leftover, chunk]) : chunk;

      // Ensure we have an even number of bytes for Int16Array
      const remainder = combinedChunk.length % 2;
      if (remainder !== 0) {
        leftover = combinedChunk.slice(combinedChunk.length - remainder);
        combinedChunk = combinedChunk.slice(0, combinedChunk.length - remainder);
      } else {
        leftover = null;
      }

      if (combinedChunk.length === 0) continue;

      const int16Array = new Int16Array(
        combinedChunk.buffer,
        combinedChunk.byteOffset,
        combinedChunk.length / 2
      );

      // Feed audio in chunks
      const FRAME_SIZE = 480; // 30ms at 16kHz
      const numFrames = Math.ceil(int16Array.length / FRAME_SIZE);

      for (let i = 0; i < numFrames; i++) {
        // Interruption Check (Inner Loop)
        if (session.currentInteractionId !== interactionId) break;

        const start = i * FRAME_SIZE;
        const end = Math.min(start + FRAME_SIZE, int16Array.length);
        const frameData = int16Array.slice(start, end);

        const audioFrame = new AudioFrame(
          frameData,
          16000,
          1,
          frameData.length
        );

        await session.audioSource.captureFrame(audioFrame);
        // 30ms delay per frame
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    }

    // Process any tiny leftover (unlikely to be audible but good hygiene)
    // Actually, distinct single byte cannot be played in 16-bit. buffer it for next call? 
    // In this context, it's end of stream, so we discard partial sample.

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

  //LLM additional states:
  problemId: string = "1"; // Default
  problemContext: any = null;
  chatHistory: { role: "user" | "model"; text: string }[] = [];
  currentInteractionId: number = 0;

  constructor(roomName: string, problemId?: string) {
    this.roomName = roomName;
    if (problemId) this.problemId = problemId; //added constructor for problemId
    this.identity = `${AGENT_IDENTITY_PREFIX}-${Math.random().toString(36).substring(7)}`;
    this.room = new Room();
  }

  async start() {
    // load RAG context
    this.problemContext = await getProblemContext(this.problemId);


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

        const myInteractionId = ++this.currentInteractionId;

        try {
          this.chatHistory.push({ role: "user", text: text });
          console.log(`[LLM] Generating stream... (ID: ${myInteractionId})`);

          // 1. Start Stream
          const stream = generateAiResponseStream(
            [...this.chatHistory],
            this.latestCode,
            this.problemContext
          );

          let fullReply = "";
          let sentenceBuffer = "";
          let audioQueue: Promise<void> = Promise.resolve();

          const processSentence = (sentence: string) => {
            // Barge-in Check
            if (this.currentInteractionId !== myInteractionId) return;

            const s = sentence.trim();
            if (!s) return;

            console.log(`[Sent to TTS]: "${s}"`);

            // Chain playback
            audioQueue = audioQueue.then(async () => {
              // Barge-in Check before synthesizing
              if (this.currentInteractionId !== myInteractionId) return;

              const stream = synthesizeSpeechStream(s);
              await playAudioInRoom(stream, this, myInteractionId);
            }).catch(err => console.error("Audio chain error:", err));
          };

          for await (const chunk of stream) {
            if (this.currentInteractionId !== myInteractionId) {
              console.log("[LLM] Stream Interrupted.");
              break;
            }

            fullReply += chunk;
            sentenceBuffer += chunk;

            // End of sentence detection
            let boundaryIndex = sentenceBuffer.search(/[.!?\n]/);

            while (boundaryIndex !== -1) {
              const sentence = sentenceBuffer.slice(0, boundaryIndex + 1);
              sentenceBuffer = sentenceBuffer.slice(boundaryIndex + 1);

              processSentence(sentence);
              boundaryIndex = sentenceBuffer.search(/[.!?\n]/);
            }
          }

          // Process remaining buffer
          if (sentenceBuffer.trim() && this.currentInteractionId === myInteractionId) {
            processSentence(sentenceBuffer);
          }

          if (this.currentInteractionId === myInteractionId) {
            console.log(`[LLM Full Reply]:`, fullReply);
            this.chatHistory.push({ role: "model", text: fullReply });
            await audioQueue;
          }

        } catch (err) {
          console.error("Pipeline Error:", err);
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


//replaced googlestreaming to bypass 5 min limit
function startGoogleStreamingStt(
  audioStream: AudioStream,
  callbacks: SttCallbacks = {}
) {
  let recognizeStream: any = null;
  let sttAlive = true;
  let restartTimeout: NodeJS.Timeout | null = null;

  // STT config
  const requestConfig = {
    config: {
      encoding: "LINEAR16" as const,
      sampleRateHertz: 16000,
      languageCode: process.env.GCP_SPEECH_LANGUAGE || "en-US",
      enableAutomaticPunctuation: true,
      model: "latest_long", //optimize for long-form audio
    },
    interimResults: true,
  };

  // restart stream every 4 mins or so to extend interviewing time
  const startStream = () => {
    if (!sttAlive) return;

    console.log("[STT] Starting new Google Speech stream...");

    // clear any existing reset timer
    if (restartTimeout) clearTimeout(restartTimeout);

    // create new stream
    recognizeStream = client
      .streamingRecognize(requestConfig)
      .on("error", (err: any) => {
        // If it's the 305s limit error (code 11), ignore and restart
        // Otherwise, report it.
        if (err.code === 11) {
          console.log("[STT] Stream time limit reached (expected). Rotating...");
        } else {
          console.error("[STT] Error:", err);
          callbacks.onError?.(err);
        }
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

    // schedule a restart in 240 seconds (4 minutes) to be safe, avoids hard limit accidentally
    restartTimeout = setTimeout(() => {
      console.log("[STT] 4 minutes elapsed. Rotating stream to prevent timeout...");
      const oldStream = recognizeStream;

      // start new stream first
      startStream();

      // end old stream
      if (oldStream) {
        oldStream.end();
        // remove listeners to prevent late errors
        oldStream.removeAllListeners();
      }
    }, 240 * 1000);
  };

  startStream();

  // audio loop
  (async () => {
    try {
      for await (const frame of audioStream as AsyncIterable<AudioFrame>) {
        if (!sttAlive) break;

        const buffer = Buffer.from(frame.data.buffer);

        // Write to current active stream
        if (recognizeStream && !recognizeStream.destroyed) {
          try {
            recognizeStream.write(buffer);
          } catch (writeErr) {
            console.warn("[STT] Write failed, restarting stream immediately.");
            startStream();
          }
        }
      }
    } finally {
      sttAlive = false;
      if (restartTimeout) clearTimeout(restartTimeout);
      if (recognizeStream) recognizeStream.end();
    }
  })();

  // kill loop if needed
  return {
    end: () => {
      sttAlive = false;
      if (restartTimeout) clearTimeout(restartTimeout);
      if (recognizeStream) recognizeStream.end();
    }
  };
}

// --- Server ---

const sessions = new Map<string, RoomSession>();

app.post("/join", async (req, res) => {
  const { roomName, problemId } = req.body;
  console.log(`[Worker] Received join request for room: ${roomName}, problemId: ${problemId}`);
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
    const session = new RoomSession(roomName, problemId);
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
