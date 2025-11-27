import CustomNavbar from "./components/CustomNavbar";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session;

  return (
    <div>
      <CustomNavbar />
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-[#F8F9FA]">
      <div className="max-w-2xl flex flex-col items-center text-center gap-8">     
        {isLoggedIn ? (
          <section className="mt-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Welcome back, {session?.user?.name ?? "candidate"}
            </h2>
            <p className="mt-2 text-gray-700">
              Pick a problem difficulty and our AI will interview you on the question
            </p>
          </section>
        ): (
          <>
            <h1 className="text-4xl sm:text-5xl font-mono text-[#1F2937]">
              <span className="text-[#6B7280]">Orbit</span>
            </h1>

            <p className="text-lg sm:text-xl text-[#1F2937] leading-relaxed">
              Your personal AI-powered technical interviewer.  
              Practice coding, system design, and behavioral interviews with real-time feedback.
            </p>
            <section className="mt-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Get started in seconds
              </h2>
              <p className="mt-2 text-gray-700">
                Sign in to unlock coding questions, a Monaco-based editor, and AI feedback powered by Llama.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
    </div>
    
  );
}
