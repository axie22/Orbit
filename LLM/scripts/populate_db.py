import boto3
import csv
import uuid
from decimal import Decimal, InvalidOperation

# 1. Configuration
CSV_FILENAME = '../data/solutions_mapped.csv' # Make sure this matches your file name
TABLE_NAME = 'interviewai-lcProbSolution'
AWS_REGION = 'us-east-2' 

#aws_access_key_id = '**************'
#aws_secret_access_key = '**************************+'

# 2. Initialize the DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
table = dynamodb.Table(TABLE_NAME)

def clean_data(row): # Convert data types to decimals
    clean_row = {}
    for key, value in row.items():
        if value == "":
            continue 
            
        try:
            # 1. Try to convert to an Integer first
            clean_row[key] = int(value)
        except ValueError:
            # 2. If it's not an int, try converting to a Decimal (float)
            try:
                clean_row[key] = Decimal(value)
            except (ValueError, InvalidOperation):
                # 3. If both fail, it's just a string (URL, Code, Description)
                clean_row[key] = value
            
    return clean_row

print(f"Start loading data into {TABLE_NAME}...")

# 3. Read CSV and Batch Write
# Batch writer is much faster than inserting one by one
with table.batch_writer() as batch:
    with open(CSV_FILENAME, mode='r', encoding='utf-8') as csvfile:
        # DictReader maps the header row to dictionary keys automatically
        reader = csv.DictReader(csvfile)
        
        count = 0
        for row in reader:
            item = clean_data(row)
            
            # MAPPING:
            # We map 'id' from CSV to 'problemID' in DynamoDB
            # We Generate a UUID for 'solutionID' (The Sort Key)
            
            dynamo_item = {
                'problemID': str(item['id']),     # Partition Key
                'solutionID': str(uuid.uuid4()),  # Sort Key (Unique ID)
                **item                            # Unpacks the rest of the CSV columns
            }
            
            # Remove the original 'id' key if you don't want it duplicated inside the item
            # del dynamo_item['id'] 

            batch.put_item(Item=dynamo_item)
            count += 1
            
            if count % 100 == 0:
                print(f"Processed {count} rows...")

print(f"✅ Success! Uploaded {count} items to DynamoDB.")