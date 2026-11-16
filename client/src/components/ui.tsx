import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, X } from 'lucide-react';
import { BRANCH_INFO, DOC_STATUS_LABELS, type Branch, type DocStatus } from '@shared';
import { errorMessage } from '../lib/api';

// ---------- Botones ----------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
export function Button({
  variant = 'primary',
  size,
  loading,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm'; loading?: boolean }) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : null}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = 'primary', size, children }: { to: string; variant?: BtnVariant; size?: 'sm'; children: ReactNode }) {
  return (
    <Link to={to} className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''}`}>
      {children}
    </Link>
  );
}

// ---------- Formularios ----------
export function Field({
  label,
  error,
  hint,
  required,
  full,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label>
        {label} {required ? <span className="req">*</span> : null}
      </label>
      {children}
      {error ? <span className="error">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { invalid, className = '', ...rest },
  ref,
) {
  return <input ref={ref} className={`input ${invalid ? 'invalid' : ''} ${className}`} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { invalid, className = '', children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={`select ${invalid ? 'invalid' : ''} ${className}`} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { invalid, className = '', ...rest },
  ref,
) {
  return <textarea ref={ref} className={`textarea ${invalid ? 'invalid' : ''} ${className}`} {...rest} />;
});

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }>(function Checkbox(
  { label, ...rest },
  ref,
) {
  return (
    <label className="checkbox">
      <input ref={ref} type="checkbox" {...rest} />
      {label}
    </label>
  );
});

// ---------- Estructura ----------
export function PageHeader({ title, sub, actions, crumbs }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; crumbs?: { to: string; label: string }[] }) {
  return (
    <div className="page-header">
      <div style={{ minWidth: 0 }}>
        {crumbs?.length ? (
          <div className="breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c.to}>
                {i > 0 ? ' / ' : ''}
                <Link to={c.to}>{c.label}</Link>
              </span>
            ))}
          </div>
        ) : null}
        <h1>{title}</h1>
        {sub ? <div className="sub">{sub}</div> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, actions, children, bodyClass = 'card-body' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; bodyClass?: string }) {
  return (
    <section className="card">
      {title || actions ? (
        <div className="card-header">
          {typeof title === 'string' ? <h2>{title}</h2> : title}
          {actions ? <div className="row">{actions}</div> : null}
        </div>
      ) : null}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Loading() {
  return (
    <div className="loading">
      <span className="spinner" />
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return <div className="alert alert-error">{errorMessage(error)}</div>;
}

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty">
      {icon ?? <Inbox />}
      <div>{children}</div>
    </div>
  );
}

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'bordo' | 'gold';
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function UnitBadge({ unit, short }: { unit: { name: string; code: string; branch: string } | null | undefined; short?: boolean }) {
  if (!unit) return <span className="muted">—</span>;
  const color = BRANCH_INFO[unit.branch as Branch]?.color ?? 'var(--muted)';
  return (
    <span className="unit-badge" title={unit.name}>
      <span className="unit-dot" style={{ background: color }} />
      {short ? unit.code : unit.name}
    </span>
  );
}

export function DocDot({ status }: { status: DocStatus }) {
  return <span className={`dot dot-${status}`} title={DOC_STATUS_LABELS[status]} />;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: ReactNode }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} className={`tab ${value === t.key ? 'active' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Modal ----------
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

/** Botón que pide confirmación en un modal propio (no usa window.confirm). */
export function ConfirmButton({
  children,
  title = '¿Confirmás?',
  message,
  confirmLabel = 'Confirmar',
  onConfirm,
  variant = 'danger',
  size,
}: {
  children: ReactNode;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<unknown> | void;
  variant?: BtnVariant;
  size?: 'sm';
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {children}
      </Button>
      {open ? (
        <Modal
          title={title}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant={variant === 'danger' ? 'primary' : variant}
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onConfirm();
                    setOpen(false);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {confirmLabel}
              </Button>
            </>
          }
        >
          {message}
        </Modal>
      ) : null}
    </>
  );
}
