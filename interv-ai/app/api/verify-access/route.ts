import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();
        const correctPassword = process.env.SITE_PASSWORD;

        if (!correctPassword) {
            console.error("SITE_PASSWORD env var is not set!");
            return NextResponse.json({ error: "Configuration error" }, { status: 500 });
        }

        if (password === correctPassword) {
            const response = NextResponse.json({ success: true });

            response.cookies.set("site-access", "true", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 60 * 60 * 24,
                path: "/",
            });

            return response;
        } else {
            return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
        }
    } catch (err) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
