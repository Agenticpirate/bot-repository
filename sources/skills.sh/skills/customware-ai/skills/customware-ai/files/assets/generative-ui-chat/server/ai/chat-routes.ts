import { convertToModelMessages, safeValidateUIMessages, stepCountIs, streamText, tool } from "ai";
import { Hono } from "hono";
import { z } from "zod";
import {
  GetWeatherInputSchema,
  type GetWeatherInput,
  type WeatherCardData,
} from "../../shared/ai/weather-card.js";
import { createCustomwareAI, type CustomwareAIContext } from "./customware-ai.js";

const ChatRequestSchema = z.object({
  messages: z.unknown(),
});

export function createGenerativeWeatherChatRoutes(context: CustomwareAIContext): Hono {
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
        "You help users with quick weather planning. When the user asks about a city, call show_weather_card so the app can render a weather card. Keep the final answer short and grounded in the tool result.",
      messages: await convertToModelMessages(validation.data),
      tools: {
        show_weather_card: tool({
          description: "Return a compact weather card for a city.",
          inputSchema: GetWeatherInputSchema,
          async execute(input) {
            return await getWeatherCard(input);
          },
        }),
      },
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: validation.data,
    });
  });

  return routes;
}

async function getWeatherCard(input: GetWeatherInput): Promise<WeatherCardData> {
  const seed = Array.from(input.city).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const baseTemperature = 16 + (seed % 11);
  const conditions = ["Sunny", "Partly cloudy", "Light rain", "Windy"] as const;
  const condition = conditions[seed % conditions.length];

  return {
    city: input.city,
    summary: `${condition} through most of the day with a comfortable afternoon.`,
    condition,
    temperatureC: baseTemperature,
    highC: baseTemperature + 3,
    lowC: baseTemperature - 4,
    hourly: [
      { label: "Morning", time: "09:00", temperatureC: baseTemperature - 2 },
      { label: "Noon", time: "12:00", temperatureC: baseTemperature },
      { label: "Afternoon", time: "15:00", temperatureC: baseTemperature + 2 },
      { label: "Evening", time: "18:00", temperatureC: baseTemperature - 1 },
    ],
  };
}
