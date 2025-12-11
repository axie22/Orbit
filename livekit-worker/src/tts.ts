import { ElevenLabsClient } from "elevenlabs";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
    console.error("Missing ELEVENLABS_API_KEY env var.");
    process.exit(1);
}

const client = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});

export async function* synthesizeSpeechStream(text: string): AsyncGenerator<Buffer> {
    try {
        const responseStream = await client.textToSpeech.convert("cjVigY5qzO86Huf0OWal", {
            text,
            model_id: "eleven_turbo_v2_5",
            output_format: "pcm_16000",
        });

        for await (const chunk of responseStream) {
            yield Buffer.from(chunk);
        }
    } catch (err) {
        console.error("[TTS] Synthesis stream error:", err);
        throw err;
    }
}
