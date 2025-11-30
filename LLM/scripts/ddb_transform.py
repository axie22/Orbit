import json
from decimal import Decimal
import boto3

PRIMARY_TOPICS = {'Array', 'Linked List', 'Binary Search', 'Tree', 'String', 'Math', 'Two Pointers',
                  'Backtracking', 'Greedy', 'Graph', 'Hash Table', 'Heap', 'Dynamic Programming',
                  'Bit Manipulation', 'Stack', 'Sort'}

REMOVE_FIELDS = ['accepted', 'asked_by_faang', 'difficulty_y', 'discuss_count', 
                     'dislikes', 'frequency', 'id', 'is_premium', 'likes', 'number',
                     'post_href', 'post_title', 'python_solutions', 'rating', 'slug',
                     'solution_link', 'submissions', 'problem_title', 'upvotes', 'url',
                     'user', 'views', 'acceptance']

NUMERIC_MAPPINGS = {
    'Easy': '1',
    'Medium': '2',
    'Hard': '3'
}

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

def transform_data(file_name, out_file):
    with open(file_name, 'r', encoding='utf-8') as f:
        items = json.load(f)

    seen = set()
    transformed = []
    for item in items:
        if item['title'] is None or item['problemID'] in seen:
            continue
        seen.add(item['problemID'])
        for field in REMOVE_FIELDS:
            item.pop(field, None)    
  
        item['difficulty'] = item.pop('difficulty_x')

        if 'related_topics' not in item:
            item['primary_topic'] = 'Misc'
            
        else:
            cats = item['related_topics'].split(',')
            item.pop('related_topics', None)
            found = False
            for cat in cats:
                if cat in PRIMARY_TOPICS:
                    item['primary_topic'] = cat
                    found = True
                    break

        if not found:
            if cats[0] == 'Depth-first Search':
                item['primary_topic'] = 'Graph'
            else:
                item['primary_topic'] = 'Misc'
                item['Secondary_Category'] = cats[0]

        item['difficulty#problemID'] = f'{NUMERIC_MAPPINGS[item['difficulty']]}_{item['difficulty']}#{item['problemID'].rjust(5, '0')}'
        transformed.append(item)


    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(transformed, f, indent=4)

def upload_to_ddb(filename):
    dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
    table = dynamodb.Table('orbit-lcproblems')
    with open(filename, 'r', encoding='utf-8') as f:
        items = json.load(f, parse_float=Decimal)
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)
    print(f"Uploaded {len(items)} to ddb")


def main():
    # download_dynamodb_table('interviewai-lcProbSolution', 'downloaded_data.json')
    transform_data('downloaded_data.json', "transformed.json")
    upload_to_ddb('transformed.json')

if __name__ == "__main__":
    main()
