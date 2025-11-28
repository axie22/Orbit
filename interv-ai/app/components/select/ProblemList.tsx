import { Difficulty } from "@/app/lib/definitions";


export type Problems = {
    id: number;
    title: string;
    difficulty: Difficulty,
    category: string;
}

const difficultyColor: Record<
  Difficulty,
  "success" | "warning" | "danger"
> = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
};

type Props = {
  category: Problems[];
};


export default function ProblemListSelector({ category }: Props) {
    return (
        <></>
    );
}