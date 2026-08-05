import { cn, control } from './ui';

/**
 * Read-only label and value.
 *
 * Three screens had their own copy of this, one of which had drifted to support a
 * monospace value. Kept as one component so a change to the label style is one edit.
 */
export function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-subtle">{label}</span>
      <span className={cn('text-sm', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

/**
 * A single number worth looking at, in a bordered tile.
 *
 * `alert` is for a value that means something is wrong — a shortfall, a penalty, a
 * ledger that does not balance. `tabular` lines up digits when tiles sit in a row.
 */
export function Figure({
  label,
  value,
  alert,
  tabular = true,
}: {
  label: string;
  value: React.ReactNode;
  alert?: boolean;
  tabular?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-current/10 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-subtle">{label}</span>
      <span
        className={cn(
          'text-sm font-medium',
          tabular && 'tabular-nums',
          alert && 'text-red-700 dark:text-red-300',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * A labelled form control.
 *
 * The label is tied to the control by id rather than by wrapping it. A wrapping
 * `<label>` absorbs the text of any `<option>` into the accessible name, which makes
 * a select impossible to address by its own label in tests and screen readers.
 */
export function LabeledField({
  label,
  name,
  id = name,
  size = 'md',
  className,
  children,
}: {
  label: string;
  name?: string;
  id?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-subtle">
        {label}
      </label>
      {children ?? <input id={id} name={name} className={control(size, className)} />}
    </div>
  );
}

/**
 * Labelled text input. The common case of {@link LabeledField}.
 *
 * `defaultValue` accepts null so a nullable BE field can be passed straight through —
 * React would otherwise flip the input to controlled and warn.
 */
export function TextField({
  label,
  name,
  id = name,
  type = 'text',
  size = 'md',
  className,
  defaultValue,
  ...rest
}: {
  label: string;
  name: string;
  id?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  defaultValue?: string | number | null;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'className' | 'defaultValue'>) {
  return (
    <LabeledField label={label} name={name} id={id}>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        className={control(size, className)}
        {...rest}
      />
    </LabeledField>
  );
}
