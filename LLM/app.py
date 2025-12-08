from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# import custom modules
from src.problem_retriever import get_problem_context
from src.llm_client import generate_response

class ChatRequest(BaseModel):
    problemId: str
    code: str
    history: list

app = FastAPI()

# --- CORS SETUP ---
# allows Next.js frontend (running on localhost:3000) to talk to this backend.
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS ---
# This defines what data the Frontend sends us.
class ChatRequest(BaseModel):
    problemId: str
    code: str
    history: List[Dict[str, Any]] # e.g. [{"role": "user", "parts": [{"text": "Hi"}]}]

# --- API ENDPOINTS ---

@app.get("/")
def health_check():
    return {"status": "Interviewer AI is online"}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Receives chat history and code, fetches problem context, 
    and returns the AI interviewer's response.
    """
    
    # 1. Get the Problem Data from DynamoDB
    problem_context = get_problem_context(request.problemId)
    
    if not problem_context:
        raise HTTPException(status_code=404, detail=f"Problem {request.problemId} not found in database.")

    # 2. Call Gemini
    # We pass the history, the code, and the problem details
    ai_reply = generate_response(
        chat_history=request.history, 
        current_user_code=request.code, 
        problem_context=problem_context
    )

    return {"reply": ai_reply}

# --- RUN SERVER ---
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)