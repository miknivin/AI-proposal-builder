type Props = {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function AddColumnModalBody({
  value,
  onChange,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <div className="space-y-4 p-5">
      <p className="text-sm text-muted">
        Enter a column header like &ldquo;GST&rdquo;, &ldquo;Tax&rdquo;, or
        &ldquo;Notes&rdquo;.
      </p>
      <input
        className="field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Column header"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="button-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button type="button" className="button-primary" onClick={onSubmit}>
          Add
        </button>
      </div>
    </div>
  );
}

