import type { RfCatalog, RiskFactor, MegIndex } from './types';
import rfCatalogData from '../../context/DVO_RF_Katalog_Rohdaten_v0.5.json';

const catalog = rfCatalogData as RfCatalog;

/**
 * Load the RF catalog data
 */
export function loadRfCatalog(): RfCatalog {
  return catalog;
}

/**
 * Get risk factors that are included in risk calculation
 * Filters to only RFs where included_in_risk_calc === true
 */
export function getRiskFactorsForCalculation(catalog: RfCatalog): RiskFactor[] {
  return catalog.risk_factors.filter((rf) => rf.included_in_risk_calc === true);
}

/**
 * Get all risk factors from catalog (not filtered by included_in_risk_calc)
 * Used for trigger detection, which must evaluate ALL selected RFs
 */
export function getAllRiskFactors(catalog: RfCatalog): RiskFactor[] {
  return catalog.risk_factors;
}

/**
 * Build MEG index from catalog
 * Creates bidirectional mapping: MEG_ID -> RFs and RF_ID -> MEG_ID
 */
export function buildMegIndex(catalog: RfCatalog): MegIndex {
  const megToRfs = new Map<string, { rfIds: string[]; mode: string }>();
  const rfToMeg = new Map<string, string | null>();

  // Initialize MEG entries from meta.mutual_exclusion_groups
  if (catalog.meta?.mutual_exclusion_groups) {
    for (const meg of catalog.meta.mutual_exclusion_groups) {
      megToRfs.set(meg.id, { rfIds: [], mode: meg.mode });
    }
  }

  // Populate index from risk factors
  for (const rf of catalog.risk_factors) {
    if (rf.mutual_exclusion_group_id) {
      const megId = rf.mutual_exclusion_group_id;
      rfToMeg.set(rf.rf_id, megId);
      
      // Add RF to MEG group
      const megEntry = megToRfs.get(megId);
      if (megEntry) {
        megEntry.rfIds.push(rf.rf_id);
      } else {
        // MEG not in meta, create entry with mode from RF
        const mode = rf.exclusion_mode || 'single_choice_optional';
        megToRfs.set(megId, { rfIds: [rf.rf_id], mode });
      }
    } else {
      rfToMeg.set(rf.rf_id, null);
    }
  }

  return { megToRfs, rfToMeg };
}

/**
 * Enforce MEG rules when toggling an RF
 * - If selecting: removes all other RFs in the same MEG
 * - If deselecting: simply removes the RF (no auto-selection)
 */
export function enforceMegRules(
  selectedRfIds: Set<string>,
  toggledRf: RiskFactor,
  megIndex: MegIndex,
  allRfs: RiskFactor[]
): Set<string> {
  const updated = new Set(selectedRfIds);
  const megId = megIndex.rfToMeg.get(toggledRf.rf_id) ?? null;
  const isCurrentlySelected = updated.has(toggledRf.rf_id);

  if (isCurrentlySelected) {
    // Deselecting: simply remove
    updated.delete(toggledRf.rf_id);
  } else {
    // Selecting: enforce MEG rules
    if (megId) {
      const megEntry = megIndex.megToRfs.get(megId);
      if (megEntry && megEntry.mode === 'single_choice_optional') {
        // Remove all other RFs in the same MEG
        for (const otherRfId of megEntry.rfIds) {
          if (otherRfId !== toggledRf.rf_id) {
            updated.delete(otherRfId);
          }
        }
      }
    }
    // Add the toggled RF
    updated.add(toggledRf.rf_id);
  }

  return updated;
}

