/**
 * Feature Flags Configuration
 * Enables gradual rollout of features across environments
 */

import { config } from './environment';

/**
 * Feature flag definitions with environment-aware defaults
 */
export const featureFlags = {
  // AI-Powered Features (generally enabled)
  aiCoverLetter: import.meta.env.VITE_FEATURE_AI_COVER_LETTER !== 'false',
  aiResumeAnalysis: import.meta.env.VITE_FEATURE_AI_RESUME_ANALYSIS !== 'false',
  interviewCoach: import.meta.env.VITE_FEATURE_INTERVIEW_COACH !== 'false',
  salaryInsights: import.meta.env.VITE_FEATURE_SALARY_INSIGHTS !== 'false',
  
  // Beta Features (disabled by default, enable via env var)
  advancedAnalytics: import.meta.env.VITE_FEATURE_ADVANCED_ANALYTICS === 'true',
  peerSupport: import.meta.env.VITE_FEATURE_PEER_SUPPORT === 'true',
  mentorMatching: import.meta.env.VITE_FEATURE_MENTOR_MATCHING === 'true',
  teamCollaboration: import.meta.env.VITE_FEATURE_TEAM_COLLABORATION === 'true',
  
  // Development-only features
  debugPanel: config.isDevelopment,
  mockData: config.isDevelopment && import.meta.env.VITE_USE_MOCK_DATA === 'true',
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return featureFlags[flag];
}

/**
 * Get all enabled feature flags (useful for analytics)
 */
export function getEnabledFeatures(): FeatureFlagKey[] {
  return (Object.keys(featureFlags) as FeatureFlagKey[]).filter(
    (key) => featureFlags[key]
  );
}

/**
 * Get feature flags summary for logging/debugging
 */
export function getFeatureFlagsSummary(): Record<FeatureFlagKey, boolean> {
  return { ...featureFlags };
}

export default featureFlags;
