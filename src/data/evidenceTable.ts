import type { EvidenceTable, EvidenceEntry } from './types';
import evidenceTableData from '../../context/DVO_Medication_Evidence_Table_v1.0.0.json';
import { isValidSubstance } from './substanceRegistry';
import { logger } from '../utils/logger';

const evidenceTable = evidenceTableData as EvidenceTable;

// Build lookup map: substance_id -> EvidenceEntry
let evidenceMap: Map<string, EvidenceEntry> | null = null;

/**
 * Load the evidence table data
 */
export function loadEvidenceTable(): EvidenceTable {
  return evidenceTable;
}

/**
 * Build and cache the evidence lookup map
 */
function buildEvidenceMap(): Map<string, EvidenceEntry> {
  if (evidenceMap === null) {
    evidenceMap = new Map();
    evidenceTable.substances.forEach((entry) => {
      evidenceMap!.set(entry.substance_id, entry);
    });
  }
  return evidenceMap;
}

/**
 * Get evidence entry for a substance by ID
 * Returns null if substance not found (graceful fallback)
 * 
 * @param substanceId - Substance ID (e.g., "alendronate", "romosozumab")
 * @returns EvidenceEntry or null if not found
 */
export function getEvidenceFor(substanceId: string): EvidenceEntry | null {
  const map = buildEvidenceMap();
  const entry = map.get(substanceId);
  
  if (!entry) {
    logger.warn(`No evidence entry found for substance_id: ${substanceId}`);
    return null;
  }
  
  return entry;
}

/**
 * Validate that evidence entries exist for a list of substance IDs
 * Logs warnings for missing entries (for debugging/development)
 * 
 * @param substanceIds - Array of substance IDs to check
 */
export function validateEvidenceEntries(substanceIds: string[]): void {
  const map = buildEvidenceMap();
  const missing: string[] = [];
  
  substanceIds.forEach((id) => {
    if (!map.has(id)) {
      missing.push(id);
    }
  });
  
  if (missing.length > 0) {
    logger.warn(
      `Missing evidence entries for substances: ${missing.join(', ')}`
    );
  }
}

/**
 * Validate evidence table entries against substance registry
 * Checks that all substances exist in registry
 * 
 * @param enableWarnings - If true, log warnings for mismatches (default: false)
 * @returns Array of validation errors (empty if all valid)
 */
export function validateAgainstRegistry(enableWarnings: boolean = false): string[] {
  const errors: string[] = [];
  
  evidenceTable.substances.forEach((entry) => {
    // Check if substance exists in registry
    if (!isValidSubstance(entry.substance_id)) {
      errors.push(`Evidence Table: substance_id "${entry.substance_id}" not found in Registry`);
    }
  });
  
  return errors;
}

