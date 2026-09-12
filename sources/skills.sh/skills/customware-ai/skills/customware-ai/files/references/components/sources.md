# Sources

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs sources --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/sources --yes --path .tmp/customware-ai-elements-install
```

A component that allows a user to view the sources or citations used to generate a response.

The `Sources` component allows a user to view the sources or citations used to generate a response.

See [`sources.tsx`](examples/sources.tsx) for this official example.

## Usage with AI SDK

Build a simple web search agent with Perplexity Sonar.

Add the following component to your frontend:

```tsx title="app/page.tsx"
"use client";

import { useChat } from "@ai-sdk/react";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "~/components/ai-elements/sources";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputTextarea,
  PromptInputSubmit,
} from "~/components/ai-elements/prompt-input";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "~/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "~/components/ai-elements/message";
import { useState } from "react";
import { DefaultChatTransport } from "ai";

const SourceDemo = () => {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/sources",
    }),
  });

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text.trim()) {
      sendMessage({ text: message.text });
      setInput("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto mb-4">
          <Conversation>
            <ConversationContent>
              {messages.map((message) => (
                <div key={message.id}>
                  {message.role === "assistant" && (
                    <Sources>
                      <SourcesTrigger
                        count={
                          message.parts.filter(
                            (part) => part.type === "source-url"
                          ).length
                        }
                      />
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case "source-url":
                            return (
                              <SourcesContent key={`${message.id}-${i}`}>
                                <Source
                                  key={`${message.id}-${i}`}
                                  href={part.url}
                                  title={part.url}
                                />
                              </SourcesContent>
                            );
                        }
                      })}
                    </Sources>
                  )}
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case "text":
                            return (
                              <MessageResponse key={`${message.id}-${i}`}>
                                {part.text}
                              </MessageResponse>
                            );
                          default:
                            return null;
                        }
                      })}
                    </MessageContent>
                  </Message>
                </div>
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

        <PromptInput
          onSubmit={handleSubmit}
          className="mt-4 w-full max-w-2xl mx-auto relative"
        >
          <PromptInputTextarea
            value={input}
            placeholder="Ask a question and search the..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status}
            onStop={stop}
            disabled={status === "ready" && !input.trim()}
            className="absolute bottom-1 right-1"
          />
        </PromptInput>
      </div>
    </div>
  );
};

export default SourceDemo;
```

Add the following route to your backend:

```tsx title="api/chat/route.ts"
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { perplexity } from "@ai-sdk/perplexity";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "perplexity/sonar",
    system:
      "You are a helpful assistant. Keep your responses short (< 100 words) unless you are asked for more details. ALWAYS USE SEARCH.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
  });
}
```

## Features

- Collapsible component that allows a user to view the sources or citations used to generate a response
- Customizable trigger and content components
- Support for custom sources or citations
- Responsive design with mobile-friendly controls
- Clean, modern styling with customizable themes

## Examples

### Custom rendering

See [`sources-custom.tsx`](examples/sources-custom.tsx) for this official example.

## Props

### `<Sources />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Any other props are spread to the root div. |

### `<SourcesTrigger />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `count` | `number` | Required | The number of sources to display in the trigger. |
| `...props` | `React.ComponentProps<typeof CollapsibleTrigger>` | - | Any other props are spread to the CollapsibleTrigger component. |

### `<SourcesContent />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Any other props are spread to the content container. |

### `<Source />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.AnchorHTMLAttributes<HTMLAnchorElement>` | - | Any other props are spread to the anchor element. |
