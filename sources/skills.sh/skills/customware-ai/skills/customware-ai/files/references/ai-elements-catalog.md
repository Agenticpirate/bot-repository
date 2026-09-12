# AI Elements Catalog

Catalog checked against the official AI Elements registry on 2026-07-15. It contains 48 components.

Read this catalog to choose components. Then read only the linked files under `components/` for the components the feature will use. Never load the whole folder into context.

Common starting sets:

- Chat: `conversation`, `message`, and `prompt-input`.
- Tool-backed chat: `conversation`, `message`, `prompt-input`, and `tool`.
- Code or artifact viewer: choose only from `artifact`, `code-block`, `file-tree`, `snippet`, and related developer-output components.
- Workflow editor: start with `canvas`, `node`, and `edge`; add `connection`, `controls`, `panel`, or `toolbar` only when the design uses them.
- Voice UI: choose only the input, playback, transcription, persona, or selector components the flow needs.

Each component file starts with its install commands and then contains its API, usage guidance, and linked official examples. Open example files only when implementing that component.

## Contents

- [Chatbot](#chatbot)
- [Code And Developer Output](#code-and-developer-output)
- [Utilities](#utilities)
- [Voice](#voice)
- [Workflow And Canvas](#workflow-and-canvas)
- [Install Everything](#install-everything)

For correct Customware placement, run the non-interactive installer from the skill root and pass all selected names together:

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs conversation message prompt-input --cwd .
```

The installer runs each listed pnpm/shadcn registry command, isolates registry-matched shadcn primitives under `app/components/ai-elements/ui/`, and keeps the template's existing `app/components/ui/` contracts unchanged.

## Chatbot

| Component | Purpose | pnpm/shadcn registry command |
| --- | --- | --- |
| [`attachments`](components/attachments.md) | Display and manage files attached to prompts or messages. | `pnpm dlx shadcn@latest add @ai-elements/attachments --yes --path .tmp/customware-ai-elements-install` |
| [`chain-of-thought`](components/chain-of-thought.md) | Display discrete labeled reasoning or activity steps. | `pnpm dlx shadcn@latest add @ai-elements/chain-of-thought --yes --path .tmp/customware-ai-elements-install` |
| [`checkpoint`](components/checkpoint.md) | Show restorable conversation checkpoints. | `pnpm dlx shadcn@latest add @ai-elements/checkpoint --yes --path .tmp/customware-ai-elements-install` |
| [`confirmation`](components/confirmation.md) | Ask users to approve or reject an AI action. | `pnpm dlx shadcn@latest add @ai-elements/confirmation --yes --path .tmp/customware-ai-elements-install` |
| [`context`](components/context.md) | Show model context-window usage. | `pnpm dlx shadcn@latest add @ai-elements/context --yes --path .tmp/customware-ai-elements-install` |
| [`conversation`](components/conversation.md) | Scrollable chat transcript with empty and jump-to-bottom states. | `pnpm dlx shadcn@latest add @ai-elements/conversation --yes --path .tmp/customware-ai-elements-install` |
| [`inline-citation`](components/inline-citation.md) | Place citations directly inside generated text. | `pnpm dlx shadcn@latest add @ai-elements/inline-citation --yes --path .tmp/customware-ai-elements-install` |
| [`message`](components/message.md) | Render user/assistant messages, markdown, actions, and branches. | `pnpm dlx shadcn@latest add @ai-elements/message --yes --path .tmp/customware-ai-elements-install` |
| [`model-selector`](components/model-selector.md) | Search and select from an allowed model list. | `pnpm dlx shadcn@latest add @ai-elements/model-selector --yes --path .tmp/customware-ai-elements-install` |
| [`plan`](components/plan.md) | Display an AI-generated plan and progress. | `pnpm dlx shadcn@latest add @ai-elements/plan --yes --path .tmp/customware-ai-elements-install` |
| [`prompt-input`](components/prompt-input.md) | Compose prompts with submit controls, files, and optional tools. | `pnpm dlx shadcn@latest add @ai-elements/prompt-input --yes --path .tmp/customware-ai-elements-install` |
| [`queue`](components/queue.md) | Display queued and pending user prompts. | `pnpm dlx shadcn@latest add @ai-elements/queue --yes --path .tmp/customware-ai-elements-install` |
| [`reasoning`](components/reasoning.md) | Show a collapsible streaming reasoning block. | `pnpm dlx shadcn@latest add @ai-elements/reasoning --yes --path .tmp/customware-ai-elements-install` |
| [`shimmer`](components/shimmer.md) | Apply a streaming/loading shimmer to text. | `pnpm dlx shadcn@latest add @ai-elements/shimmer --yes --path .tmp/customware-ai-elements-install` |
| [`sources`](components/sources.md) | Group links used as response sources. | `pnpm dlx shadcn@latest add @ai-elements/sources --yes --path .tmp/customware-ai-elements-install` |
| [`suggestion`](components/suggestion.md) | Offer short clickable follow-up prompts. | `pnpm dlx shadcn@latest add @ai-elements/suggestion --yes --path .tmp/customware-ai-elements-install` |
| [`task`](components/task.md) | Show task status and completion details. | `pnpm dlx shadcn@latest add @ai-elements/task --yes --path .tmp/customware-ai-elements-install` |
| [`tool`](components/tool.md) | Render tool input, state, output, and errors. | `pnpm dlx shadcn@latest add @ai-elements/tool --yes --path .tmp/customware-ai-elements-install` |

## Code And Developer Output

| Component | Purpose | pnpm/shadcn registry command |
| --- | --- | --- |
| [`agent`](components/agent.md) | Display agent identity and status. | `pnpm dlx shadcn@latest add @ai-elements/agent --yes --path .tmp/customware-ai-elements-install` |
| [`artifact`](components/artifact.md) | Present a generated artifact in a structured panel. | `pnpm dlx shadcn@latest add @ai-elements/artifact --yes --path .tmp/customware-ai-elements-install` |
| [`code-block`](components/code-block.md) | Render syntax-highlighted code with copy controls. | `pnpm dlx shadcn@latest add @ai-elements/code-block --yes --path .tmp/customware-ai-elements-install` |
| [`commit`](components/commit.md) | Display source-control commit details. | `pnpm dlx shadcn@latest add @ai-elements/commit --yes --path .tmp/customware-ai-elements-install` |
| [`environment-variables`](components/environment-variables.md) | Display masked environment-variable rows; never use it for the gateway key. | `pnpm dlx shadcn@latest add @ai-elements/environment-variables --yes --path .tmp/customware-ai-elements-install` |
| [`file-tree`](components/file-tree.md) | Browse hierarchical files and folders. | `pnpm dlx shadcn@latest add @ai-elements/file-tree --yes --path .tmp/customware-ai-elements-install` |
| [`jsx-preview`](components/jsx-preview.md) | Preview generated JSX safely in a UI surface. | `pnpm dlx shadcn@latest add @ai-elements/jsx-preview --yes --path .tmp/customware-ai-elements-install` |
| [`package-info`](components/package-info.md) | Show package versions and dependency changes. | `pnpm dlx shadcn@latest add @ai-elements/package-info --yes --path .tmp/customware-ai-elements-install` |
| [`sandbox`](components/sandbox.md) | Present sandbox execution details. | `pnpm dlx shadcn@latest add @ai-elements/sandbox --yes --path .tmp/customware-ai-elements-install` |
| [`schema-display`](components/schema-display.md) | Render API or structured-data schemas. | `pnpm dlx shadcn@latest add @ai-elements/schema-display --yes --path .tmp/customware-ai-elements-install` |
| [`snippet`](components/snippet.md) | Display compact inline code snippets. | `pnpm dlx shadcn@latest add @ai-elements/snippet --yes --path .tmp/customware-ai-elements-install` |
| [`stack-trace`](components/stack-trace.md) | Render a readable error stack trace. | `pnpm dlx shadcn@latest add @ai-elements/stack-trace --yes --path .tmp/customware-ai-elements-install` |
| [`terminal`](components/terminal.md) | Render terminal commands and ANSI output. | `pnpm dlx shadcn@latest add @ai-elements/terminal --yes --path .tmp/customware-ai-elements-install` |
| [`test-results`](components/test-results.md) | Display test suites, cases, and results. | `pnpm dlx shadcn@latest add @ai-elements/test-results --yes --path .tmp/customware-ai-elements-install` |
| [`web-preview`](components/web-preview.md) | Show a web page preview with browser-like controls. | `pnpm dlx shadcn@latest add @ai-elements/web-preview --yes --path .tmp/customware-ai-elements-install` |

## Utilities

| Component | Purpose | pnpm/shadcn registry command |
| --- | --- | --- |
| [`image`](components/image.md) | Display generated or attached images. | `pnpm dlx shadcn@latest add @ai-elements/image --yes --path .tmp/customware-ai-elements-install` |
| [`open-in-chat`](components/open-in-chat.md) | Open selected content in an AI chat flow. | `pnpm dlx shadcn@latest add @ai-elements/open-in-chat --yes --path .tmp/customware-ai-elements-install` |

## Voice

| Component | Purpose | pnpm/shadcn registry command |
| --- | --- | --- |
| [`audio-player`](components/audio-player.md) | Play generated or uploaded audio. | `pnpm dlx shadcn@latest add @ai-elements/audio-player --yes --path .tmp/customware-ai-elements-install` |
| [`mic-selector`](components/mic-selector.md) | Select a microphone input device. | `pnpm dlx shadcn@latest add @ai-elements/mic-selector --yes --path .tmp/customware-ai-elements-install` |
| [`persona`](components/persona.md) | Display an animated voice persona. | `pnpm dlx shadcn@latest add @ai-elements/persona --yes --path .tmp/customware-ai-elements-install` |
| [`speech-input`](components/speech-input.md) | Capture speech as prompt input. | `pnpm dlx shadcn@latest add @ai-elements/speech-input --yes --path .tmp/customware-ai-elements-install` |
| [`transcription`](components/transcription.md) | Display live or completed transcription text. | `pnpm dlx shadcn@latest add @ai-elements/transcription --yes --path .tmp/customware-ai-elements-install` |
| [`voice-selector`](components/voice-selector.md) | Browse and select a synthesis voice. | `pnpm dlx shadcn@latest add @ai-elements/voice-selector --yes --path .tmp/customware-ai-elements-install` |

## Workflow And Canvas

| Component | Purpose | pnpm/shadcn registry command |
| --- | --- | --- |
| [`canvas`](components/canvas.md) | Host a node-and-edge workflow canvas. | `pnpm dlx shadcn@latest add @ai-elements/canvas --yes --path .tmp/customware-ai-elements-install` |
| [`connection`](components/connection.md) | Render workflow connection state. | `pnpm dlx shadcn@latest add @ai-elements/connection --yes --path .tmp/customware-ai-elements-install` |
| [`controls`](components/controls.md) | Add workflow canvas controls. | `pnpm dlx shadcn@latest add @ai-elements/controls --yes --path .tmp/customware-ai-elements-install` |
| [`edge`](components/edge.md) | Render a workflow edge. | `pnpm dlx shadcn@latest add @ai-elements/edge --yes --path .tmp/customware-ai-elements-install` |
| [`node`](components/node.md) | Render a workflow node. | `pnpm dlx shadcn@latest add @ai-elements/node --yes --path .tmp/customware-ai-elements-install` |
| [`panel`](components/panel.md) | Add an overlay panel to a workflow canvas. | `pnpm dlx shadcn@latest add @ai-elements/panel --yes --path .tmp/customware-ai-elements-install` |
| [`toolbar`](components/toolbar.md) | Add contextual workflow actions. | `pnpm dlx shadcn@latest add @ai-elements/toolbar --yes --path .tmp/customware-ai-elements-install` |

## Install Everything

Use this only when the product genuinely needs the complete catalog:

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs all --cwd .
```

Underlying verified registry command:

```bash
pnpm dlx shadcn@latest add @ai-elements/all --yes --path .tmp/customware-ai-elements-install
```
