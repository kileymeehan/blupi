export interface FeatureFlags {
  aiStoryboardGeneration: boolean;
  aiCsvClassification: boolean;
  aiPdfParsing: boolean;
  emailNotifications: boolean;
  pendoIntegration: boolean;
  googleSheetsIntegration: boolean;
}

function checkEnvVar(name: string): boolean {
  const value = process.env[name];
  return !!value && value.trim().length > 0;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    aiStoryboardGeneration: checkEnvVar('OPENAI_API_KEY') || checkEnvVar('REPLICATE_API_TOKEN'),
    aiCsvClassification: checkEnvVar('OPENAI_API_KEY'),
    aiPdfParsing: checkEnvVar('OPENAI_API_KEY'),
    emailNotifications: checkEnvVar('SENDGRID_API_KEY'),
    pendoIntegration: checkEnvVar('PENDO_API_KEY'),
    googleSheetsIntegration: checkEnvVar('GOOGLE_SERVICE_ACCOUNT_KEY'),
  };
}

export function getEnabledFeatures(): string[] {
  const flags = getFeatureFlags();
  return Object.entries(flags)
    .filter(([_, enabled]) => enabled)
    .map(([name]) => name);
}

export function getDisabledFeatures(): string[] {
  const flags = getFeatureFlags();
  return Object.entries(flags)
    .filter(([_, enabled]) => !enabled)
    .map(([name]) => name);
}

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatureFlags()[feature];
}

export function logFeatureStatus(): void {
  const flags = getFeatureFlags();
  console.log('[FEATURES] Feature flags status:');
  
  const enabled = getEnabledFeatures();
  const disabled = getDisabledFeatures();
  
  if (enabled.length > 0) {
    console.log('[FEATURES] Enabled:', enabled.join(', '));
  }
  
  if (disabled.length > 0) {
    console.log('[FEATURES] Disabled (missing API keys):', disabled.join(', '));
  }
}

export function requireFeature(feature: keyof FeatureFlags, featureName: string): void {
  if (!isFeatureEnabled(feature)) {
    throw new FeatureDisabledError(featureName);
  }
}

export class FeatureDisabledError extends Error {
  public readonly statusCode = 503;
  public readonly feature: string;
  
  constructor(feature: string) {
    super(`The ${feature} feature is currently unavailable. Please contact your administrator.`);
    this.name = 'FeatureDisabledError';
    this.feature = feature;
  }
}

export function getFeatureFlagsForClient(): Record<string, boolean> {
  const flags = getFeatureFlags();
  return { ...flags };
}
