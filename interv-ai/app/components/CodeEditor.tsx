"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";

type CodeEditorProps = {
  initialCode?: string;
  language?: string;
};

export default function CodeEditor({
  initialCode = "# Write your solution here\n",
  language = "python",
  onCodeChange,
}: CodeEditorProps & { onCodeChange?: (code: string) => void }) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value ?? "";
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput("");
    setError("");

    try {
      const response = await fetch("/api/code/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, language }),
      });

      const data = await response.json();

      if (data.output) {
        setOutput(data.output);
      }

      if (data.error) {
        setError(data.error);
      }

      if (!data.output && !data.error) {
        setOutput("No output");
      }
    } catch (err) {
      setError("Failed to run code");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full rounded-lg border border-gray-200 shadow-sm overflow-hidden bg-white">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            Solution Editor
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              {language}
            </span>
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className={`
                flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors
                ${isRunning
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700 active:bg-green-800"}
              `}
            >
              {isRunning ? "Running..." : "Run Code"}
            </button>
          </div>
        </div>

        <Editor
          height="600px"
          width="100%"
          defaultLanguage={language}
          value={code}
          theme="vs-dark"
          onChange={handleEditorChange}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </div>

      {(output || error) && (
        <div className="w-full rounded-lg border border-gray-200 shadow-sm overflow-hidden bg-gray-900 text-white">
          <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Console Output
            </span>
            <button
              onClick={() => { setOutput(""); setError(""); }}
              className="text-xs text-gray-400 hover:text-white"
            >
              Clear
            </button>
          </div>
          <div className="p-4 font-mono text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
            {output && <div className="text-green-400">{output}</div>}
            {error && <div className="text-red-400 mt-2">{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}