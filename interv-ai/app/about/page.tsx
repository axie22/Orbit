import CustomNavbar from "../components/CustomNavbar"

import technicalInterviewPic from "../../public/technical_interview.png"
import Logo from "../../public/Orbit_logo.svg"

import Image from 'next/image';

export default function About() {
    return (
        <div>
        <CustomNavbar />

        <main className="min-h-screen bg-[#F8F9FA] px-6 py-16 flex justify-center">
            <div className="max-w-6xl w-full flex flex-col gap-16">
                <section className="flex flex-col items-center text-center gap-6">
                    <div className="flex items-center gap-3">
                        <Image
                        src={Logo}
                        alt="Orbit Logo"
                        width={100}
                        height={100}
                        className="object-contain"
                        />
                        <h1 className="text-5xl font-bold tracking-tight text-slate-900">
                        Orbit
                        </h1>
                    </div>
                </section>
                
                <section className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-center">
                <div className="space-y-5 text-left">
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
                    Built for technical interview practice
                    </h1>

                    <p className="text-lg text-slate-600 max-w-xl">
                    Orbit is a technical interview practice platform built by engineers,
                    for engineers.
                    </p>

                    <ul className="mt-3 space-y-1 text-sm text-slate-600 font-mono">
                    <li>• VS Code-style editor for coding problems</li>
                    <li>• Adaptive AI interviewer for feedback</li>
                    <li>• Designed for repeated, focused practice</li>
                    </ul>
                </div>

                <div className="flex justify-center md:justify-end">
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-md p-4">
                    <Image
                        src={technicalInterviewPic}
                        alt="Technical interview illustration"
                        className="rounded-xl w-full h-auto"
                        width={800}
                    />
                    </div>
                </div>
                </section>

                <section className="flex flex-col gap-4 items-center text-center">
                <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                    Our Mission
                </h2>

                <p className="text-slate-700 leading-relaxed text-[15px] max-w-3xl mx-auto">
                    Orbit was created to help engineers prepare for technical interviews with clarity 
                    and confidence. Our platform combines a developer-grade code editor with an adaptive 
                    AI interviewer that evaluates your solutions, explains mistakes, and guides you toward 
                    stronger problem-solving patterns.
                    <br /><br />
                    Whether you are practicing algorithms, refining your reasoning, or sharpening your 
                    communication, Orbit simulates a realistic interview experience—minus the pressure.
                </p>
                </section>

                <section className="flex flex-col gap-6">
                <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                    Meet the Team
                </h2>

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">Alexander Xie</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        Alex is a backend-leaning full-stack engineer with a focus on AI systems and machine learning powered applications. 
                        He has experience building data pipelines, training LLMs, and developing the backend services that support them. 
                        His work centers on designing scalable architectures, optimizing developer workflows, and connecting intelligent models with real-world product features.
                    </p>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">Phoebe Huang</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        Phobi
                    </p>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">Matthew Cheng</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        Matty
                    </p>
                    </div>
                </div>
                </section>
            </div>
        </main>

        </div>
    );
}