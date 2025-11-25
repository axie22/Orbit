import AuthButton from "./components/AuthButton";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gray-50">
      <div className="max-w-2xl flex flex-col items-center text-center gap-8">
        
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
          Interv<span className="text-blue-600">AI</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-700 leading-relaxed">
          Your personal AI-powered technical interviewer.  
          Practice coding, system design, and behavioral interviews with real-time feedback.
        </p>

        <div className="mt-4">
          <AuthButton />
        </div>

        <p className="text-sm text-gray-500 max-w-md">
          Sign in to start an interview session powered by Llama and our custom curated datasets.
        </p>
      </div>
    </main>
  );
}
