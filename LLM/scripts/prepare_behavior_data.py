import pandas as pd
import json
import random
import os

# --- CONFIG ---
INPUT_FILE = "mock_video_transcript.csv" # Your real interviews
TRAIN_FILE = "train_behavior.jsonl"
VAL_FILE = "val_behavior.jsonl"

def format_row(row):
    transcript = str(row['transcript'])
    # Heuristic: We use the transcript to simulate an ideal interaction.
    # We treat the transcript as the "Hidden Context" the model should know.
    
    system_prompt = """You are Orbit, a Senior Software Engineer conducting a technical interview. 
    Be professional, encouraging, and Socratic. 
    Use the provided TRANSCRIPT CONTEXT to guide your personality, but adapt to the user."""

    # Create a training sample
    return {
        "systemInstruction": {
            "role": "system",
            "parts": [{"text": system_prompt}]
        },
        "contents": [
            {"role": "user", "parts": [{"text": "Hi, I'm ready to start the interview."}]},
            # We use the first chunk of the transcript as the "Ideal Model Response"
            # This teaches the model the TONE of the mock interviewer.
            {"role": "model", "parts": [{"text": transcript[:1000] + "..."}]} 
        ]
    }

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Error: {INPUT_FILE} not found in current folder.")
        return

    df = pd.read_csv(INPUT_FILE)
    print(f"Loaded {len(df)} mock interviews.")

    # Convert to Vertex format
    all_data = df.apply(format_row, axis=1).tolist()

    # Shuffle and Split 80/20
    random.seed(42)
    random.shuffle(all_data)
    split_idx = int(len(all_data) * 0.8)
    
    train_data = all_data[:split_idx]
    val_data = all_data[split_idx:]

    # Save Files
    with open(TRAIN_FILE, 'w') as f:
        for entry in train_data:
            json.dump(entry, f)
            f.write('\n')
            
    with open(VAL_FILE, 'w') as f:
        for entry in val_data:
            json.dump(entry, f)
            f.write('\n')

    print(f"✅ Success!")
    print(f"Training Data: {len(train_data)} rows -> {TRAIN_FILE}")
    print(f"Validation Data: {len(val_data)} rows -> {VAL_FILE}")

if __name__ == "__main__":
    main()