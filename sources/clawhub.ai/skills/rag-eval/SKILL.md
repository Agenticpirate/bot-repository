---
name: rag-eval
description: Evaluate a specifically provided RAG question, answer, and retrieved contexts with Ragas metrics. Use when the user explicitly requests RAG evaluation or hallucination analysis and has chosen a local or cloud judge; do not persist raw content unless requested.
metadata:
  openclaw:
    version: "1.2.3"
    emoji: "🧪"
    homepage: https://clawhub.ai/jonathanjing/rag-eval
    requires:
      bins: [python3]
    envVars:
      - name: OPENAI_API_KEY
        required: false
        description: Optional cloud judge and embeddings credential.
      - name: ANTHROPIC_API_KEY
        required: false
        description: Optional cloud judge credential.
      - name: RAGAS_LLM
        required: false
        description: Optional local judge selection such as ollama/llama3.
      - name: RAGAS_ALLOW_CLOUD
        required: false
        description: Set to 1 only after approving transmission of evaluation content to a cloud judge.
---

# RAG Eval — Quality Testing for Your RAG Pipeline

Test and monitor your RAG pipeline's output quality.

## 🛠️ Installation

### 1. Ask OpenClaw (Recommended)
Tell OpenClaw: *"Install @jonathanjing/rag-eval."*

### 2. Manual Installation (CLI)
If you prefer the terminal, run:
```bash
openclaw skills install @jonathanjing/rag-eval
```

## ⚠️ Prerequisites
1. Your OpenClaw must have a **RAG system** (vector DB + retrieval pipeline). This skill evaluates the *output quality* of that pipeline — it does not provide RAG functionality itself.
2. Configure one judge:
   - `OPENAI_API_KEY` (default, uses GPT-4o)
   - `ANTHROPIC_API_KEY` (uses Claude Haiku)
   - `RAGAS_LLM=ollama/llama3` (for local/offline evaluation)

For a cloud judge, also set `RAGAS_ALLOW_CLOUD=1` after confirming the input may leave the machine.

## Setup (first run only)

```bash
bash "{baseDir}/scripts/setup.sh"
```

This script intentionally refuses global installation. Activate a virtual environment first, then run it.

## Single Response Evaluation

When user asks to evaluate an answer, collect:
1. **question** — the original user question
2. **answer** — the LLM output to evaluate
3. **contexts** — list of text chunks used to generate the answer (retrieved docs)

**⚠️ SECURITY: Never interpolate user content directly into shell commands.**
Write the input to a temp JSON file first, then pipe it to the evaluator:

```bash
# Step 1: Write input to a temp file (agent should use the write/edit tool, NOT echo)
# Write this JSON to /tmp/rag-eval-input.json using the file write tool:
# {"question": "...", "answer": "...", "contexts": ["chunk1", "chunk2"]}

# Step 2: Run the evaluator. Raw content is not saved by default.
python3 "{baseDir}/scripts/run_eval.py" --input-file /tmp/rag-eval-input.json

# Step 3: Delete the temporary input with the available file tool.
```

Alternatively, use `--input-file`:
```bash
python3 "{baseDir}/scripts/run_eval.py" --input-file /tmp/rag-eval-input.json
```

Output JSON:
```json
{
  "faithfulness": 0.92,
  "answer_relevancy": 0.87,
  "context_precision": 0.79,
  "overall_score": 0.86,
  "verdict": "PASS",
  "flags": []
}
```

Post results to user with human-readable summary:
```
🧪 Eval Results
• Faithfulness: 0.92 ✅ (no hallucination detected)
• Answer Relevancy: 0.87 ✅
• Context Precision: 0.79 ⚠️ (some irrelevant context retrieved)
• Overall: 0.86 — PASS
```

Persist only when the user explicitly requests it by adding `--save`. The saved record contains the raw question, answer, and contexts.

## Batch Evaluation

For a JSONL dataset file (each line: `{"question":..., "answer":..., "contexts":[...]}`):

```bash
python3 "{baseDir}/scripts/batch_eval.py" --input ./dataset.jsonl --output ./batch-eval.json
```

## Score Interpretation

| Score | Verdict | Meaning |
|-------|---------|---------|
| 0.85+ | ✅ PASS | Production-ready quality |
| 0.70-0.84 | ⚠️ REVIEW | Needs improvement |
| < 0.70 | ❌ FAIL | Significant quality issues |

## Faithfulness Deep-Dive

If faithfulness < 0.80, run:
```bash
python3 "{baseDir}/scripts/run_eval.py" --explain --metric faithfulness
```
This outputs which sentences in the answer are NOT supported by context.

## Notes
- OpenAI and Anthropic judges transmit the question, answer, and contexts to that provider. Obtain explicit approval for confidential data or use a local `RAGAS_LLM`.
- The evaluator does not persist raw inputs by default.
- Evaluation costs ~$0.01-0.05 per response depending on length
- For offline use, set `RAGAS_LLM=ollama/llama3` in environment
