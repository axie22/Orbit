# Data Processing for Videos

## Goal

To train and evaluate our interview-preparation assistant, we plan to collect and process data from multiple sources including textual interview transcripts, code snippets, and annotated images of algorithm solutions. One of our core datasets will be sourced from publicly available YouTube coding tutorial videos that explain solutions to LeetCode-style technical problems from creators like Neetcode. These videos provide rich instructional material combining both visual and verbal reasoning, which can serve as ideal examples of high-quality interview responses.

**Modalities at Inference:** We'll be targeting video transcripts as well as the text/images that appear on screen when the creator is coding their solution.

- Text modality: word-timestamped transcripts (creator narration).
- Visual modality: frames precisely when code or diagrams are on screen, plus OCR ([Optical Character Recognition](https://aws.amazon.com/what-is/ocr/)) text from those frames.
- Alignment: a timeline that aligns transcript spans to code/diagram frames to code snippets so we can synthesize realistic Q&A turns

### High-level Pipeline

Discover $\rightarrow$ Ingest $\rightarrow$ Transcribe/Align $\rightarrow$ Detect code scenes $\rightarrow$ OCR & code parse $\rightarrow$ Normalize & de-dupe $\rightarrow$ Align transcript to code events $\rightarrow$ ?

## 1. Discover & Ingest

**Inputs:** YT channels, playlists, or video IDs.
**Metadata fetch:** title, description, publish time, tags, problem slug/ID, creator ID.
**Artifacts to store:** audio track (WAV), captions, metadata JSON.

## 2. Transcription + forced alignment

### Two Options

1. YT Auto Transcripts

Pros:

- Zero cost, zero compute, instant availability
- Often sentence-level timestamps + punctuation. Useful for coarse segmentation without running ASR.
- Decent accuracy on common speech

Cons:

- No word-level timing. Most YT caption tracks are chunk-level. Downstream forced alignment to frames becomes approximate and noisy.
- **Terminology and code tokens.** DS&A vocab and identifiers get mangled: `deque`, `Trie`, `i/j`, `O(n log n)` are all are common failure points. This hurts:
  - OCR to transcript alignment (can’t match “heapify” if it’s transcribed “heap of five”).
  - Pattern labeling (“two-pointers” vs “two pointers” vs “two point is”).
  - Complexity extraction (O(n log n) $\rightarrow$ “o n login”).
- Missing or blocked tracks. Some videos have no captions or only partial ones  

2. YT + [WhisperX](https://github.com/m-bain/whisperX)

The hybrid approach combines:

- YouTube’s auto-generated captions
- WhisperX alignment, lightweight forced alignment to refine timing and fix errors

**Breakdown:**

1. Pull YT Captions via the YouTube API
2. Run WhisperX forced alignment on the audio
   1. WhisperX takes your video’s audio and optionally an existing transcript. It aligns the spoken words to timestamps with word-level precision.
3. Merge and reconcile
   1. Combine both sources: Use YouTube captions for segmentation and punctuation, Use WhisperX for timing and technical correctness
4. Lexicon & normalization layer (Can skip)
   1. Domain dictionary & normalizers: map “o n login” $\rightarrow$ O(n log n), “deck” $\rightarrow$ deque

## 3. Scene/shot detection & Code Scene Classification

**Goal:** Find when Code/Whiteboard/IDE is on screen, so we can OCR only the useful frames

- Shot/scene cuts: [PySceneDetect](https://www.scenedetect.com/) → segment into scenes.
  - "PySceneDetect is a tool for detecting shot changes in videos (example), and can automatically split the video into separate clips"
- Frame sampling: sample 1–2 fps within scenes.
- Binary classifier “code vs not-code”:
  - Option 1 (Simpler, Probably less accurate): rule-based heuristics (monospace density, high contrast text blocks, window chrome of IDEs).
  - Option 2 (Complex, More accurate): a lightweight CNN/ViT trained on a small labeled set of frames (positive: code/diagram; negative: talking head)

## 4. OCR on code/diagram frames + code parsing

OCR: [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) or [Tesseract](https://github.com/tesseract-ocr/tesseract)

- Both are OpenSource so we'll look into which one is better for our use-case

**Post-processing:**

- Merge per-frame OCR into time-ordered code lines
- Language detect (pygments/guesslang), then normalize.
- Group lines into snippets when stable for ≥N seconds.

## 5. Transcript and code alignment

**Goal**: We want to know which words explain which code. This might be a big tough so we'll have to think of how we can complete this.

Compute similarity between transcript segment and code snippet using:

- Keyword overlap
- Embedding similarity
- Time overlap

Create alignment edges when transcript time window overlaps a code scene and similarity exceeds a threshold.

## 6. Reasoning step segmentation

Turn the long narration into ordered steps that reflect interview-style reasoning. We want our LLM to be able to speak like a great engineer so it has to provide good reasoning. This might also be complex so let's think about how we can engineer this.

Heuristics + small model:

- Boundary cues: “first”, “then”, “now”, “edge case”, “complexity”, “alternative”.
- Clause patterns: stating invariant, choosing data structure, walking through example, complexity statement.

Label each step with type and evidence.

Extract problem card fields if mentioned: constraints, typical pitfalls, complexity.

## 7. Turn lecture into mock interview dialogue

We want full interviewer to candidate turn cycle. We synthesize supervised pairs from the aligned steps.

Templates + LLM polishing:

Interviewer prompts based on upcoming/next step: \[“Restate the problem in your own words.”, “What data structure would help here and why?”,...\]

Candidate answers are grounded in the transcript snippet for that step.

Insert realistic follow-ups from common pitfalls mined from the video (e.g., duplicates, negatives, overflow).

## How does this Feed into our Model?

1. Training data: thousands of grounded, multi-turn dialogues with attached code and frames.
2. RAG at inference: retrieve the right problem card + similar dialogues + relevant frames/OCR snippets to guide answers.
3. Fine-tune: supervised fine-tune on our best dialogues to get the “flow” we want.
