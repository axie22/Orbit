# src/llm_evaluator_sklearn.py
import argparse
import json
import os
from dotenv import load_dotenv
load_dotenv()

from src.problem_loader import ProblemLoader
from src.llm_client import chat  # assumes you already have a Groq wrapper at src/llm_client.py
from src.retriever_sklearn import SKLearnRetriever

PROMPT_SYSTEM = (
    "You are a senior software engineer and interviewer. "
    "Given a problem, the candidate's solution (code or explanation), and some reference docs, "
    "provide a concise, constructive evaluation. "
    "Return ONLY a valid JSON object with keys: "
    '"scores" (object with correctness, efficiency, clarity, edge_cases as integers 0-10), '
    '"short_summary" (string 1-2 sentences), '
    '"strengths" (list of strings), '
    '"improvements" (list of strings), '
    '"explanation" (optional detailed notes)'
)

def build_user_message(problem_text, candidate_text, retrieved_texts, test_summary=None):
    refs_joined = "\n\n---\n\n".join([r["meta"]["text"] for r in retrieved_texts[:3]])
    s = f"""Problem:
{problem_text}

Candidate submission:
{candidate_text}

Test summary (if any):
{test_summary or 'N/A'}

Reference docs (top matches):
{refs_joined}

Instructions:
Evaluate the candidate in the context of the problem and references. Return JSON as described.
"""
    return s

def parse_json_from_text(text):
    # Find first { ... } block and parse
    s = text
    start = s.find("{")
    end = s.rfind("}")
    if start == -1 or end == -1:
        return {"error": "no json found", "raw": s}
    try:
        return json.loads(s[start:end+1])
    except Exception as e:
        return {"error": f"json parse error: {e}", "raw": s}

def evaluate(problem_id, candidate_text, num_refs=4, temperature=0.2):
    loader = ProblemLoader()
    retriever = SKLearnRetriever()
    # get problem
    prob_df = loader.get_problem_df()
    row = prob_df[prob_df["id"] == int(problem_id)]
    if row.empty:
        raise ValueError(f"Problem id {problem_id} not found")
    problem_text = row.iloc[0]["description"]
    # retrieve
    query = row.iloc[0]["title"] + " " + (problem_text[:400] if len(problem_text)>400 else problem_text)
    refs = retriever.retrieve_by_text(query, k=num_refs)
    # build prompt
    system_msg = {"role": "system", "content": PROMPT_SYSTEM}
    user_msg = {"role": "user", "content": build_user_message(problem_text, candidate_text, refs)}
    messages = [system_msg, user_msg]
    raw = chat(messages, temperature=temperature, max_tokens=1024)
    parsed = parse_json_from_text(raw)
    return {"raw": raw, "parsed": parsed, "refs": refs}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--problem_id", required=True, type=int)
    parser.add_argument("--code_file", required=False)
    parser.add_argument("--answer", required=False)
    parser.add_argument("--num_refs", type=int, default=4)
    args = parser.parse_args()

    if args.code_file:
        if not os.path.exists(args.code_file):
            raise SystemExit("code_file not found")
        candidate_text = open(args.code_file, "r", encoding="utf-8").read()
    elif args.answer:
        candidate_text = args.answer
    else:
        raise SystemExit("Please provide --code_file or --answer")

    out = evaluate(args.problem_id, candidate_text, num_refs=args.num_refs)
    print("=== RAW LLM RESPONSE ===")
    print(out["raw"])
    print("\n=== PARSED JSON (best effort) ===")
    print(json.dumps(out["parsed"], indent=2))
