export interface ThresholdEntry {
  age: number;
  tscore: string;
  required_factor: number;
}

export interface ThresholdTable {
  sex: "female" | "male";
  threshold_percent: 3 | 5 | 10;
  entries: ThresholdEntry[];
  source?: {
    document: string;
    pages: number[];
  };
}

export interface DVOBundle {
  README?: {
    purpose?: string;
    source_of_truth?: string;
    how_to_extend?: string[];
    lookup_rules?: string[];
    created_at_utc?: string;
  };
  bundle_version: string;
  tables: ThresholdTable[];
}

export interface RiskFactor {
  rf_id: string;
  label_de: string;
  group: "G1_STURZ" | "G2_RA_GC" | "G3_OTHER";
  rr_3y: number;
  included_in_risk_calc: boolean;
  flags?: {
    imminent_rr?: boolean;
    strong_irreversible_A?: boolean;
  };
  source_ref?: string;
  mutual_exclusion_group_id?: string;
  exclusion_mode?: string;
  ui_hidden_when_other_selected?: boolean;
  ui_disclosure_text?: string;
}

export interface RfCatalog {
  meta?: {
    name?: string;
    version?: string;
    created_date?: string;
    source_documents?: Array<{ title?: string; file?: string }>;
    notes?: string[];
    updated_date?: string;
    mutual_exclusion_groups?: Array<{
      id: string;
      label_de: string;
      mode: string;
      ui_default: string;
    }>;
  };
  risk_factors: RiskFactor[];
}

export interface SelectedRfInfo {
  rf: RiskFactor;
  poolSource: string; // e.g., "G1_STURZ", "G2_RA_GC", "G3_OTHER_1", "G3_OTHER_2"
}

export interface MegIndex {
  megToRfs: Map<string, { rfIds: string[]; mode: string }>;
  rfToMeg: Map<string, string | null>;
}

export type RiskBand = "<3%" | "3–<5%" | "5–<10%" | ">=10%";

export type TherapyStrategy =
  | "none"
  | "consider_antiresorptive"
  | "antiresorptive"
  | "osteoanabolic_start";

export type GuidelineName = "DEGAM" | "DVO";

export interface GuidelineStatement {
  grade: string;          // e.g. "A", "B", "0", "-"
  wording_de: string;     // short, UI-safe
}

export type DeviationFlag = "DEGAM_SOFTENING" | null;

export interface TherapyPlan {
  strategy: TherapyStrategy;
  label_de: string;
  sequence_hint?: string;
  
  // Guideline modulation fields
  guideline_default: GuidelineName; // always "DEGAM"
  guideline_strength: {
    DEGAM: GuidelineStatement;
    DVO: GuidelineStatement;
  };
  deviation_flag?: DeviationFlag;
}

// Evidence Table Types
export type EvidenceLevel = "A" | "B" | "C";

export type TherapyClass = "osteoanabolic" | "antiresorptive";

export interface FractureEfficacy {
  hip: boolean;
  vertebral: boolean;
}

export interface EvidenceEntry {
  substance_id: string;
  label_de: string;
  therapy_class: TherapyClass;
  evidence_level: EvidenceLevel;
  fracture_efficacy: FractureEfficacy;
  evidence_note_de: string;
  source_refs: string[];
}

export interface EvidenceTableMeta {
  name?: string;
  version?: string;
  created_date?: string;
  scope?: string[];
  source_documents?: Array<{ title?: string; file?: string }>;
  notes?: string[];
}

export interface EvidenceTable {
  meta?: EvidenceTableMeta;
  substances: EvidenceEntry[];
  ordering_rules_v1?: {
    description?: string;
    sort_keys_desc?: string[];
  };
}

export interface RankedSubstance {
  substance_id: string;
  evidence: EvidenceEntry | null;
  ui: {
    evidenceChip: string;        // e.g. "Evidenz A"
    efficacyHint: string;        // e.g. "Hüfte + Wirbel"
    note?: string;
    sourceRefs?: string[];
  };
}

// Substance Administration Metadata Types
export interface ApprovalInfo {
  approved: boolean;
  population_note_de?: string;
}

export interface SubstanceAdministration {
  route: string;              // "oral" | "iv" | "sc" | "mixed"
  frequency_default: string;   // "daily" | "weekly" | "monthly" | "six_monthly" | "quarterly" | "yearly" | "mixed"
  setting_default: string;     // "self" | "practice" | "mixed"
}

export interface SubstanceAdminMeta {
  substance_id: string;
  therapy_class: "antiresorptive" | "osteoanabolic";
  administration: SubstanceAdministration;
  approval: {
    female: ApprovalInfo;
    male: ApprovalInfo;
  };
  notes_de?: string;
}

export interface SubstanceMetadataTable {
  meta?: {
    name?: string;
    version?: string;
    created_date?: string;
    scope?: string;
    fields?: Record<string, unknown>;
    enums?: Record<string, string[]>;
  };
  substances: SubstanceAdminMeta[];
}

