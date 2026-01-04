import type { DVOBundle, ThresholdTable } from './types';
import bundleData from '../../context/DVO_Threshold_Tables_Bundle_v1.0.0.json';

const bundle = bundleData as DVOBundle;

/**
 * Load the DVO bundle data
 */
export function loadBundle(): DVOBundle {
  return bundle;
}

/**
 * Calculate age bin from age in years
 * Formula: floor(ageYears / 5) * 5
 * Clamped to [50, 90]
 * Returns null if age < 50
 */
export function ageBin(ageYears: number): number | null {
  if (ageYears < 50) {
    return null;
  }
  if (ageYears >= 90) {
    return 90;
  }
  return Math.floor(ageYears / 5) * 5;
}

/**
 * Get available T-score bins from a table (excluding "no_bmd")
 * Returns sorted array from best (0.0) to worst (most negative)
 */
export function getAvailableTscoreBins(table: ThresholdTable): number[] {
  const bins = new Set<number>();
  
  for (const entry of table.entries) {
    if (entry.tscore !== "no_bmd") {
      const binValue = parseFloat(entry.tscore);
      if (!isNaN(binValue)) {
        bins.add(binValue);
      }
    }
  }
  
  // Sort descending (best to worst: 0.0, -0.5, -1.0, ...)
  return Array.from(bins).sort((a, b) => b - a);
}

/**
 * Map T-Score to the correct DVO bin following pseudocode rules:
 * 1. Exact match → return that bin
 * 2. Better than best bin (> 0.0) → return 0.0
 * 3. Worse than worst bin → return worst bin
 * 4. Between bins → return next worse (more negative) bin
 */
export function mapTscoreToBin(tscore: number, availableBins: number[]): number {
  if (availableBins.length === 0) {
    throw new Error("No T-score bins available");
  }
  
  // Sort bins descending (best to worst)
  const sortedBins = [...availableBins].sort((a, b) => b - a);
  const bestBin = sortedBins[0]; // Highest value (0.0)
  const worstBin = sortedBins[sortedBins.length - 1]; // Lowest value (most negative)
  
  // 1. Exact match
  if (sortedBins.includes(tscore)) {
    return tscore;
  }
  
  // 2. Better than best bin (> 0.0) → return 0.0
  if (tscore > bestBin) {
    return bestBin;
  }
  
  // 3. Worse than worst bin → return worst bin
  if (tscore < worstBin) {
    return worstBin;
  }
  
  // 4. Between bins → return next worse (more negative)
  // Iterate through bins and find the interval
  for (let i = 0; i < sortedBins.length - 1; i++) {
    const prev = sortedBins[i]; // Less negative (better)
    const curr = sortedBins[i + 1]; // More negative (worse)
    
    if (tscore < prev && tscore > curr) {
      return curr; // Next worse bin
    }
  }
  
  // Fallback (should not happen due to guards above)
  return worstBin;
}

/**
 * Unified lookup function for both "no_bmd" and T-score bins
 * Returns the required_factor if found, null if not found
 */
export function lookupCell(
  bundle: DVOBundle,
  sex: "female" | "male",
  thresholdPercent: 3 | 5 | 10,
  ageBin: number,
  tscoreBinOrNoBmd: number | "no_bmd"
): number | null {
  const table = bundle.tables.find(
    (t: ThresholdTable) =>
      t.sex === sex && t.threshold_percent === thresholdPercent
  );

  if (!table) {
    return null;
  }

  const tscoreKey = tscoreBinOrNoBmd === "no_bmd" 
    ? "no_bmd" 
    : typeof tscoreBinOrNoBmd === "number"
    ? tscoreBinOrNoBmd.toFixed(1) // Convert -1.0 to "-1.0" to match JSON format
    : tscoreBinOrNoBmd;

  const entry = table.entries.find(
    (e) => e.age === ageBin && e.tscore === tscoreKey
  );

  return entry ? entry.required_factor : null;
}

/**
 * Lookup the "no_bmd" cell value for given parameters
 * Returns the required_factor if found, null if not found
 * (Backward-compatible wrapper)
 */
export function lookupNoBmdCell(
  bundle: DVOBundle,
  sex: "female" | "male",
  thresholdPercent: 3 | 5 | 10,
  ageBin: number
): number | null {
  return lookupCell(bundle, sex, thresholdPercent, ageBin, "no_bmd");
}

/**
 * Determine if threshold is reached based on lookup result
 * Inverted logic: null (missing cell) => true (reached), number => false (not reached)
 */
export function thresholdReachedFromLookup(
  cellValue: number | null
): boolean {
  return cellValue === null;
}

/**
 * Calculate the highest reached band
 */
export function highestReachedBand(
  reached3: boolean,
  reached5: boolean,
  reached10: boolean
): string {
  if (reached10) {
    return ">=10%";
  }
  if (reached5) {
    return "5–<10%";
  }
  if (reached3) {
    return "3–<5%";
  }
  return "<3%";
}

