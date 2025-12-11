import { ElevenLabsClient } from "elevenlabs";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
    console.error("Missing ELEVENLABS_API_KEY env var.");
    process.exit(1);
}

const client = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});

export async function synthesizeSpeech(text: string): Promise<Buffer> {
    try {
        const responseStream = await client.textToSpeech.convert("cjVigY5qzO86Huf0OWal", {
            text,
            model_id: "eleven_turbo_v2_5",
            output_format: "pcm_16000",
        });

        const chunks: Buffer[] = [];
        for await (const chunk of responseStream) {
            chunks.push(Buffer.from(chunk));
        }
        const audioBuffer = Buffer.concat(chunks);

        console.log(`[TTS] Synthesized ${text.length} characters using ElevenLabs`);
        return audioBuffer;
    } catch (err) {
        console.error("[TTS] Synthesis error:", err);
        throw err;
    }
}
