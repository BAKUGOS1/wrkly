export const AI_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_ENABLE_AI !== "false",
  insightsEnabled: process.env.NEXT_PUBLIC_ENABLE_AI !== "false",
  suggestionsEnabled: process.env.NEXT_PUBLIC_ENABLE_AI !== "false",
  ultraplanEnabled: process.env.NEXT_PUBLIC_ENABLE_AI !== "false",
  agentEnabled: process.env.NEXT_PUBLIC_ENABLE_AI !== "false",
  maxCommandLength: 500,
  maxDescriptionLength: 2000,
};
