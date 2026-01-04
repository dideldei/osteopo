import { RiskFactorItem } from './RiskFactorItem';
import type { RiskFactor } from '../data/types';

interface MutualExclusionGroupProps {
  megId: string;
  megLabel: string;
  rfs: RiskFactor[];
  isExpanded: boolean;
  hasSelectedRf: boolean;
  selectedRfIds: Set<string>;
  age: number | null;
  onToggleExpanded: () => void;
  onToggleRf: (rfId: string) => void;
  formatRfLabel: (rf: RiskFactor) => string;
}

export function MutualExclusionGroup(props: MutualExclusionGroupProps) {
  return (
    <div class="rf-meg-subgroup">
      <button
        class="rf-meg-toggle"
        onClick={props.onToggleExpanded}
        type="button"
        aria-expanded={props.isExpanded}
      >
        <span class="rf-meg-toggle-icon">{props.isExpanded ? '▼' : '▶'}</span>
        <span class="rf-meg-toggle-label">{props.megLabel}</span>
        {props.hasSelectedRf && (
          <span class="rf-meg-selected-badge">(ausgewählt)</span>
        )}
      </button>
      {props.isExpanded && (
        <div class="rf-meg-content">
          <p class="rf-meg-hint">
            Aus dieser Gruppe kann nur eine Option gleichzeitig gewählt werden.
          </p>
          {props.rfs.map((rf) => (
            <RiskFactorItem
              rf={rf}
              isSelected={props.selectedRfIds.has(rf.rf_id)}
              onToggle={() => props.onToggleRf(rf.rf_id)}
              age={props.age}
              formatLabel={props.formatRfLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

