---
name: paper-pilot
description: Automates deep research analysis on PDFs in the input folder.
---

# PaperPilot Workflow Instructions

When the user asks to "Run PaperPilot" or "analyze a paper", execute ALL of the following steps in order. Do not ask for clarification. Do not stop early. Complete all 7 steps.

---

## Step 1: Scan the Input Folder
- List all files in: `C:\Users\faizan\Desktop\PaperPilot\input\`
- Identify the most recently added PDF file.
- If multiple PDFs exist, ask the user which one to process.
- If no PDFs exist, notify the user and stop.

## Step 2: Extract Text from the PDF
- Use `pdftotext` or any available shell tool to extract text from the PDF.
- Save the raw text to: `C:\Users\faizan\Desktop\PaperPilot\input\extracted.txt`
- Identify the paper's title from the first few lines of the extracted text.
- Create a sanitized folder name from the title (e.g., "Attention_Is_All_You_Need").
- Call this variable `PAPER_TITLE`.

## Step 3: Create the Output Workspace
- Create this directory: `C:\Users\faizan\Desktop\PaperPilot\output\{PAPER_TITLE}\`

## Step 4: Generate Summary.md and Structured_Insights.md
- Read the full prompt from: `C:\Users\faizan\Desktop\PaperPilot\prompts\analyze_paper.md`
- Read the extracted text from Step 2.
- Using both as instructions, write TWO files to `C:\Users\faizan\Desktop\PaperPilot\output\{PAPER_TITLE}\`:
  - `Summary.md` — Problem, methodology, key results, one-line takeaway.
  - `Structured_Insights.md` — Dataset, model type, metrics table, reproducibility.

## Step 5: Generate Research_Gap.md
- Read the full prompt from: `C:\Users\faizan\Desktop\PaperPilot\prompts\research_gap.md`
- Read the extracted text from Step 2.
- Using both as instructions, write `Research_Gap.md` to the output folder.
- It must contain: Methodological Gaps, Dataset/Evaluation Gaps, Reasoning Gaps, and Future Work proposals.

## Step 6: Generate Related_Work.md (Browser Search)
- Open the browser.
- Search arXiv.org or Semantic Scholar for papers related to `{PAPER_TITLE}`.
- Identify exactly 3 highly relevant papers.
- For each paper, extract ONLY: Title, Year, and direct arXiv link.
- Write `Related_Work.md` to the output folder with this information.

## Step 7: Finalize
- Create an empty file: `C:\Users\faizan\Desktop\PaperPilot\output\{PAPER_TITLE}\Notes.txt`
- Move the original PDF from the input folder to: `C:\Users\faizan\Desktop\PaperPilot\output\{PAPER_TITLE}\original.pdf`
- Delete `C:\Users\faizan\Desktop\PaperPilot\input\extracted.txt`
- Notify the user: "PaperPilot complete! Check output/{PAPER_TITLE}/ — all 5 files generated."

---

## Rules
- Do NOT stop between steps to ask for permission.
- Do NOT treat this as a conversational request.
- Execute all 7 steps in sequence and call `complete_task` only after Step 7 is done.
