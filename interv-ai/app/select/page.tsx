"use client";

import { useState, useEffect } from "react";
import CustomNavbar from "../components/CustomNavbar";
import CategorySidebar from "../components/select/CategorySidebar";

import { Category, Problem, Difficulty, CATEGORIES, 
         ProblemsApiResponse } from "../lib/definitions";

import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Chip,
} from "@heroui/react";

const difficultyColor: Record<Difficulty, "success" | "warning" | "danger"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
};

export default function Select() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("Array");
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null);

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
    try {
      setIsLoading(true);
      setError(null);

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

      // Map API problems → frontend Problem type
      const mapped: Problem[] = data.items.map((p) => ({
        id: Number(p.problemID),
        title: p.title,
        difficulty: p.difficulty,
        category: p.category as Category,
        blurb: p.blurb,
      }));

      setProblems((prev) => (append ? [...prev, ...mapped] : mapped));
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);

      // Reset selected problem if we replaced the list
      if (!append && mapped.length > 0) {
        setSelectedProblemId(mapped[0].id);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
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
          {/* Category Sidebar */}
          <CategorySidebar
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onSelect={(cat) => {
              setSelectedCategory(cat);
            }}
          />

          <div className="flex flex-col gap-6">
            {/* Problem selector list */}
            <Card>
              <CardHeader className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div>
                  <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">
                    Problem Selector
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Pick a problem from{" "}
                    <span className="font-medium">{selectedCategory}</span>{" "}
                    to practice with the AI interviewer.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="bordered"
                    className="text-xs font-mono"
                    onPress={() => {
                      if (filteredProblems.length) {
                        const random =
                          filteredProblems[
                            Math.floor(
                              Math.random() * filteredProblems.length
                            )
                          ];
                        setSelectedProblemId(random.id);
                      }
                    }}
                    isDisabled={filteredProblems.length === 0}
                  >
                    Random
                  </Button>
                </div>
              </CardHeader>

              <CardBody className="p-0">
                {error && (
                  <div className="px-4 py-3 text-xs text-red-600">
                    {error}
                  </div>
                )}

                {isLoading && problems.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    Loading problems...
                  </div>
                ) : filteredProblems.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    No problems in this category yet.
                  </div>
                ) : (
                  <>
                    <ul className="divide-y divide-slate-100">
                      {filteredProblems.map((problem) => {
                        const isActive =
                          problem.id === selectedProblem?.id;
                        return (
                          <li
                            key={problem.id}
                            className={`px-4 py-3 cursor-pointer text-sm flex items-center justify-between gap-3 transition-colors ${
                              isActive
                                ? "bg-slate-900 text-slate-50"
                                : "hover:bg-slate-50 text-slate-800"
                            }`}
                            onClick={() =>
                              setSelectedProblemId(problem.id)
                            }
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {problem.title}
                              </span>
                              <span
                                className={`text-xs ${
                                  isActive
                                    ? "text-slate-200"
                                    : "text-slate-500"
                                }`}
                              >
                                {problem.category}
                              </span>
                            </div>
                            <Chip
                              size="sm"
                              color={difficultyColor[problem.difficulty]}
                              variant={isActive ? "flat" : "bordered"}
                              className="text-[11px] font-mono"
                            >
                              {problem.difficulty.toUpperCase()}
                            </Chip>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Load more button for pagination */}
                    {hasMore && (
                      <div className="px-4 py-3 border-t border-slate-100 flex justify-center">
                        <Button
                          size="sm"
                          variant="bordered"
                          onPress={() =>
                            loadProblems({
                              category: selectedCategory,
                              cursor,
                              append: true,
                            })
                          }
                          isDisabled={isLoading}
                        >
                          {isLoading ? "Loading..." : "Load more"}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardBody>
            </Card>

            {/* Problem preview + Start Session */}
            <Card>
              <CardHeader className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {selectedProblem
                      ? selectedProblem.title
                      : "No problem selected"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Review the prompt, then start a mock interview session.
                  </p>
                </div>
                {selectedProblem && (
                  <Chip
                    size="sm"
                    color={difficultyColor[selectedProblem.difficulty]}
                    variant="flat"
                    className="text-[11px] font-mono"
                  >
                    {selectedProblem.difficulty.toUpperCase()}
                  </Chip>
                )}
              </CardHeader>

              <CardBody className="px-4 py-4 flex flex-col gap-4">
                {selectedProblem ? (
                  <>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {selectedProblem.blurb}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-slate-500 font-mono">
                        Mode:{" "}
                        <span className="font-semibold">
                          Live AI Interview
                        </span>
                      </p>
                      <Button
                        color="primary"
                        radius="sm"
                        className="px-5"
                        onPress={() => {
                          console.log(
                            "Start session for problem id",
                            selectedProblem.id
                          );
                          // e.g. router.push(`/practice?problemId=${selectedProblem.id}`)
                        }}
                      >
                        Start Session
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    Select a problem from the list above, or let the AI
                    pick one for you to begin.
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
