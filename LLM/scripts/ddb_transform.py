import json
from decimal import Decimal
import boto3


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            if o % 1 == 0:
                return int(o)
            return float(o)
        return super().default(o)


def download_dynamodb_table(table_name, file_name):
    dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
    table = dynamodb.Table(table_name)
    scan_kwargs = {}
    done = False
    start_key = None
    items = []

    print(f"Starting scan of table {table_name}...")

    while not done:
        if start_key:
            scan_kwargs['ExclusiveStartKey'] = start_key
        response = table.scan(**scan_kwargs)
        items.extend(response.get('Items', []))
        start_key = response.get('LastEvaluatedKey', None)
        if not start_key:
            done = True   
        print(f"Items collected so far: {len(items)}")

    with open(file_name, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=4, cls=DecimalEncoder) 
    print(f"Successfully downloaded {len(items)} items to {file_name}")

download_dynamodb_table('interviewai-lcProbSolution', 'downloaded_data.json')
