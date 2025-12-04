import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// initialize the Google Generative AI client
const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, problemContext, currentUserCode, conversationHistory } = body;

    if (!message || !problemContext) {
      return NextResponse.json(
        { error: "Message and problem context are required" },
        { status: 400 }
      );
    }

    const systemInstruction = `
      You are an expert Senior Staff Software Engineer conducting a mock technical interview.
      The user is solving the problem: "${problemContext.title}".

      --- PROBLEM DESCRIPTION ---
      ${problemContext.description}

      --- HIDDEN SOLUTION (FOR YOUR EYES ONLY) ---
      ${problemContext.solution_code || "Not provided"}

      --- INTERVIEWER HINTS (Derived from real interviews) ---
      ${problemContext.hints || "No specific hints available"}

      --- CURRENT USER CODE ---
      \`\`\`python
      ${currentUserCode || "// No code submitted yet"}
      \`\`\`

      --- YOUR INSTRUCTIONS ---
      1. Be encouraging but rigorous.
      2. Use the Socratic Method. DO NOT write the code for the user. Ask questions to guide them.
      3. If the user's code has a bug, ask them to trace their code with an example input.
      4. Keep your responses concise (under 3 sentences usually).
      5. If the user is completely stuck, use one of the "INTERVIEWER HINTS" provided above.
      `;

    // initialize the model w system instruction
    const model = client.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
    });

    // build conversation history for context
    const history = (conversationHistory || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // start a chat session with history
    const chat = model.startChat({
      history,
    });

    // send the user's message and get response
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return NextResponse.json(
      {
        success: true,
        response: responseText,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Chat API error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get response from LLM", details: errorMessage },
      { status: 500 }
    );
  }
}