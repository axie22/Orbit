export const CATEGORIES: Category[] = [
  "Array",
  "Strings",
  "Hashing",
  "Two Pointers",
  "Sliding Window",
  "Linked List",
  "Heap",
  "Intervals",
  "Trees",
  "Graphs",
  "Backtracking",
  "Dynamic Programming",
  "Misc",
];

export type Category =
  | "Array"
  | "Strings"
  | "Hashing"
  | "Two Pointers"
  | "Sliding Window"
  | "Linked List"
  | "Intervals"
  | "Heap"
  | "Trees"
  | "Graphs"
  | "Backtracking"
  | "Dynamic Programming"
  | "Misc";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type Problem = {
  id: number;
  title: string;
  difficulty: Difficulty;
  category: Category;
  blurb: string;
};


export type ApiProblem = {
  problemID: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  blurb: string;
};

export type ProblemsApiResponse = {
  items: ApiProblem[];
  nextCursor: string | null;
  hasMore: boolean;
};
