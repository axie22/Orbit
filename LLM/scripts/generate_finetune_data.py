import pandas as pd
import google.generativeai as genai
import json
import time
from tqdm import tqdm
import os
from dotenv import load_dotenv
import google.generativeai as genai

# load .env file
load_dotenv() 

# api load
API_KEY = os.getenv("GOOGLE_API_KEY")

if not API_KEY:
    raise ValueError("No API_KEY found! Did you create the .env file?")

# 3. gemini config
genai.configure(api_key=API_KEY)
INPUT_CSV = "video_problem_transcripts.csv" 
OUTPUT_JSONL = "interview_finetune_data.jsonl"
NUM_SAMPLES = 50 

model = genai.GenerativeModel('models/gemini-2.0-flash-001')

def create_synthetic_dialogue(title, transcript):
    """
    Takes a monologue transcript and converts it into a training dialogue.
    """
    prompt = f"""
    You are an expert technical interviewer data generator.
    
    I have a transcript of a solution explanation for the coding problem: "{title}".
    
    TRANSCRIPT:
    {transcript[:4000]} ... (truncated)
    
    TASK:
    Convert this monologue into a realistic training dialogue between:
    1. A Candidate (who is trying to solve it, may make minor mistakes, asks questions).
    2. An Interviewer (who guides them SOCRATICALLY, does not give the answer, asks about time complexity).
    
    The conversation should end with the candidate reaching the optimal solution, described in the transcript.
    
    OUTPUT FORMAT:
    Return ONLY valid JSON.
    {{
        "messages": [
            {{"role": "user", "content": "Hi, I'm ready to solve {title}."}},
            {{"role": "model", "content": "Great. Here is the problem..."}},
            {{"role": "user", "content": "I think I'll use a brute force approach..."}},
            {{"role": "model", "content": "That works, but what is the time complexity?"}}
        ]
    }}
    """
    
    try:
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        return json.loads(response.text)
    except Exception as e:
        print(f"Error generating {title}: {e}")
        return None

def main():
    print(f"Loading {INPUT_CSV}...")
    df = pd.read_csv(INPUT_CSV)
    
    # filer empty transcripts
    df = df.dropna(subset=['transcript'])
    
    # take sample
    df = df.sample(n=min(NUM_SAMPLES, len(df)), random_state=42)
    
    successful_rows = 0
    
    with open(OUTPUT_JSONL, 'w') as f:
        print(f"Generating synthetic dialogues for {len(df)} problems...")
        
        for _, row in tqdm(df.iterrows(), total=len(df)):
            dialogue_json = create_synthetic_dialogue(row['title'], row['transcript'])
            
            if dialogue_json and "messages" in dialogue_json:
                # CONVERT TO GOOGLE TUNING FORMAT
                # Google expects: {"contents": [{"role": "user", "parts": [...]}, ...]}
                google_entry = {"contents": []}
                
                for msg in dialogue_json['messages']:
                    # Map 'model' -> 'model' and 'user' -> 'user'
                    role = msg['role'] 
                    # Ensure strict mapping if your prompt output varies
                    if role not in ['user', 'model']: continue 
                    
                    google_entry["contents"].append({
                        "role": role,
                        "parts": [{"text": msg['content']}]
                    })
                
                # Write to JSONL
                f.write(json.dumps(google_entry) + "\n")
                successful_rows += 1
                
                # Sleep to avoid hitting rate limits (15 RPM on free tier)
                time.sleep(4) 

    print(f"\nDone! Successfully generated {successful_rows} training examples.")
    print(f"File saved to: {OUTPUT_JSONL}")
    print("Upload this file to Google AI Studio to start fine-tuning.")

if __name__ == "__main__":
    main()