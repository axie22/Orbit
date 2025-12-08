import pandas as pd
import boto3
import time
import sys
from botocore.exceptions import ClientError
from decimal import Decimal

# --- configuration ---
TABLE_NAME = "Orbit_Interview_Questions"
REGION = "us-east-2" 
LEETCODE_CSV = "LLM/data/solutions_mapped.csv" 
TRANSCRIPT_CSV = "transcripts/video_problem_transcripts.csv"

# columns to drop to save space
DROP_COLUMNS = [
    'accepted', 'asked_by_faang', 'difficulty_y', 'discuss_count', 
    'dislikes', 'frequency', 'is_premium', 'likes', 'number', 
    'post_href', 'post_title', 'rating', 'slug', 'solution_link', 
    'submissions', 'upvotes', 'url', 'user', 'views', 'acceptance_rate', 
    'acceptance', 'problem_title', 'similar_questions', 'companies'
]

def process_data():
    print("step 1: loading data...")
    df_problems = pd.read_csv(LEETCODE_CSV)
    df_transcripts = pd.read_csv(TRANSCRIPT_CSV)

    # clean columns
    cols_to_drop = [c for c in DROP_COLUMNS if c in df_problems.columns]
    df_problems = df_problems.drop(columns=cols_to_drop)

    print("step 2: aggregating solutions (grouping by id)...")
    # group by id so "two sum" appears once with a list of solutions
    df_agg = df_problems.groupby('id').agg({
        'title': 'first',
        'description': 'first',
        'difficulty_x': 'first',
        'related_topics': 'first',
        # collect all solutions into a list, ignore nans
        'python_solutions': lambda x: list(x.dropna().unique())
    }).reset_index()

    df_agg = df_agg.rename(columns={'difficulty_x': 'difficulty'})

    print("step 3: merging transcripts (left join)...")
    # convert both ids to numeric to ensure matches (e.g. 1 == 1.0)
    df_agg['id_numeric'] = pd.to_numeric(df_agg['id'], errors='coerce')
    df_transcripts['problem_id_numeric'] = pd.to_numeric(df_transcripts['problem_id'], errors='coerce')

    # left join: keep everything in df_agg (problems), attach df_transcripts where possible
    df_final = pd.merge(
        df_agg, 
        df_transcripts[['problem_id_numeric', 'transcript']], 
        left_on='id_numeric', 
        right_on='problem_id_numeric', 
        how='left' # <--- this ensures we keep two sum even if missing in transcripts
    )

    # fill missing data
    df_final['transcript'] = df_final['transcript'].fillna("no transcript available.")
    df_final['related_topics'] = df_final['related_topics'].fillna("none")
    
    # create the string partition key
    df_final['problemId'] = df_final['id_numeric'].astype(str).str.replace(r'\.0$', '', regex=True)
    
    # --- verification check ---
    print("\n--- data integrity check ---")
    check_two_sum = df_final[df_final['problemId'] == '1']
    if not check_two_sum.empty:
        print(f"success: 'two sum' (id 1) is present!")
        print(f"   transcript status: {check_two_sum.iloc[0]['transcript'][:30]}...")
    else:
        print(f"error: 'two sum' (id 1) is missing. check your source csv!")
    print(f"total problems to upload: {len(df_final)}\n")
    # --------------------------

    return df_final

def slow_upload(table, df):
    total = len(df)
    print(f"starting upload of {total} items to {TABLE_NAME}...")
    print("speed limited to 2 items/sec (safe for free tier provisioned capacity)")
    
    for index, row in df.iterrows():
        item = row.to_dict()
        
        # dynamodb format prep
        clean_item = {
            'problemId': str(item['problemId']),
            'title': str(item['title']),
            'description': str(item['description']),
            'difficulty': str(item['difficulty']),
            'topics': str(item['related_topics']).split(','),
            'solutions': item['python_solutions'],
            'transcript': str(item['transcript'])
        }
        
        # remove empty strings/lists if you prefer, but this is safe
        
        try:
            table.put_item(Item=clean_item)
            
            # print progress
            sys.stdout.write(f"\rprogress: {index+1}/{total} | uploaded: {clean_item['title'][:20]}")
            sys.stdout.flush()
            
            # sleep to prevent crashing the db
            time.sleep(0.5) 
            
        except ClientError as e:
            print(f"\nerror on {clean_item['title']}: {e}")
            time.sleep(2)

    print("\n\nupload complete!")

if __name__ == "__main__":
    # aws setup
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)
    
    # run
    final_df = process_data()
    
    # confirm before uploading
    confirm = input("does the integrity check look good? (y/n): ")
    if confirm.lower() == 'y':
        slow_upload(table, final_df)
    else:
        print("upload cancelled.")