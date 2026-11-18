import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  affiliationSchema,
  AFFILIATION_STATUS_LABELS,
  AFFILIATION_STATUSES,
  guardianSchema,
  todayIso,
  transferSchema,
  TRANSFER_REASON_LABELS,
  TRANSFER_REASONS,
  type AffiliationInput,
  type GuardianInput,
  type TransferInput,
} from '@shared';
import { api, errorMessage, qs } from '../../lib/api';
import { applyServerErrors, toFormValues } from '../../lib/forms';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { Guardian, MemberDetail, MemberDoc } from '../../lib/types';
import { Button, Checkbox, Field, Input, Modal, Select, Textarea } from '../../components/ui';

// ---------- Responsable ----------
export function GuardianDialog({ memberId, guardian, onClose, onSaved }: { memberId: string; guardian?: Guardian; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const { register, handleSubmit, formState, setError } = useForm<GuardianInput>({
    resolver: zodResolver(guardianSchema),
    defaultValues: guardian
      ? (toFormValues({ name: guardian.name, relationship: guardian.relationship, dni: guardian.dni, phone: guardian.phone, email: guardian.email, address: guardian.address }) as GuardianInput)
      : { name: '', relationship: '', dni: '', phone: '', email: '', address: '' },
  });
  const e = formState.errors;

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (guardian) await api.put(`/members/${memberId}/guardians/${guardian.linkId}`, values);
      else await api.post(`/members/${memberId}/guardians`, values);
      toast.ok('Responsable guardado');
      onSaved();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err));
    }
  });

  return (
    <Modal
      title={guardian ? 'Editar responsable' : 'Agregar responsable'}
      onClose={onClose}
      footer={
        mode === 'new' ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button loading={formState.isSubmitting} onClick={onSubmit}>
              Guardar
            </Button>
          </>
        ) : null
      }
    >
      {!guardian ? (
        <div className="segmented mb">
          <button className={mode === 'new' ? 'on-presente' : ''} onClick={() => setMode('new')}>
            Nuevo
          </button>
          <button className={mode === 'existing' ? 'on-presente' : ''} onClick={() => setMode('existing')}>
            Ya cargado (hermanos)
          </button>
        </div>
      ) : null}
      {mode === 'existing' && !guardian ? (
        <LinkExistingGuardian memberId={memberId} onDone={() => (onSaved(), onClose())} />
      ) : (
        <form onSubmit={onSubmit} noValidate>
          {guardian ? (
            <div className="alert alert-info mb">Si este responsable está vinculado a hermanos, el cambio se ve en todas sus fichas.</div>
          ) : null}
          <div className="form-grid">
            <Field label="Nombre y apellido" required error={e.name?.message} full>
              <Input {...register('name')} invalid={!!e.name} autoFocus />
            </Field>
            <Field label="Vínculo" hint="Madre, padre, tutor/a, abuela…">
              <Input {...register('relationship')} />
            </Field>
            <Field label="DNI" error={e.dni?.message}>
              <Input {...register('dni')} invalid={!!e.dni} />
            </Field>
            <Field label="Teléfono">
              <Input type="tel" {...register('phone')} />
            </Field>
            <Field label="Email" error={e.email?.message}>
              <Input type="email" {...register('email')} invalid={!!e.email} />
            </Field>
            <Field label="Dirección" full>
              <Input {...register('address')} />
            </Field>
          </div>
        </form>
      )}
    </Modal>
  );
}

function LinkExistingGuardian({ memberId, onDone }: { memberId: string; onDone: () => void }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [relationship, setRelationship] = useState('');
  const results = useQuery({
    queryKey: ['guardian-search', q],
    queryFn: () =>
      api.get<{ id: string; name: string; dni: string | null; phone: string | null; members: string[] }[]>(`/members/guardians/search${qs({ q })}`),
    enabled: q.trim().length >= 3,
  });
  return (
    <div className="stack">
      <Field label="Buscar por nombre o DNI" hint="Escribí al menos 3 letras">
        <Input value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </Field>
      <Field label="Vínculo con este protagonista">
        <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Madre, padre…" />
      </Field>
      <ul className="list-plain">
        {results.data?.map((g) => (
          <li key={g.id} className="row between">
            <div>
              <strong>{g.name}</strong> {g.dni ? <span className="muted">· DNI {g.dni}</span> : null}
              <div className="muted">Responsable de: {g.members.join(', ') || '—'}</div>
            </div>
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await api.post(`/members/${memberId}/guardians/link`, { guardianId: g.id, relationship });
                  toast.ok('Responsable vinculado');
                  onDone();
                } catch (e) {
                  toast.error(e);
                }
              }}
            >
              Vincular
            </Button>
          </li>
        ))}
        {q.trim().length >= 3 && results.data && !results.data.length ? <li className="muted">Sin resultados.</li> : null}
      </ul>
    </div>
  );
}

// ---------- Documento ----------
export function DocumentDialog({
  memberId,
  memberName,
  doc,
  onClose,
  onSaved,
}: {
  memberId: string;
  memberName?: string;
  doc: Pick<MemberDoc, 'documentTypeId' | 'name' | 'hasExpiry' | 'presented' | 'presentedAt' | 'expiresAt' | 'notes'> & Partial<Pick<MemberDoc, 'notApplicable' | 'required'>>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [presented, setPresented] = useState(doc.presented);
  const [notApplicable, setNotApplicable] = useState(!!doc.notApplicable);
  const [presentedAt, setPresentedAt] = useState(doc.presentedAt ?? todayIso());
  const [expiresAt, setExpiresAt] = useState(doc.expiresAt ?? (doc.hasExpiry ? `${new Date().getFullYear()}-12-31` : ''));
  const [notes, setNotes] = useState(doc.notes ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/members/${memberId}/documents`, { documentTypeId: doc.documentTypeId, presented, notApplicable: !presented && notApplicable, presentedAt, expiresAt, notes });
      toast.ok('Documentación actualizada');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={doc.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={busy} onClick={save}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="stack">
        {memberName ? <p style={{ margin: 0 }}>{memberName}</p> : null}
        <Checkbox label="Presentado" checked={presented} onChange={(e) => setPresented(e.target.checked)} />
        {presented ? (
          <div className="form-grid">
            <Field label="Fecha de entrega">
              <Input type="date" value={presentedAt} onChange={(e) => setPresentedAt(e.target.value)} />
            </Field>
            {doc.hasExpiry ? (
              <Field label="Vence el">
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </Field>
            ) : null}
          </div>
        ) : (
          <Checkbox
            label="No corresponde (por ejemplo, no tiene obra social): no cuenta como faltante"
            checked={notApplicable}
            onChange={(e) => setNotApplicable(e.target.checked)}
          />
        )}
        {doc.required === false ? <p className="muted" style={{ margin: 0 }}>Es un documento opcional: si no se presenta, no figura como faltante.</p> : null}
        <Field label="Notas" hint="No escribas datos de salud.">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

// ---------- Pase de unidad ----------
export function TransferDialog({ member, onClose, onSaved }: { member: MemberDetail; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const units = useUnits();
  const { register, handleSubmit, formState, watch, setError, setValue } = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: { toUnitId: '', toSmallGroupId: '', date: todayIso(), reason: 'edad', notes: '' },
  });
  const e = formState.errors;
  const target = units.data?.find((u) => u.id === watch('toUnitId'));
  // Motivo sugerido: si cambia de rama, por edad; si es la misma rama, por elección
  useEffect(() => {
    if (target && member.unit) setValue('reason', target.branch !== member.unit.branch ? 'edad' : 'eleccion');
  }, [target, member.unit, setValue]);
  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.post(`/members/${member.id}/transfer`, values);
      toast.ok('Pase registrado');
      onSaved();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err));
    }
  });
  return (
    <Modal
      title="Pase de unidad"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={formState.isSubmitting} onClick={onSubmit}>
            Registrar pase
          </Button>
        </>
      }
    >
      <p>
        <strong>
          {member.firstName} {member.lastName}
        </strong>{' '}
        pasa de <strong>{member.unit?.name ?? 'sin unidad'}</strong> a:
      </p>
      <div className="form-grid">
        <Field label="Nueva unidad" required error={e.toUnitId?.message} full>
          <Select {...register('toUnitId')} invalid={!!e.toUnitId}>
            <option value="">Elegí una unidad</option>
            {units.data
              ?.filter((u) => u.id !== member.unitId && u.active)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Pequeño grupo" error={e.toSmallGroupId?.message}>
          <Select {...register('toSmallGroupId')} disabled={!target}>
            <option value="">Sin asignar</option>
            {target?.smallGroups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha del pase" required error={e.date?.message}>
          <Input type="date" {...register('date')} invalid={!!e.date} />
        </Field>
        <Field label="Motivo" error={e.reason?.message} full>
          <Select {...register('reason')}>
            {TRANSFER_REASONS.map((r) => (
              <option key={r} value={r}>
                {TRANSFER_REASON_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notas" full>
          <Textarea {...register('notes')} />
        </Field>
      </div>
    </Modal>
  );
}

// ---------- Afiliación ----------
export function AffiliationDialog({
  memberId,
  initial,
  onClose,
  onSaved,
}: {
  memberId: string;
  initial?: { year: number; status: string; date: string | null; notes: string | null };
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { register, handleSubmit, formState } = useForm<AffiliationInput>({
    resolver: zodResolver(affiliationSchema),
    defaultValues: initial
      ? (toFormValues({ ...initial, status: initial.status as AffiliationInput['status'] }) as AffiliationInput)
      : { year: new Date().getFullYear(), status: 'pendiente', date: '', notes: '' },
  });
  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.put(`/members/${memberId}/affiliations`, values);
      toast.ok('Afiliación guardada');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err);
    }
  });
  return (
    <Modal
      title="Afiliación a SAAC"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={formState.isSubmitting} onClick={onSubmit}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Año" error={formState.errors.year?.message}>
          <Input type="number" {...register('year')} disabled={!!initial} />
        </Field>
        <Field label="Estado">
          <Select {...register('status')}>
            {AFFILIATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {AFFILIATION_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha">
          <Input type="date" {...register('date')} />
        </Field>
        <Field label="Notas">
          <Input {...register('notes')} />
        </Field>
      </div>
    </Modal>
  );
}
