"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import CustomNavbar from "../components/CustomNavbar";
import CategorySidebar from "../components/select/CategorySidebar";
import ProblemSelectorCard from "../components/select/ProblemSelectorCard";
import ProblemPreviewCard from "../components/select/ProblemPreviewCard";

import {
  Category,
  Problem,
  Difficulty,
  CATEGORIES,
  ProblemsApiResponse,
} from "../lib/definitions";

export default function Select() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<Category>("Array");
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);

  // Filter State
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null); // null = All
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Data State
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  // cursorStack stores the "start key" for each page.
  // Index 0 = Page 1 (cursor: null)
  // Index 1 = Page 2 (cursor: "abc...")
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [nextCursor, setNextCursor] = useState<string | null>(null); // Cursor for the *next* page fetch

  const currentPageIndex = cursorStack.length - 1;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only update if changed
      if (searchTerm !== debouncedSearch) {
        setDebouncedSearch(searchTerm);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearch]);

  const loadProblems = async (
    category: Category,
    diff: Difficulty | null,
    cursor: string | null,
    search: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        category,
        limit: "10", // Smaller limit for pages
      });
      if (diff) params.set("difficulty", diff);
      if (cursor) params.set("cursor", cursor);
      if (search) params.set("search", search);

      const res = await fetch(`/api/problems?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data: ProblemsApiResponse = await res.json();

      const mapped: Problem[] = data.items.map((p) => ({
        id: String(p.problemID),
        title: p.title,
        difficulty: p.difficulty,
        category: p.category as Category,
        description: p.description ?? "",
        companies: p.companies || [],
      }));

      setProblems(mapped);
      setNextCursor(data.nextCursor);

      if (mapped.length > 0) {
        setSelectedProblemId(mapped[0].id);
      } else {
        setSelectedProblemId(null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load problems.");
      setProblems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset when Category or Difficulty or Search changes
  useEffect(() => {
    setCursorStack([null]); // Reset to Page 1
    loadProblems(selectedCategory, difficulty, null, debouncedSearch);
  }, [selectedCategory, difficulty, debouncedSearch]);

  // Handle Pagination
  const handleNext = () => {
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, nextCursor]);
    loadProblems(selectedCategory, difficulty, nextCursor, debouncedSearch);
  };

  const handlePrev = () => {
    if (cursorStack.length <= 1) return;
    const newStack = cursorStack.slice(0, -1);
    const prevCursor = newStack[newStack.length - 1]; // The cursor for the previous page
    setCursorStack(newStack);
    loadProblems(selectedCategory, difficulty, prevCursor, debouncedSearch);
  };

  const selectedProblem =
    problems.find((p) => p.id === selectedProblemId) || null;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <CustomNavbar />
      <main className="px-6 py-10 flex justify-center">
        <div className="max-w-6xl w-full grid gap-8 md:grid-cols-[260px_minmax(0,1fr)]">
          <CategorySidebar
            categories={[...CATEGORIES]}
            selectedCategory={selectedCategory}
            onSelect={(cat) => setSelectedCategory(cat)}
          />

          <div className="flex flex-col gap-6">
            <ProblemSelectorCard
              selectedCategory={selectedCategory}
              problems={problems}
              selectedProblemId={selectedProblemId}
              onSelectProblem={(id) => setSelectedProblemId(String(id))}
              isLoading={isLoading}
              error={error}

              // Filters
              filterDifficulty={difficulty}
              onFilterDifficulty={(d) => {
                // Should allow null if "all"
                if (d === "all" as any) setDifficulty(null);
                else setDifficulty(d);
              }}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}

              // Pagination
              onNextPage={handleNext}
              onPrevPage={handlePrev}
              canGoNext={!!nextCursor}
              canGoPrev={cursorStack.length > 1}
            />

            <ProblemPreviewCard
              selectedProblem={selectedProblem}
              onStartSession={(id) => {
                router.push(`/practice/${id}`);
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
