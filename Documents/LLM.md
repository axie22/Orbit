# LLM Service Documentation
## Overview
The LLM service is the core intelligence of the InterviewPrepAI system. It combines a **fine-tuned Gemini 2.0 Flash model** with **RAG (Retrieval-Augmented Generation)** to provide context-aware interview coaching.
**Key Features:**
- Fine-tuned on 220+ synthetic interview dialogues
- Real-time problem context retrieval from DynamoDB
- Socratic questioning methodology (guides without giving answers)
- Integration with LiveKit voice system
- FastAPI backend with sub-2s response time
---
## Architecture
```
┌─────────────────┐
│   Next.js App   │
└────────┬────────┘
         │ POST /chat
         ▼
┌─────────────────┐
│  FastAPI Server │ (app.py)
│  Port: 8000     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────┐  ┌─────────────────┐
│ DDB  │  │ Vertex AI       │
│ RAG  │  │ Gemini 2.0      │
│      │  │ (Fine-tuned)    │
└──────┘  └─────────────────┘
```
---
## Components
### 1. FastAPI Server (`app.py`)
**Endpoints:**
#### `GET /`
Health check endpoint.
**Response:**
```json
{
  "status": "Interviewer AI is online"
}
```
#### `POST /chat`
Main endpoint for interview conversation.
**Request:**
```json
{
  "problemId": "1",
  "code": "def twoSum(nums, target):\n    ...",
  "history": [
    {
      "role": "user",
      "parts": [{"text": "I'm ready to solve this problem"}]
    },
    {
      "role": "model", 
      "parts": [{"text": "Great! Can you restate the problem?"}]
    }
  ]
}
```
**Response:**
```json
{
  "reply": "Good start! What's the time complexity of your current approach?"
}
```
---
### 2. LLM Client (`src/llm_client.py`)
**Fine-Tuned Model Details:**
- **Base Model:** Gemini 2.0 Flash
- **Platform:** Google Vertex AI
- **Training Data:** 220+ synthetic interview dialogues
**Generation Function:**
```python
def generate_response(chat_history, current_user_code, problem_context):
    """
    Generates AI interviewer response using fine-tuned model.
    
    Args:
        chat_history: List of previous messages (Gemini format)
        current_user_code: User's current solution code
        problem_context: Retrieved from DynamoDB (problem info, solution, hints)
    
    Returns:
        str: AI interviewer's response
    """
```
**System Prompt Template:**
The system instruction is dynamically injected with:
- Problem title and description
- Hidden solution code (for verification, not shown to user)
- Transcript-derived hints from YouTube tutorials
- Current user code state

**Example System Instruction:**
```
You are an expert Senior Staff Software Engineer conducting a mock technical interview.
The user is solving the problem: "Two Sum".
--- PROBLEM DESCRIPTION ---
Given an array of integers nums and an integer target, return indices of the 
two numbers such that they add up to target.
--- HIDDEN SOLUTION (FOR YOUR EYES ONLY) ---
def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
--- INTERVIEWER HINTS (Derived from real interviews) ---
"Start by thinking about the brute force approach. We can use two nested loops..."
"What if we used a hash table to store the numbers we've seen so far?..."
--- CURRENT USER CODE ---
def twoSum(nums, target):
    # user's code here
--- YOUR INSTRUCTIONS ---
1. Be encouraging but rigorous.
2. Use the Socratic Method. DO NOT write the code for the user. Ask questions to guide them.
3. If the user's code has a bug, ask them to trace their code with an example input.
4. Keep your responses concise (under 3 sentences usually).
5. If the user is completely stuck, use one of the "INTERVIEWER HINTS" provided above.
```
**Generation Config:**
- **Temperature:** 0.7 (balanced creativity/consistency)
- **Max Output Tokens:** 1024
- **Safety Settings:** All categories OFF (for technical content)
---
### 3. Problem Retriever (`src/problem_retriever.py`)
**DynamoDB Integration:**
The problem retriever is a function that fetches problem details, solution, and transcript hints from DynamoDB, to provide context to the LLM for reasonable responses.

**DynamoDB Schema:**
- **Table Name:** `Orbit_Interview_Questions`
- **Region:** `us-east-2`
- **Partition Key:** `problemId` (string)

**Item Structure:**
```python
{
    "problemId": "1",
    "title": "Two Sum",
    "description": "Given an array of integers...",
    "difficulty": "Easy",
    "topics": ["Array", "Hash Table"],
    "solutions": [
        "def twoSum(nums, target): # solution 1",
        "def twoSum(nums, target): # solution 2"
    ],
    "transcript": "Today we're solving Two Sum. Let's start with brute force..."
}
```
**Retrieval Latency:** ~150ms average
---
## Data Pipeline Scripts
### `scripts/populate_db.py`
This function uploads LeetCode problems + transcripts to DynamoDB.

**Process:**
1. Load LeetCode solutions CSV (`solutions_mapped.csv`)
2. Load video transcripts CSV (`video_problem_transcripts.csv`)
3. Aggregate solutions by problem ID (multiple solutions per problem)
4. Left join transcripts to problems
5. Upload to DynamoDB (throttled at 2 items/sec)

**Data Stats:**
- **1825 problems** in database
- **60-70% transcript coverage** 
- **Multiple solutions** aggregated per problem
---
### `scripts/generate_finetune_data.py`
Generates synthetic training dialogues for fine-tuning.

**Process:**
1. Sample N problems from transcript CSV
2. For each problem, prompt Gemini 2.0 Flash to convert monologue transcript into dialogue
3. Format as interviewer-candidate conversation (Socratic style)
4. Convert to Google AI Studio JSONL format
5. Save to `interview_finetune_data.jsonl`

**Usage:**
```bash
cd LLM/scripts
python generate_finetune_data.py
# Generates 220+ training examples
# Upload to Google AI Studio for fine-tuning
```
**Output Format:**
```json
{
  "contents": [
    {"role": "user", "parts": [{"text": "I'm ready to solve Two Sum"}]},
    {"role": "model", "parts": [{"text": "Great. Can you restate the problem in your own words?"}]},
    {"role": "user", "parts": [{"text": "We need to find two numbers that add to the target"}]},
    {"role": "model", "parts": [{"text": "Correct. What's a brute force approach?"}]}
  ]
}
```
---
### `scripts/addsystemprompt.py`

This function adds system instruction field to training data (Google AI Studio format).

**Purpose:** Wraps each training example with the interviewer persona system prompt.
---
## Fine-Tuning Workflow
### 1. Prepare Training Data
```bash
cd LLM/scripts
python generate_finetune_data.py
# Output: interview_finetune_data.jsonl
```
### 2. Add System Instructions (Optional)
```bash
python addsystemprompt.py
# Output: interview_finetune_data_with_system.jsonl
```
### 3. Upload to Google AI Studio
- Go to https://aistudio.google.com/
- Navigate to "Tune" section
- Upload JSONL file
- Configure tuning job:
  - Base model: Gemini 2.0 Flash
  - Epochs: 3-5
  - Learning rate: Auto
### 4. Deploy to Vertex AI
- After tuning completes, export model to Vertex AI
- Note the endpoint ID
- Update `ENDPOINT_ID` in `src/llm_client.py`
### 5. Test Locally
```bash
cd LLM/scripts
python test_chat_local.py
```
---
## Configuration
### Environment Variables (`.env`)
```bash
# AWS Configuration
AWS_REGION=us-east-2
DYNAMODB_TABLE_NAME=Orbit_Interview_Questions
# Google Cloud (Vertex AI)
GOOGLE_APPLICATION_CREDENTIALS=./service_account.json
```
### Service Account Setup
1. Create Google Cloud service account with permissions:
   - Vertex AI User
   - Speech-to-Text API User (if using STT)
   - Text-to-Speech API User (if using TTS)
2. Download JSON key as `service_account.json`
3. Place in `LLM/` directory
---






## API Usage Examples
### Python Client
```python
import requests
response = requests.post("http://localhost:8000/chat", json={
    "problemId": "1",
    "code": "def twoSum(nums, target):\n    pass",
    "history": [
        {
            "role": "user",
            "parts": [{"text": "Hi, I'm ready to solve Two Sum"}]
        }
    ]
})
print(response.json()["reply"])
# "Great! Can you start by restating the problem in your own words?"
```
### JavaScript/Frontend
```typescript
const response = await fetch("http://localhost:8000/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    problemId: "1",
    code: currentCode,
    history: conversationHistory
  })
});
const data = await response.json();
console.log(data.reply);
```
---


## Troubleshooting
### "Problem not found in database"
**Cause:** Problem ID doesn't exist in DynamoDB  
**Fix:** 
1. Check if problem was uploaded: `aws dynamodb get-item --table-name Orbit_Interview_Questions --key '{"problemId": {"S": "1"}}'`
2. Re-run `populate_db.py` if needed
### "GenAI Error: 403 Forbidden"
**Cause:** Service account lacks Vertex AI permissions  
**Fix:** Grant `roles/aiplatform.user` to service account
### "Model response too generic"
**Cause:** RAG context not being injected properly  
**Fix:** 
1. Verify DynamoDB retrieval returns transcript
2. Check system prompt includes `problem_context['hints']`
3. Ensure transcript isn't empty string
### Slow response times (>5s)
**Cause:** Vertex AI cold start or quota limits  
**Fix:**
1. Keep endpoint warm with periodic health checks
2. Upgrade to paid tier for better quotas
3. Implement response caching for common questions
