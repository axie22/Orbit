import random

class ProblemRetriever:
    def __init__(self, problems_df, solutions_df):
        self.problems = problems_df
        self.solutions = solutions_df

    # ---------------------------
    # Basic retrieval functions
    # ---------------------------

    def get_random_problem(self, difficulty=None):
        df = self.problems
        if difficulty:
            df = df[df["difficulty"].str.lower() == difficulty.lower()]
        if df.empty:
            return None
        return df.sample(1).iloc[0]

    def get_problem_by_id(self, problem_id):
        result = self.problems[self.problems["id"] == problem_id]
        return result.iloc[0] if not result.empty else None

    def search_by_keyword(self, keyword):
        keyword = keyword.lower()
        return self.problems[
            self.problems["description"].str.lower().str.contains(keyword)
            | self.problems["title"].str.lower().str.contains(keyword)
        ]

    # ---------------------------
    # Problem + Solution pairing
    # ---------------------------

    def get_problem_with_solutions(self, problem_id):
        problem = self.get_problem_by_id(problem_id)
        if problem is None:
            return None

        sols = self.solutions[self.solutions["id"] == problem_id]
        return problem, sols
