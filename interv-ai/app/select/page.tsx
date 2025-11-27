"use client";

import { useState } from "react";
import CustomNavbar from "../components/CustomNavbar";
import CategorySidebar from "../components/CategorySidebar";

import { Category, Problem, Difficulty, CATEGORIES } from "../lib/definitions";

import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Chip,
} from "@heroui/react";


// Fake data that we'll replace once its uploaded
const PROBLEMS: Problem[] = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    category: "Arrays",
    blurb: "Given an array of integers, return indices of two numbers that add up to a target.",
  },
  {
    id: 13,
    title: "Valid Sudoku",
    difficulty: "Medium",
    category: "Arrays",
    blurb: "Determine if a 9 x 9 Sudoku board is valid."
  },
  {
    id: 2,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    category: "Strings",
    blurb: "Find the length of the longest substring without repeating characters.",
  },
  {
    id: 3,
    title: "Group Anagrams",
    difficulty: "Medium",
    category: "Hashing",
    blurb: "Group words that are anagrams of each other using a hash-based approach.",
  },
  {
    id: 4,
    title: "Binary Tree Level Order Traversal",
    difficulty: "Medium",
    category: "Trees",
    blurb: "Return the level order traversal of a binary tree using BFS.",
  },
  {
    id: 5,
    title: "Course Schedule",
    difficulty: "Medium",
    category: "Graphs",
    blurb: "Determine if you can finish all courses given prerequisites (cycle detection in a graph).",
  },
  {
    id: 6,
    title: "House Robber",
    difficulty: "Medium",
    category: "Dynamic Programming",
    blurb: "Maximize the amount you can rob without robbing adjacent houses.",
  },
  {
    id: 7,
    title: "3Sum",
    difficulty: "Medium",
    category: "Two Pointers",
    blurb: "Find three integers in the array that sum of to the target"
  },
  {
    id: 8,
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Medium",
    category: "Sliding Window",
    blurb: "Return the maximum profit you can achieve from a transaction."
  },
  {
    id: 9,
    title: "Reverse Linked List",
    difficulty: "Medium",
    category: "Linked List",
    blurb: "Given the head of a singly linked list, reverse the list, and return the reversed list."
  },
  {
    id: 10,
    title: "K Closest Points to Origin",
    difficulty: "Medium",
    category: "Heap",
    blurb: "Return the k closest points to the origin (0, 0)."
  },
  {
    id: 11,
    title: "Merge Intervals",
    difficulty: "Medium",
    category: "Intervals",
    blurb: "Merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input."
  }
];

const difficultyColor: Record<Difficulty, "success" | "warning" | "danger"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
};

export default function Select() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("Arrays");
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>( null );

  const filteredProblems = PROBLEMS.filter(
    (p) => p.category === selectedCategory
  );
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
                setSelectedProblemId(null);
            }}/>

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
                      setSelectedProblemId(random.id);
                    }
                  }}
                >
                  Random
                </Button>
              </CardHeader>

              <CardBody className="p-0">
                {filteredProblems.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    No problems in this category yet.
                  </div>
                ) : (
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
                          onClick={() => setSelectedProblemId(problem.id)}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {problem.title}
                            </span>
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
                        Mode: <span className="font-semibold">Live AI Interview</span>
                      </p>
                      <Button
                        color="primary"
                        radius="sm"
                        className="px-5"
                        // TODO: wire this up to your interview route
                        onPress={() => {
                          console.log(
                            "Start session for problem id",
                            selectedProblem.id
                          );
                        }}
                      >
                        Start Session
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    Select a problem from the list above, or let the AI pick one
                    for you to begin.
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
