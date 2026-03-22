export const AI_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_ENABLE_AI !== "false",
  maxCommandLength: 500,
  maxDescriptionLength: 2000,
};
