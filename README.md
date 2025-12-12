# Orbit — Personalized Interview Preparation Assistant

## Deployment Link

https://orbit-app-mt7to.ondigitalocean.app/

## Overview

![Orbit Website Photo](./Documents/Orbit_Website.png)

**Orbit** is an intelligent, personalized interview preparation system that leverages large language models and retrieval-augmented generation to simulate technical interviews, evaluate responses, and provide targeted feedback.  
The system aims to make interview preparation more engaging and adaptive, with a focus on coding and system design interviews.

---

## Motivation
Job searching has become increasingly competitive, and candidates often struggle with limited, generic resources that do not adapt to their learning pace or strengths. While existing tools like LeetCode and mock interview services provide practice, they lack interactivity and personalized feedback loops.

Our project seeks to build an AI-powered assistant that:
- Conducts personalized mock interviews.
- Evaluates user responses for accuracy, clarity, and reasoning quality.
- Provides actionable, constructive feedback to guide future practice.

By integrating LLMs with retrieval systems and multimodal input (text, speech, and visuals), we can create a more natural, data-informed preparation experience that evolves with the user.

---

## Related Works

### 1. SimInterview (Nguyen et al., 2025)
[Paper](https://arxiv.org/abs/2508.11873)

**Summary:**  
SimInterview is a multilingual interview simulation system powered by LLMs. It integrates speech recognition, text generation, and visual avatars to simulate real interview experiences and adapts prompts to users’ resumes and target roles.

**Strengths:**
- Comprehensive multimodal design (speech + avatars).  
- Tested across multiple roles and languages.

**Limitations:**
- Focuses primarily on business interviews.  
- Lacks technical evaluation and coding-specific feedback.

---

### 2. Towards Smarter Hiring (Maity et al., 2025)
[Paper](https://arxiv.org/abs/2504.05683)

**Summary:**  
Introduces the HURIT dataset containing ~3,890 real HR interview transcripts. Evaluates pretrained LLMs for automated scoring, feedback generation, and error detection in HR interviews.

**Strengths:**
- Real-world data and human baselines.  
- Rigorous zero-shot and few-shot evaluation.

**Limitations:**
- Focused on HR interviews rather than technical problem-solving.  
- Feedback quality lacks precision in algorithmic reasoning contexts.

---

### 3. Zara (Yazdani et al., 2025)
[Paper](https://arxiv.org/abs/2507.02869)

**Summary:**  
A GPT-4-based AI interviewer that conducts candidate interviews and provides feedback using RAG-grounded evaluations aligned with real interview rubrics.

**Strengths:**
- Scalable feedback generation.  
- Hybrid RAG + LLM framework for reduced hallucination.

**Limitations:**
- Does not assess code correctness or technical logic.  
- Relies on human validation for reliability.

---

## Methodology

### System Architecture
Our proposed system consists of the following core components:

1. **Question Generation Module**  
   Uses prompt-engineered or fine-tuned LLMs to generate role-specific technical questions based on user-provided context.

2. **Knowledge Extraction Pipeline**  
   Automatically extracts technical interview data from YouTube coding tutorials using:
   - Whisper for transcription.  
   - PyTesseract/EasyOCR for code extraction.  
   - OpenAI API + LangChain for context processing.

3. **Response Evaluation Module**  
   Scores user answers for correctness, clarity, and reasoning using semantic similarity and rubric-based evaluation prompts.

4. **Feedback & Coaching Module**  
   Provides structured feedback and improvement suggestions while adapting tone and difficulty based on prior performance.

5. **Session Memory & Personalization Layer**  
   Maintains a record of user interactions to tailor future questions and feedback dynamically.

6. **Interface Layer**  
   A Flask-based web interface for conducting and visualizing mock interviews, feedback, and analytics.

---

## Tools & Technologies

| Category | Tools / Libraries |
|-----------|------------------|
| Data Processing | Python, Pandas, Jupyter |
| LLM & Retrieval | Transformers, LangChain, OpenAI API |
| Speech & OCR | Whisper API, PyTesseract, EasyOCR |
| Video Handling | OpenCV, Pytube |
| Backend & UI | Flask, HTML, CSS, JavaScript |
| Version Control | Git, GitHub |

---

## Datasets

### 1. Software Engineering Interview Questions Dataset
[Kaggle](https://www.kaggle.com/datasets/syedmharis/software-engineering-interview-questions-dataset)  
Contains 250 general technical questions suitable for evaluating base-level understanding of software engineering concepts.

**Use Case:**  
Serves as a foundation for question generation and testing baseline model performance.

---

### 2. LeetCode Problem Dataset
[Kaggle](https://www.kaggle.com/datasets/gzipchrist/leetcode-problem-dataset)  
Contains 1,825 LeetCode problems with difficulty levels, topics, and acceptance rates.

**Use Case:**  
Provides structured question data for fine-tuning generation models and analyzing patterns in problem selection.

---

### 3. LeetCode Solution Dataset (Python)
[Kaggle](https://www.kaggle.com/datasets/jacobhds/leetcode-solutions-and-content-kpis)  
Contains LeetCode problem solutions from the forum section of leetcode with identifiers like upvotes, views, and the solutions in python3

**Use Case:**  
Provides structured solution data for fine-tuning generation models and analyzing user-inputted solutions

---

### 4. YouTube Coding Interview Walkthroughs

See [Video_Processing.md](./Documents/Video_Processing.md) for more info.

**Pipeline:**

1. **Video Selection:** Filter by topic diversity, code clarity, and English language.  
2. **Frame Extraction:** Capture key frames using OpenCV scene detection.  
3. **Transcription:** Convert audio to text using Whisper or YouTube captions.  
4. **Text-Image Synchronization:** Pair transcripts with code screenshots.  
5. **Data Cleaning:** Normalize indentation, remove duplicates, and label by topic/difficulty.

**Purpose:**  
Forms a multimodal dataset (text + visuals) for enhanced LLM training and grounding. Enables reasoning about both code and explanation quality.

---

## Evaluation Plan

| Metric | Description |
|--------|--------------|
| **Feedback Accuracy** | Human evaluators assess model feedback against expert answers. |
| **Question Relevance** | Cosine similarity between generated and benchmark question sets. |
| **User Improvement** | Track user score trends and performance over time. |
| **Response Coherence** | Measure contextual consistency across multiple feedback turns. |

---

## Work Plan

| Week | Focus | Planned Tasks |
|------|--------|---------------|
| **1 (10/07–10/13)** | Ideation | Finalize proposal, literature review, meet TA |
| **2 (10/14–10/20)** | Data & Setup | Collect and preprocess datasets, begin EDA |
| **3 (10/21–10/27)** | Model Baseline | Build static LLM chain for question generation and scoring |
| **4 (10/28–11/03)** | Adaptive Feedback | Integrate evaluation loops, add personalized question selection |
| **5 (11/04–11/10)** | UI Prototyping | Build Flask-based frontend and connect backend models |
| **6 (11/11–11/17)** | Midpoint Demo | Internal presentation and debugging |
| **7 (11/18–11/24)** | Evaluation | Implement feedback metrics and small user study |
| **8 (11/25–12/01)** | Refinement | Optimize prompts, conduct ablation studies |
| **9 (12/02–12/08)** | Visualization | Generate analysis plots and performance trends |
| **10 (12/09–12/15)** | Finalization | Prepare report, demo, and code documentation |

---

## Directory Layout

``` bash
video-pipeline/
├─ config/
│  ├─ channels.yml               # seed channels/playlists/video_ids
│  ├─ constants.yml              # formats, thresholds, processing_version
│  └─ .env.example               # YT API key, paths
├─ pipelines/
│  ├─ discover.py                # builds/updates manifest.csv from seeds
│  ├─ ingest.py                  # downloads media + captions; extracts audio
│  ├─ plan_segments.py             # (Stage 2.1) transcript→candidate segments
│  ├─ materialize_segments.py      # (Stage 2.2) yt-dlp clips + ffmpeg frames
│  ├─ detect_code_frames.py        # (Stage 2.3) UI classifier + OCR + scoring
│  └─ index_frames.py              # (Stage 2.4) link frames↔utterances, write DDB
├─ services/                       # reusable, side-effecting helpers (S3, DDB, yt, ffmpeg…)
│  ├─ s3io.py
│  ├─ ddb.py
│  ├─ yt.py                        # yt-dlp client selection, segment download
│  ├─ media.py                     # ffmpeg extract_audio, extract_frames
│  └─ captions.py                  # pick_best_caption, parse_vtt, whisperx wrappers
├─ manifests/
│  ├─ manifest.csv               # canonical list of videos to process
│  └─ rejected.csv               # videos rejected at discover
├─ data/
│  ├─ raw/                       # immutable artifacts (as-downloaded)
│  │  └─ yt/{video_id}/
│  │     ├─ metadata.json
│  │     ├─ captions.en.vtt      # zero or more caption files
│  │     ├─ captions.auto.en.vtt
│  │     └─ source.sha256
│  └─ derived/                   # pipeline outputs (audio, aligned captions, OCR frames)
│     └─ yt/{video_id}/
│        ├─ audio.wav            # For ASR/alignment
│        └─ captions.norm.en.vtt # normalized caption track (merged/fixed)
├─ logs/
│  ├─ discover.log
│  └─ ingest.log
├─ scripts/
│  └─ make_audio.sh              # ffmpeg wrapper
├─ .gitignore
└─ README.md

```

---

## References

- Nguyen, T. T. H., et al. (2025). *SimInterview: Transforming Business Education through LLM-Based Simulated Multilingual Interview Training System.* arXiv:2508.11873  
- Maity, S., Deroy, A., & Sarkar, S. (2025). *Towards Smarter Hiring: Are Zero-Shot and Few-Shot Pre-trained LLMs Ready for HR Spoken Interview Transcript Analysis?* arXiv:2504.05683  
- Yazdani, N., Mahajan, A., & Ansari, A. (2025). *Zara: An LLM-Based Candidate Interview Feedback System.* arXiv:2507.02869
