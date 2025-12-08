import google.generativeai as genai
import os
from dotenv import load_dotenv

# 1. Load the API key from your .env file
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("Error: API Key not found. Make sure .env exists!")
else:
    genai.configure(api_key=api_key)

    print("Fetching available models...")
    print("-" * 30)
    
    try:
        # 2. List all models available to your account
        for m in genai.list_models():
            # Only show models that can generate text/chat
            if 'generateContent' in m.supported_generation_methods:
                print(f"ID: {m.name}")
                print(f"Display Name: {m.display_name}")
                print("-" * 30)
    except Exception as e:
        print(f"Error: {e}")