import AuthButton from "./components/AuthButton";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-[#F8F9FA]">
      <div className="max-w-2xl flex flex-col items-center text-center gap-8">
        
        <h1 className="text-4xl sm:text-5xl font-mono text-[#1F2937]">
          Interv<span className="text-[#6B7280  ]">AI</span>
        </h1>

        <p className="text-lg sm:text-xl text-[#1F2937] leading-relaxed">
          Your personal AI-powered technical interviewer.  
          Practice coding, system design, and behavioral interviews with real-time feedback.
        </p>

        <div className="mt-4">
          <AuthButton />
        </div>

        <p className="text-sm text-[#1F2937] max-w-md">
          Sign in to start an interview session powered by Llama and our custom curated datasets.
        </p>
      </div>
    </main>
  );
}
