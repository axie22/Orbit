"use client";

import { Difficulty, Problem, Category } from "@/app/lib/definitions";
import { Card, CardHeader, CardBody, Button, Chip } from "@heroui/react";

const difficultyColor: Record<Difficulty, "success" | "warning" | "danger"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
};

type ProblemSelectorCardProps = {
  selectedCategory: Category;
  problems: Problem[];
  selectedProblemId: number | null;
  onSelectProblem: (id: number) => void;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
};

export default function ProblemSelectorCard({
  selectedCategory,
  problems,
  selectedProblemId,
  onSelectProblem,
  isLoading,
  error,
  hasMore,
  onLoadMore,
}: ProblemSelectorCardProps) {
  const filteredProblems = problems;
  const selectedProblem =
    filteredProblems.find((p) => p.id === selectedProblemId) ||
    filteredProblems[0] ||
    null;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">
            Problem Selector
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pick a problem from{" "}
            <span className="font-medium">{selectedCategory}</span> to practice
            with the AI interviewer.
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
                    Math.floor(Math.random() * filteredProblems.length)
                  ];
                onSelectProblem(random.id);
              }
            }}
            isDisabled={filteredProblems.length === 0}
          >
            Random
          </Button>
        </div>
      </CardHeader>

      <CardBody className="p-0">
        {error && <div className="px-4 py-3 text-xs text-red-600">{error}</div>}

        {isLoading && filteredProblems.length === 0 ? (
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
                const isActive = problem.id === selectedProblem?.id;
                return (
                  <li
                    key={problem.id}
                    className={`px-4 py-3 cursor-pointer text-sm flex items-center justify-between gap-3 transition-colors ${
                      isActive
                        ? "bg-slate-900 text-slate-50"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                    onClick={() => onSelectProblem(problem.id)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{problem.title}</span>
                      <span
                        className={`text-xs ${
                          isActive ? "text-slate-200" : "text-slate-500"
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

            {hasMore && (
              <div className="px-4 py-3 border-t border-slate-100 flex justify-center">
                <Button
                  size="sm"
                  variant="bordered"
                  onPress={onLoadMore}
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
  );
}
