import { VertexAI } from '@google-cloud/vertexai';

// --- CONFIGURATION ---
const PROJECT_ID = "618518132754";
const LOCATION = "us-central1";

// THE KEY CHANGE: Use your specific Endpoint ID instead of "gemini-1.5-flash"
const ENDPOINT_ID = "projects/618518132754/locations/us-central1/endpoints/5275745961627353088";

// Initialize Vertex AI
// (It uses GOOGLE_APPLICATION_CREDENTIALS from docker-compose automatically)
const vertexAI = new VertexAI({
    project: PROJECT_ID,
    location: LOCATION
});

// Initialize the specific fine-tuned model
const model = vertexAI.getGenerativeModel({
    model: ENDPOINT_ID,
});

export async function* generateAiResponseStream(
    history: { role: string; text: string }[],
    latestUserCode: string,
    context: any
): AsyncGenerator<string> {
    if (!context) {
        yield "I'm ready to start, but I couldn't load the problem details.";
        return;
    }

    const systemPrompt = `
    You are an expert Senior Staff Software Engineer conducting a mock technical interview.
    The user is solving the problem: "${context.title}".

    --- PROBLEM DESCRIPTION ---
    ${context.description}

    --- HIDDEN SOLUTION (FOR YOUR EYES ONLY) ---
    ${context.solution_code || "Not provided"}

    --- INTERVIEWER HINTS ---
    ${context.hints || "No specific hints available"}
    
    --- CANDIDATE CODE ---
    \`\`\`python
    ${latestUserCode || "# No code written yet"}
    \`\`\`

    --- YOUR INSTRUCTIONS ---
    1. Be encouraging but rigorous.
    2. Use the Socratic Method. DO NOT give the answer. Ask questions.
    3. Keep your responses CONCISE (1-2 sentences max) because you are speaking.
    4. If the user is silent or stuck, offer a small hint.
  `;

    try {
        // Convert history to Vertex format
        const vertexHistory = history.map(msg => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }]
        }));

        // Handle "Empty History" Edge Case
        let userMessage = "Hello, I am ready.";
        if (vertexHistory.length > 0 && vertexHistory[vertexHistory.length - 1].role === 'user') {
            const lastMsg = vertexHistory.pop();
            if (lastMsg && lastMsg.parts[0].text) {
                userMessage = lastMsg.parts[0].text;
            }
        }

        // Start Chat
        const chatSession = model.startChat({
            systemInstruction: {
                role: 'system',
                parts: [{ text: systemPrompt }]
            },
            history: vertexHistory
        });

        const streamingResult = await chatSession.sendMessageStream(userMessage);

        for await (const item of streamingResult.stream) {
            const text = item.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                yield text;
            }
        }

    } catch (err) {
        console.error("[LLM] Generation error:", err);
        yield "I'm having trouble connecting to my brain right now.";
    }
}