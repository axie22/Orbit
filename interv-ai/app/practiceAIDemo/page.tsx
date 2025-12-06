"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import CodeEditor from "@/app/components/CodeEditor";
import CustomNavbar from "../components/CustomNavbar";

// Interface for chat messages
interface Message {
    role: 'user' | 'model';
    parts: { text: string }[];
}

function PracticeSession() {
    const searchParams = useSearchParams();
    const problemId = searchParams.get("id") || "1";

    // --- STATE ---
    // The code state is now managed here in the parent
    const [code, setCode] = useState<string>("# Write your Python code here...\n");
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Callback to receive code updates from the CodeEditor
    const handleCodeChangeAction = useCallback((newCode: string) => {
        setCode(newCode);
    }, []);

    // Auto-scroll for chat
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // --- HANDLER: Send Message to Python Backend ---
    const sendMessage = async () => {
        if (!inputValue.trim()) return;

        // 1. Update UI immediately with user message
        const newUserMsg: Message = { role: "user", parts: [{ text: inputValue }] };
        const newHistory = [...messages, newUserMsg];

        setMessages(newHistory);
        setInputValue("");
        setIsLoading(true);

        try {
            // 2. Call your Python Backend, sending the current state of 'code'
            const response = await fetch("http://localhost:8000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    problemId: problemId,
                    code: code, // <-- THIS IS THE CRITICAL CODE VALUE
                    history: newHistory
                }),
            });

            if (!response.ok) throw new Error("Backend connection failed");

            const data = await response.json();

            // 3. Update UI with AI response
            const newAiMsg: Message = { role: "model", parts: [{ text: data.reply }] };
            setMessages([...newHistory, newAiMsg]);

        } catch (error) {
            console.error("Error:", error);
            setMessages([
                ...newHistory,
                { role: "model", parts: [{ text: "Error connecting to interviewer. Is the backend running and CodeEditor patched?" }] },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#F8F9FA]">
            <CustomNavbar />

            <main className="flex-1 flex overflow-hidden">
                {/* LEFT PANEL: Code Editor */}
                <div className="w-3/5 border-r border-gray-200 bg-white">
                    {/* We pass the initialCode and the new callback prop */}
                    <CodeEditor
                        initialCode={code}
                        onCodeChangeAction={handleCodeChangeAction}
                        language="python"
                    />
                </div>

                {/* RIGHT PANEL: Chat Interface */}
                <div className="w-2/5 flex flex-col bg-white">
                    {/* Header */}
                    <div className="p-4 border-b bg-gray-50">
                        <h2 className="font-semibold text-gray-700">Interview Session</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Problem ID: {problemId}</p>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-400 mt-10 text-sm">
                                <p>The AI Interviewer is ready.</p>
                                <p>Type <strong>"Hello"</strong> to start.</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                                        ? "bg-[#1A3D64] text-white rounded-br-none"
                                        : "bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200"
                                        }`}
                                >
                                    <strong className="block text-xs opacity-70 mb-1">
                                        {msg.role === "user" ? "You" : "Interviewer"}
                                    </strong>
                                    {msg.parts[0].text}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start animate-pulse">
                                <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-500">
                                    Interviewer is typing...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t bg-gray-50">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 border border-gray-300 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3D64] text-black"
                                placeholder="Explain your approach..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                disabled={isLoading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={isLoading}
                                className={`px-4 py-2 rounded text-sm font-medium text-white transition-colors ${isLoading ? "bg-gray-400" : "bg-[#1A3D64] hover:bg-[#1A3D64]/90"
                                    }`}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Main Page Component wrapped in Suspense (Required for useSearchParams in Next.js)
export default function Practice() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading Interview...</div>}>
            <PracticeSession />
        </Suspense>
    );
}