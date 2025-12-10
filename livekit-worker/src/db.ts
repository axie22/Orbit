/*
    Database access for the LLM for hinting
*/

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-2" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.PROBLEMS_FULL_TABLE_NAME || "InterviewProblems";

export async function getProblemContext(problemId: string) {
    try {
        console.log(`[DB] Fetching context for: ${problemId}`);
        const result = await ddb.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: { problemId },
            })
        );

        if (!result.Item) {
            console.warn(`[DB] Problem ${problemId} not found.`);
            return null;
        }

        return {
            title: result.Item.title,
            description: result.Item.description,
            solution_code: result.Item.solution || result.Item.solution_code, // handle inconsistent naming
            hints: result.Item.hints || result.Item.structured_hints,
            transcript: result.Item.transcript // fetches trancript if available for RAG
        };
    } catch (err) {
        console.error("[DB] Error fetching problem:", err);
        return null;
    }
}