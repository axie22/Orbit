import pandas as pd
import os

class ProblemLoader:
    def __init__(self, base_path=None):
        if base_path is None:
            base_path = os.path.dirname(os.path.dirname(__file__))

        data_path = os.path.join(base_path, "data")

        problems_file = os.path.join(data_path, "problems_clean.csv")
        solutions_file = os.path.join(data_path, "solutions_mapped.csv")

        self.problems = pd.read_csv(problems_file)
        self.solutions = pd.read_csv(solutions_file)

        # ensure IDs are integers
        self.problems["id"] = self.problems["id"].astype(int)
        self.solutions["id"] = self.solutions["id"].astype(int)

        print(f"Loaded {len(self.problems)} problems")
        print(f"Loaded {len(self.solutions)} merged problem/solution entries")

    def get_problem_df(self):
        return self.problems

    def get_solution_df(self):
        return self.solutions
