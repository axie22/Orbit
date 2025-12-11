import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
  NativeAttributeValue,
} from "@aws-sdk/lib-dynamodb";
import { Difficulty } from "@/app/lib/definitions";

const REGION = process.env.AWS_REGION;
const TABLE_NAME = process.env.PROBLEMS_TABLE_NAME;

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);


export type ProblemDTO = {
  problemID: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  description: string;
  companies?: string[];
};

type ProblemsResponse = {
  items: ProblemDTO[];
  nextCursor: string | null;
  hasMore: boolean;
};

// Helpers for encoding / decoding Dynamo cursor
function encodeCursor(key: Record<string, NativeAttributeValue> | undefined): string | null {
  if (!key) return null;
  return Buffer.from(JSON.stringify(key)).toString("base64url");
}

function decodeCursor(cursor: string | null): Record<string, NativeAttributeValue> | undefined {
  if (!cursor) return undefined;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

const difficultyPrefixMap: Record<Difficulty, string> = {
  Easy: "1_Easy#",
  Medium: "2_Medium#",
  Hard: "3_Hard#",
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty") as Difficulty | null;
  const limitParam = searchParams.get("limit");
  const cursor = searchParams.get("cursor");
  const search = searchParams.get("search");

  if (!category) {
    return NextResponse.json(
      { error: "Missing required query param: category" },
      { status: 400 }
    );
  }

  const limit = Math.min(Number(limitParam) || 20, 50);
  const exclusiveStartKey = decodeCursor(cursor);

  // Dynamo Query
  const input: QueryCommandInput = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "primary_topic = :topic",
    ExpressionAttributeValues: {
      ":topic": category,
    },
    Limit: limit,
    ExclusiveStartKey: exclusiveStartKey,
  };

  if (difficulty) {
    const prefix = difficultyPrefixMap[difficulty];
    if (!prefix) {
      return NextResponse.json(
        { error: `Invalid difficulty: ${difficulty}` },
        { status: 400 }
      );
    }

    // Fix: Use ExpressionAttributeNames because '#' is special
    input.KeyConditionExpression += " AND begins_with(#sk, :sortPrefix)";
    if (!input.ExpressionAttributeNames) input.ExpressionAttributeNames = {};
    input.ExpressionAttributeNames["#sk"] = "difficulty#problemID";
    input.ExpressionAttributeValues![":sortPrefix"] = prefix;
  }

  // Handle Search using FilterExpression
  if (search) {
    input.FilterExpression = "contains(#title, :search)";
    if (!input.ExpressionAttributeNames) input.ExpressionAttributeNames = {};
    input.ExpressionAttributeNames["#title"] = "title";
    input.ExpressionAttributeValues![":search"] = search;
  }



  try {
    const result = await docClient.send(new QueryCommand(input));

    const items = (result.Items || []).map((item): ProblemDTO => {
      const rawId = item.problemID ?? item.problemId;
      const difficultyValue = item.difficulty as Difficulty;

      let companies: string[] = [];
      if (Array.isArray(item.companies)) {
        companies = item.companies;
      } else if (typeof item.companies === "string") {
        companies = item.companies.split(",").map((c: string) => c.trim()).filter(Boolean);
      }

      const fullDescription = item.description ?? "";
      const description =
        fullDescription.length > 180
          ? fullDescription.slice(0, 177).trimEnd() + "..."
          : fullDescription;

      return {
        problemID: String(rawId),
        title: item.title ?? "Untitled problem",
        difficulty: difficultyValue,
        category: item.primary_topic ?? category,
        description,
        companies: companies,
      };
    });

    const nextCursor = encodeCursor(result.LastEvaluatedKey);
    const response: ProblemsResponse = {
      items,
      nextCursor,
      hasMore: !!result.LastEvaluatedKey,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("Error querying Problems table:", err);
    return NextResponse.json(
      { error: "Failed to load problems" },
      { status: 500 }
    );
  }
}
