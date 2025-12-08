import pandas as pd
import json
import os

# CONFIGURATION
INPUT_FILE = "video_problem_transcripts.csv"  # Ensure this matches your file name
OUTPUT_FILE = "large_transcript_data.jsonl"

def format_transcript_to_prompt(row):
    """
    Converts a monologue transcript row into a Vertex AI Multi-Turn Chat format.
    """
    # 1. Extract Problem Name from Title (e.g., "Sqrt(x) - Leetcode 69..." -> "Sqrt(x)")
    title = str(row['title'])
    problem_name = title.split(' - ')[0] if ' - ' in title else title
    
    transcript = str(row['transcript'])
    
    # 2. Construct the System Instruction (The Persona & Knowledge)
    # We inject the transcript as the "Hidden Solution" so the model knows the logic.
    system_text = f"""You are an expert Senior Software Engineer conducting a technical interview.
The user is coding in **PYTHON**.

THE PROBLEM:
{problem_name}

THE HIDDEN SOLUTION (DO NOT REVEAL DIRECTLY):
{transcript}

YOUR GOAL:
1. Act as a professional, encouraging, but rigorous interviewer.
2. Ask the user to explain their approach before coding.
3. If they are stuck, offer subtle hints based on the hidden solution.
4. DO NOT write the code for them. Guide them.
5. Watch out for Python specific best practices (e.g. using enumerate, list comprehensions, proper variable naming).
6. If they propose a brute force solution, ask about time complexity and if they can optimize.

Keep responses concise and conversational."""

    # 3. Construct the Contents (The Dialogue History)
    # Since we don't have a real dialogue, we seed the conversation with the "Start".
    contents = [
        {
            "role": "user", 
            "parts": [{"text": f"Hi, I'm ready to solve {problem_name}."}]
        },
        {
            "role": "model", 
            "parts": [{"text": f"Okay, great! Let's solve {problem_name}. Can you walk me through your initial thoughts on how to approach this problem?"}]
        }
    ]
    
    # Return the JSON Object structure required by Vertex AI
    return {
        "systemInstruction": {
            "role": "system",
            "parts": [{"text": system_text}]
        },
        "contents": contents
    }

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found. Please place it in the same directory.")
        return

    print(f"Reading {INPUT_FILE}...")
    try:
        df = pd.read_csv(INPUT_FILE)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    print(f"Processing {len(df)} transcripts...")
    
    # Apply formatting
    jsonl_data = df.apply(format_transcript_to_prompt, axis=1)

    # Save to JSONL
    print(f"Saving to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        for entry in jsonl_data:
            json.dump(entry, f)
            f.write('\n')

    print("Success! A preview of the first entry:")
    print("-" * 50)
    with open(OUTPUT_FILE, 'r') as f:
        print(f.readline()[:500] + "...") # Preview first 500 chars

if __name__ == "__main__":
    main()