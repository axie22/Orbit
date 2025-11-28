"use client";

import { SessionProvider } from "next-auth/react";
import { HeroUIProvider } from "@heroui/system";

export function Providers({children}: {children: React.ReactNode}) {
    return (
        <HeroUIProvider>
            <SessionProvider>{children}</SessionProvider>
        </HeroUIProvider>
    );
}