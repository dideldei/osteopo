import { createSignal, createMemo } from 'solid-js';
import {
  loadBundle,
  ageBin,
  lookupNoBmdCell,
  lookupCell,
  getAvailableTscoreBins,
  mapTscoreToBin,
  thresholdReachedFromLookup,
  highestReachedBand,
} from './data/lookup';
import { loadRfCatalog, getRiskFactorsForCalculation, buildMegIndex, enforceMegRules, getAllRiskFactors } from './data/rfCatalog';
import {
  selectTop2RiskFactors,
  computeCombinedMultiplier,
  isThresholdReached,
} from './data/rfSelection';
import { deriveTherapyPlan, getCandidateSubstances } from './data/therapy';
import { rankSubstancesByEvidence } from './data/substanceRanking';
import { getMetadataFor, getRegimenText, getApprovalHint } from './data/substanceMetadata';
import type { ThresholdTable, RiskFactor, RiskBand } from './data/types';

type Sex = 'female' | 'male' | null;

function getBadgeClass(band: string): string {
  if (band.includes('10')) return 'badge-10';
  if (band.includes('5')) return 'badge-5';
  if (band.includes('3')) return 'badge-3';
  return '';
}

export default function App() {
  console.log('App component initializing');
  
  const [sex, setSex] = createSignal<Sex>(null);
  const [age, setAge] = createSignal<number | null>(null);
  const [tscoreTotalHip, setTscoreTotalHip] = createSignal<number | null>(null);
  const [selectedRfIds, setSelectedRfIds] = createSignal<Set<string>>(new Set());
  const [rfSectionExpanded, setRfSectionExpanded] = createSignal(false);

  console.log('Loading bundle...');
  const bundle = loadBundle();
  
  // Load RF catalog with error handling - use memo to make it lazy
  const availableRfs = createMemo(() => {
    try {
      const rfCatalog = loadRfCatalog();
      return getRiskFactorsForCalculation(rfCatalog);
    } catch (error) {
      console.error('Failed to load RF catalog:', error);
      return [];
    }
  });

  // Display RFs: includes calculation RFs plus trigger-only RFs
  const displayRfs = createMemo(() => {
    try {
      const rfCatalog = loadRfCatalog();
      const calcRfs = getRiskFactorsForCalculation(rfCatalog);
      const allRfs = getAllRiskFactors(rfCatalog);
      
      // Add trigger-only RFs (not in calculation but have trigger flags)
      const triggerOnlyRfs = allRfs.filter(
        (rf) => 
          rf.included_in_risk_calc === false &&
          (rf.flags?.imminent_rr === true || rf.flags?.strong_irreversible_A === true)
      );
      
      return [...calcRfs, ...triggerOnlyRfs];
    } catch (error) {
      console.error('Failed to load display RFs:', error);
      return [];
    }
  });

  // Build MEG index from catalog
  const megIndex = createMemo(() => {
    try {
      const rfCatalog = loadRfCatalog();
      return buildMegIndex(rfCatalog);
    } catch (error) {
      console.error('Failed to build MEG index:', error);
      return { megToRfs: new Map(), rfToMeg: new Map() };
    }
  });

  // Get MEG label from catalog
  const getMegLabel = (megId: string): string => {
    try {
      const rfCatalog = loadRfCatalog();
      const meg = rfCatalog.meta?.mutual_exclusion_groups?.find((g) => g.id === megId);
      return meg?.label_de || megId;
    } catch {
      return megId;
    }
  };

  // Format RF label with trigger indicator and RR
  const formatRfLabel = (rf: RiskFactor): string => {
    let label = rf.label_de;
    if (rf.included_in_risk_calc === false) {
      label += ' (nur Trigger)';
    }
    if (rf.rr_3y !== null) {
      label += ` (RR: ${rf.rr_3y})`;
    }
    return label;
  };
  
  console.log('App component initialized');

  const computedAgeBin = createMemo(() => {
    const ageValue = age();
    if (ageValue === null) return null;
    return ageBin(ageValue);
  });

  const isTscoreOutOfScope = createMemo(() => {
    const tscore = tscoreTotalHip();
    return tscore !== null && tscore > 0.0;
  });

  // RF selection and multiplier computation
  const top2Rfs = createMemo(() => {
    return selectTop2RiskFactors(selectedRfIds(), availableRfs());
  });

  const combinedMultiplier = createMemo(() => {
    return computeCombinedMultiplier(top2Rfs());
  });

  // Group RFs for display (by group and MEG)
  const groupedRfs = createMemo(() => {
    const groups: Record<string, RiskFactor[]> = {
      G1_STURZ: [],
      G2_RA_GC: [],
      G3_OTHER: [],
    };
    const megGroups: Record<string, Record<string, RiskFactor[]>> = {
      G1_STURZ: {},
      G2_RA_GC: {},
      G3_OTHER: {},
    };
    
    displayRfs().forEach((rf) => {
      groups[rf.group].push(rf);
      
      // Also group by MEG if present
      const megId = megIndex().rfToMeg.get(rf.rf_id);
      if (megId) {
        if (!megGroups[rf.group][megId]) {
          megGroups[rf.group][megId] = [];
        }
        megGroups[rf.group][megId].push(rf);
      }
    });
    
    // Sort each group by rr_3y descending (RFs with rr_3y === null go to end)
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        if (a.rr_3y === null && b.rr_3y === null) return 0;
        if (a.rr_3y === null) return 1; // a goes to end
        if (b.rr_3y === null) return -1; // b goes to end
        return b.rr_3y - a.rr_3y;
      });
    });
    
    // Sort MEG groups within each main group (RFs with rr_3y === null go to end)
    Object.keys(megGroups).forEach((groupKey) => {
      Object.keys(megGroups[groupKey]).forEach((megId) => {
        megGroups[groupKey][megId].sort((a, b) => {
          if (a.rr_3y === null && b.rr_3y === null) return 0;
          if (a.rr_3y === null) return 1; // a goes to end
          if (b.rr_3y === null) return -1; // b goes to end
          return b.rr_3y - a.rr_3y;
        });
      });
    });
    
    return { groups, megGroups };
  });

  const toggleRf = (rfId: string) => {
    const current = selectedRfIds();
    const toggledRf = displayRfs().find((rf) => rf.rf_id === rfId);
    
    if (!toggledRf) {
      console.warn(`RF not found: ${rfId}`);
      return;
    }

    // Enforce MEG rules before updating state
    const updated = enforceMegRules(current, toggledRf, megIndex(), displayRfs());
    setSelectedRfIds(updated);
  };

  const results = createMemo(() => {
    const sexValue = sex();
    const ageBinValue = computedAgeBin();
    const tscore = tscoreTotalHip();

    if (sexValue === null || ageBinValue === null) {
      return null;
    }

    // If T-Score > 0.0, don't compute
    if (isTscoreOutOfScope()) {
      return null;
    }

    let cell3: number | null;
    let cell5: number | null;
    let cell10: number | null;
    let usedBmd = false;

    if (tscore === null || tscore === undefined) {
      // No T-Score provided: use no_bmd (current MVP behavior)
      cell3 = lookupNoBmdCell(bundle, sexValue, 3, ageBinValue);
      cell5 = lookupNoBmdCell(bundle, sexValue, 5, ageBinValue);
      cell10 = lookupNoBmdCell(bundle, sexValue, 10, ageBinValue);
    } else {
      // T-Score provided: use WITH_BMD tables
      usedBmd = true;
      
      // Get tables for each threshold to extract available bins
      const table3 = bundle.tables.find(
        (t: ThresholdTable) => t.sex === sexValue && t.threshold_percent === 3
      );
      const table5 = bundle.tables.find(
        (t: ThresholdTable) => t.sex === sexValue && t.threshold_percent === 5
      );
      const table10 = bundle.tables.find(
        (t: ThresholdTable) => t.sex === sexValue && t.threshold_percent === 10
      );

      // Map T-Score to bin for each threshold (may differ per table)
      const tscoreBin3 = table3 ? mapTscoreToBin(tscore, getAvailableTscoreBins(table3)) : null;
      const tscoreBin5 = table5 ? mapTscoreToBin(tscore, getAvailableTscoreBins(table5)) : null;
      const tscoreBin10 = table10 ? mapTscoreToBin(tscore, getAvailableTscoreBins(table10)) : null;

      cell3 = tscoreBin3 !== null ? lookupCell(bundle, sexValue, 3, ageBinValue, tscoreBin3) : null;
      cell5 = tscoreBin5 !== null ? lookupCell(bundle, sexValue, 5, ageBinValue, tscoreBin5) : null;
      cell10 = tscoreBin10 !== null ? lookupCell(bundle, sexValue, 10, ageBinValue, tscoreBin10) : null;
    }

    // Use multiplier to determine threshold reach
    const multiplier = combinedMultiplier();
    
    // When no BMD and no RFs (multiplier = 1.0), preserve original MVP behavior:
    // - If cell is null → reached = true (empty cell = already reached)
    // - If cell is numeric → reached = false (numeric cell = NOT reached by default)
    // When BMD is provided OR RFs are selected, use multiplier comparison:
    // - If cell is null → reached = true (unchanged)
    // - If cell is numeric → reached = (multiplier >= requiredFactor)
    
    const threshold3 = !usedBmd && multiplier === 1.0 && cell3 !== null
      ? { reached: false, reason: "Schwelle nicht erreicht (ohne RF)" }
      : isThresholdReached(cell3, multiplier);
    const threshold5 = !usedBmd && multiplier === 1.0 && cell5 !== null
      ? { reached: false, reason: "Schwelle nicht erreicht (ohne RF)" }
      : isThresholdReached(cell5, multiplier);
    const threshold10 = !usedBmd && multiplier === 1.0 && cell10 !== null
      ? { reached: false, reason: "Schwelle nicht erreicht (ohne RF)" }
      : isThresholdReached(cell10, multiplier);

    const band = highestReachedBand(
      threshold3.reached,
      threshold5.reached,
      threshold10.reached
    );

    // Get all RFs from catalog (not just calculation RFs) for trigger detection
    const allRfs = getAllRiskFactors(loadRfCatalog());
    const selectedRfs = allRfs.filter((rf) => selectedRfIds().has(rf.rf_id));

    // Compute triggers
    const imminent = selectedRfs.some((rf) => rf.flags?.imminent_rr === true);
    const strongIrreversibleA = selectedRfs.some((rf) => rf.flags?.strong_irreversible_A === true);
    const triggerPresent = imminent || strongIrreversibleA;

    // Get RFs contributing to each trigger
    const imminentRfs = selectedRfs.filter((rf) => rf.flags?.imminent_rr === true);
    const strongIrreversibleARfs = selectedRfs.filter((rf) => rf.flags?.strong_irreversible_A === true);

    // Compute recommendation based on band and trigger presence
    let recommendation: string;
    if (band === ">=10%") {
      recommendation = "Therapie indiziert (hoch)";
    } else if (band === "5–<10%") {
      recommendation = "Therapie empfohlen";
    } else if (band === "3–<5%") {
      recommendation = triggerPresent
        ? "Therapie kann erwogen werden"
        : "Keine spezifische Therapie; Prävention / Verlauf";
    } else {
      recommendation = "Keine spezifische Therapie; Prävention / Verlauf";
    }

    // Derive therapy plan from risk band and trigger presence
    const therapyPlan = deriveTherapyPlan(band as RiskBand, triggerPresent);

    // Get candidate substances and rank by evidence
    const candidateSubstances = getCandidateSubstances(therapyPlan.strategy);
    // For now, no contraindication filtering (out of scope)
    const allowedSubstances = candidateSubstances;
    const rankedSubstances = rankSubstancesByEvidence(allowedSubstances);

    return {
      ageBin: ageBinValue,
      reached3: threshold3.reached,
      reached5: threshold5.reached,
      reached10: threshold10.reached,
      band,
      usedBmd,
      multiplier,
      top2Rfs: top2Rfs(),
      thresholdDetails: {
        threshold3: { requiredFactor: cell3, ...threshold3 },
        threshold5: { requiredFactor: cell5, ...threshold5 },
        threshold10: { requiredFactor: cell10, ...threshold10 },
      },
      triggers: {
        imminent,
        strongIrreversibleA,
        triggerPresent,
        imminentRfs,
        strongIrreversibleARfs,
      },
      recommendation,
      therapyPlan,
      rankedSubstances,
    };
  });

  const ageValue = () => age();
  const isOutOfScope = createMemo(() => {
    const ageValue = age();
    return ageValue !== null && ageValue < 50;
  });

  console.log('App render called');
  
  return (
    <div class="app">
      <h1>DVO Osteoporose – MVP Threshold Classifier</h1>

      <div class="card">
        <h2>Eingaben</h2>
        <div class="field">
          <label for="sex">Geschlecht</label>
          <div class="row">
            <label class="radio-label">
              <input
                type="radio"
                id="sex-female"
                name="sex"
                value="female"
                checked={sex() === 'female'}
                onChange={(e) => setSex(e.currentTarget.value as 'female')}
              />
              <span>Weiblich</span>
            </label>
            <label class="radio-label">
              <input
                type="radio"
                id="sex-male"
                name="sex"
                value="male"
                checked={sex() === 'male'}
                onChange={(e) => setSex(e.currentTarget.value as 'male')}
              />
              <span>Männlich</span>
            </label>
          </div>
        </div>

        <div class="field">
          <label for="age">Alter (Jahre)</label>
          <input
            type="number"
            id="age"
            min="0"
            max="120"
            value={ageValue() ?? ''}
            onInput={(e) => {
              const value = e.currentTarget.value;
              setAge(value === '' ? null : parseInt(value, 10));
            }}
          />
        </div>

        <div class="field">
          <label for="tscore">BMD (Total Hip T-Score, optional)</label>
          <input
            type="number"
            id="tscore"
            step="0.1"
            value={tscoreTotalHip() ?? ''}
            placeholder="z.B. -2.5"
            onInput={(e) => {
              const value = e.currentTarget.value;
              setTscoreTotalHip(value === '' ? null : parseFloat(value));
            }}
          />
        </div>

        {isOutOfScope() && (
          <div class="notice">
            Hinweis: Alter unter 50 Jahren liegt außerhalb des Gültigkeitsbereichs.
          </div>
        )}

        {isTscoreOutOfScope() && (
          <div class="notice">
            T-Score &gt; 0,0: keine Osteoporose (außerhalb App-Scope)
          </div>
        )}

        <div class="rf-section">
          <button
            type="button"
            class="rf-toggle"
            onClick={() => setRfSectionExpanded(!rfSectionExpanded())}
          >
            {rfSectionExpanded() ? '▼' : '▶'} Risikofaktoren (optional)
          </button>
          
          {rfSectionExpanded() && (
            <div class="rf-content">
              <div class="rf-group">
                <h3>G1: Sturzrisiko</h3>
                <p class="rf-group-hint">
                  Aus dieser Gruppe wird automatisch nur der stärkste Risikofaktor berücksichtigt.
                </p>
                {(() => {
                  const { groups, megGroups } = groupedRfs();
                  const g1Rfs = groups.G1_STURZ;
                  const g1MegGroups = megGroups.G1_STURZ;
                  
                  // Get RFs that are in MEGs
                  const rfsInMegs = new Set<string>();
                  Object.values(g1MegGroups).forEach((megRfs) => {
                    megRfs.forEach((rf) => rfsInMegs.add(rf.rf_id));
                  });
                  
                  // Separate MEG and non-MEG RFs
                  const nonMegRfs = g1Rfs.filter((rf) => !rfsInMegs.has(rf.rf_id));
                  
                  return (
                    <>
                      {/* Render MEG groups */}
                      {Object.entries(g1MegGroups).map(([megId, megRfs]) => (
                        <div class="rf-meg-subgroup">
                          <p class="rf-meg-hint">
                            {getMegLabel(megId)}: Aus dieser Gruppe kann nur eine Option gleichzeitig gewählt werden.
                          </p>
                          {megRfs.map((rf) => (
                            <label class="rf-item">
                              <input
                                type="checkbox"
                                checked={selectedRfIds().has(rf.rf_id)}
                                onChange={() => toggleRf(rf.rf_id)}
                              />
                              <span>{formatRfLabel(rf)}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                      {/* Render non-MEG RFs */}
                      {nonMegRfs.map((rf) => (
                        <label class="rf-item">
                          <input
                            type="checkbox"
                            checked={selectedRfIds().has(rf.rf_id)}
                            onChange={() => toggleRf(rf.rf_id)}
                          />
                          <span>{rf.label_de} (RR: {rf.rr_3y})</span>
                        </label>
                      ))}
                    </>
                  );
                })()}
              </div>

              <div class="rf-group">
                <h3>G2: Rheumatoide Arthritis / Glukokortikoide</h3>
                <p class="rf-group-hint">
                  Aus dieser Gruppe wird automatisch nur der stärkste Risikofaktor berücksichtigt.
                </p>
                {(() => {
                  const { groups, megGroups } = groupedRfs();
                  const g2Rfs = groups.G2_RA_GC;
                  const g2MegGroups = megGroups.G2_RA_GC;
                  
                  // Get RFs that are in MEGs
                  const rfsInMegs = new Set<string>();
                  Object.values(g2MegGroups).forEach((megRfs) => {
                    megRfs.forEach((rf) => rfsInMegs.add(rf.rf_id));
                  });
                  
                  // Separate MEG and non-MEG RFs
                  const nonMegRfs = g2Rfs.filter((rf) => !rfsInMegs.has(rf.rf_id));
                  
                  return (
                    <>
                      {/* Render MEG groups */}
                      {Object.entries(g2MegGroups).map(([megId, megRfs]) => (
                        <div class="rf-meg-subgroup">
                          <p class="rf-meg-hint">
                            {getMegLabel(megId)}: Aus dieser Gruppe kann nur eine Option gleichzeitig gewählt werden.
                          </p>
                          {megRfs.map((rf) => (
                            <label class="rf-item">
                              <input
                                type="checkbox"
                                checked={selectedRfIds().has(rf.rf_id)}
                                onChange={() => toggleRf(rf.rf_id)}
                              />
                              <span>{formatRfLabel(rf)}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                      {/* Render non-MEG RFs */}
                      {nonMegRfs.map((rf) => (
                        <label class="rf-item">
                          <input
                            type="checkbox"
                            checked={selectedRfIds().has(rf.rf_id)}
                            onChange={() => toggleRf(rf.rf_id)}
                          />
                          <span>{rf.label_de} (RR: {rf.rr_3y})</span>
                        </label>
                      ))}
                    </>
                  );
                })()}
              </div>

              <div class="rf-group">
                <h3>G3: Sonstige Risikofaktoren</h3>
                <p class="rf-group-hint">
                  Bis zu zwei Risikofaktoren können berücksichtigt werden.
                </p>
                {(() => {
                  const { groups, megGroups } = groupedRfs();
                  const g3Rfs = groups.G3_OTHER;
                  const g3MegGroups = megGroups.G3_OTHER;
                  
                  // Get RFs that are in MEGs
                  const rfsInMegs = new Set<string>();
                  Object.values(g3MegGroups).forEach((megRfs) => {
                    megRfs.forEach((rf) => rfsInMegs.add(rf.rf_id));
                  });
                  
                  // Separate MEG and non-MEG RFs
                  const nonMegRfs = g3Rfs.filter((rf) => !rfsInMegs.has(rf.rf_id));
                  
                  return (
                    <>
                      {/* Render MEG groups */}
                      {Object.entries(g3MegGroups).map(([megId, megRfs]) => (
                        <div class="rf-meg-subgroup">
                          <p class="rf-meg-hint">
                            {getMegLabel(megId)}: Aus dieser Gruppe kann nur eine Option gleichzeitig gewählt werden.
                          </p>
                          {megRfs.map((rf) => (
                            <label class="rf-item">
                              <input
                                type="checkbox"
                                checked={selectedRfIds().has(rf.rf_id)}
                                onChange={() => toggleRf(rf.rf_id)}
                              />
                              <span>{formatRfLabel(rf)}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                      {/* Render non-MEG RFs */}
                      {nonMegRfs.map((rf) => (
                        <label class="rf-item">
                          <input
                            type="checkbox"
                            checked={selectedRfIds().has(rf.rf_id)}
                            onChange={() => toggleRf(rf.rf_id)}
                          />
                          <span>{rf.label_de} (RR: {rf.rr_3y})</span>
                        </label>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {results() && (
        <div class="card result">
          <h2>Ergebnis</h2>
          <div class="result-content">
            <div class="result-row">
              <span class="result-label">Altersgruppe:</span>
              <span class="result-value">{results()!.ageBin}</span>
            </div>
            <div class="result-row">
              <span class="result-label">3%-Schwelle erreicht:</span>
              <span class="result-value">{results()!.reached3 ? 'Ja' : 'Nein'}</span>
            </div>
            <div class="result-row">
              <span class="result-label">5%-Schwelle erreicht:</span>
              <span class="result-value">{results()!.reached5 ? 'Ja' : 'Nein'}</span>
            </div>
            <div class="result-row">
              <span class="result-label">10%-Schwelle erreicht:</span>
              <span class="result-value">{results()!.reached10 ? 'Ja' : 'Nein'}</span>
            </div>
            <div class="result-row final-band">
              <span class="result-label">Höchste erreichte Band:</span>
              <span class={`badge ${getBadgeClass(results()!.band)}`}>
                {results()!.band}
              </span>
            </div>
            <div class="result-row">
              <span class="result-label">Empfehlung:</span>
              <span class="result-value">{results()!.recommendation}</span>
            </div>
          </div>

          <div class="therapy-strategy-section">
            <h3>Therapie-Strategie (leitlinienbasiert)</h3>
            <div class="therapy-strategy-content">
              <div class="therapy-strategy-label">
                {results()!.therapyPlan.label_de}
              </div>
              {results()!.therapyPlan.sequence_hint && (
                <div class="therapy-sequence-hint">
                  {results()!.therapyPlan.sequence_hint}
                </div>
              )}
              
              {/* Guideline section */}
              <div class="guideline-section">
                <h4>Leitlinien-Einordnung</h4>
                <div class="guideline-primary">
                  <strong>DEGAM:</strong> {results()!.therapyPlan.guideline_strength.DEGAM.grade} – {results()!.therapyPlan.guideline_strength.DEGAM.wording_de}
                </div>
                <div class="guideline-context">
                  <strong>DVO-Kontext:</strong> {results()!.therapyPlan.guideline_strength.DVO.grade} – {results()!.therapyPlan.guideline_strength.DVO.wording_de}
                </div>
                {results()!.therapyPlan.deviation_flag === "DEGAM_SOFTENING" && (
                  <div class="deviation-note">
                    Hinweis: DEGAM formuliert zurückhaltender als DVO.
                  </div>
                )}
              </div>

              {/* Substance options section */}
              {results()!.therapyPlan.strategy !== "none" && results()!.rankedSubstances.length > 0 && (
                <div class="substance-options-section">
                  <h4>Medikamentöse Optionen (evidenzbasiert)</h4>
                  <div class="substance-options-list">
                    {results()!.rankedSubstances.map((substance) => {
                      const metadata = getMetadataFor(substance.substance_id);
                      const sexValue = sex();
                      
                      return (
                        <div class="substance-option">
                          <div class="substance-header">
                            <span class="substance-name">
                              {substance.evidence?.label_de || substance.substance_id}
                            </span>
                            <span class="evidence-chip">
                              {substance.ui.evidenceChip}
                            </span>
                          </div>
                          <div class="substance-efficacy">
                            {substance.ui.efficacyHint}
                          </div>
                          {metadata && (
                            <div class="substance-meta">
                              {getRegimenText(metadata)}
                            </div>
                          )}
                          {metadata && sexValue && (() => {
                            const approvalHint = getApprovalHint(metadata, sexValue);
                            return approvalHint ? (
                              <div class="approval-hint">
                                {approvalHint}
                              </div>
                            ) : null;
                          })()}
                          {substance.ui.note && (
                            <details class="substance-details">
                              <summary>Details</summary>
                              <div class="substance-note">
                                {substance.ui.note}
                              </div>
                              {substance.ui.sourceRefs && substance.ui.sourceRefs.length > 0 && (
                                <div class="substance-sources">
                                  <strong>Quellen:</strong> {substance.ui.sourceRefs.join(', ')}
                                </div>
                              )}
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {results() && (
            <div class="transparency-block">
              <h3>Berechnung</h3>
              
              {selectedRfIds().size > 0 && (
                <>
                  <div class="transparency-section">
                    <strong>Ausgewählte Risikofaktoren:</strong>
                    <ul class="rf-list">
                      {displayRfs()
                        .filter((rf) => selectedRfIds().has(rf.rf_id))
                        .map((rf) => (
                          <li>{formatRfLabel(rf)}</li>
                        ))}
                    </ul>
                  </div>

                  {(() => {
                    // Compute active MEG groups
                    const activeMegs: Array<{ megId: string; megLabel: string; activeRf: RiskFactor }> = [];
                    const processedMegs = new Set<string>();
                    
                      selectedRfIds().forEach((rfId) => {
                        const megId = megIndex().rfToMeg.get(rfId);
                        if (megId && !processedMegs.has(megId)) {
                          processedMegs.add(megId);
                          const activeRf = displayRfs().find((rf) => rf.rf_id === rfId);
                          if (activeRf) {
                            activeMegs.push({
                              megId,
                              megLabel: getMegLabel(megId),
                              activeRf,
                            });
                          }
                        }
                      });
                    
                    return activeMegs.length > 0 ? (
                      <div class="transparency-section">
                        <strong>Aktive MEG-Gruppen:</strong>
                        <ul class="rf-list">
                          {activeMegs.map(({ megId, megLabel, activeRf }) => (
                            <li>
                              <strong>{megLabel}:</strong> {formatRfLabel(activeRf)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null;
                  })()}

                  {results() && results()!.triggers && (
                    <div class="transparency-section">
                      <strong>Trigger-Status:</strong>
                      <ul class="rf-list">
                        <li>
                          <strong>Imminentes Risiko (IFR):</strong> {results()!.triggers.imminent ? 'Ja' : 'Nein'}
                          {results()!.triggers.imminentRfs.length > 0 && (
                            <ul style={{ "margin-left": "1rem", "margin-top": "0.25rem" }}>
                              {results()!.triggers.imminentRfs.map((rf) => (
                                <li>{rf.label_de}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                        <li>
                          <strong>Starke/irreversible RF (Option A):</strong> {results()!.triggers.strongIrreversibleA ? 'Ja' : 'Nein'}
                          {results()!.triggers.strongIrreversibleARfs.length > 0 && (
                            <ul style={{ "margin-left": "1rem", "margin-top": "0.25rem" }}>
                              {results()!.triggers.strongIrreversibleARfs.map((rf) => (
                                <li>{rf.label_de}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                      </ul>
                    </div>
                  )}

                  {top2Rfs().length > 0 && (
                    <div class="transparency-section">
                      <strong>Top-2 Risikofaktoren (gewählt):</strong>
                      <ul class="rf-list chosen-rf">
                        {top2Rfs().map((info) => (
                          <li>
                            {info.rf.label_de} (RR: {info.rf.rr_3y}, Quelle: {info.poolSource})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div class="transparency-section">
                    <strong>Kombinierter Multiplikator:</strong>
                    <span class="multiplier-value">{results()!.multiplier.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div class="transparency-section">
                <strong>Schwellenwerte:</strong>
                <div class="threshold-details">
                  <div class="threshold-detail">
                    <strong>3%:</strong> Erforderlicher Faktor: {results()?.thresholdDetails.threshold3.requiredFactor === null ? 'leer' : results()?.thresholdDetails.threshold3.requiredFactor?.toFixed(2) ?? 'N/A'} | 
                    Erreicht: {results()?.thresholdDetails.threshold3.reached ? 'Ja' : 'Nein'} | 
                    <span class="reason-text">{results()?.thresholdDetails.threshold3.reason ?? ''}</span>
                  </div>
                  <div class="threshold-detail">
                    <strong>5%:</strong> Erforderlicher Faktor: {results()?.thresholdDetails.threshold5.requiredFactor === null ? 'leer' : results()?.thresholdDetails.threshold5.requiredFactor?.toFixed(2) ?? 'N/A'} | 
                    Erreicht: {results()?.thresholdDetails.threshold5.reached ? 'Ja' : 'Nein'} | 
                    <span class="reason-text">{results()?.thresholdDetails.threshold5.reason ?? ''}</span>
                  </div>
                  <div class="threshold-detail">
                    <strong>10%:</strong> Erforderlicher Faktor: {results()?.thresholdDetails.threshold10.requiredFactor === null ? 'leer' : results()?.thresholdDetails.threshold10.requiredFactor?.toFixed(2) ?? 'N/A'} | 
                    Erreicht: {results()?.thresholdDetails.threshold10.reached ? 'Ja' : 'Nein'} | 
                    <span class="reason-text">{results()?.thresholdDetails.threshold10.reason ?? ''}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div class="disclaimer">
        {results()?.usedBmd
          ? "Diese Einstufung basiert auf Alter, Geschlecht und BMD (Total Hip T-Score) gemäß DVO 2023. Therapie ist im MVP nicht enthalten."
          : "Diese Einstufung basiert auf Alter und Geschlecht gemäß DVO 2023 (ohne BMD). Therapie ist im MVP nicht enthalten."}
      </div>
    </div>
  );
}

