import os
from dotenv import load_dotenv
load_dotenv()

from langchain_community.document_loaders import TextLoader
from langchain_community.vectorstores import FAISS
from langchain.embeddings import SentenceTransformerEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import HumanMessage, SystemMessage
import requests
import json

####################################################
# 1. EMBEDDINGS + INDEXING
####################################################

def build_or_load_faiss_index(data_dir="data", index_path="index.faiss"):
    embedder = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")

    if os.path.exists(index_path):
        print("🔹 Loading existing FAISS index...")
        return FAISS.load_local(index_path, embedder, allow_dangerous_deserialization=True)

    print("🔹 Building new FAISS index...")

    docs = []
    for f in os.listdir(data_dir):
        if f.endswith(".txt"):
            loader = TextLoader(os.path.join(data_dir, f))
            docs.extend(loader.load())

    # Chunk transcripts + OCR text
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(docs)

    # Build index
    db = FAISS.from_documents(chunks, embedder)
    db.save_local(index_path)

    print("✅ FAISS index built and saved.")
    return db


####################################################
# 2. GROQ LLAMA CLIENT
####################################################

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama3-70b-8192"

def llama(messages, temperature=0):
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": temperature
    }

    r = requests.post(GROQ_URL, headers=headers, data=json.dumps(payload))
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


####################################################
# 3. QUESTION GENERATION WITH RAG
####################################################

def generate_coding_question(db, topic_query="dynamic programming"):
    # Retrieve relevant context
    docs = db.similarity_search(topic_query, k=4)
    context = "\n\n".join([d.page_content for d in docs])

    system_prompt = """
You are an expert technical interviewer. 
Using the provided context from real interview transcripts, generate ONE coding interview question.
Return strictly JSON with:
{
  "title": "...",
  "prompt": "...",
  "constraints": "...",
  "expected_solution_outline": ["...", "..."],
  "sample_tests": [{"input": "...", "output": "..."}]
}
"""

    user_prompt = f"Context:\n{context}\n\nGenerate question now."

    response = llama([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ], temperature=0)

    print("\n=== GENERATED QUESTION ===")
    print(response)
    return response


####################################################
# 4. ANSWER EVALUATION
####################################################

def evaluate_answer(question_json, user_answer):
    system_prompt = """
You are an automated interview grader.
Score the candidate on 5 categories from 1-4:

- Problem Understanding
- Approach / Algorithm
- Implementation Correctness
- Testing & Edge Cases
- Communication

Return STRICT JSON:

{
 "Problem Understanding": {"score": X, "evidence": "...", "suggestion": "..."},
 ...
 "overall_score": X
}
"""

    user_prompt = f"""
Question:
{question_json}

Candidate Answer:
{user_answer}
"""

    response = llama([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ], temperature=0)

    print("\n=== EVALUATION ===")
    print(response)
    return response


####################################################
# 5. MAIN WORKFLOW (MVP)
####################################################

if __name__ == "__main__":
    db = build_or_load_faiss_index()

    # Step 1 — generate question
    q = generate_coding_question(db, topic_query="binary search trees")

    # Step 2 — simulate user answer
    user_answer = """
I would use inorder traversal to get sorted array and then pick middle recursively...
"""

    evaluate_answer(q, user_answer)
