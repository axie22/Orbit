export const CATEGORIES: Category[] = [
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
];

export type Category =
  | "Array"
  | "String"
  | "Hash Table"
  | "Stack"
  | "Two Pointers"
  | "Linked List"
  | "Heap"
  | "Binary Search"
  | "Tree"
  | "Graph"
  | "Greedy"
  | "Backtracking"
  | "Dynamic Programming"
  | "Sort"
  | "Math"
  | "Bit Manipulation"
  | "Misc";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type Problem = {
  id: number;
  title: string;
  difficulty: Difficulty;
  category: Category;
  description: string;
};


export type ApiProblem = {
  problemID: string;
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
