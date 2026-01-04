import type { RiskFactor } from '../data/types';

/**
 * Check if age hint should be shown for a risk factor
 */
export function shouldShowAgeHint(rfId: string, age: number | null): boolean {
  return rfId === "rf_parent_hip_fracture" && age !== null && age > 75;
}

