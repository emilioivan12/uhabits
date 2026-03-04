import { FormEvent, useEffect, useState } from "react";

interface NumericEntryDialogProps {
  isOpen: boolean;
  habitName: string;
  unit: string;
  dateLabel: string;
  initialValue: number;
  onCancel: () => void;
  onSave: (value: number) => void;
  onClear: () => void;
}

export function NumericEntryDialog({
  isOpen,
  habitName,
  unit,
  dateLabel,
  initialValue,
  onCancel,
  onSave,
  onClear
}: NumericEntryDialogProps) {
  const [valueText, setValueText] = useState(initialValue.toString());

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setValueText(initialValue.toString());
  }, [initialValue, isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(valueText);
    if (!Number.isFinite(value)) {
      return;
    }
    onSave(value);
  }

  return (
    <div className="numeric-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="numeric-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Set value for ${habitName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{habitName}</h3>
        <p>{dateLabel}</p>
        <form onSubmit={handleSubmit}>
          <label>
            Value ({unit || "unit"})
            <input
              autoFocus
              inputMode="decimal"
              value={valueText}
              onChange={(event) => setValueText(event.target.value)}
            />
          </label>
          <div className="numeric-dialog-actions">
            <button type="button" className="button" onClick={onClear}>
              Clear
            </button>
            <button type="button" className="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
