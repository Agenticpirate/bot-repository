import { convertToModelMessages, safeValidateUIMessages, stepCountIs, streamText } from "ai";
import { Hono } from "hono";
import { z } from "zod";
import { createCustomwareAI, type CustomwareAIContext } from "./customware-ai.js";
import { createProjectTools } from "./project-query-tool.js";

const ChatRequestSchema = z.object({
  messages: z.unknown(),
});

export function createSQLToolChatRoutes(context: CustomwareAIContext): Hono {
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
      system:
        "You help users inspect live project data. Use list_projects when the user asks for project names, owners, or statuses. Never invent database rows. Keep the final answer short and grounded in the returned rows.",
      messages: await convertToModelMessages(validation.data),
      tools: createProjectTools(),
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: validation.data,
    });
  });

  return routes;
}
