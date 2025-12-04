// app/api/problem/[id]/route.ts
import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.PROBLEMS_FULL_TABLE_NAME; // Orbit_Interview_Questions

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log("=== API: Fetching FULL problem ===");
  console.log("Problem ID:", id);
  console.log("TABLE_NAME:", TABLE_NAME);
  console.log("AWS_REGION:", process.env.AWS_REGION);
  console.log("Query Key:", { problemId: id });

  try {
    const result = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { problemId: id },
      })
    );

    console.log("DynamoDB Query Result - Item found:", !!result.Item);
    
    if (!result.Item) {
      console.log("ERROR: Item not found in DynamoDB table");
      return NextResponse.json(
        { error: "Problem not found" },
        { status: 404 }
      );
    }

    console.log("SUCCESS: Returning item with title:", result.Item.title);
    return NextResponse.json(result.Item, { status: 200 });
  } catch (err) {
    console.error("=== DynamoDB ERROR ===");
    console.error("Error object:", err);
    if (err instanceof Error) {
      console.error("Error message:", err.message);
      console.error("Error name:", err.name);
    }
    console.error("Full error details:", JSON.stringify(err, null, 2));
    
    return NextResponse.json(
      { 
        error: "Server error", 
        details: err instanceof Error ? err.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}