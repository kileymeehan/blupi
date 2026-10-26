// Environment configuration for Blupi application
// Handles different environments: development, staging, production

export interface EnvironmentConfig {
  name: string;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  database: {
    url: string;
  };
  features: {
    debugMode: boolean;
    stagingBanner: boolean;
    rateLimitEnabled: boolean;
    errorReporting: boolean;
  };
  ui: {
    showEnvironmentBadge: boolean;
    allowTestData: boolean;
  };
}

// Determine current environment
const getEnvironment = (): string => {
  // Check explicit environment variable first
  if (process.env.ENVIRONMENT) {
    return process.env.ENVIRONMENT.trim().toLowerCase();
  }

  // Fall back to NODE_ENV
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV.trim().toLowerCase();
  }

  // Default to development
  return 'development';
};

const currentEnvironment = getEnvironment();

// Environment-specific configurations
const configurations: Record<string, EnvironmentConfig> = {
  development: {
    name: 'Development',
    isDevelopment: true,
    isStaging: false,
    isProduction: false,
    database: {
      url: process.env.DATABASE_URL || '',
    },
    features: {
      debugMode: true,
      stagingBanner: false,
      rateLimitEnabled: false,
      errorReporting: false,
    },
    ui: {
      showEnvironmentBadge: true,
      allowTestData: true,
    },
  },
  
  staging: {
    name: 'Staging',
    isDevelopment: false,
    isStaging: true,
    isProduction: false,
    database: {
      url: process.env.DATABASE_URL || '',
    },
    features: {
      debugMode: process.env.DEBUG_MODE === 'true',
      stagingBanner: process.env.STAGING_BANNER_ENABLED !== 'false',
      rateLimitEnabled: process.env.RATE_LIMIT_ENABLED === 'true',
      errorReporting: true,
    },
    ui: {
      showEnvironmentBadge: true,
      allowTestData: true,
    },
  },
  
  production: {
    name: 'Production',
    isDevelopment: false,
    isStaging: false,
    isProduction: true,
    database: {
      url: process.env.DATABASE_URL || '',
    },
    features: {
      debugMode: false,
      stagingBanner: false,
      rateLimitEnabled: true,
      errorReporting: true,
    },
    ui: {
      showEnvironmentBadge: false,
      allowTestData: false,
    },
  },
};

// Export current configuration
export const config: EnvironmentConfig = configurations[currentEnvironment] || configurations.development;

// Helper functions
export const isStaging = () => config.isStaging;
export const isProduction = () => config.isProduction;
export const isDevelopment = () => config.isDevelopment;

// Validation function
export const validateEnvironment = (): string[] => {
  const errors: string[] = [];
  
  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    errors.push('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for Google sign-in');
  }
  
  return errors;
};

// Log current environment (server-side only)
if (typeof window === 'undefined') {
  console.log(`[ENVIRONMENT] Running in ${config.name} mode`);
  
  const validationErrors = validateEnvironment();
  if (validationErrors.length > 0) {
    console.error('[ENVIRONMENT] Configuration errors:', validationErrors);
  }
}