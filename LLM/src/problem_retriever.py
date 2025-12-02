import boto3
import os
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

# Initialize DynamoDB Client
dynamodb = boto3.resource(
    'dynamodb',
    region_name=os.getenv("AWS_REGION", "us-east-2")
)

TABLE_NAME = os.getenv("DYNAMODB_TABLE_NAME", "Orbit_Interview_Questions")
table = dynamodb.Table(TABLE_NAME)

def get_problem_context(problem_id: str):
    """
    Fetches the problem details, solution, and transcript hints from DynamoDB.
    """
    try:
        response = table.get_item(Key={'problemId': problem_id})
        
        if 'Item' not in response:
            return None

        item = response['Item']

        # We restructure the data to be clean for the LLM
        return {
            "title": item.get('title', 'Unknown Problem'),
            "description": item.get('description', ''),
            "difficulty": item.get('difficulty', 'Medium'),
            # The Hidden Solution the bot sees but doesn't share
            "solution_code": item.get('solutions', ''), 
            # If you processed videos, these hints go here
            "hints": item.get('transcript', 'No specific hints available. Use general knowledge.')
        }

    except ClientError as e:
        print(f"Error fetching from DynamoDB: {e}")
        return None