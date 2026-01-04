/**
 * Data Consistency Validation Script
 * 
 * Validates consistency between:
 * - Substance Registry (master reference)
 * - Evidence Table
 * - Administration Metadata
 * 
 * Run with: npx tsx scripts/validate-data-consistency.ts
 */

import { loadSubstanceRegistry, getAllSubstanceIds, getRegistryEntry } from '../src/data/substanceRegistry';
import { loadEvidenceTable } from '../src/data/evidenceTable';
import { loadSubstanceMetadata } from '../src/data/substanceMetadata';

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

function validateConsistency(): ValidationResult {
  const result: ValidationResult = {
    errors: [],
    warnings: [],
  };

  // Load all data sources
  const registry = loadSubstanceRegistry();
  const evidenceTable = loadEvidenceTable();
  const metadataTable = loadSubstanceMetadata();

  const registryIds = new Set(getAllSubstanceIds(true));
  const evidenceIds = new Set(evidenceTable.substances.map((s) => s.substance_id));
  const metadataIds = new Set(metadataTable.substances.map((s) => s.substance_id));

  // 1. Check: All evidence table substances exist in registry
  evidenceIds.forEach((id) => {
    if (!registryIds.has(id)) {
      result.errors.push(`Evidence Table: substance_id "${id}" not found in Registry`);
    }
  });

  // 2. Check: All metadata substances exist in registry
  metadataIds.forEach((id) => {
    if (!registryIds.has(id)) {
      result.errors.push(`Administration Metadata: substance_id "${id}" not found in Registry`);
    }
  });

  // 3. Check: therapy_class consistency - ENTFERNT
  // therapy_class kommt jetzt nur noch aus Registry (Single Source of Truth)

  // 4. Check: label_de consistency (Evidence Table vs Registry)
  evidenceTable.substances.forEach((entry) => {
    const registryEntry = getRegistryEntry(entry.substance_id);
    if (registryEntry) {
      if (entry.label_de !== registryEntry.label_de) {
        result.warnings.push(
          `Evidence Table: label_de mismatch for "${entry.substance_id}" ` +
          `(Evidence: "${entry.label_de}", Registry: "${registryEntry.label_de}")`
        );
      }
    }
  });

  // 5. Check: Registry substances not in Evidence Table (warning only)
  registryIds.forEach((id) => {
    if (!evidenceIds.has(id)) {
      result.warnings.push(
        `Registry: substance_id "${id}" exists in Registry but not in Evidence Table`
      );
    }
  });

  // 6. Check: Registry substances not in Metadata (warning only)
  registryIds.forEach((id) => {
    if (!metadataIds.has(id)) {
      result.warnings.push(
        `Registry: substance_id "${id}" exists in Registry but not in Administration Metadata`
      );
    }
  });

  return result;
}

// Main execution
function main() {
  console.log('Validating data consistency...\n');

  const result = validateConsistency();

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('✓ All validations passed!');
    process.exit(0);
  }

  if (result.errors.length > 0) {
    console.error('✗ ERRORS found:');
    result.errors.forEach((error) => {
      console.error(`  - ${error}`);
    });
    console.error('');
  }

  if (result.warnings.length > 0) {
    console.warn('⚠ WARNINGS:');
    result.warnings.forEach((warning) => {
      console.warn(`  - ${warning}`);
    });
    console.warn('');
  }

  if (result.errors.length > 0) {
    console.error(`\n✗ Validation failed with ${result.errors.length} error(s)`);
    process.exit(1);
  } else {
    console.log(`\n✓ Validation passed with ${result.warnings.length} warning(s)`);
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { validateConsistency };

