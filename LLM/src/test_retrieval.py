from problem_loader import ProblemLoader
from problem_retriever import ProblemRetriever

loader = ProblemLoader()
retriever = ProblemRetriever(loader.get_problem_df(), loader.get_solution_df())

print("\n--- RANDOM MEDIUM PROBLEM ---")
p = retriever.get_random_problem("Medium")
print(p["id"], p["title"])
print(p["description"][:300])

print("\n--- SEARCH: 'tree' ---")
results = retriever.search_by_keyword("tree")
print(results[["id", "title"]].head())

print("\n--- PROBLEM + SOLUTIONS (first result) ---")
pid = int(p["id"])
prob, sols = retriever.get_problem_with_solutions(pid)
print(prob["title"])
print("Solutions available:", len(sols))
