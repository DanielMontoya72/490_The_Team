/**
 * React hook for accessing feature flags
 */

import { featureFlags, type FeatureFlagKey } from '@/config/featureFlags';

/**
 * Hook to check if a feature flag is enabled
 * @param flag - The feature flag key to check
 * @returns boolean indicating if the feature is enabled
 * 
 * @example
 * ```tsx
 * const isAIEnabled = useFeatureFlag('aiCoverLetter');
 * if (isAIEnabled) {
 *   // Render AI-powered cover letter feature
 * }
 * ```
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  return featureFlags[flag];
}

/**
 * Hook to get multiple feature flags at once
 * @param flags - Array of feature flag keys to check
 * @returns Object mapping flag keys to their boolean values
 * 
 * @example
 * ```tsx
 * const { aiCoverLetter, interviewCoach } = useFeatureFlags(['aiCoverLetter', 'interviewCoach']);
 * ```
 */
export function useFeatureFlags<T extends FeatureFlagKey>(
  flags: T[]
): Record<T, boolean> {
  return flags.reduce((acc, flag) => {
    acc[flag] = featureFlags[flag];
    return acc;
  }, {} as Record<T, boolean>);
}

export default useFeatureFlag;
