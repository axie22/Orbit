"use client";

import { Card, CardBody, Chip, Button, Link } from "@heroui/react";
import { Difficulty } from "@/app/lib/definitions";

export type RecommendedProblem = {
  id: number;
  title: string;
  difficulty: Difficulty;
  category: string;
};

const difficultyColor: Record<Difficulty, "success" | "warning" | "danger"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
};

type Props = {
  problems: RecommendedProblem[];
};

export default function RecommendedProblemsCard({ problems }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Recommended for you
        </h2>
        <Link
          href="/select"
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          View all problems →
        </Link>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardBody className="p-0">
          <ul className="divide-y divide-slate-100">
            {problems.map((p) => (
              <li
                key={p.id}
                className="px-4 py-3 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {p.title}
                  </p>
                  <p className="text-xs text-slate-500">{p.category}</p>
                </div>

                <div className="flex items-center gap-3">
                  <Chip
                    size="sm"
                    color={difficultyColor[p.difficulty]}
                    variant="flat"
                    className="text-[11px] font-mono"
                  >
                    {p.difficulty.toUpperCase()}
                  </Chip>
                  <Button
                    as={Link}
                    href={`/select`} // TODO: change to start session with p.id
                    // href={`/practice?problemId=${p.id}`}
                    size="sm"
                    radius="sm"
                    variant="bordered"
                  >
                    Practice
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}
