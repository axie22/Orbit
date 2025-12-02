export const CATEGORIES = [
  "Array",
  "String",
  "Hash Table",
  "Stack",
  "Two Pointers",
  "Linked List",
  "Heap",
  "Binary Search",
  "Tree",
  "Graph",
  "Greedy",
  "Backtracking",
  "Dynamic Programming",
  "Sort",
  "Math",
  "Bit Manipulation",
  "Misc",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Difficulty = "Easy" | "Medium" | "Hard";

export type Problem = {
  id: string;
  title: string;
  difficulty: Difficulty;
  category: Category;
  description: string;
};

export type ApiProblem = {
  problemID: string; // frontend table problemID
  title: string;
  difficulty: Difficulty;
  category: string;
  description: string;
};

export type ProblemsApiResponse = {
  items: ApiProblem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type FullProblem = {
  problemId: string; // training table problemId PK
  title: string;
  description: string;
  difficulty: Difficulty;
  topics?: string[];
  transcript?: string;
  solutions?: any;
};
