import CustomNavbar from "@/app/components/CustomNavbar";
import CodeEditor from "@/app/components/CodeEditor";

import MarkdownRenderer from "../../components/MarkdownRenderer";
import VoiceRecorderSection from "../VoiceRecorderSection";
  

export default async function PracticePage({ params, }: { params: Promise<{ id: string }>; }) {
    const { id } = await params;   

    console.log("PracticePage fetching:", id);

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/problem/${id}`, {
    cache: "no-store",
    });

    if (!res.ok) {
    return (
        <div className="mt-20 text-red-600 text-xl flex justify-center">
        Problem not found.
        </div>
    );
  }

  const problem = await res.json();

  return (
    <div>
      <CustomNavbar />
      <main className="px-6 py-10 flex flex-col items-center min-h-screen">
        <h1 className="text-3xl font-semibold mb-4">{problem.title}</h1>

        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 max-w-3xl mb-10">
          <h2 className="text-xl font-medium mb-3">Description</h2>
          <MarkdownRenderer content={problem.description}/>
        </div>

        <VoiceRecorderSection />

        <CodeEditor language="python" initialCode="# Write your solution here" />
      </main>
    </div>
  );
}
