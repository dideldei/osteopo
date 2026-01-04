import type { RiskBand, TherapyPlan, TherapyStrategy, TherapyClass } from './types';
import { getSubstancesByTherapyClass } from './substanceRegistry';

/**
 * Derive therapy strategy plan from risk band and trigger presence
 * This is Level 1 (strategy level) - no medication names, no contraindications
 * 
 * Reference: DVO_therapy_engine_pseudocode_v1.txt describes Level 2 (substance level)
 */
export function deriveTherapyPlan(
  riskBand: RiskBand,
  triggerPresent: boolean
): TherapyPlan {
  switch (riskBand) {
    case "<3%":
      return {
        strategy: "none",
        label_de: "keine medikamentöse Therapie",
        guideline_default: "DEGAM",
        guideline_strength: {
          DVO: { grade: "-", wording_de: "keine spezifische medikamentöse Therapie" },
          DEGAM: { grade: "-", wording_de: "keine spezifische medikamentöse Therapie" },
        },
        deviation_flag: null,
      };

    case "3–<5%":
      if (!triggerPresent) {
        return {
          strategy: "none",
          label_de: "keine medikamentöse Therapie",
          guideline_default: "DEGAM",
          guideline_strength: {
            DVO: { grade: "-", wording_de: "keine spezifische medikamentöse Therapie" },
            DEGAM: { grade: "-", wording_de: "keine spezifische medikamentöse Therapie" },
          },
          deviation_flag: null,
        };
      } else {
        return {
          strategy: "consider_antiresorptive",
          label_de: "medikamentöse Therapie kann erwogen werden",
          sequence_hint: "bei Entscheidung für Therapie: antiresorptiv",
          guideline_default: "DEGAM",
          guideline_strength: {
            DVO: { grade: "0", wording_de: "kann erwogen werden (bei Triggern)" },
            DEGAM: { grade: "0", wording_de: "kann erwogen werden (bei Triggern)" },
          },
          deviation_flag: null,
        };
      }

    case "5–<10%":
      return {
        strategy: "antiresorptive",
        label_de: "antiresorptive Therapie empfohlen",
        sequence_hint: "Monotherapie antiresorptiv; Verlaufskontrolle",
        guideline_default: "DEGAM",
        guideline_strength: {
          DVO: { grade: "A", wording_de: "antiresorptiv empfohlen" },
          DEGAM: { grade: "A", wording_de: "antiresorptiv empfohlen" },
        },
        deviation_flag: null,
      };

    case ">=10%":
      return {
        strategy: "osteoanabolic_start",
        label_de: "osteoanabole Starttherapie empfohlen",
        sequence_hint: "zeitlich begrenzte osteoanabole Therapie, anschließend antiresorptive Erhaltung",
        guideline_default: "DEGAM",
        guideline_strength: {
          DVO: { grade: "A", wording_de: "soll osteoanabol behandelt werden" },
          DEGAM: { grade: "B", wording_de: "sollte osteoanabol behandelt werden" },
        },
        deviation_flag: "DEGAM_SOFTENING",
      };
  }
}

/**
 * Get candidate substance IDs for a therapy strategy
 * Based on pseudocode: maps strategy to therapy class, then gets substances from Registry
 * 
 * @param strategy - Therapy strategy
 * @returns Array of substance IDs for this strategy
 */
export function getCandidateSubstances(strategy: TherapyStrategy): string[] {
  if (strategy === "none") {
    return [];
  }

  // Map strategy to therapy class
  let therapyClass: TherapyClass;
  if (strategy === "osteoanabolic_start") {
    therapyClass = "osteoanabolic";
  } else {
    // "antiresorptive" or "consider_antiresorptive"
    therapyClass = "antiresorptive";
  }

  // Get substances from Registry
  const candidates = getSubstancesByTherapyClass(therapyClass, true);

  // Special case: >=10% should only show romosozumab and teriparatide (per pseudocode)
  if (strategy === "osteoanabolic_start") {
    return candidates.filter((id) => 
      id === "romosozumab" || id === "teriparatide"
    );
  }

  return candidates;
}

