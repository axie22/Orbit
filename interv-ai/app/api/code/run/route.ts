import { NextRequest, NextResponse } from "next/server";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

export async function POST(req: NextRequest) {
    try {
        const { code, language } = await req.json();

        if (!code) {
            return NextResponse.json({ error: "No code provided" }, { status: 400 });
        }

        // Only support python for now
        if (language !== "python") {
            return NextResponse.json({ error: "Only python is supported at this time" }, { status: 400 });
        }

        const client = new LambdaClient({
            region: process.env.AWS_REGION || "us-east-1",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
            },
        });

        const command = new InvokeCommand({
            FunctionName: "code-runner",
            Payload: JSON.stringify({ code }),
        });

        const response = await client.send(command);

        // Parse the payload returned from Lambda
        const payloadString = new TextDecoder("utf-8").decode(response.Payload);
        const payload = JSON.parse(payloadString);

        if (payload.body) {
            const body = JSON.parse(payload.body);
            return NextResponse.json(body);
        }

        return NextResponse.json({
            output: "",
            error: "Unexpected response from execution environment"
        });

    } catch (error) {
        console.error("Error executing code:", error);
        return NextResponse.json(
            { error: "Failed to execute code" },
            { status: 500 }
        );
    }
}
