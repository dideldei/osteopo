import type { Accessor } from 'solid-js';

type Sex = 'female' | 'male' | null;

interface InputSectionProps {
  sex: Accessor<Sex>;
  setSex: (sex: 'female' | 'male') => void;
  age: Accessor<number | null>;
  setAge: (age: number | null) => void;
  tscoreInputValue: Accessor<string>;
  setTscoreInputValue: (value: string) => void;
  setTscoreTotalHip: (value: number | null) => void;
  isOutOfScope: Accessor<boolean>;
  isTscoreOutOfScope: Accessor<boolean>;
}

export function InputSection(props: InputSectionProps) {
  const ageValue = () => props.age();

  return (
    <div class="card">
      <h2>Eingaben</h2>
      <div class="field">
        <label for="sex">Geschlecht</label>
        <div class="row" role="radiogroup" aria-label="Geschlecht auswählen">
          <label class="radio-label">
            <input
              type="radio"
              id="sex-female"
              name="sex"
              value="female"
              checked={props.sex() === 'female'}
              onChange={(e) => props.setSex(e.currentTarget.value as 'female')}
              aria-label="Weiblich"
            />
            <span>Weiblich</span>
          </label>
          <label class="radio-label">
            <input
              type="radio"
              id="sex-male"
              name="sex"
              value="male"
              checked={props.sex() === 'male'}
              onChange={(e) => props.setSex(e.currentTarget.value as 'male')}
              aria-label="Männlich"
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
          aria-label="Alter in Jahren"
          onInput={(e) => {
            const value = e.currentTarget.value;
            props.setAge(value === '' ? null : parseInt(value, 10));
          }}
        />
      </div>

      <div class="field">
        <label for="tscore">BMD (Total Hip T-Score, optional)</label>
        <input
          type="text"
          id="tscore"
          class="bmd-input"
          value={props.tscoreInputValue()}
          placeholder="z.B. -2.5"
          pattern="^-?\d*[.,]?\d*$"
          aria-label="BMD Total Hip T-Score (optional)"
          onInput={(e) => {
            let value = e.currentTarget.value;
            // Normalize comma to dot for parsing (mobile keyboards often use comma)
            const normalizedValue = value.replace(',', '.');
            
            // Update the display value (preserve intermediate states like "1." or ".5")
            props.setTscoreInputValue(value);
            
            // Try to parse - only update numeric value if valid
            if (value === '' || value === '-' || value === '.' || value === ',' || value === '-.' || value === '-,' || value === '.-' || value === ',-') {
              // Intermediate states - keep input but clear numeric value
              props.setTscoreTotalHip(null);
            } else {
              const parsed = parseFloat(normalizedValue);
              if (!isNaN(parsed)) {
                props.setTscoreTotalHip(parsed);
              } else {
                // Invalid input - keep display but clear numeric
                props.setTscoreTotalHip(null);
              }
            }
          }}
          onBlur={(e) => {
            // On blur, normalize the display value (convert comma to dot, remove trailing dot if no decimals)
            const value = e.currentTarget.value;
            if (value === '' || value === '-' || value === '.' || value === ',' || value === '-.' || value === '-,' || value === '.-' || value === ',-') {
              props.setTscoreInputValue('');
              props.setTscoreTotalHip(null);
            } else {
              const normalized = value.replace(',', '.');
              const parsed = parseFloat(normalized);
              if (!isNaN(parsed)) {
                // Format nicely: remove trailing dot if it's a whole number
                const formatted = parsed % 1 === 0 ? parsed.toString() : normalized;
                props.setTscoreInputValue(formatted);
                props.setTscoreTotalHip(parsed);
              } else {
                // Invalid - clear on blur
                props.setTscoreInputValue('');
                props.setTscoreTotalHip(null);
              }
            }
          }}
        />
      </div>

      {props.isOutOfScope() && (
        <div class="notice">
          Hinweis: Alter unter 50 Jahren liegt außerhalb des Gültigkeitsbereichs.
        </div>
      )}

      {props.isTscoreOutOfScope() && (
        <div class="notice">
          T-Score &gt; 0,0: keine Osteoporose (außerhalb App-Scope)
        </div>
      )}
    </div>
  );
}

