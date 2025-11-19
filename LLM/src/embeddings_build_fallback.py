# src/embeddings_build_fallback.py
import os, json, pickle
import numpy as np
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv()

DATA_DIR = os.environ.get("DATA_DIR", "./data")
DOCSTORE = os.environ.get("DOCSTORE_JSONL", os.path.join(DATA_DIR, "doc_store.jsonl"))
EMBED_MODEL = os.environ.get("EMBED_MODEL", "all-MiniLM-L6-v2")
OUT_EMBED = os.path.join(DATA_DIR, "embeddings.npy")
OUT_META = os.path.join(DATA_DIR, "meta.pkl")

def load_docs(path):
    docs = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line=line.strip()
            if not line:
                continue
            try:
                docs.append(json.loads(line))
            except Exception as e:
                print("skipping line due to json error:", e)
    return docs

def doc_text(d):
    t = f"Title: {d.get('title','')}\nDifficulty: {d.get('difficulty','')}\nDescription:\n{d.get('description','')}\n"
    if d.get('canonical_solution'):
        t += "\nSolution:\n" + d['canonical_solution'][:2000]
    return t

def main():
    docs = load_docs(DOCSTORE)
    if not docs:
        raise SystemExit(f"No docs found in {DOCSTORE}. Run data processing script first.")
    model = SentenceTransformer(EMBED_MODEL)
    texts = [doc_text(d) for d in docs]
    print(f"Embedding {len(texts)} docs using {EMBED_MODEL} ...")
    embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    np.save(OUT_EMBED, embeddings.astype("float32"))
    meta = [{"problem_id": d.get("problem_id"), "title": d.get("title"), "text": texts[i]} for i,d in enumerate(docs)]
    with open(OUT_META, "wb") as f:
        pickle.dump(meta, f)
    print("Saved embeddings to", OUT_EMBED)
    print("Saved meta to", OUT_META)

if __name__ == "__main__":
    main()
