const FEATURES = {
  AI_COMMANDS: process.env.ENABLE_AI !== 'false',
  AI_SUMMARIZE: process.env.ENABLE_AI !== 'false',
  AI_GENERATE: process.env.ENABLE_AI !== 'false',
  AI_ASSIST: process.env.ENABLE_AI !== 'false',
  AI_INSIGHTS: process.env.ENABLE_AI !== 'false',
  AI_SUGGEST: process.env.ENABLE_AI !== 'false',
  AI_MEMORY: process.env.ENABLE_AI !== 'false',
  AI_ULTRAPLAN: process.env.ENABLE_AI !== 'false',
  AI_AGENT: process.env.ENABLE_AI !== 'false',
};

export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}
