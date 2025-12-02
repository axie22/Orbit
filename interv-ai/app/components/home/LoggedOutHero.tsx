"use client";

import { Button, Link } from "@heroui/react";

export default function LoggedOutHero() {
  return (
    <section className="flex flex-col items-center text-center gap-6">
      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1F2937]">
        Practice technical interviews with{" "}
        <span className="text-[#1A3D64]">Orbit</span>
      </h1>

      <p className="text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
        Your AI-powered interview playground. Code, speak, and reason through
        problems with real-time feedback from an adaptive AI interviewer.
      </p>

      <div className="flex gap-4 mt-2">
        <Button
          as={Link}
          href="/api/auth/signin"
          radius="sm"
          className="px-6 py-3 bg-[#1A3D64] text-white hover:bg-[#1A3D64]/90"
        >
          Sign in to get started
        </Button>

        <Button
          as={Link}
          href="/about"
          variant="bordered"
          radius="sm"
          className="px-6 py-3"
        >
          Learn more
        </Button>

        {/* --- NEW DEMO BUTTON (Cheng Test Edition) --- */}
        <Button
          as={Link}
          href="/practiceAIDemo?id=two-sum"
          radius="sm"
          className="px-6 py-3 bg-emerald-600 text-white hover:bg-emerald-700 font-medium shadow-sm"
        >
          Try AI Demo
        </Button>
        {/* --- NEW DEMO BUTTON (Cheng Test Edition)--- */}

      </div>
    </section>
  );
}
