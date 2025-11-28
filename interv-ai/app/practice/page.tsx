import CodeEditor from "@/app/components/CodeEditor"
import CustomNavbar from "../components/CustomNavbar";

export default function Practice() {
    return (
        <div>
            <CustomNavbar />
            <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-[#F8F9FA]">
                <CodeEditor language="python" />
            </main>
        </div>
    );
}