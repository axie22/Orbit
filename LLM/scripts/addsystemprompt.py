import json
import re

# Input and Output filenames
input_file = 'interview_finetune_data.jsonl'
output_file = 'interview_finetune_data_with_system.jsonl'

# The Template provided
SYSTEM_PROMPT_TEMPLATE = """You are an expert Senior Software Engineer conducting a technical interview.
The user is coding in **PYTHON**.

THE PROBLEM:
{title}
{description}

THE HIDDEN SOLUTION (DO NOT REVEAL DIRECTLY):
{solution}
Time Complexity: {time_complexity}
Space Complexity: {space_complexity}

YOUR GOAL:
1. Act as a professional, encouraging, but rigorous interviewer.
2. Ask the user to explain their approach before coding.
3. If they are stuck, offer subtle hints based on the hidden solution.
4. DO NOT write the code for them. Guide them.
5. Watch out for Python specific best practices (e.g. using enumerate, list comprehensions, proper variable naming).
6. If they propose a brute force solution, ask about time complexity and if they can optimize.

Keep responses concise and conversational."""

def extract_metadata(turns):
    """
    Attempts to extract problem details from the conversation history.
    """
    first_user_msg = turns[0]['parts'][0]['text']
    first_model_msg = turns[1]['parts'][0]['text']
    full_text = " ".join([t['parts'][0]['text'] for t in turns])

    # 1. Extract Title (Assumes format: "solve [Title] - Leetcode")
    title_match = re.search(r"solve (.*?) - (Leetcode|Python)", first_user_msg, re.IGNORECASE)
    title = title_match.group(1) if title_match else "Technical Interview Problem"

    # 2. Extract Description (Assumes Model says: "The problem is as follows: [Description] ...")
    desc_match = re.search(r"The problem is as follows:\s*(.*?)\s*(Can you|Do you|How would)", first_model_msg, re.DOTALL | re.IGNORECASE)
    description = desc_match.group(1).strip() if desc_match else "See conversation for problem details."

    # 3. Extract Complexities (Simple heuristic search)
    time_comp_match = re.search(r"Time complexity.*?(O\(.*?\))", full_text, re.IGNORECASE)
    time_complexity = time_comp_match.group(1) if time_comp_match else "See solution"
    
    space_comp_match = re.search(r"Space complexity.*?(O\(.*?\))", full_text, re.IGNORECASE)
    space_complexity = space_comp_match.group(1) if space_comp_match else "See solution"

    # 4. Extract Solution (Finds the last Python code block in the chat)
    code_blocks = re.findall(r"```python(.*?)```", full_text, re.DOTALL)
    solution = code_blocks[-1].strip() if code_blocks else "Refer to the conversation history for the implementation."

    return {
        "title": title,
        "description": description,
        "solution": solution,
        "time_complexity": time_complexity,
        "space_complexity": space_complexity
    }

transformed_data = []

with open(input_file, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        turns = data['contents']
        
        # Extract data from the conversation to fill the template
        meta = extract_metadata(turns)
        
        # Format the system prompt
        filled_system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            title=meta['title'],
            description=meta['description'],
            solution=meta['solution'],
            time_complexity=meta['time_complexity'],
            space_complexity=meta['space_complexity']
        )
        
        # Create the new JSON object with system_instruction
        new_entry = {
            "systemInstruction": {
                "role": "system", 
                "parts": [{"text": filled_system_prompt}]
            },
            "contents": turns
        }
        transformed_data.append(new_entry)

# Write to new file
with open(output_file, 'w', encoding='utf-8') as f:
    for entry in transformed_data:
        f.write(json.dumps(entry) + '\n')

print(f"Successfully processed {len(transformed_data)} conversations into {output_file}")