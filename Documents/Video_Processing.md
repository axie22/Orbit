# Data Processing for Videos

## Goal

To train and evaluate our interview-preparation assistant, we collected and processed data from publicly available YouTube coding tutorial videos that explain solutions to LeetCode-style technical problems from creators like NeetCode, TechLead, and others. These videos provide rich instructional material with verbal reasoning that serves as ideal examples of high-quality interview explanations.

**Data at Inference:** We target video transcripts containing the creator's solution explanations, which are then used to:
- Ground LLM responses in real pedagogical content
- Provide hints and explanations during mock interviews
- Generate synthetic training dialogues for fine-tuning

---

## High-Level Pipeline

**Discover → Transcript Extraction → Problem Mapping → Synthetic Dialogue Generation → Fine-Tuning**

---

## 1. Discover & Metadata Collection

**Inputs:** YouTube channels, playlists, or video IDs  
**Tools:** YouTube Data API v3

**Process:**
- Fetch video metadata (title, description, publish date, video ID)
- Extract problem information from titles (e.g., "Two Sum - LeetCode 1")
- Build manifest CSV with video IDs and metadata
- Filter for relevant coding tutorial content

**Artifacts:**
- `manifest.csv` - List of discovered videos to process
- Video metadata (title, URL, channel, duration)

---

## 2. Transcript Extraction

**Primary Method:** YouTube Auto-Generated Captions

### Why YouTube Captions?

**Pros:**
- Zero cost, zero compute, instant availability
- Sentence-level timestamps with punctuation
- Decent accuracy on common speech
- No additional processing required

**Cons:**
- Some technical terms get mangled (e.g., "deque" → "deck", "O(n log n)" → "o n login")
- No word-level timing (chunk-level timestamps)
- Some videos lack captions or have incomplete tracks

### Implementation (`caption_cleaner.py`)

```python
def process_caption(video_id: str) -> str:
    # Read normalized VTT file
    vtt_file = work_dir / "captions.norm.en.vtt"
    
    # Parse WebVTT format
    # Extract text, remove timestamps
    # Clean formatting artifacts
    # Return plain text transcript
```

**Output:** Plain text transcripts saved to `transcripts/{video_id}/transcript.txt`

---

## 3. Problem Mapping & Data Aggregation

**Goal:** Link transcripts to LeetCode problem metadata

**Process (`populate_db.py`):**
1. Parse problem ID from video title (e.g., "LeetCode 1" → problem ID: 1)
2. Load LeetCode problem dataset with solutions
3. Merge transcripts with problem data via left join on problem ID
4. Aggregate multiple solutions per problem
5. Upload to DynamoDB

**Schema:**
```python
{
    "problemId": "1",
    "title": "Two Sum",
    "description": "...",
    "difficulty": "Easy",
    "topics": ["Array", "Hash Table"],
    "solutions": ["solution1.py", "solution2.py", ...],
    "transcript": "Today we're solving Two Sum..."
}
```

**Coverage:**
- **480+ videos** processed
- **1825 unique LeetCode problems** in database
- **60-70% transcript coverage** (problems with associated video explanations)

---

## 4. Synthetic Dialogue Generation

**Goal:** Convert monologue tutorial transcripts into realistic interviewer-candidate conversations

### Why Synthetic Dialogues?

Real interview transcripts are hard to collect (privacy concerns, scarcity). YouTube tutorials provide high-quality explanations but in monologue form. We use an LLM to transform these into training dialogues.

### Implementation (`generate_finetune_data.py`)

**Process:**
1. Take transcript + problem title
2. Prompt Gemini 2.0 Flash to generate interviewer-candidate dialogue
3. Interviewer uses Socratic method (asks questions, gives hints)
4. Candidate responds with reasoning (may make minor mistakes)
5. Conversation ends with optimal solution

**Prompt Template:**
```python
prompt = f"""
Convert this monologue into a realistic training dialogue between:
1. A Candidate (solving the problem, may make mistakes)
2. An Interviewer (guides SOCRATICALLY, doesn't give answer)

The conversation should end with the candidate reaching the optimal solution.

OUTPUT FORMAT: JSON with messages array
{{
    "messages": [
        {{"role": "user", "content": "..."}},
        {{"role": "model", "content": "..."}}
    ]
}}
"""
```

**Output Format (JSONL for Google AI Studio):**
```json
{
  "contents": [
    {"role": "user", "parts": [{"text": "I'm ready to solve Two Sum"}]},
    {"role": "model", "parts": [{"text": "Great. Can you restate the problem?"}]},
    {"role": "user", "parts": [{"text": "We need to find two numbers that add up to target"}]},
    {"role": "model", "parts": [{"text": "Correct. What data structure would help here?"}]}
  ]
}
```

**Generated Data:**
- **220+ training examples** in `interview_finetune_data_with_system.jsonl`
- Covers diverse problem types (arrays, trees, graphs, DP)
- Demonstrates hint-giving, complexity analysis, edge case discussion

---

## 5. Fine-Tuning

**Model:** Gemini 2.0 Flash  
**Platform:** Google AI Studio / Vertex AI  

**Training:**
- Upload JSONL training data to Google AI Studio
- Configure fine-tuning job with system instruction template
- Deploy fine-tuned model to Vertex AI endpoint

**System Instruction (Injected at Inference):**
```python
system_text = f"""
You are an expert Senior Staff Software Engineer conducting a mock technical interview.

--- HIDDEN SOLUTION (FOR YOUR EYES ONLY) ---
{problem_context['solution_code']}

--- INTERVIEWER HINTS (Derived from real interviews) ---
{problem_context['hints']}

--- YOUR INSTRUCTIONS ---
1. Be encouraging but rigorous.
2. Use the Socratic Method. DO NOT write code for user.
3. If user's code has a bug, ask them to trace with an example.
4. Keep responses concise (under 3 sentences usually).
"""
```

---

## How This Feeds into Our Model

### At Inference (During Live Interview):

1. **User joins practice session** for problem (e.g., "Two Sum")
2. **Backend retrieves from DynamoDB:**
   - Problem description
   - Hidden solution code
   - Transcript hints from YouTube tutorial
3. **System prompt injected** with above context
4. **User writes code** in Monaco Editor
5. **User speaks** → STT → text sent to LLM
6. **LLM generates response** using:
   - Fine-tuned Socratic behavior
   - Retrieved transcript hints (RAG)
   - Current user code state
7. **Response synthesized** → TTS → audio played back

### RAG (Retrieval-Augmented Generation):

- **Retrieval:** DynamoDB lookup by problem ID (150ms latency)
- **Context:** Transcript excerpt (truncated to 10K chars) + solution code
- **Augmentation:** Context injected into system prompt before generation
- **Benefit:** Grounded responses, reduced hallucination, matches tutorial quality

---

## Data Quality Observations

### Strengths:
- YouTube captions provide free, high-quality transcripts at scale
- Tutorial creators (NeetCode, etc.) give excellent pedagogical explanations
- Transcript hints enable realistic interviewer behavior (mirrors real teaching)

### Limitations:
- **Technical vocabulary errors:** Some terms transcribed incorrectly
- **Monologue format:** Original transcripts aren't dialogues (synthetic conversion needed)
- **Coverage gaps:** Not all 1825 problems have video tutorials (only 60-70%)
- **Synthetic dialogue quality:** Generated conversations can feel scripted or overly polished

### Future Improvements:
- Manual correction of technical terms in high-value transcripts
- Collect real human-human mock interview recordings for training data
- Expand video coverage to system design and behavioral questions
- Fine-tune dialogue generator to produce more realistic candidate responses

---

## Pipeline Scripts Reference

| Script | Purpose |
|--------|---------|
| `discover.py` | Fetch video metadata from YouTube API |
| `generate_transcripts.py` | Extract captions and save as plain text |
| `caption_cleaner.py` | Parse VTT format, clean artifacts |
| `transcript_csv.py` | Convert transcripts to CSV format |
| `populate_db.py` | Upload problems + transcripts to DynamoDB |
| `generate_finetune_data.py` | Create synthetic training dialogues |

---

This approach gives us scalable, cost-effective data collection while maintaining pedagogical quality from expert tutorial creators.
