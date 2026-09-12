import { convertToModelMessages, safeValidateUIMessages, streamText } from "ai";
import { Hono } from "hono";
import { z } from "zod";
import { createCustomwareAI, type CustomwareAIContext } from "./customware-ai.js";

const ChatRequestSchema = z.object({
  messages: z.unknown(),
});

export function createAIChatRoutes(context: CustomwareAIContext): Hono {
  const customwareAI = createCustomwareAI(context);
  const routes = new Hono();

  routes.post("/api/chat", async (c) => {
    const body = ChatRequestSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) {
      return c.json({ message: "Invalid chat request." }, 400);
    }

    const validation = await safeValidateUIMessages({ messages: body.data.messages });
    if (!validation.success) {
      return c.json({ message: "Invalid chat messages." }, 400);
    }

    const result = streamText({
      model: customwareAI("google/gemini-3-flash-preview"),
      messages: await convertToModelMessages(validation.data),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: validation.data,
      sendReasoning: true,
      sendSources: true,
    });
  });

  return routes;
}
