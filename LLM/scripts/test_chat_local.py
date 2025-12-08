import sys
import os
import requests
import json

# Add the parent directory to the path so we can import from src if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# CONFIGURATION
# If your server is running on a different port, change it here
API_URL = "http://localhost:8000/chat"

# TEST DATA
# This simulates what the React Frontend sends
mock_payload = {
    "problemId": "1", # This matches the hardcoded ID we set earlier
    "code": """
def twoSum(nums, target):
    # I am stuck. I know I need to check pairs.
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    """,
    "history": [
        {"role": "user", "parts": [{"text": "Hi, I'm ready to solve Two Sum."}]},
        {"role": "model", "parts": [{"text": "Great! The problem is finding two numbers that add up to a target. How do you plan to solve it?"}]},
        {"role": "user", "parts": [{"text": "I wrote a brute force solution but I know it's slow. Can you give me a hint on how to optimize it?"}]}
    ]
}

def run_test():
    print(f"📡 Connecting to {API_URL}...")
    
    try:
        response = requests.post(
            API_URL, 
            json=mock_payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            print("\n SUCCESS! Backend Replied:")
            data = response.json()
            print("-" * 40)
            print(f" AI Reply: {data.get('reply')}")
            print("-" * 40)
        else:
            print(f"\n ERROR: Server returned {response.status_code}")
            print(f"Details: {response.text}")

    except requests.exceptions.ConnectionError:
        print("\n CONNECTION REFUSED")
        print("Is your server running? Try running 'python app.py' in a separate terminal.")

if __name__ == "__main__":
    run_test()