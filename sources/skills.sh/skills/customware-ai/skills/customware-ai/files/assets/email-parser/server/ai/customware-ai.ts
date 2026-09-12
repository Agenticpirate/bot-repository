import { createOpenRouter, type OpenRouterProvider } from "@openrouter/ai-sdk-provider";

const CUSTOMWARE_AI_ORIGIN = "https://app.customware.ai/api";

export interface CustomwareAIContext {
  orgId: string;
  projectId: string;
}

export function createCustomwareAI(context: CustomwareAIContext): OpenRouterProvider {
  const apiKey = process.env.CUSTOMWARE_AI_GATEWAY_KEY;

  if (!apiKey) {
    throw new Error("CUSTOMWARE_AI_GATEWAY_KEY is required on the server.");
  }

  return createOpenRouter({
    apiKey,
    baseURL: `${CUSTOMWARE_AI_ORIGIN}/orgs/${context.orgId}/projects/${context.projectId}/ai/v1`,
  });
}
