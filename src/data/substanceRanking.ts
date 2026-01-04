import type { EvidenceEntry, RankedSubstance, EvidenceLevel } from './types';
import { getEvidenceFor } from './evidenceTable';

/**
 * Get evidence level order for sorting (A > B > C > none)
 */
function getEvidenceLevelOrder(level: EvidenceLevel | null): number {
  if (level === "A") return 0;
  if (level === "B") return 1;
  if (level === "C") return 2;
  return 3; // null or missing
}

/**
 * Format efficacy hint string
 */
function formatEfficacyHint(efficacy: { hip: boolean; vertebral: boolean } | null): string {
  if (!efficacy) return "unklar";
  
  if (efficacy.hip && efficacy.vertebral) {
    return "Hüfte + Wirbel";
  } else if (efficacy.vertebral) {
    return "Wirbel";
  } else if (efficacy.hip) {
    return "Hüfte";
  } else {
    return "unklar";
  }
}

/**
 * Format evidence chip string
 */
function formatEvidenceChip(level: EvidenceLevel | null): string {
  if (!level) return "Evidenz unklar";
  return `Evidenz ${level}`;
}

/**
 * Rank substances by evidence within therapy class
 * 
 * Sort order:
 * 1. evidence_level (A > B > C > none)
 * 2. hip efficacy (true > false)
 * 3. vertebral efficacy (true > false)
 * 4. substance_id (alphabetical, stable fallback)
 * 
 * @param allowedSubstances - Array of substance IDs (after contraindication filtering)
 * @returns Ranked array of substances with evidence annotations
 */
export function rankSubstancesByEvidence(
  allowedSubstances: string[]
): RankedSubstance[] {
  // Get evidence for each substance
  const withEvidence = allowedSubstances.map((substanceId) => {
    const evidence = getEvidenceFor(substanceId);
    
    return {
      substance_id: substanceId,
      evidence,
      // Pre-compute UI fields
      ui: {
        evidenceChip: formatEvidenceChip(evidence?.evidence_level ?? null),
        efficacyHint: formatEfficacyHint(evidence?.fracture_efficacy ?? null),
        note: evidence?.evidence_note_de,
        sourceRefs: evidence?.source_refs,
      },
    };
  });

  // Sort by ranking rules
  withEvidence.sort((a, b) => {
    const aLevel = a.evidence?.evidence_level ?? null;
    const bLevel = b.evidence?.evidence_level ?? null;
    
    // 1. Evidence level
    const levelDiff = getEvidenceLevelOrder(aLevel) - getEvidenceLevelOrder(bLevel);
    if (levelDiff !== 0) return levelDiff;
    
    // 2. Hip efficacy
    const aHip = a.evidence?.fracture_efficacy.hip ?? false;
    const bHip = b.evidence?.fracture_efficacy.hip ?? false;
    if (aHip !== bHip) return bHip ? 1 : -1; // true before false
    
    // 3. Vertebral efficacy
    const aVert = a.evidence?.fracture_efficacy.vertebral ?? false;
    const bVert = b.evidence?.fracture_efficacy.vertebral ?? false;
    if (aVert !== bVert) return bVert ? 1 : -1; // true before false
    
    // 4. Alphabetical fallback
    return a.substance_id.localeCompare(b.substance_id);
  });

  return withEvidence;
}

