"""
src/llm_client.py

Minimal Groq chat wrapper. Loads GROQ_API_KEY and GROQ_MODEL from environment (via python-dotenv).
Returns the assistant text for a chat-style messages list.

Usage:
    from src.llm_client import chat
    messages = [
        {"role": "system", "content": "You are helpful."},
        {"role": "user", "content": "Say hi"}
    ]
    resp_text = chat(messages)
"""

import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

if not GROQ_API_KEY:
    raise EnvironmentError(
        "GROQ_API_KEY is not set. Create a .env file at project root with GROQ_API_KEY=your_key"
    )

try:
    from groq import Groq
except Exception as e:
    raise RuntimeError("Please install the `groq` Python package (pip install groq).") from e

_client = Groq(api_key=GROQ_API_KEY)


def chat(messages, model: str | None = None, max_tokens: int = 1024, temperature: float = 0.2):
    """
    messages: list of {"role":"system"/"user"/"assistant", "content": "..."}
    Returns: assistant string content
    """
    model = model or GROQ_MODEL
    # Defensive validation of messages
    if not isinstance(messages, list) or not messages:
        raise ValueError("messages must be a non-empty list of message dicts")

    # Call Groq chat completions
    resp = _client.chat.completions.create(
        messages=messages,
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
    )

    # Response structure: resp.choices[0].message.content
    try:
        return resp.choices[0].message.content
    except Exception as e:
        # Fallback: return str(resp)
        return str(resp)


# Quick smoke test (only run when invoked directly)
if __name__ == "__main__":
    msg = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Write a one-line JSON: {'hello':'world'}"}
    ]
    print("Calling Groq chat (make sure GROQ_API_KEY is set)...")
    print(chat(msg))
