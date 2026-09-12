import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart } from "ai";
import { BotIcon, CloudSunIcon, MapPinIcon, SparklesIcon } from "lucide-react";
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
import type { GetWeatherInput, WeatherCardData } from "../../../shared/ai/weather-card";

const starterPrompts = ["Weather in Perth", "Plan an afternoon in Melbourne"];

type WeatherToolPart = ToolUIPart<{
  show_weather_card: {
    input: GetWeatherInput;
    output: WeatherCardData;
  };
}>;

export function GenerativeWeatherChat(): ReactElement {
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
          <h2 className="truncate font-semibold text-sm">Weather guide</h2>
          <p className="truncate text-muted-foreground text-xs">Helpful forecasts with visual summaries</p>
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
                description="Ask about a city and the assistant will use a server tool to create a forecast card."
                icon={
                  <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <SparklesIcon aria-hidden="true" className="size-5" />
                  </div>
                }
                title="Plan around the weather"
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

                    const toolPart = getWeatherToolPart(part);
                    if (!toolPart) return null;

                    if (toolPart.state === "output-available") {
                      return <WeatherCard data={toolPart.output} key={`${message.id}-card-${index}`} />;
                    }

                    return <WeatherCardLoading city={getWeatherInputCity(toolPart)} key={`${message.id}-loading-${index}`} />;
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
              placeholder="Ask about a city…"
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter className="pt-1">
            <PromptInputTools>
              <span className="pl-1 text-muted-foreground text-xs">Enter to send · Shift+Enter for a new line</span>
            </PromptInputTools>
            <PromptInputSubmit className="size-8 rounded-lg" disabled={status === "ready" && !input.trim()} onStop={stop} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </section>
  );
}

function getWeatherToolPart(part: { type: string }): WeatherToolPart | null {
  return part.type === "tool-show_weather_card" ? (part as WeatherToolPart) : null;
}

function WeatherCardLoading({ city }: { city: string }): ReactElement {
  return (
    <div className="w-full rounded-2xl border border-dashed bg-background p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-xl bg-sky-100 text-sky-700">
          <CloudSunIcon aria-hidden="true" className="size-4" />
        </div>
        <div>
          <p className="font-medium text-sm">Preparing your forecast</p>
          <p className="text-muted-foreground text-xs">Getting the latest view for {city}…</p>
        </div>
      </div>
    </div>
  );
}

function WeatherCard({ data }: { data: WeatherCardData }): ReactElement {
  return (
    <article className="w-full overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-background to-cyan-50 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-sky-100 bg-background/70 px-5 py-4 backdrop-blur-sm">
        <div>
          <p className="font-medium text-sky-800 text-xs uppercase tracking-[0.16em]">{data.condition}</p>
          <h3 className="mt-1 font-semibold text-xl">{data.city}</h3>
          <p className="mt-1 text-muted-foreground text-sm">{data.summary}</p>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
          <CloudSunIcon aria-hidden="true" className="size-5" />
        </div>
      </div>

      <div className="grid gap-5 px-5 py-4 sm:grid-cols-[auto_1fr]">
        <div>
          <p className="font-semibold text-4xl tracking-tight">{data.temperatureC}°</p>
          <p className="mt-1 text-muted-foreground text-xs">High {data.highC}° · Low {data.lowC}°</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.hourly.map((point) => (
            <div className="rounded-xl border border-sky-100 bg-background/80 p-2.5" key={point.time}>
              <p className="text-muted-foreground text-xs">{point.label}</p>
              <p className="mt-1 font-medium text-sm">{point.temperatureC}°</p>
              <p className="mt-0.5 text-muted-foreground text-xs">{point.time}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 border-t border-sky-100 px-5 py-2.5 text-muted-foreground text-xs">
        <MapPinIcon aria-hidden="true" className="size-3.5" />
        Forecast for {data.city}
      </div>
    </article>
  );
}

function getWeatherInputCity(toolPart: WeatherToolPart): string {
  if (typeof toolPart.input === "object" && toolPart.input !== null && "city" in toolPart.input && typeof toolPart.input.city === "string") {
    return toolPart.input.city;
  }

  return "your city";
}
