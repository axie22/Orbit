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
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);

  return (
    <div className="w-full max-w-3xl rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">
          Solution Editor
        </span>
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          {language}
        </span>
      </div>

      {/* Monaco editor */}
      <Editor
        height="600px"
        width="1000px"
        defaultLanguage={language}
        value={code}
        theme="vs-dark"
        onChange={(value) => setCode(value ?? "")}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
        }}
      />
    </div>
  );
}
