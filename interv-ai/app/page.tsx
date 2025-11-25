import Image from "next/image";
import AuthButton from "./components/AuthButton";
import { SessionProvider } from "next-auth/react";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
      <AuthButton />
    </div>
  );
}
