"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session } = useSession();
  if (session) {
    return (
      <div className="flex flex-col gap-2 items-start">
        <span className="text-gray-700 font-medium">
          {session?.user?.name}
        </span>

        <button
          onClick={() => signOut()}
          className="px-4 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 transition"
        >
          Sign out
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 items-start">
      <span className="text-gray-700 font-medium">Not signed in</span>

      <button
        onClick={() => signIn()}
        className="px-4 py-2 rounded-md bg-[#29293F] text-white hover:bg-blue-500 transition"
      >
        Sign in
      </button>
    </div>
  );
}