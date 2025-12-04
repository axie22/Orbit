"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div
      className="prose prose-slate prose-sm max-w-none
                 prose-pre:bg-slate-900 prose-pre:text-slate-50
                 prose-code:text-[13px] prose-code:before:hidden prose-code:after:hidden"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
