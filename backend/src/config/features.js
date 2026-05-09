/**
 * Feature Flags Configuration
 * Enable/disable features per tenant or globally
 * FASE 7: AI/Image features
 */

const env = require('./env');

/**
 * Feature flags with default values
 * Can be overridden via environment variables or tenant settings
 */
const FEATURES = {
  // Image uploads and management
  IMAGE_UPLOADS_ENABLED: {
    default: false,
    env: 'FEATURE_IMAGE_UPLOADS_ENABLED',
    description: 'Enable image upload functionality',
    requires: ['STORAGE_BUCKET'],
  },
  
  // AI Beauty Analysis
  AI_BEAUTY_ANALYSIS_ENABLED: {
    default: false,
    env: 'FEATURE_AI_BEAUTY_ANALYSIS',
    description: 'Enable AI facial analysis',
    requires: ['AI_API_KEY', 'IMAGE_UPLOADS_ENABLED'],
  },
  
  // Virtual Preview / Filters
  VIRTUAL_BEAUTY_PREVIEW_ENABLED: {
    default: false,
    env: 'FEATURE_VIRTUAL_PREVIEW',
    description: 'Enable virtual try-on and filters',
    requires: ['AI_BEAUTY_ANALYSIS_ENABLED'],
  },
  
  // HTTPOnly cookies (FASE 2)
  HTTPONLY_COOKIES_ENABLED: {
    default: false,
    env: 'USE_HTTPONLY_COOKIES',
    description: 'Use httpOnly cookies for auth tokens',
    requires: [],
  },
  
  // CSP Enforcement (FASE 1)
  CSP_ENFORCEMENT: {
    default: false,
    env: 'CSP_ENFORCEMENT',
    description: 'Enforce Content Security Policy',
    requires: [],
  },
  
  // Audit logging
  AUDIT_LOGGING_ENABLED: {
    default: true,
    env: 'FEATURE_AUDIT_LOGGING',
    description: 'Enable audit logging for all operations',
    requires: [],
  },
  
  // Rate limiting Redis
  REDIS_RATE_LIMIT_ENABLED: {
    default: false,
    env: 'FEATURE_REDIS_RATE_LIMIT',
    description: 'Use Redis for distributed rate limiting',
    requires: ['REDIS_URL'],
  },
  
  // Marketing consent
  MARKETING_CONSENT_REQUIRED: {
    default: true,
    env: 'FEATURE_MARKETING_CONSENT',
    description: 'Require explicit marketing consent',
    requires: [],
  },
};

/**
 * Check if a feature is enabled
 * Priority: Environment variable > Tenant setting > Default
 */
function isEnabled(featureName, tenantConfig = {}) {
  const feature = FEATURES[featureName];
  
  if (!feature) {
    console.warn(`[FEATURES] Unknown feature: ${featureName}`);
    return false;
  }
  
  // Check environment variable first
  if (process.env[feature.env]) {
    return process.env[feature.env] === 'true';
  }
  
  // Check tenant config
  if (tenantConfig[featureName] !== undefined) {
    return tenantConfig[featureName];
  }
  
  // Return default
  return feature.default;
}

/**
 * Get all enabled features
 */
function getEnabledFeatures(tenantConfig = {}) {
  const enabled = {};
  
  for (const [name, config] of Object.entries(FEATURES)) {
    enabled[name] = isEnabled(name, tenantConfig);
  }
  
  return enabled;
}

/**
 * Validate feature dependencies
 */
function validateDependencies(featureName, enabledFeatures) {
  const feature = FEATURES[featureName];
  
  if (!feature || !feature.requires) return { valid: true };
  
  const missing = feature.requires.filter(req => {
    // Check if required feature is a boolean flag
    if (req.includes('_ENABLED')) {
      return !enabledFeatures[req];
    }
    // Check if required env var exists
    return !process.env[req];
  });
  
  if (missing.length > 0) {
    return {
      valid: false,
      missing,
      message: `${featureName} requires: ${missing.join(', ')}`,
    };
  }
  
  return { valid: true };
}

/**
 * Middleware to inject feature flags into requests
 */
function featuresMiddleware(req, res, next) {
  // Get tenant-specific features if available
  const tenantFeatures = req.tenant?.settings?.features || {};
  
  req.features = getEnabledFeatures(tenantFeatures);
  
  // Add helper function
  req.isFeatureEnabled = (name) => isEnabled(name, tenantFeatures);
  
  next();
}

module.exports = {
  FEATURES,
  isEnabled,
  getEnabledFeatures,
  validateDependencies,
  featuresMiddleware,
};
