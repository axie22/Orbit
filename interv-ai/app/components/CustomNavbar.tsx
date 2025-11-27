"use client";

import AuthButton from "./AuthButton";
import { useSession } from "next-auth/react";
import Logo from "../../public/Orbit_logo.svg"

import Image from "next/image";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
  Link,
} from "@heroui/react";


export default function CustomNavbar() {
    const {data: session} = useSession();
    const isLoggedIn = !!session;

    return (
        <Navbar
            position="sticky"
            maxWidth="xl"
            isBordered
            className="bg-white/80 backdrop-blur border-b border-slate-200"
        >
        <NavbarBrand className="gap-2">
            <Link href="/">
                <div className="flex items-baseline gap-1">
                <Image
                    src={Logo}
                    alt="Orbit Logo"
                    width={28}
                    height={28}
                    className="object-contain"
                />
                <span className="font-semibold text-lg tracking-tight text-slate-900">
                    <span className="text-[#1A3D64]">Orbit</span>
                </span>
                </div>
                <span className="hidden sm:inline text-xs text-slate-500 border-l border-slate-200 pl-3 ml-2">
                Your Technical Interview Playground
                </span>
            </Link>
        </NavbarBrand>

        <NavbarContent
            justify="center"
            className="hidden md:flex gap-6 text-sm font-medium"
        >
            {isLoggedIn && (
                <>
                    <NavbarItem>
                    <Link href="/practice" color="foreground">
                        Practice
                    </Link>
                    </NavbarItem>
                    <NavbarItem>
                    <Link href="/problems" color="foreground">
                        Problems
                    </Link>
                    </NavbarItem>
                    <NavbarItem>
                    <Link href="/about" color="foreground">
                        About
                    </Link>
                    </NavbarItem>
                </>
            )}
        </NavbarContent>

        <NavbarContent justify="end" className="gap-3">
            <NavbarItem className="hidden sm:flex">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 px-2 py-1 rounded-full border border-slate-200 bg-slate-50">
                Alpha
            </span>
            </NavbarItem>

            {!isLoggedIn && (
                <>
                <NavbarItem>
                    <Link href="/about" color="foreground">
                        About
                    </Link>
                </NavbarItem>
                </>
            )}

            {isLoggedIn && (
                <>
                    <NavbarItem className="hidden md:flex">
                    <Button
                        as={Link}
                        href="/practice"
                        size="sm"
                        variant="bordered"
                        radius="sm"
                    >
                        Start session
                    </Button>
                    </NavbarItem>
                </>
            )}

            <NavbarItem>
                <AuthButton />
            </NavbarItem>
        </NavbarContent>
        </Navbar>
    );
}
