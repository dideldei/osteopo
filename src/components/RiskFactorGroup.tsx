import { MutualExclusionGroup } from './MutualExclusionGroup';
import { RiskFactorItem } from './RiskFactorItem';
import type { RiskFactor } from '../data/types';

interface RiskFactorGroupProps {
  groupId: string;
  groupTitle: string;
  groupHint: string;
  rfs: RiskFactor[];
  megGroups: Record<string, RiskFactor[]>;
  isExpanded: boolean;
  selectedRfIds: Set<string>;
  age: number | null;
  onToggleExpanded: () => void;
  onToggleMegExpanded: (megId: string) => void;
  isMegExpanded: (megId: string) => boolean;
  onToggleRf: (rfId: string) => void;
  getMegLabel: (megId: string) => string;
  formatRfLabel: (rf: RiskFactor) => string;
}

export function RiskFactorGroup(props: RiskFactorGroupProps) {
  // Get RFs that are in MEGs
  const rfsInMegs = new Set<string>();
  Object.values(props.megGroups).forEach((megRfs) => {
    megRfs.forEach((rf) => rfsInMegs.add(rf.rf_id));
  });
  
  // Separate MEG and non-MEG RFs
  const nonMegRfs = props.rfs.filter((rf) => !rfsInMegs.has(rf.rf_id));

  return (
    <div class="rf-group">
      <button
        class="rf-group-toggle"
        onClick={props.onToggleExpanded}
        type="button"
        aria-expanded={props.isExpanded}
      >
        <span class="rf-group-toggle-icon">
          {props.isExpanded ? '▼' : '▶'}
        </span>
        <h3 class="rf-group-title">{props.groupTitle}</h3>
      </button>
      {props.isExpanded && (
        <>
          <p class="rf-group-hint">{props.groupHint}</p>
          {/* Render MEG groups */}
          {Object.entries(props.megGroups).map(([megId, megRfs]) => {
            const expanded = props.isMegExpanded(megId);
            const hasSelectedRf = megRfs.some((rf) => props.selectedRfIds.has(rf.rf_id));
            
            return (
              <MutualExclusionGroup
                megId={megId}
                megLabel={props.getMegLabel(megId)}
                rfs={megRfs}
                isExpanded={expanded}
                hasSelectedRf={hasSelectedRf}
                selectedRfIds={props.selectedRfIds}
                age={props.age}
                onToggleExpanded={() => props.onToggleMegExpanded(megId)}
                onToggleRf={props.onToggleRf}
                formatRfLabel={props.formatRfLabel}
              />
            );
          })}
          {/* Render non-MEG RFs */}
          {nonMegRfs.map((rf) => (
            <RiskFactorItem
              rf={rf}
              isSelected={props.selectedRfIds.has(rf.rf_id)}
              onToggle={() => props.onToggleRf(rf.rf_id)}
              age={props.age}
              formatLabel={props.formatRfLabel}
            />
          ))}
        </>
      )}
    </div>
  );
}

