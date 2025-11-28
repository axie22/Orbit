"use client";

import { Card, CardBody, Button, Link } from "@heroui/react";

export default function QuickActionsRow() {
  return (
    <section className="grid sm:grid-cols-3 gap-6">
      <Card className="border border-slate-200 shadow-sm hover:shadow-md transition">
        <CardBody className="p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-slate-900 text-sm">
            Start new session
          </h3>
          <p className="text-xs text-slate-600">
            Choose a problem and begin a fresh interview
          </p>
          <Button
            as={Link}
            href="/select"
            size="sm"
            radius="sm"
            className="mt-1 bg-[#1A3D64] text-white hover:bg-[#1A3D64]/90"
          >
            Go to practice
          </Button>
        </CardBody>
      </Card>

      <Card className="border border-slate-200 shadow-sm opacity-70">
        <CardBody className="p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-slate-900 text-sm">
            Continue last session
          </h3>
          <p className="text-xs text-slate-600">
            Resume your most recent interview (coming soon)
          </p>
          <Button
            size="sm"
            radius="sm"
            variant="bordered"
            isDisabled
            className="mt-1"
          >
            Coming soon
          </Button>
        </CardBody>
      </Card>

      <Card className="border border-slate-200 shadow-sm hover:shadow-md transition">
        <CardBody className="p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-slate-900 text-sm">
            Browse problems
          </h3>
          <p className="text-xs text-slate-600">
            Explore problems by topic and difficulty before you start
          </p>
          <Button
            as={Link}
            href="/problems"
            size="sm"
            radius="sm"
            variant="bordered"
            className="mt-1"
          >
            View problems
          </Button>
        </CardBody>
      </Card>
    </section>
  );
}
