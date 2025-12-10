"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAiResponse = generateAiResponse;
const vertexai_1 = require("@google-cloud/vertexai");
// --- CONFIGURATION ---
const PROJECT_ID = "618518132754";
const LOCATION = "us-central1";
// THE KEY CHANGE: Use your specific Endpoint ID instead of "gemini-1.5-flash"
const ENDPOINT_ID = "projects/618518132754/locations/us-central1/endpoints/5275745961627353088";
// Initialize Vertex AI
// (It uses GOOGLE_APPLICATION_CREDENTIALS from docker-compose automatically)
const vertexAI = new vertexai_1.VertexAI({
    project: PROJECT_ID,
    location: LOCATION
});
// Initialize the specific fine-tuned model
const model = vertexAI.getGenerativeModel({
    model: ENDPOINT_ID,
});
async function generateAiResponse(history, latestUserCode, context) {
    if (!context)
        return "I'm ready to start, but I couldn't load the problem details.";
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
        // Start Chat
        // Note: Fine-tuned endpoints behave slightly differently. 
        // We send the system prompt in the config.
        const chat = model.startChat({
            systemInstruction: {
                role: 'system',
                parts: [{ text: systemPrompt }]
            },
            history: vertexHistory,
        });
        // Handle "Empty History" Edge Case
        // If we have history, we technically want to respond to the *last* user message.
        let userMessage = "Hello, I am ready.";
        if (vertexHistory.length > 0 && vertexHistory[vertexHistory.length - 1].role === 'user') {
            const lastMsg = vertexHistory.pop();
            if (lastMsg && lastMsg.parts[0].text) {
                userMessage = lastMsg.parts[0].text;
            }
        }
        // Re-initialize chat with adjusted history (minus the trigger message)
        const chatSession = model.startChat({
            systemInstruction: {
                role: 'system',
                parts: [{ text: systemPrompt }]
            },
            history: vertexHistory
        });
        const result = await chatSession.sendMessage(userMessage);
        const response = await result.response;
        // Safety check for empty candidates
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            console.warn("[LLM] Response was blocked or empty.");
            return "I'm thinking, but I'm having trouble phrasing it right now.";
        }
        return text;
    }
    catch (err) {
        console.error("[LLM] Generation error:", err);
        return "I'm having trouble connecting to my brain right now.";
    }
}
