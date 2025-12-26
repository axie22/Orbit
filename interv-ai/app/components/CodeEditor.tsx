"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Card, CardHeader, CardBody, Button, Divider, ScrollShadow } from "@heroui/react";

type CodeEditorProps = {
  initialCode?: string;
  language?: string;
  onCodeChange?: (code: string) => void;
};

export default function CodeEditor({
  initialCode = "# Write your solution here\n",
  language = "python",
  onCodeChange,
}: CodeEditorProps) {
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
      <Card className="w-full border-none shadow-sm bg-white" radius="lg">
        <CardHeader className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Solution Editor
            </span>
            <div className="px-2 py-0.5 rounded-full bg-slate-200/60 text-[10px] font-mono font-medium text-slate-600 uppercase tracking-wide">
              {language}
            </div>
          </div>
          <Button
            size="sm"
            color="success"
            variant="flat"
            isLoading={isRunning}
            onPress={handleRunCode}
            className="font-medium text-xs px-4 h-8 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
          >
            {isRunning ? "Running..." : "Run Code"}
          </Button>
        </CardHeader>

        <Divider className="bg-slate-100" />

        <CardBody className="p-0 overflow-hidden">
          <Editor
            height="500px" // Slightly reduced to fit better with output
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
              padding: { top: 16, bottom: 16 },
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          />
        </CardBody>
      </Card>

      {(output || error) && (
        <Card className="w-full border-none shadow-sm bg-slate-900 text-slate-300" radius="lg">
          <CardHeader className="flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-slate-950/30">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Console Output
            </span>
            <Button
              size="sm"
              variant="light"
              color="default"
              className="h-6 min-w-0 px-2 text-[10px] text-slate-500 hover:text-slate-300"
              onPress={() => { setOutput(""); setError(""); }}
            >
              Clear
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            <ScrollShadow className="max-h-60">
              <div className="p-4 font-mono text-sm whitespace-pre-wrap">
                {output && <div className="text-emerald-400">{output}</div>}
                {error && <div className="text-rose-400 mt-2 pb-2 border-b border-rose-900/30 mb-2">Error Execution:</div>}
                {error && <div className="text-rose-300/90">{error}</div>}
              </div>
            </ScrollShadow>
          </CardBody>
        </Card>
      )}
    </div>
  );
}