### """ File for calling google gemini Fine Tuned LLM to generate interview responses """###
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# Configure the API
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def generate_response(chat_history, current_user_code, problem_context):
    """
    chat_history: List of messages from the frontend
    current_user_code: The Python code currently in the editor
    problem_context: The dict returned from problem_retriever.py
    """
    
    # 1. Build the System Prompt (The Persona)
    # This instructs Gemini on how to behave.
    system_instruction = f"""
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

    # 2. Initialize the Model
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash", 
        system_instruction=system_instruction
    )

    # 3. Format History for Gemini
    # Gemini expects logic to be strict about user/model turns. 
    # We assume 'chat_history' comes in clean from the frontend.
    
    try:
        # We use generate_content with the full history list
        # This is stateless; we send the whole conversation every time.
        response = model.generate_content(chat_history)
        return response.text
    except Exception as e:
        return f"I'm having trouble thinking right now. (Error: {str(e)})"