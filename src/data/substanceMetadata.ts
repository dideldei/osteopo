import type { SubstanceMetadataTable, SubstanceAdminMeta } from './types';
import substanceMetadataData from '../../context/DVO_Substance_Administration_Metadata_v1.0.0.json';

const metadataTable = substanceMetadataData as SubstanceMetadataTable;

// Build lookup map: substance_id -> SubstanceAdminMeta
let metadataMap: Map<string, SubstanceAdminMeta> | null = null;

/**
 * Load the substance metadata table data
 */
export function loadSubstanceMetadata(): SubstanceMetadataTable {
  return metadataTable;
}

/**
 * Build and cache the metadata lookup map
 */
function buildMetadataMap(): Map<string, SubstanceAdminMeta> {
  if (metadataMap === null) {
    metadataMap = new Map();
    metadataTable.substances.forEach((entry) => {
      metadataMap!.set(entry.substance_id, entry);
    });
  }
  return metadataMap;
}

/**
 * Get metadata entry for a substance by ID
 * Returns null if substance not found (graceful fallback)
 * 
 * @param substanceId - Substance ID
 * @returns SubstanceAdminMeta or null if not found
 */
export function getMetadataFor(substanceId: string): SubstanceAdminMeta | null {
  const map = buildMetadataMap();
  const entry = map.get(substanceId);
  
  if (!entry) {
    // Silent fail - no console.warn (metadata is optional)
    return null;
  }
  
  return entry;
}

/**
 * Format route for display
 */
function formatRoute(route: string): string {
  const routeMap: Record<string, string> = {
    "oral": "oral",
    "iv": "i.v.",
    "sc": "s.c.",
    "mixed": "gemischt",
  };
  return routeMap[route] || route;
}

/**
 * Format frequency for display
 */
function formatFrequency(frequency: string): string {
  const freqMap: Record<string, string> = {
    "daily": "täglich",
    "weekly": "wöchentlich",
    "monthly": "monatlich",
    "six_monthly": "alle 6 Monate",
    "quarterly": "vierteljährlich",
    "yearly": "jährlich",
    "mixed": "variabel",
  };
  return freqMap[frequency] || frequency;
}

/**
 * Format setting for display
 */
function formatSetting(setting: string): string {
  const settingMap: Record<string, string> = {
    "self": "Selbst",
    "practice": "Praxis",
    "mixed": "gemischt",
  };
  return settingMap[setting] || setting;
}

/**
 * Get regimen text for display
 * Format: "route • frequency • setting"
 * 
 * @param meta - Substance metadata
 * @returns Formatted regimen text
 */
export function getRegimenText(meta: SubstanceAdminMeta): string {
  const route = formatRoute(meta.administration.route);
  const frequency = formatFrequency(meta.administration.frequency_default);
  const setting = formatSetting(meta.administration.setting_default);
  
  return `${route} • ${frequency} • ${setting}`;
}

/**
 * Get approval hint for a substance based on sex
 * Returns null if no hint needed
 * 
 * @param meta - Substance metadata
 * @param sex - Patient sex ("female" | "male" | null)
 * @returns Approval hint string or null
 */
export function getApprovalHint(
  meta: SubstanceAdminMeta,
  sex: "female" | "male" | null
): string | null {
  if (!sex) return null;
  
  const approval = meta.approval[sex];
  
  // If not approved, show off-label hint
  if (!approval.approved) {
    return "Für " + (sex === "male" ? "Männer" : "Frauen") + " nicht zugelassen (Off-Label).";
  }
  
  // If approved but has notes, show hint
  if (approval.population_note_de) {
    return `Hinweis: ${approval.population_note_de}`;
  }
  
  return null;
}

