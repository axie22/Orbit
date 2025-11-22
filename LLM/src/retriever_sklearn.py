# src/retriever_sklearn.py
import os
import pickle
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

DATA_DIR = os.environ.get("DATA_DIR", "./data")
EMBED_PATH = os.path.join(DATA_DIR, "embeddings.npy")
META_PATH = os.path.join(DATA_DIR, "meta.pkl")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "all-MiniLM-L6-v2")

class SKLearnRetriever:
    def __init__(self, embed_path=EMBED_PATH, meta_path=META_PATH, metric='cosine'):
        if not os.path.exists(embed_path) or not os.path.exists(meta_path):
            raise FileNotFoundError("Embeddings or meta not found. Run embeddings_build_fallback.py first.")
        self.embeds = np.load(embed_path)
        with open(meta_path, "rb") as f:
            self.meta = pickle.load(f)
        # build NN model (cosine similarity via metric='cosine' returns distances in [0,2])
        self.nn = NearestNeighbors(n_neighbors=10, metric=metric, algorithm='auto')
        self.nn.fit(self.embeds)
        # local embedder for query
        self.model = SentenceTransformer(EMBED_MODEL)

    def embed_query(self, query_text):
        return self.model.encode([query_text], convert_to_numpy=True)[0]

    def retrieve_by_text(self, query_text, k=5):
        q_emb = self.embed_query(query_text).astype("float32")
        dists, idxs = self.nn.kneighbors(q_emb.reshape(1,-1), n_neighbors=min(k, len(self.meta)))
        results = []
        for dist, idx in zip(dists[0], idxs[0]):
            results.append({"meta": self.meta[idx], "dist": float(dist)})
        return results

    def retrieve_by_embedding(self, q_emb, k=5):
        q_emb = np.array(q_emb).astype("float32")
        dists, idxs = self.nn.kneighbors(q_emb.reshape(1,-1), n_neighbors=min(k, len(self.meta)))
        results = []
        for dist, idx in zip(dists[0], idxs[0]):
            results.append({"meta": self.meta[idx], "dist": float(dist)})
        return results

if __name__ == "__main__":
    r = SKLearnRetriever()
    res = r.retrieve_by_text("dynamic programming array partition", k=3)
    for r0 in res:
        print(r0["meta"]["problem_id"], r0["meta"]["title"], r0["dist"])
        print(r0["meta"]["text"][:200], "...\n")
