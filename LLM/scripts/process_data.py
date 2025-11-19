import pandas as pd
import json
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

PROBLEMS_CSV = os.path.join(DATA_DIR, "leetcode_problems.csv")
SOLUTIONS_CSV = os.path.join(DATA_DIR, "leetcode_solutions.csv")

OUT_PROBLEMS = os.path.join(DATA_DIR, "problems_clean.csv")
OUT_SOLUTIONS = os.path.join(DATA_DIR, "solutions_mapped.csv")
OUT_DOCSTORE = os.path.join(DATA_DIR, "doc_store.jsonl")


def main():
    print(f"Loading problems from: {PROBLEMS_CSV}")
    print(f"Loading solutions from: {SOLUTIONS_CSV}")

    problems = pd.read_csv(PROBLEMS_CSV)
    solutions = pd.read_csv(SOLUTIONS_CSV)

    # Convert id/number to int (common issue)
    problems["id"] = problems["id"].astype(int)
    solutions["number"] = solutions["number"].astype(int)

    # Merge solutions onto problems
    merged = problems.merge(
        solutions,
        left_on="id",
        right_on="number",
        how="left"
    )

    # Save cleaned CSVs
    problems.to_csv(OUT_PROBLEMS, index=False)
    merged.to_csv(OUT_SOLUTIONS, index=False)

    print(f"✔ Saved cleaned problems → {OUT_PROBLEMS}")
    print(f"✔ Saved mapped solutions → {OUT_SOLUTIONS}")

    # Build docstore for future RAG
    with open(OUT_DOCSTORE, "w") as f:
        for _, row in problems.iterrows():
            entry = {
                "id": int(row["id"]),
                "title": row["title"],
                "difficulty": row["difficulty"],
                "description": row["description"],
            }
            f.write(json.dumps(entry) + "\n")

    print(f"✔ Saved doc store → {OUT_DOCSTORE}")
    print("Processing complete!")


if __name__ == "__main__":
    main()
