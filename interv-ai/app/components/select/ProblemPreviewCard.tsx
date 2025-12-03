"use client";

import { Difficulty, Problem } from "@/app/lib/definitions";
import { Card, CardHeader, CardBody, Button, Chip } from "@heroui/react";

const difficultyColor: Record<Difficulty, "success" | "warning" | "danger"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
};

type ProblemPreviewCardProps = {
  selectedProblem: Problem | null;
  onStartSession: (problemId: string) => void;
};

export default function ProblemPreviewCard({
  selectedProblem,
  onStartSession,
}: ProblemPreviewCardProps) {
  return (
    <Card>
      <CardHeader className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {selectedProblem ? selectedProblem.title : "No problem selected"}
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
              {selectedProblem.description}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500 font-mono">
                Mode: <span className="font-semibold">Live AI Interview</span>
              </p>
              <Button
                color="primary"
                radius="sm"
                className="px-5"
                onPress={() => onStartSession(selectedProblem.id)}
              >
                Start Session
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Select a problem from the list above, or let us pick one for you to
            begin.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
