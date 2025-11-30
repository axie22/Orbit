"use client";

import { useState, useEffect } from "react";
import CustomNavbar from "../components/CustomNavbar";
import CategorySidebar from "../components/select/CategorySidebar";
import ProblemSelectorCard from "../components/select/ProblemSelectorCard";
import ProblemPreviewCard from "../components/select/ProblemPreviewCard";

import {
  Category,
  Problem,
  CATEGORIES,
  ProblemsApiResponse,
} from "../lib/definitions";

export default function Select() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("Array");
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(
    null
  );

  const [problems, setProblems] = useState<Problem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadProblems = async ({
    category,
    cursor: cursorArg,
    append,
  }: {
    category: Category;
    cursor?: string | null;
    append?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        category,
        limit: "20",
      });
      if (cursorArg) params.set("cursor", cursorArg);

      const res = await fetch(`/api/problems?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch problems (status ${res.status})`);
      }

      const data: ProblemsApiResponse = await res.json();

      const mapped: Problem[] = data.items.map((p) => ({
        id: Number(p.problemID),
        title: p.title,
        difficulty: p.difficulty,
        category: p.category as Category,
        description: p.description ?? "",
      }));

      setProblems((prev) => (append ? [...prev, ...mapped] : mapped));
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);

      if (!append && mapped.length > 0) {
        setSelectedProblemId(mapped[0].id);
      }
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Failed to load problems.";
      setError(message);
      setProblems([]);
      setCursor(null);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSelectedProblemId(null);
    setProblems([]);
    setCursor(null);
    setHasMore(false);

    loadProblems({ category: selectedCategory, append: false });
  }, [selectedCategory]);

  const filteredProblems = problems;

  const selectedProblem =
    filteredProblems.find((p) => p.id === selectedProblemId) ||
    filteredProblems[0] ||
    null;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <CustomNavbar />
      <main className="px-6 py-10 flex justify-center">
        <div className="max-w-6xl w-full grid gap-8 md:grid-cols-[260px_minmax(0,1fr)]">
          <CategorySidebar
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onSelect={(cat) => {
              setSelectedCategory(cat);
            }}
          />

          <div className="flex flex-col gap-6">
            <ProblemSelectorCard
              selectedCategory={selectedCategory}
              problems={filteredProblems}
              selectedProblemId={selectedProblemId}
              onSelectProblem={(id) => setSelectedProblemId(id)}
              isLoading={isLoading}
              error={error}
              hasMore={hasMore}
              onLoadMore={() =>
                loadProblems({
                  category: selectedCategory,
                  cursor,
                  append: true,
                })
              }
            />

            <ProblemPreviewCard
              selectedProblem={selectedProblem}
              onStartSession={(id) => {
                console.log("Start session for problem id", id);
                // later we push to /practice page with problemId={id}
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
