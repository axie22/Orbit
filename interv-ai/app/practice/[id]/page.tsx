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
      <div className="min-h-screen bg-[#F8F9FA]">
        <CustomNavbar />
        <main className="mt-20 text-red-600 text-xl flex justify-center">
          Problem not found.
        </main>
      </div>
    );
  }

  const problem = await res.json();

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <CustomNavbar />
      <main className="px-6 py-10 flex justify-center">
        <section className="grid gap-8 md:grid-cols-[1fr_2fr] items-start">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-center text-slate-900">{problem.title}</h1>
              <div className="flex flex-col gap-6">
                <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                  <h2 className="text-xl font-medium mb-3 text-slate-900">
                    Description
                  </h2>
                  <MarkdownRenderer content={problem.description} />
                </div>

                <div className="flex justify-center md:justify-start">
                  <VoiceRecorderSection />
                </div>
              </div>
            </div>

            <div className="flex flex-col h-full">
              <CodeEditor
                language="python"
                initialCode="# Write your solution here"
              />
            </div>
          </section>
      </main>
    </div>
  );
}
