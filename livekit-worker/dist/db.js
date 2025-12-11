"use strict";
/*
    Database access for the LLM for hinting
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProblemContext = getProblemContext;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || "us-east-2" });
const ddb = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.PROBLEMS_FULL_TABLE_NAME || "InterviewProblems";
async function getProblemContext(problemId) {
    try {
        console.log(`[DB] Fetching context for: ${problemId}`);
        const result = await ddb.send(new lib_dynamodb_1.GetCommand({
            TableName: TABLE_NAME,
            Key: { problemId },
        }));
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
    }
    catch (err) {
        console.error("[DB] Error fetching problem:", err);
        return null;
    }
}
