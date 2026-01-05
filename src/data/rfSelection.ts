import type { RiskFactor, SelectedRfInfo } from './types';

/**
 * Select Top-2 risk factors following DVO pseudocode logic exactly
 * 
 * Logic:
 * 1. Map selected RF IDs to RiskFactor objects
 * 2. Exclusive groups: best_g1 (G1_STURZ), best_g2 (G2_RA_GC)
 * 3. Non-exclusive group: up to 2 strongest from G3_OTHER
 * 4. Build pool from best_g1, best_g2, g3_1, g3_2
 * 5. Sort pool DESC by rr_3y
 * 6. Return top 2 with pool source metadata
 */
export function selectTop2RiskFactors(
  selectedRfIds: Set<string>,
  allRfs: RiskFactor[]
): SelectedRfInfo[] {
  // 1. Map selected RF IDs to RiskFactor objects
  const selectedRfs = allRfs.filter((rf) => selectedRfIds.has(rf.rf_id));

  if (selectedRfs.length === 0) {
    return [];
  }

  // 2. Exclusive groups: keep only strongest per group
  const g1Rfs = selectedRfs.filter((rf) => rf.group === "G1_STURZ");
  const g2Rfs = selectedRfs.filter((rf) => rf.group === "G2_RA_GC");
  const g3Rfs = selectedRfs.filter((rf) => rf.group === "G3_OTHER");

  const best_g1 = g1Rfs.length > 0
    ? g1Rfs.reduce((best, current) => 
        current.rr_3y > best.rr_3y ? current : best
      )
    : null;

  const best_g2 = g2Rfs.length > 0
    ? g2Rfs.reduce((best, current) => 
        current.rr_3y > best.rr_3y ? current : best
      )
    : null;

  // 3. Non-exclusive group: sort DESC and take up to 2 strongest
  const sorted_g3 = [...g3Rfs].sort((a, b) => b.rr_3y - a.rr_3y);
  const g3_1 = sorted_g3.length >= 1 ? sorted_g3[0] : null;
  const g3_2 = sorted_g3.length >= 2 ? sorted_g3[1] : null;

  // 4. Build pool (omit nulls)
  const pool: Array<{ rf: RiskFactor; source: string }> = [];
  if (best_g1) pool.push({ rf: best_g1, source: "G1_STURZ" });
  if (best_g2) pool.push({ rf: best_g2, source: "G2_RA_GC" });
  if (g3_1) pool.push({ rf: g3_1, source: "G3_OTHER_1" });
  if (g3_2) pool.push({ rf: g3_2, source: "G3_OTHER_2" });

  // 5. Sort pool DESC by rr_3y
  pool.sort((a, b) => b.rf.rr_3y - a.rf.rr_3y);

  // 6. Return top 2
  return pool.slice(0, 2).map((item) => ({
    rf: item.rf,
    poolSource: item.source,
  }));
}

/**
 * Compute combined multiplier from chosen risk factors
 * - 0 RFs → 1.0
 * - 1 RF → rr_3y
 * - 2 RFs → rr_3y_1 × rr_3y_2
 */
export function computeCombinedMultiplier(chosenRfs: SelectedRfInfo[]): number {
  if (chosenRfs.length === 0) {
    return 1.0;
  }
  if (chosenRfs.length === 1) {
    return chosenRfs[0].rf.rr_3y;
  }
  // 2 RFs: multiply
  return chosenRfs[0].rf.rr_3y * chosenRfs[1].rf.rr_3y;
}

/**
 * Determine if threshold is reached based on required factor and multiplier
 * Returns both the result and reason for transparency
 * 
 * Uses epsilon tolerance to handle floating-point precision issues.
 * For example: 1.5 * 1.4 = 2.0999999999999996 instead of exactly 2.1
 */
const EPSILON = 1e-9; // Very small tolerance for floating-point comparisons

export function isThresholdReached(
  requiredFactor: number | null,
  multiplier: number
): { reached: boolean; reason: string } {
  if (requiredFactor === null) {
    return {
      reached: true,
      reason: "Leeres Tabellenfeld: Schwelle bereits ohne RF erreicht",
    };
  }
  
  // Use epsilon tolerance: multiplier >= (requiredFactor - epsilon)
  // This handles cases where floating-point arithmetic produces values like
  // 2.0999999999999996 instead of exactly 2.1
  const reached = multiplier >= (requiredFactor - EPSILON);
  return {
    reached,
    reason: "Multiplikator vs. erforderlicher Faktor",
  };
}



