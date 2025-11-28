"use client";

type LoggedInHeroProps = {
  name: string;
};

export default function LoggedInHero({ name }: LoggedInHeroProps) {
  return (
    <section className="flex flex-col items-center text-center gap-4">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#111827]">
        Welcome back, <span className="text-[#1A3D64]">{name}</span>
      </h1>
      <p className="text-slate-600 max-w-xl">
        Pick up where you left off, or start a new mock interview. Orbit will
        guide you through coding, design, and reasoning like a real interviewer.
      </p>
    </section>
  );
}
