"""
src/problem_loader.py

Loads cleaned problem and solution CSVs from the project's data/ directory.
Provides simple helpers to access pandas DataFrames and lookup by id.

Usage:
    from src.problem_loader import ProblemLoader
    loader = ProblemLoader()
    probs_df = loader.get_problem_df()
    sols_df = loader.get_solution_df()
    p = loader.get_problem_by_id(17)
"""

import os
import pandas as pd

class ProblemLoader:
    def __init__(self, base_path: str | None = None):
        """
        base_path: root path that contains `data/`. If None, defaults to two levels up from this file.
        Example: project_root/data/problems_clean.csv
        """
        if base_path is None:
            # src/ -> project_root/src/.. -> project_root
            base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

        data_path = os.path.join(base_path, "data")
        problems_file = os.path.join(data_path, "problems_clean.csv")
        solutions_file = os.path.join(data_path, "solutions_mapped.csv")

        if not os.path.exists(problems_file):
            raise FileNotFoundError(f"Problems file not found: {problems_file}")
        if not os.path.exists(solutions_file):
            # allow existence of only problems file (some flows)
            print(f"Warning: Solutions file not found: {solutions_file}. Continuing with problems only.")
            self.solutions = pd.DataFrame()
        else:
            self.solutions = pd.read_csv(solutions_file, dtype=str).fillna("")

        self.problems = pd.read_csv(problems_file, dtype=str).fillna("")

        # Normalize common numeric IDs to int where possible
        def try_int_col(df, colname, newname):
            if colname in df.columns:
                try:
                    df[newname] = df[colname].astype(int)
                except Exception:
                    # convert float strings or messy content to ints where possible
                    def _to_int_safe(x):
                        try:
                            return int(float(x))
                        except Exception:
                            return None
                    df[newname] = df[colname].apply(_to_int_safe)
            else:
                df[newname] = None

        try_int_col(self.problems, "id", "id_int")
        try_int_col(self.solutions, "number", "number_int")

        # Common convenience: cast back to int for rows where valid
        if "id_int" in self.problems.columns:
            # drop rows with None in id_int? keep for safety
            pass

        print(f"Loaded {len(self.problems)} problems from {problems_file}")
        print(f"Loaded {len(self.solutions)} solution rows from {solutions_file if os.path.exists(solutions_file) else 'N/A'}")

    def get_problem_df(self) -> pd.DataFrame:
        return self.problems

    def get_solution_df(self) -> pd.DataFrame:
        return self.solutions

    def get_problem_by_id(self, pid: int):
        """
        Return the problem row (pandas Series) where id == pid (or id_int == pid).
        Returns None if not found.
        """
        if "id" in self.problems.columns:
            matches = self.problems[self.problems["id"].astype(str) == str(pid)]
            if not matches.empty:
                return matches.iloc[0]
        if "id_int" in self.problems.columns:
            matches = self.problems[self.problems["id_int"] == int(pid)]
            if not matches.empty:
                return matches.iloc[0]
        return None

    def get_solutions_for_problem(self, pid: int):
        """
        Return DataFrame of solution rows where number == pid (or number_int == pid)
        """
        if self.solutions.empty:
            return self.solutions
        if "number" in self.solutions.columns:
            matches = self.solutions[self.solutions["number"].astype(str) == str(pid)]
            if not matches.empty:
                return matches
        if "number_int" in self.solutions.columns:
            matches = self.solutions[self.solutions["number_int"] == int(pid)]
            if not matches.empty:
                return matches
        return pd.DataFrame()  # empty

# quick smoke test
if __name__ == "__main__":
    loader = ProblemLoader()
    print("Sample problem titles:")
    print(loader.get_problem_df().head(3)["title"])
