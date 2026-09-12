import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart } from "ai";
import { BotIcon, DatabaseIcon, SparklesIcon } from "lucide-react";
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
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "~/components/ai-elements/tool";
import type { ListProjectsInput, ListProjectsOutput } from "../../../shared/ai/project-tools";

const starterPrompts = ["Show active projects", "Which projects belong to Asha?"];

type ListProjectsToolPart = ToolUIPart<{
  list_projects: {
    input: ListProjectsInput;
    output: ListProjectsOutput;
  };
}>;

export function SQLToolChat(): ReactElement {
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
          <DatabaseIcon aria-hidden="true" className="size-4" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-sm">Project data assistant</h2>
          <p className="truncate text-muted-foreground text-xs">Answers use read-only project data</p>
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
          Connected
        </span>
      </header>

      <Conversation className="min-h-0 flex-1 bg-muted/20">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-5 px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
              <ConversationEmptyState
                className="h-auto w-auto gap-4 p-0"
                description="Ask a natural-language question. The assistant chooses from safe, server-owned project queries."
                icon={
                  <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <SparklesIcon aria-hidden="true" className="size-5" />
                  </div>
                }
                title="Explore project data"
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
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return <MessageResponse key={`${message.id}-text-${index}`}>{part.text}</MessageResponse>;
                    }

                    const toolPart = getListProjectsToolPart(part);
                    if (!toolPart) return null;

                    return (
                      <Tool className="w-full rounded-xl border bg-background shadow-sm" defaultOpen key={`${message.id}-tool-${index}`}>
                        <ToolHeader title="Project data query" type={toolPart.type} state={toolPart.state} />
                        <ToolContent>
                          <ToolInput input={toolPart.input} />
                          <ToolOutput
                            errorText={toolPart.errorText}
                            output={
                              toolPart.state === "output-available" ? (
                                <ProjectQueryResult result={toolPart.output} />
                              ) : (
                                <p className="text-muted-foreground text-sm">Reading project data…</p>
                              )
                            }
                          />
                        </ToolContent>
                      </Tool>
                    );
                  })}
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
              placeholder="Ask about projects…"
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter className="pt-1">
            <PromptInputTools>
              <span className="pl-1 text-muted-foreground text-xs">Read-only data · Enter to send</span>
            </PromptInputTools>
            <PromptInputSubmit className="size-8 rounded-lg" disabled={status === "ready" && !input.trim()} onStop={stop} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </section>
  );
}

function getListProjectsToolPart(part: { type: string }): ListProjectsToolPart | null {
  return part.type === "tool-list_projects" ? (part as ListProjectsToolPart) : null;
}

function ProjectQueryResult({ result }: { result: ListProjectsOutput }): ReactElement {
  return (
    <div className="space-y-4 text-sm">
      <details className="rounded-lg border bg-muted/30 px-3 py-2">
        <summary className="cursor-pointer font-medium">Query details</summary>
        <div className="mt-3 space-y-3">
          <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs">{result.sql}</pre>
          <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs">{JSON.stringify(result.params, null, 2)}</pre>
        </div>
      </details>
      <div className="space-y-2">
        <p className="font-medium">{result.rowCount} matching projects</p>
        <ul className="space-y-2">
          {result.rows.map((row) => (
            <li className="rounded-xl border border-border/70 bg-background px-3 py-2.5" key={row.id}>
              <p className="font-medium">{row.name}</p>
              <p className="mt-0.5 text-muted-foreground text-xs">{row.ownerName} · {row.status}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
