"use client";

import { Difficulty, Problem, Category } from "@/app/lib/definitions";
import { Card, CardHeader, CardBody, Button, Chip, Select, SelectItem, Input } from "@heroui/react";

const difficultyColor: Record<Difficulty, "success" | "warning" | "danger"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
};

type ProblemSelectorCardProps = {
  selectedCategory: Category;
  problems: Problem[];
  selectedProblemId: string | null;
  onSelectProblem: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  // Filters
  filterDifficulty: Difficulty | null;
  onFilterDifficulty: (d: Difficulty | null) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  // Pagination
  onNextPage: () => void;
  onPrevPage: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
};

export default function ProblemSelectorCard({
  selectedCategory,
  problems,
  selectedProblemId,
  onSelectProblem,
  isLoading,
  error,
  filterDifficulty,
  onFilterDifficulty,
  searchTerm,
  onSearchChange,
  onNextPage,
  onPrevPage,
  canGoNext,
  canGoPrev,
}: ProblemSelectorCardProps) {
  const filteredProblems = problems;

  const selectedProblem =
    filteredProblems.find((p) => p.id === selectedProblemId) ||
    filteredProblems[0] ||
    null;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">
            Problem Selector
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pick a problem from{" "}
            <span className="font-medium">{selectedCategory}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <Input
            size="sm"
            placeholder="Search problems..."
            className="w-full sm:w-48"
            classNames={{
              input: "text-xs",
            }}
            value={searchTerm}
            onValueChange={onSearchChange}
            startContent={
              <svg aria-hidden="true" fill="none" focusable="false" height="1em" role="presentation" viewBox="0 0 24 24" width="1em" className="text-default-400 pointer-events-none flex-shrink-0">
                <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                <path d="M22 22L20 20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              </svg>
            }
          />

          {/* Difficulty Filter */}
          <div className="w-full sm:w-32">
            <Select
              size="sm"
              label="Difficulty"
              classNames={{
                trigger: "h-8 min-h-unit-8",
                value: "text-xs",
              }}
              selectedKeys={filterDifficulty ? [filterDifficulty] : []}
              onChange={(e) => onFilterDifficulty(e.target.value as Difficulty | null)}
            >
              <SelectItem key="all" textValue="All">All</SelectItem>
              <SelectItem key="Easy" textValue="Easy">Easy</SelectItem>
              <SelectItem key="Medium" textValue="Medium">Medium</SelectItem>
              <SelectItem key="Hard" textValue="Hard">Hard</SelectItem>
            </Select>
          </div>

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

        {isLoading ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            Loading problems...
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            No problems found.
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 min-h-[300px]">
              {filteredProblems.map((problem) => {
                const isActive = problem.id === selectedProblemId;

                return (
                  <li
                    key={problem.id}
                    className={`px-4 py-3 cursor-pointer text-sm flex items-center justify-between gap-3 transition-colors ${isActive
                      ? "bg-slate-900 text-slate-50"
                      : "hover:bg-slate-50 text-slate-800"
                      }`}
                    onClick={() => onSelectProblem(problem.id)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{problem.title}</span>
                      <span
                        className={`text-xs ${isActive ? "text-slate-200" : "text-slate-500"
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

            {/* Pagination Controls */}
            <div className="px-4 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
              <Button
                size="sm"
                variant="flat"
                onPress={onPrevPage}
                isDisabled={!canGoPrev || isLoading}
                className="text-xs"
              >
                Previous
              </Button>

              <span className="text-xs text-slate-400 font-mono">
                Select Page
              </span>

              <Button
                size="sm"
                variant="flat"
                onPress={onNextPage}
                isDisabled={!canGoNext || isLoading}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
