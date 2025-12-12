### """ File for calling google gemini Fine Tuned LLM to generate interview responses """###
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
PROJECT_ID = "618518132754"
LOCATION = "us-central1"
ENDPOINT_ID = "projects/618518132754/locations/us-central1/endpoints/5275745961627353088"

# initialize client
client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location=LOCATION
)

def generate_response(chat_history, current_user_code, problem_context):
    """
    chat_history: List of messages from the frontend
    current_user_code: The Python code currently in the editor
    problem_context: The dict returned from problem_retriever.py
    """
    # --- 1. RAG CONTEXT SETUP ---
    rag_transcript = problem_context.get('transcript', '')[:10000]
    rag_solution = problem_context.get('solution_code', 'No solution provided.')
    title = problem_context.get('title', 'Unknown Problem')
    description = problem_context.get('description', 'No description.')

    # 1. build system prompt
    # instructs Gemini on how to behave.
    system_text = f"""
    You are an expert Senior Staff Software Engineer conducting a mock technical interview.
    The user is solving the problem: "{problem_context['title']}".
    
    --- PROBLEM DESCRIPTION ---
    {problem_context['description']}
    
    --- HIDDEN SOLUTION (FOR YOUR EYES ONLY) ---
    {problem_context['solution_code']}
    
    --- INTERVIEWER HINTS (Derived from real interviews) ---
    {problem_context['hints']}
    
    --- CURRENT USER CODE ---
    ```python
    {current_user_code}
    ```
    
    --- YOUR INSTRUCTIONS ---
    1. Be encouraging but rigorous.
    2. Use the Socratic Method. DO NOT write the code for the user. Ask questions to guide them.
    3. If the user's code has a bug, ask them to trace their code with an example input.
    4. Keep your responses concise (under 3 sentences usually).
    5. If the user is completely stuck, use one of the "INTERVIEWER HINTS" provided above.
    """

    # 2. embed chat history
    # Map our history format to the new google.genai.types.Content format
    contents = []
    for msg in chat_history:
        role = "user" if msg['role'] == "user" else "model"
        text = msg['parts'][0]['text']
        if not text.strip(): continue # Skip empty
        
        contents.append(types.Content(
            role=role,
            parts=[types.Part.from_text(text=text)]
        ))

    # 3. GENERATE
    try:
        response = client.models.generate_content(
            model=ENDPOINT_ID,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.7, # lowered slightly for more stable hints and guidance
                max_output_tokens=1024,
                system_instruction=system_text, #system prompt
            )
        )
        return response.text

    except Exception as e:
        print(f"GenAI Error: {e}")
        return f"I'm having trouble thinking right now. (Error: {str(e)})"