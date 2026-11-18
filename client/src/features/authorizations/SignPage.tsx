import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Download, PenLine, Plus, Trash2 } from 'lucide-react';
import {
  AUTH_ACTIVITY_LABELS,
  AUTH_ACTIVITY_TYPES,
  AUTH_KIND_ANNUAL,
  AUTH_KIND_LABELS,
  AUTH_KINDS,
  buildAuthorizationText,
  formatDate,
  MIN_SIGNATURE_POINTS,
  signaturePoints,
  SIGNER_ROLES,
  type AuthKind,
  type AuthorizationContent,
  type SignatureData,
} from '@shared';
import { api, ApiError, qs } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, Card, Checkbox, Empty, ErrorBox, Field, Input, Loading, PageHeader, Select } from '../../components/ui';
import { AuthorizationPaper } from './AuthorizationPaper';
import { SignaturePad } from './SignaturePad';
import type { Prefill } from './types';

interface Form {
  locality: string;
  department: string;
  province: string;
  signerName: string;
  role: string;
  nationality: string;
  birthDate: string;
  dni: string;
  phone: string;
  address: string;
  minorNationality: string;
  minorAddress: string;
  sameAddress: boolean;
  range: string;
  custodyNotes: string;
  details: string;
  actType: string;
  actStart: string;
  actEnd: string;
  actPlace: string;
}
interface Pickup {
  name: string;
  dni: string;
  relationship: string;
  phone: string;
}
const EMPTY_PICKUP: Pickup = { name: '', dni: '', relationship: '', phone: '' };
// Campo del servidor → campo del formulario (para mostrar el error donde corresponde)
const SERVER_FIELDS: Record<string, keyof Form> = {
  'place.locality': 'locality',
  'signer.name': 'signerName',
  'signer.role': 'role',
  'signer.nationality': 'nationality',
  'signer.birthDate': 'birthDate',
  'signer.dni': 'dni',
  'signer.phone': 'phone',
  'signer.address': 'address',
  'minor.nationality': 'minorNationality',
  'minor.address': 'minorAddress',
  range: 'range',
  custodyNotes: 'custodyNotes',
  details: 'details',
  'activity.startDate': 'actStart',
  'activity.endDate': 'actEnd',
  'activity.place': 'actPlace',
};
const REQ = { required: 'Completá este dato' };

/**
 * Firma de una autorización en persona: el educador completa (o revisa) los datos con la madre, el padre o el
 * tutor, le pasa el dispositivo, y la persona lee la planilla y firma con el dedo.
 */
export function SignPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const kind = (params.get('kind') ?? '') as AuthKind;
  const memberId = params.get('memberId') ?? '';
  const campId = params.get('campId') ?? '';
  const [year, setYear] = useState(Number(params.get('year')) || new Date().getFullYear());
  const valid = AUTH_KINDS.includes(kind) && !!memberId;

  const q = useQuery({
    queryKey: ['auth-prefill', kind, memberId, campId, year],
    queryFn: () => api.get<Prefill>(`/authorizations/prefill${qs({ kind, memberId, campId, year })}`),
    enabled: valid,
  });
  const p = q.data;

  const { register, handleSubmit, reset, setValue, watch, getValues, setError, formState } = useForm<Form>({
    defaultValues: { locality: '', department: '', province: '', signerName: '', role: 'madre', nationality: 'argentina', birthDate: '', dni: '', phone: '', address: '', minorNationality: 'argentina', minorAddress: '', sameAddress: true, range: '', custodyNotes: '', details: '', actType: 'salida', actStart: '', actEnd: '', actPlace: '' },
  });
  // Salida o campamento que no está cargado en la app: el lugar y las fechas se completan acá
  const manualActivity = kind === 'campamento' && !campId;
  const [pickups, setPickups] = useState<Pickup[]>([{ ...EMPTY_PICKUP }]);
  const [pickupError, setPickupError] = useState('');
  const e = formState.errors;
  const [step, setStep] = useState<'datos' | 'firma'>('datos');
  const [signature, setSignature] = useState<SignatureData | null>(null);
  const [custodySignature, setCustodySignature] = useState<SignatureData | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  // Datos ya conocidos: lo que declaró la última vez o el responsable cargado en la ficha
  const [loadedFor, setLoadedFor] = useState('');
  useEffect(() => {
    if (!p || loadedFor === p.member.id) return;
    setLoadedFor(p.member.id);
    const g = p.guardians[0];
    const s = p.last?.signer;
    const address = s?.address ?? g?.address ?? '';
    const minorAddress = p.last?.minor.address ?? p.member.address ?? '';
    reset({
      locality: p.last?.place.locality ?? p.group.locality,
      department: p.last?.place.department ?? '',
      province: p.last?.place.province ?? '',
      signerName: s?.name ?? g?.name ?? '',
      role: s?.role ?? (SIGNER_ROLES as readonly string[]).find((r) => r === g?.relationship) ?? 'madre',
      nationality: s?.nationality ?? 'argentina',
      birthDate: s?.birthDate ?? '',
      dni: s?.dni ?? (g?.dni ?? '').replace(/\D/g, ''),
      phone: s?.phone ?? g?.phone ?? '',
      address,
      minorNationality: p.last?.minor.nationality ?? 'argentina',
      minorAddress,
      sameAddress: !minorAddress || minorAddress === address,
      range: p.last?.range ?? '5 km',
      custodyNotes: '',
      details: '',
      actType: 'salida',
      actStart: p.today,
      actEnd: p.today,
      actPlace: '',
    });
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps

  const v = watch();
  const content: AuthorizationContent | null = useMemo(() => {
    if (!p) return null;
    return {
      kind,
      date: p.today,
      year: p.year,
      place: { locality: v.locality, department: v.department || null, province: v.province || null },
      signer: { name: v.signerName, nationality: v.nationality, birthDate: v.birthDate, dni: (v.dni ?? '').replace(/\D/g, ''), phone: v.phone, address: v.address, role: v.role },
      minor: { name: `${p.member.firstName} ${p.member.lastName}`, nationality: v.minorNationality, birthDate: p.member.birthDate, dni: (p.member.dni ?? '').replace(/\D/g, '') || null, address: v.sameAddress ? v.address : v.minorAddress },
      group: p.group,
      camp: p.camp ?? (manualActivity ? { name: '', type: v.actType, startDate: v.actStart, endDate: v.actEnd || v.actStart, place: v.actPlace } : null),
      range: kind === 'salidas_cercanas' ? v.range : null,
      custodyNotes: kind === 'ingreso' ? v.custodyNotes || null : null,
      pickups: kind === 'retiro_terceros' ? pickups.filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim(), dni: x.dni.replace(/\D/g, ''), relationship: x.relationship.trim() || null, phone: x.phone.trim() || null })) : null,
      details: kind === 'retiro_solo' ? v.details || null : null,
    };
  }, [p, kind, JSON.stringify(v), JSON.stringify(pickups)]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!valid) return <Empty>Falta elegir la autorización y el protagonista. Entrá desde la ficha del protagonista o desde el legajo del campamento.</Empty>;
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  if (!p || !content) return null;

  const kidName = `${p.member.firstName} ${p.member.lastName}`;
  const needsCustody = kind === 'ingreso' && !!v.custodyNotes?.trim();
  const signed = signaturePoints(signature) >= MIN_SIGNATURE_POINTS && (!needsCustody || signaturePoints(custodySignature) >= MIN_SIGNATURE_POINTS);

  const toSign = handleSubmit(() => {
    if (kind === 'retiro_terceros') {
      const filled = pickups.filter((x) => x.name.trim() || x.dni.trim());
      const bad = filled.find((x) => !x.name.trim() || !/^\d{6,9}$/.test(x.dni.replace(/\D/g, '')));
      if (!filled.length || bad) {
        setPickupError(!filled.length ? 'Cargá al menos una persona autorizada' : 'Cada persona autorizada lleva nombre y DNI');
        return;
      }
      setPickupError('');
    }
    setStep('firma');
    window.scrollTo({ top: 0 });
  });

  const submit = async () => {
    setBusy(true);
    try {
      const f = getValues();
      const r = await api.post<{ id: string }>('/authorizations', {
        kind,
        memberId,
        campId: campId || null,
        year: p.year,
        place: { locality: f.locality, department: f.department, province: f.province },
        signer: { name: f.signerName, nationality: f.nationality, birthDate: f.birthDate, dni: f.dni, phone: f.phone, address: f.address, role: f.role },
        minor: { nationality: f.minorNationality, address: f.sameAddress ? f.address : f.minorAddress },
        activity: manualActivity ? { type: f.actType, startDate: f.actStart, endDate: f.actEnd || f.actStart, place: f.actPlace } : null,
        range: kind === 'salidas_cercanas' ? f.range : null,
        custodyNotes: kind === 'ingreso' ? f.custodyNotes : null,
        pickups: kind === 'retiro_terceros' ? content.pickups : null,
        details: kind === 'retiro_solo' ? f.details : null,
        signature,
        custodySignature: needsCustody ? custodySignature : null,
        accepted,
      });
      await Promise.all(['authorizations', 'member', 'members', 'doc-board', 'camp'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      toast.ok('Autorización firmada');
      navigate(`/autorizaciones/${r.id}?nueva=1`, { replace: true });
    } catch (err) {
      // Si el error es de un dato, se vuelve al paso de los datos con el campo marcado
      if (err instanceof ApiError && err.details) {
        let fieldError = false;
        for (const [k, msg] of Object.entries(err.details)) {
          const field = SERVER_FIELDS[k];
          if (field) {
            setError(field, { type: 'server', message: msg });
            fieldError = true;
          }
        }
        if (fieldError) setStep('datos');
        toast.error(fieldError ? 'Revisá los datos marcados' : Object.values(err.details)[0] ?? err);
      } else toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const known = [
    ...(p.last ? [{ label: p.last.signer.name, apply: () => (['name', 'nationality', 'birthDate', 'dni', 'phone', 'address', 'role'] as const).forEach((k) => setValue(k === 'name' ? 'signerName' : k, p.last!.signer[k])) }] : []),
    ...p.guardians
      .filter((g) => g.name !== p.last?.signer.name)
      .map((g) => ({
        label: g.name,
        apply: () => {
          setValue('signerName', g.name);
          setValue('dni', (g.dni ?? '').replace(/\D/g, ''));
          setValue('phone', g.phone ?? '');
          setValue('address', g.address ?? '');
          const role = (SIGNER_ROLES as readonly string[]).find((r) => r === g.relationship);
          if (role) setValue('role', role);
        },
      })),
  ];

  return (
    <div className="auth-wrap">
      <PageHeader
        title={AUTH_KIND_LABELS[kind]}
        sub={
          <>
            {kidName}
            {p.member.unit ? ` · ${p.member.unit.name}` : ''}
            {p.camp ? ` · ${p.camp.name}` : AUTH_KIND_ANNUAL[kind] ? ` · año ${p.year}` : ''}
          </>
        }
      />
      <div className="auth-toolbar no-print">
        <Button variant="secondary" onClick={() => (step === 'firma' ? setStep('datos') : navigate(-1))}>
          <ArrowLeft /> {step === 'firma' ? 'Volver a los datos' : 'Volver'}
        </Button>
        <div className="auth-steps">
          <span className={`auth-step ${step === 'datos' ? 'on' : ''}`}>1 · Datos</span>
          <span className={`auth-step ${step === 'firma' ? 'on' : ''}`}>2 · Leer y firmar</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          title="Baja la planilla en PDF con lo que la app ya sabe, para imprimirla y firmarla en papel"
          onClick={() => api.download(`/authorizations/blank-pdf${qs({ kind, memberId, campId, year: p.year })}`, `${AUTH_KIND_LABELS[kind]} - ${kidName} (para firmar).pdf`).catch(toast.error)}
        >
          <Download /> Bajar para firmar en papel
        </Button>
      </div>

      {p.existing.length ? (
        <div className="alert alert-info">
          Ya hay una autorización vigente de este tipo, firmada por {p.existing[0].signerName} el {formatDate(p.existing[0].signedAt.slice(0, 10))} (
          <Link to={`/autorizaciones/${p.existing[0].id}`}>verla</Link>). Podés hacer firmar otra, por ejemplo al otro progenitor.
        </div>
      ) : null}

      {step === 'datos' ? (
        <form onSubmit={toSign} noValidate className="stack">
          <Card title="Quién firma">
            <p className="muted" style={{ marginTop: 0 }}>
              Completalo con la madre, el padre o el tutor delante, tal como figura en su DNI. Queda guardado en la ficha para la próxima vez.
            </p>
            {known.length ? (
              <div className="row" style={{ marginBottom: 12 }}>
                <span className="muted">Usar los datos de:</span>
                {known.map((k) => (
                  <Button key={k.label} type="button" size="sm" variant="secondary" onClick={k.apply}>
                    {k.label}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="form-grid">
              <Field label="Nombre y apellido completo" required full error={e.signerName?.message} hint="Como figura en el DNI">
                <Input {...register('signerName', REQ)} invalid={!!e.signerName} autoComplete="off" />
              </Field>
              <Field label="Firma en carácter de" required error={e.role?.message}>
                <Select {...register('role', REQ)}>
                  {SIGNER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="DNI" required error={e.dni?.message}>
                <Input inputMode="numeric" {...register('dni', { ...REQ, validate: (x) => /^\d{6,9}$/.test(x.replace(/\D/g, '')) || 'Revisá el DNI' })} invalid={!!e.dni} autoComplete="off" />
              </Field>
              <Field label="Nacionalidad" required error={e.nationality?.message}>
                <Input {...register('nationality', REQ)} invalid={!!e.nationality} />
              </Field>
              <Field label="Fecha de nacimiento" required error={e.birthDate?.message}>
                <Input type="date" {...register('birthDate', REQ)} invalid={!!e.birthDate} />
              </Field>
              <Field label="Teléfono" required error={e.phone?.message}>
                <Input inputMode="tel" {...register('phone', REQ)} invalid={!!e.phone} autoComplete="off" />
              </Field>
              <Field label="Domicilio" required full error={e.address?.message} hint="Calle y número, ciudad, provincia">
                <Input {...register('address', REQ)} invalid={!!e.address} autoComplete="off" />
              </Field>
            </div>
          </Card>

          <Card title={`Datos de ${p.member.firstName}`}>
            <p style={{ marginTop: 0 }}>
              <b>{kidName}</b> · DNI {p.member.dni ?? '—'} · nació el {formatDate(p.member.birthDate) || '—'}
            </p>
            <div className="form-grid">
              <Field label="Nacionalidad" required error={e.minorNationality?.message}>
                <Input {...register('minorNationality', REQ)} invalid={!!e.minorNationality} />
              </Field>
              <Field label=" ">
                <Checkbox label="Vive en el mismo domicilio que quien firma" {...register('sameAddress')} />
              </Field>
              {!v.sameAddress ? (
                <Field label="Domicilio del protagonista" required full error={e.minorAddress?.message}>
                  <Input {...register('minorAddress', { validate: (x) => getValues('sameAddress') || !!x.trim() || 'Completá este dato' })} invalid={!!e.minorAddress} autoComplete="off" />
                </Field>
              ) : null}
            </div>
          </Card>

          <Card title="La autorización">
            <div className="form-grid">
              {kind === 'campamento' && (p.campOptions.length || campId) ? (
                <Field
                  label="Campamento o salida"
                  full
                  hint={campId ? 'Sale con el tipo, las fechas y el lugar cargados en el campamento.' : 'Si ya está cargado en la app, elegilo y se completa solo. Si no, completá los datos a mano.'}
                >
                  <Select
                    value={campId}
                    onChange={(ev) => {
                      const next = new URLSearchParams(params);
                      if (ev.target.value) next.set('campId', ev.target.value);
                      else next.delete('campId');
                      setParams(next, { replace: true });
                    }}
                  >
                    <option value="">No está cargado: completar a mano</option>
                    {p.campOptions.map((c) => (
                      <option key={c.id} value={c.id} disabled={!c.enrolled}>
                        {c.name} · {formatDate(c.startDate)}
                        {c.endDate !== c.startDate ? ` al ${formatDate(c.endDate)}` : ''}
                        {c.enrolled ? '' : ` (${p.member.firstName} no está inscripto)`}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              {kind === 'campamento' && p.campOptions.some((c) => !c.enrolled) && !campId ? (
                <p className="full muted" style={{ margin: 0 }}>
                  Los campamentos donde {p.member.firstName} no está inscripto aparecen en gris: primero inscribilo desde el campamento (pestaña «Inscripción y legajo»).
                </p>
              ) : null}
              {p.camp ? (
                <p className="full" style={{ margin: 0 }}>
                  <b>{p.camp.name}</b> · del {formatDate(p.camp.startDate)} al {formatDate(p.camp.endDate)} · {p.camp.place || <span className="muted">sin lugar cargado: completalo en el campamento</span>}
                </p>
              ) : null}
              {AUTH_KIND_ANNUAL[kind] ? (
                <Field label="Año" hint="Vale por ese año">
                  <Select value={year} onChange={(ev) => setYear(Number(ev.target.value))}>
                    {[new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              {kind === 'salidas_cercanas' ? (
                <Field label="Hasta qué distancia de la sede" required error={e.range?.message} hint="«En un rango no mayor a…»">
                  <Input {...register('range', REQ)} invalid={!!e.range} placeholder="5 km" />
                </Field>
              ) : null}
              {manualActivity ? (
                <>
                  <Field label="Qué es" required>
                    <Select {...register('actType')}>
                      {AUTH_ACTIVITY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {AUTH_ACTIVITY_LABELS[t]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Lugar" required full error={e.actPlace?.message} hint="Nombre del lugar y dirección">
                    <Input {...register('actPlace', REQ)} invalid={!!e.actPlace} autoComplete="off" />
                  </Field>
                  <Field label="Desde el día" required error={e.actStart?.message}>
                    <Input type="date" {...register('actStart', REQ)} invalid={!!e.actStart} />
                  </Field>
                  <Field label="Hasta el día" required error={e.actEnd?.message} hint="Si es en el día, la misma fecha">
                    <Input type="date" {...register('actEnd', { ...REQ, validate: (x) => x >= getValues('actStart') || 'No puede terminar antes de empezar' })} invalid={!!e.actEnd} />
                  </Field>
                </>
              ) : null}
              {kind === 'retiro_solo' ? (
                <Field label="Aclaraciones (opcional)" full error={e.details?.message} hint="Por ejemplo: solo los sábados de reunión; hasta su casa, a dos cuadras">
                  <Input {...register('details')} autoComplete="off" />
                </Field>
              ) : null}
              {kind === 'retiro_terceros' ? (
                <div className="full stack">
                  <p style={{ margin: 0 }}>
                    <b>Personas adultas autorizadas a retirarlo/a</b> <span className="muted">(hasta 5)</span>
                  </p>
                  {pickups.map((x, i) => {
                    const set = (k: keyof Pickup, val: string) => setPickups((list) => list.map((y, j) => (j === i ? { ...y, [k]: val } : y)));
                    return (
                      <div key={i} className="auth-pickup">
                        <Field label="Nombre y apellido">
                          <Input value={x.name} onChange={(ev) => set('name', ev.target.value)} autoComplete="off" />
                        </Field>
                        <Field label="DNI">
                          <Input inputMode="numeric" value={x.dni} onChange={(ev) => set('dni', ev.target.value)} autoComplete="off" />
                        </Field>
                        <Field label="Vínculo">
                          <Input value={x.relationship} onChange={(ev) => set('relationship', ev.target.value)} placeholder="abuela, tío…" autoComplete="off" />
                        </Field>
                        <Field label="Teléfono">
                          <Input inputMode="tel" value={x.phone} onChange={(ev) => set('phone', ev.target.value)} autoComplete="off" />
                        </Field>
                        <Button type="button" variant="ghost" size="sm" aria-label="Quitar" disabled={pickups.length === 1} onClick={() => setPickups((list) => list.filter((_, j) => j !== i))}>
                          <Trash2 />
                        </Button>
                      </div>
                    );
                  })}
                  {pickupError ? <p className="field-error" style={{ margin: 0, color: 'var(--danger)' }}>{pickupError}</p> : null}
                  {pickups.length < 5 ? (
                    <div>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setPickups((list) => [...list, { ...EMPTY_PICKUP }])}>
                        <Plus /> Agregar otra persona
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {kind === 'ingreso' ? (
                <Field label="Aclaraciones sobre la tenencia o guarda (si corresponde)" full error={e.custodyNotes?.message} hint="Solo si hay guarda, tenencia judicial o tutela. Lleva una segunda firma.">
                  <Input {...register('custodyNotes')} autoComplete="off" />
                </Field>
              ) : null}
              <Field label="Se firma en la localidad de" required error={e.locality?.message}>
                <Input {...register('locality', REQ)} invalid={!!e.locality} />
              </Field>
              <Field label="Partido / departamento">
                <Input {...register('department')} />
              </Field>
              <Field label="Provincia">
                <Input {...register('province')} />
              </Field>
            </div>
          </Card>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="submit">
              Seguir: leer y firmar <ArrowRight />
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="alert alert-info no-print">
            Pasale el dispositivo a <b>{v.signerName || 'quien firma'}</b> para que lea la autorización y firme. Lo hace delante tuyo ({p.attendedBy.name}): queda registrado quién presenció la firma.
          </div>
          <AuthorizationPaper content={content} text={buildAuthorizationText(content)} />
          <Card title="Firma">
            <div className="stack">
              <SignaturePad value={signature} onChange={setSignature} />
              {needsCustody ? (
                <>
                  <p style={{ margin: 0 }}>
                    Segunda firma, por la aclaración sobre la tenencia o guarda: «{v.custodyNotes}»
                  </p>
                  <SignaturePad value={custodySignature} onChange={setCustodySignature} label="Firmá de nuevo acá" />
                </>
              ) : null}
              <label className="auth-check">
                <input type="checkbox" checked={accepted} onChange={(ev) => setAccepted(ev.target.checked)} />
                <span>
                  Soy <b>{v.signerName}</b>, DNI {v.dni}. Leí la autorización, los datos son correctos y autorizo a <b>{kidName}</b>.
                </span>
              </label>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <Button onClick={submit} loading={busy} disabled={!signed || !accepted}>
                  <PenLine /> Firmar la autorización
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
