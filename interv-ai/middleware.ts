import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const hasCookie = req.cookies.has("site-access");    // 2. Define paths that need protection
    // The user wants to allow the landing page ("/") but block "functionality" (practice, etc)
    const isProtectedPath =
        req.nextUrl.pathname.startsWith("/practice") ||
        req.nextUrl.pathname.startsWith("/select");

    // 3. Logic: If it's a protected path and no cookie, redirect
    if (isProtectedPath && !hasCookie) {
        return NextResponse.redirect(new URL("/password", req.url));
    }

    // 4. If they are on the password page but have the cookie, send them to /select or /
    if (req.nextUrl.pathname === "/password" && hasCookie) {
        return NextResponse.redirect(new URL("/select", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
