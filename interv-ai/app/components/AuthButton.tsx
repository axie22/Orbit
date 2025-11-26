"use client";

import { Button } from "@heroui/button";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session } = useSession(); 
  if (session) {
    return (
      <Button
        size="sm"
        color="primary"
        variant="flat"
        radius="sm"
        onPress={() => signOut()}
      >
        Sign out
      </Button>
    );
  }
  return (
    <Button
        size="sm"
        radius="sm"
        onPress={() => signIn()}
        className="
          bg-white 
    text-slate-800 
    border border-slate-300 
    hover:border-slate-400 
    hover:bg-slate-50
    font-medium
    shadow-sm
    transition-all
  "
      >
        Sign in
      </Button>
  );
}