import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
    const hasCookie = req.cookies.has("site-access");
    const isProtectedPath =
        req.nextUrl.pathname.startsWith("/practice") ||
        req.nextUrl.pathname.startsWith("/select");

    //  If it's a protected path
    if (isProtectedPath) {
        // Check Site Password
        if (!hasCookie) {
            return NextResponse.redirect(new URL("/access", req.url));
        }

        // Check User Authentication
        const sessionToken = req.cookies.get("next-auth.session-token")?.value ||
            req.cookies.get("__Secure-next-auth.session-token")?.value;

        if (!sessionToken) {
            return NextResponse.redirect(new URL("/api/auth/signin", req.url));
        }
    }

    if (req.nextUrl.pathname === "/access" && hasCookie) {
        return NextResponse.redirect(new URL("/select", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
