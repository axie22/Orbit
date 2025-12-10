"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const livekit_server_sdk_1 = require("livekit-server-sdk");
const rtc_node_1 = require("@livekit/rtc-node");
const speech_1 = require("@google-cloud/speech");
// Google TTS removed
const express_1 = __importDefault(require("express"));
// two added imports for LLM integration
const db_1 = require("./db");
const llm_1 = require("./llm");
const tts_1 = require("./tts");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const client = new speech_1.v1.SpeechClient();
const LIVEKIT_URL = process.env.LIVEKIT_URL ?? "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const AGENT_IDENTITY_PREFIX = process.env.AGENT_IDENTITY ?? "orbit-agent";
if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    console.error("Missing LiveKit env vars. Check LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.");
    process.exit(1);
}
// --- TTS Functions ---
// synthesizeSpeech is now imported from ./tts.ts
async function playAudioInRoom(audioBuffer, session) {
    try {
        if (!session.audioSource) {
            session.audioSource = new rtc_node_1.AudioSource(16000, 1);
        }
        if (!session.audioTrack) {
            session.audioTrack = rtc_node_1.LocalAudioTrack.createAudioTrack("ai-voice", session.audioSource);
            await session.room.localParticipant.publishTrack(session.audioTrack, new rtc_node_1.TrackPublishOptions({}));
            console.log(`[${session.roomName}] Published AI audio track`);
        }
        // Convert Buffer to Int16Array
        const int16Array = new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.length / 2);
        // Feed audio in chunks to avoid buffer overflow
        const FRAME_SIZE = 480; // 30ms at 16kHz
        const numFrames = Math.ceil(int16Array.length / FRAME_SIZE);
        console.log(`[TTS] Playing ${int16Array.length} samples (${numFrames} frames)`);
        for (let i = 0; i < numFrames; i++) {
            const start = i * FRAME_SIZE;
            const end = Math.min(start + FRAME_SIZE, int16Array.length);
            const frameData = int16Array.slice(start, end);
            // Create AudioFrame
            const audioFrame = new rtc_node_1.AudioFrame(frameData, 16000, 1, frameData.length);
            await session.audioSource.captureFrame(audioFrame);
            // Small delay to match real-time playback (30ms per frame)
            await new Promise((resolve) => setTimeout(resolve, 30));
        }
        console.log(`[TTS] Finished playing audio`);
    }
    catch (err) {
        console.error("[TTS] Playback error:", err);
        throw err;
    }
}
class RoomSession {
    constructor(roomName, problemId) {
        this.latestCode = "";
        this.sttStreams = new Map();
        this.audioSource = null;
        this.audioTrack = null;
        //LLM additional states:
        this.problemId = "1"; // Default
        this.problemContext = null;
        this.chatHistory = [];
        this.isProcessing = false; // lock to prevent double-talk so LLM doesnt glitch out when processing mult
        this.roomName = roomName;
        if (problemId)
            this.problemId = problemId; //added constructor for problemId
        this.identity = `${AGENT_IDENTITY_PREFIX}-${Math.random().toString(36).substring(7)}`;
        this.room = new rtc_node_1.Room();
    }
    async start() {
        // load RAG context
        this.problemContext = await (0, db_1.getProblemContext)(this.problemId);
        const token = await this.createAgentToken(this.roomName, this.identity);
        await this.room.connect(LIVEKIT_URL, token, {
            autoSubscribe: true,
            dynacast: true,
        });
        console.log(`[${this.roomName}] Connected as ${this.identity}`);
        this.room
            .on(rtc_node_1.RoomEvent.ParticipantConnected, (p) => {
            console.log(`[${this.roomName}] Participant connected:`, p.identity);
        })
            .on(rtc_node_1.RoomEvent.ParticipantDisconnected, (p) => {
            console.log(`[${this.roomName}] Participant disconnected:`, p.identity);
        })
            .on(rtc_node_1.RoomEvent.DataReceived, (payload, participant) => {
            const from = participant?.identity ?? "unknown";
            try {
                const json = JSON.parse(new TextDecoder().decode(payload));
                if (json.type === "code_update") {
                    this.latestCode = json.code;
                    console.log(`[${this.roomName}] Code update from ${from}`);
                }
            }
            catch (err) {
                // ignore non-json
            }
        })
            .on(rtc_node_1.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            if (publication.kind === rtc_node_1.TrackKind.KIND_AUDIO) {
                console.log(`[${this.roomName}] Subscribed to audio from ${participant.identity}`);
                this.handleAudioTrack(track, participant);
            }
        })
            .on(rtc_node_1.RoomEvent.Disconnected, () => {
            console.log(`[${this.roomName}] Disconnected`);
            this.cleanup();
        });
    }
    async createAgentToken(roomName, identity) {
        const at = new livekit_server_sdk_1.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
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
    handleAudioTrack(track, participant) {
        const audioStream = new rtc_node_1.AudioStream(track, 16000, 1);
        const sttStream = startGoogleStreamingStt(audioStream, {
            onFinal: async (text) => {
                console.log(`[STT final][${participant.identity}]:`, text);
                // prevent overlapping processing
                if (this.isProcessing)
                    return;
                this.isProcessing = true;
                try {
                    // updated audiohandle for actual finetuned LLM
                    // const response = await fetch("http://web-app:3000/api/llm-chat", { ... });
                    //first add/update chat history
                    this.chatHistory.push({ role: "user", text: text });
                    // 2. ask LLM for response
                    console.log("[LLM] Generating response...");
                    const aiReply = await (0, llm_1.generateAiResponse)([...this.chatHistory], // pass a copy of chathistory for context
                    this.latestCode, this.problemContext);
                    console.log(`[LLM Response]:`, aiReply);
                    // 3. save AI response to history
                    this.chatHistory.push({ role: "model", text: aiReply });
                    // synthesize and play audio (tts service, added processing)
                    const audioBuffer = await (0, tts_1.synthesizeSpeech)(aiReply);
                    await playAudioInRoom(audioBuffer, this);
                }
                catch (err) {
                    console.error("Pipeline Error:", err);
                }
                finally {
                    this.isProcessing = false;
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
//replaced googlestreaming to bypass 5 min limit
function startGoogleStreamingStt(audioStream, callbacks = {}) {
    let recognizeStream = null;
    let sttAlive = true;
    let restartTimeout = null;
    // STT config
    const requestConfig = {
        config: {
            encoding: "LINEAR16",
            sampleRateHertz: 16000,
            languageCode: process.env.GCP_SPEECH_LANGUAGE || "en-US",
            enableAutomaticPunctuation: true,
            model: "latest_long", //optimize for long-form audio
        },
        interimResults: true,
    };
    // restart stream every 4 mins or so to extend interviewing time
    const startStream = () => {
        if (!sttAlive)
            return;
        console.log("[STT] Starting new Google Speech stream...");
        // clear any existing reset timer
        if (restartTimeout)
            clearTimeout(restartTimeout);
        // create new stream
        recognizeStream = client
            .streamingRecognize(requestConfig)
            .on("error", (err) => {
            // If it's the 305s limit error (code 11), ignore and restart
            // Otherwise, report it.
            if (err.code === 11) {
                console.log("[STT] Stream time limit reached (expected). Rotating...");
            }
            else {
                console.error("[STT] Error:", err);
                callbacks.onError?.(err);
            }
        })
            .on("data", (data) => {
            const result = data.results?.[0];
            const alt = result?.alternatives?.[0];
            if (!alt)
                return;
            const text = alt.transcript;
            if (result.isFinal) {
                console.log("[STT final]:", text);
                callbacks.onFinal?.(text);
            }
            else {
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
            for await (const frame of audioStream) {
                if (!sttAlive)
                    break;
                const buffer = Buffer.from(frame.data.buffer);
                // Write to current active stream
                if (recognizeStream && !recognizeStream.destroyed) {
                    try {
                        recognizeStream.write(buffer);
                    }
                    catch (writeErr) {
                        console.warn("[STT] Write failed, restarting stream immediately.");
                        startStream();
                    }
                }
            }
        }
        finally {
            sttAlive = false;
            if (restartTimeout)
                clearTimeout(restartTimeout);
            if (recognizeStream)
                recognizeStream.end();
        }
    })();
    // kill loop if needed
    return {
        end: () => {
            sttAlive = false;
            if (restartTimeout)
                clearTimeout(restartTimeout);
            if (recognizeStream)
                recognizeStream.end();
        }
    };
}
// --- Server ---
const sessions = new Map();
app.post("/join", async (req, res) => {
    const { roomName, problemId } = req.body; // <--- added problemId fetch
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
        const session = new RoomSession(roomName, problemId); // <--- pass problemId
        await session.start();
        sessions.set(roomName, session);
        // Auto-cleanup if room disconnects
        session.room.on(rtc_node_1.RoomEvent.Disconnected, () => {
            sessions.delete(roomName);
        });
        res.json({ message: "Joined room", roomName, identity: session.identity });
    }
    catch (err) {
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
    await (0, rtc_node_1.dispose)();
    process.exit(0);
});
