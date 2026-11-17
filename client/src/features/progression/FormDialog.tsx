// Diálogo de formulario genérico para los ABM chicos de Progresión (catálogos, etapas, roles, revisiones…).
import { useState, type ReactNode } from 'react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, Checkbox, Field, Input, Modal, Select, Textarea } from '../../components/ui';

export type FormValue = string | boolean;
export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'checkbox' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  rows?: number;
  list?: string[];
}

export function FormDialog({
  title,
  fields,
  initial,
  onSave,
  onClose,
  saveLabel = 'Guardar',
  intro,
  wide,
}: {
  title: string;
  fields: FieldDef[];
  initial: Record<string, FormValue>;
  onSave: (v: Record<string, FormValue>) => Promise<unknown>;
  onClose: () => void;
  saveLabel?: string;
  intro?: ReactNode;
  wide?: boolean;
}) {
  const toast = useToast();
  const [v, setV] = useState<Record<string, FormValue>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const missing = fields.filter((f) => f.required && f.type !== 'checkbox' && !String(v[f.key] ?? '').trim());
    if (missing.length) {
      setErrors(Object.fromEntries(missing.map((f) => [f.key, 'Obligatorio'])));
      return;
    }
    setBusy(true);
    try {
      await onSave(v);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.details) setErrors(e.details);
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      wide={wide}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy}>
            {saveLabel}
          </Button>
        </>
      }
    >
      {intro ? <div className="mb">{intro}</div> : null}
      <div className="form-grid">
        {fields.map((f) => {
          const val = v[f.key];
          const set = (x: FormValue) => setV((p) => ({ ...p, [f.key]: x }));
          const full = f.full ?? (f.type === 'textarea' || f.type === 'checkbox');
          if (f.type === 'checkbox') {
            return (
              <div key={f.key} className={`field ${full ? 'full' : ''}`}>
                <Checkbox label={f.label} checked={!!val} onChange={(e) => set(e.target.checked)} />
                {f.hint ? <span className="hint">{f.hint}</span> : null}
              </div>
            );
          }
          return (
            <Field key={f.key} label={f.label} required={f.required} error={errors[f.key]} hint={f.hint} full={full}>
              {f.type === 'textarea' ? (
                <Textarea rows={f.rows ?? 3} value={String(val ?? '')} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} />
              ) : f.type === 'select' ? (
                <Select value={String(val ?? '')} onChange={(e) => set(e.target.value)}>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <>
                  <Input
                    type={f.type ?? 'text'}
                    value={String(val ?? '')}
                    onChange={(e) => set(e.target.value)}
                    placeholder={f.placeholder}
                    list={f.list ? `dl-${f.key}` : undefined}
                    invalid={!!errors[f.key]}
                  />
                  {f.list ? (
                    <datalist id={`dl-${f.key}`}>
                      {f.list.map((x) => (
                        <option key={x} value={x} />
                      ))}
                    </datalist>
                  ) : null}
                </>
              )}
            </Field>
          );
        })}
      </div>
    </Modal>
  );
}

/** Texto multilínea ↔ lista (una por línea). */
export const toLines = (t: FormValue | undefined) =>
  String(t ?? '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
