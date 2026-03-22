const FEATURES = {
  AI_COMMANDS: process.env.ENABLE_AI !== 'false',
  AI_SUMMARIZE: process.env.ENABLE_AI !== 'false',
  AI_GENERATE: process.env.ENABLE_AI !== 'false',
  AI_ASSIST: process.env.ENABLE_AI !== 'false',
};

export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}
