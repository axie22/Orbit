import CustomNavbar from "./components/CustomNavbar";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

import LoggedOutHero from "./components/home/LoggedOutHero";
import LoggedInHero from "./components/home/LoggedInHero";
import QuickActionsRow from "./components/home/QuickActionsRow";
import RecommendedProblemsCard, {
  RecommendedProblem,
} from "./components/home/RecommendedProblemsCard";


export default async function Home() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session;

  const recommendedProblems: RecommendedProblem[] = [
    {
      id: 1,
      title: "Two Sum",
      difficulty: "Easy",
      category: "Arrays & Hashing",
    },
    {
      id: 2,
      title: "Longest Substring Without Repeating Characters",
      difficulty: "Medium",
      category: "Sliding Window",
    },
    {
      id: 3,
      title: "Binary Tree Level Order Traversal",
      difficulty: "Medium",
      category: "Trees & Graphs",
    },
  ];

  return (
    <div>
      <CustomNavbar />

      <main className="min-h-screen bg-[#F8F9FA] px-6 py-20 flex justify-center">
        <div className="max-w-5xl w-full flex flex-col gap-24">
          {isLoggedIn ? (
            <>
              <LoggedInHero name={session?.user?.name ?? "engineer"} />

              <QuickActionsRow />

              <RecommendedProblemsCard problems={recommendedProblems} />

              <section className="text-center">
                <p className="text-xs text-slate-500 font-mono uppercase tracking-[0.18em]">
                  Orbit
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Consistency beats cramming. Aim for one session a day.
                </p>
              </section>
            </>
          ) : (
            <>
              <LoggedOutHero />
              {/* you can reuse QuickActionsRow here later if you want, or a lighter variant */}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
