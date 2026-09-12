import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BotIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import type { ReactElement } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "~/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "~/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "~/components/ai-elements/prompt-input";

const starterPrompts = ["Summarize the latest activity", "What should I focus on next?"];

export function AIChat(): ReactElement {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  async function submitText(text: string): Promise<void> {
    if (!text.trim() || status !== "ready") return;

    await sendMessage({ text });
    setInput("");
  }

  async function handleSubmit(message: PromptInputMessage): Promise<void> {
    await submitText(message.text);
  }

  return (
    <section className="flex h-full min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
      <header className="flex shrink-0 items-center gap-3 border-b border-border/70 px-4 py-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <BotIcon aria-hidden="true" className="size-4" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-sm">Workspace assistant</h2>
          <p className="truncate text-muted-foreground text-xs">Ask about the information in this app</p>
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
          Ready
        </span>
      </header>

      <Conversation className="min-h-0 flex-1 bg-muted/20">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-5 px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
              <ConversationEmptyState
                className="h-auto w-auto gap-4 p-0"
                description="I can help you understand, summarize, and act on the information in this workspace."
                icon={
                  <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <SparklesIcon aria-hidden="true" className="size-5" />
                  </div>
                }
                title="How can I help?"
              />
              <div className="grid w-full gap-2 pt-2 text-left">
                {starterPrompts.map((prompt) => (
                  <button
                    className="rounded-xl border border-border/70 bg-background px-3 py-2.5 text-left text-sm shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={status !== "ready"}
                    key={prompt}
                    onClick={async () => {
                      await submitText(prompt);
                    }}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent className="text-[0.9375rem] leading-6">
                  {message.parts
                    .filter((part) => part.type === "text")
                    .map((part, index) => (
                      <MessageResponse key={`${message.id}-text-${index}`}>{part.text}</MessageResponse>
                    ))}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton className="bottom-5 shadow-md" />
      </Conversation>

      <div className="shrink-0 border-t border-border/70 bg-background p-3 sm:p-4">
        <PromptInput
          className="rounded-2xl border border-border/80 bg-muted/30 px-3 py-2 shadow-sm transition-shadow focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10"
          onSubmit={handleSubmit}
        >
          <PromptInputBody>
            <PromptInputTextarea
              className="min-h-12 bg-transparent px-1 py-2 text-sm shadow-none focus-visible:ring-0"
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="Ask about your workspace…"
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter className="pt-1">
            <PromptInputTools>
              <span className="pl-1 text-muted-foreground text-xs">Enter to send · Shift+Enter for a new line</span>
            </PromptInputTools>
            <PromptInputSubmit
              className="size-8 rounded-lg"
              disabled={status === "ready" && !input.trim()}
              onStop={stop}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </section>
  );
}
