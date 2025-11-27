
// Use these in select page
export const CATEGORIES: Category[] = [
  "Arrays",
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
  | "Arrays"
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