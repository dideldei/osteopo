import type { SubstanceRegistry, SubstanceRegistryEntry, TherapyClass } from './types';
import substanceRegistryData from '../../context/DVO_Substance_Registry_v1.0.0.json';

const registry = substanceRegistryData as SubstanceRegistry;

// Build lookup map: substance_id -> SubstanceRegistryEntry
let registryMap: Map<string, SubstanceRegistryEntry> | null = null;

/**
 * Load the substance registry data
 */
export function loadSubstanceRegistry(): SubstanceRegistry {
  return registry;
}

/**
 * Build and cache the registry lookup map
 */
function buildRegistryMap(): Map<string, SubstanceRegistryEntry> {
  if (registryMap === null) {
    registryMap = new Map();
    registry.substances.forEach((entry) => {
      registryMap!.set(entry.substance_id, entry);
    });
  }
  return registryMap;
}

/**
 * Get registry entry for a substance by ID
 * Returns null if substance not found
 * 
 * @param substanceId - Substance ID
 * @returns SubstanceRegistryEntry or null if not found
 */
export function getRegistryEntry(substanceId: string): SubstanceRegistryEntry | null {
  const map = buildRegistryMap();
  return map.get(substanceId) || null;
}

/**
 * Get all substances by therapy class
 * 
 * @param therapyClass - Therapy class to filter by
 * @param activeOnly - If true, only return active substances (default: true)
 * @returns Array of substance IDs
 */
export function getSubstancesByTherapyClass(
  therapyClass: TherapyClass,
  activeOnly: boolean = true
): string[] {
  return registry.substances
    .filter((entry) => {
      if (entry.therapy_class !== therapyClass) return false;
      if (activeOnly && !entry.active) return false;
      return true;
    })
    .map((entry) => entry.substance_id);
}

/**
 * Get label for a substance by ID
 * Returns substance_id as fallback if not found
 * 
 * @param substanceId - Substance ID
 * @returns German label or substance_id as fallback
 */
export function getSubstanceLabel(substanceId: string): string {
  const entry = getRegistryEntry(substanceId);
  return entry?.label_de || substanceId;
}

/**
 * Validate that a substance ID exists in the registry
 * 
 * @param substanceId - Substance ID to validate
 * @returns true if substance exists and is active
 */
export function isValidSubstance(substanceId: string): boolean {
  const entry = getRegistryEntry(substanceId);
  return entry !== null && entry.active;
}

/**
 * Get all substance IDs from registry
 * 
 * @param activeOnly - If true, only return active substances (default: true)
 * @returns Array of all substance IDs
 */
export function getAllSubstanceIds(activeOnly: boolean = true): string[] {
  return registry.substances
    .filter((entry) => !activeOnly || entry.active)
    .map((entry) => entry.substance_id);
}

