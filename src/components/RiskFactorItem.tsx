import type { RiskFactor } from '../data/types';
import { shouldShowAgeHint } from '../utils/rfHelpers';

interface RiskFactorItemProps {
  rf: RiskFactor;
  isSelected: boolean;
  onToggle: () => void;
  age: number | null;
  formatLabel: (rf: RiskFactor) => string;
}

export function RiskFactorItem(props: RiskFactorItemProps) {
  const showAgeHint = shouldShowAgeHint(props.rf.rf_id, props.age);
  
  return (
    <label class="rf-item">
      <input
        type="checkbox"
        checked={props.isSelected}
        onChange={props.onToggle}
      />
      <span>
        {props.formatLabel(props.rf)}
        {showAgeHint && (
          <span class="rf-age-limit-hint">
            {" "}(nur bis Alter 75)
          </span>
        )}
      </span>
    </label>
  );
}

