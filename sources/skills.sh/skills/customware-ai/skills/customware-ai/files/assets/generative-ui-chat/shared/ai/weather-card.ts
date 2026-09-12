import { z } from "zod";

export const GetWeatherInputSchema = z.object({
  city: z.string().trim().min(1).max(60),
});

export const WeatherPointSchema = z.object({
  label: z.string(),
  time: z.string(),
  temperatureC: z.number().int(),
});

export const WeatherCardSchema = z.object({
  city: z.string(),
  summary: z.string(),
  condition: z.string(),
  temperatureC: z.number().int(),
  highC: z.number().int(),
  lowC: z.number().int(),
  hourly: z.array(WeatherPointSchema).length(4),
});

export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;
export type WeatherCardData = z.infer<typeof WeatherCardSchema>;
