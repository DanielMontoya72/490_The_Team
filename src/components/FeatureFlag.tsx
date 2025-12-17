/**
 * Declarative Feature Flag Component
 * Conditionally renders children based on feature flag state
 */

import React from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { FeatureFlagKey } from '@/config/featureFlags';

interface FeatureFlagProps {
  /** The feature flag to check */
  flag: FeatureFlagKey;
  /** Content to render when feature is enabled */
  children: React.ReactNode;
  /** Optional content to render when feature is disabled */
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders content based on feature flag status
 * 
 * @example
 * ```tsx
 * <FeatureFlag flag="aiCoverLetter">
 *   <AICoverLetterGenerator />
 * </FeatureFlag>
 * 
 * <FeatureFlag 
 *   flag="advancedAnalytics" 
 *   fallback={<BasicAnalytics />}
 * >
 *   <AdvancedAnalyticsDashboard />
 * </FeatureFlag>
 * ```
 */
export function FeatureFlag({ 
  flag, 
  children, 
  fallback = null 
}: FeatureFlagProps): React.ReactElement | null {
  const isEnabled = useFeatureFlag(flag);
  
  if (isEnabled) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

export default FeatureFlag;
