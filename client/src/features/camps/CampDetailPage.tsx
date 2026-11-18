import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Download, FileSignature, Pencil, Printer, RotateCcw, Trash2, UserPlus, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CAMP_STATUS_LABELS,
  CAMP_STATUSES,
  CAMP_TYPE_LABELS,
  CHARGE_STATUS_LABELS,
  DOC_STATUS_LABELS,
  enrollmentSchema,
  formatDate,
  formatMoney,
} from '@shared';
import { api } from '../../lib/api';
import { applyServerErrors } from '../../lib/forms';
import { adultName, useAdults } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { useAuth } from '../../lib/auth';
import { Badge, Button, Card, Checkbox, ConfirmButton, DocDot, Empty, ErrorBox, Field, Input, LinkButton, Loading, Modal, PageHeader, Tabs, UnitBadge } from '../../components/ui';
import type { MemberListItem } from '../../lib/types';
import { Money, Stat } from '../accounting/common';
import { CAMP_STATUS_TONE, CampDialog, campDates } from './CampsPage';
import { BudgetRenderTab, LogisticsTab } from './CampTabs';
import { CampProgramTab } from './CampProgramTab';
import { Stars } from './CampSitesPage';
import type { CampDetail, LegajoRow } from './types';
import '../accounting/accounting.css';
import './camps.css';

type Tab = 'datos' | 'programa' | 'legajo' | 'presupuesto' | 'logistica';

export function CampDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  // ?tab=legajo abre directo el legajo (se usa al volver de firmar una autorización)
  const [search] = useSearchParams();
  const [tab, setTab] = useState<Tab>((search.get('tab') as Tab) || 'datos');
  const [editing, setEditing] = useState(false);
  const q = useQuery({ queryKey: ['camp', id], queryFn: () => api.get<CampDetail>(`/camps/${id}`) });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const c = q.data!;
  const step = CAMP_STATUSES.indexOf(c.status);
  const post = async (path: string, msg: string) => {
    try {
      await api.post(`/camps/${c.id}/${path}`, {});
      toast.ok(msg);
      await q.refetch();
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <>
      <PageHeader
        title={c.name}
        crumbs={[{ to: '/campamentos', label: 'Campamentos y salidas' }]}
        sub={
          <span>
            {CAMP_TYPE_LABELS[c.type]} · {campDates(c.startDate, c.endDate)} · {c.nights === 1 ? '1 noche' : `${c.nights} noches`}
            {c.site ? ` · ${c.site.name}` : c.place ? ` · ${c.place}` : ''}
          </span>
        }
        actions={
          <>
            {c.canApprove && c.status === 'borrador' ? (
              <ConfirmButton variant="gold" title="Aprobar campamento" message={`¿Aprobar «${c.name}»?`} confirmLabel="Aprobar" onConfirm={() => post('approve', 'Campamento aprobado')}>
                <CheckCircle2 /> Aprobar campamento
              </ConfirmButton>
            ) : null}
            {c.canApprove && c.status === 'aprobado' ? (
              <ConfirmButton variant="secondary" title="Volver a borrador" message="El campamento vuelve a borrador (sin aprobación)." confirmLabel="Volver a borrador" onConfirm={() => post('approve', 'Volvió a borrador')}>
                <RotateCcw /> Volver a borrador
              </ConfirmButton>
            ) : null}
            {c.canEdit && c.status === 'aprobado' ? (
              <ConfirmButton variant="primary" title="Marcar como realizado" message="¿El campamento ya se hizo? Después se carga la rendición." confirmLabel="Marcar realizado" onConfirm={() => post('done', 'Marcado como realizado')}>
                <CheckCircle2 /> Marcar como realizado
              </ConfirmButton>
            ) : null}
            {c.canEdit && c.status === 'realizado' ? (
              <ConfirmButton variant="secondary" title="Desmarcar realizado" message="Vuelve a «Aprobado»." confirmLabel="Desmarcar" onConfirm={() => post('done', 'Volvió a aprobado')}>
                <RotateCcw /> Desmarcar realizado
              </ConfirmButton>
            ) : null}
            {c.canEdit && c.status !== 'rendido' ? (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil /> Editar
              </Button>
            ) : null}
            {c.canDelete && c.status === 'borrador' ? (
              <ConfirmButton
                title="Eliminar campamento"
                message={`¿Eliminar «${c.name}»? Se anulan los cargos de inscripción sin pagos.`}
                confirmLabel="Eliminar"
                onConfirm={async () => {
                  try {
                    await api.del(`/camps/${c.id}`);
                    toast.ok('Campamento eliminado');
                    navigate('/campamentos');
                  } catch (e) {
                    toast.error(e);
                  }
                }}
              >
                <Trash2 />
              </ConfirmButton>
            ) : null}
          </>
        }
      />
      <div className="camp-status-steps mb" aria-label="Estado">
        {CAMP_STATUSES.map((s, i) => (
          <span key={s} className={`step ${i < step ? 'done' : i === step ? 'current' : ''}`}>
            {CAMP_STATUS_LABELS[s]}
          </span>
        ))}
      </div>
      <div className="no-print">
        <Tabs
          tabs={[
            { key: 'datos', label: 'Datos' },
            { key: 'programa', label: 'Programa y cronograma' },
            { key: 'legajo', label: `Inscripción y legajo (${c.legajo.length})` },
            { key: 'presupuesto', label: 'Presupuesto y rendición' },
            { key: 'logistica', label: 'Logística' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'datos' ? <DataTab c={c} /> : null}
      {tab === 'programa' ? <CampProgramTab c={c} /> : null}
      {tab === 'legajo' ? <LegajoTab c={c} refetch={q.refetch} /> : null}
      {tab === 'presupuesto' ? <BudgetRenderTab c={c} refetch={q.refetch} /> : null}
      {tab === 'logistica' ? <LogisticsTab c={c} refetch={q.refetch} /> : null}
      {editing ? <CampDialog camp={c} onClose={() => setEditing(false)} onSaved={() => q.refetch()} /> : null}
    </>
  );
}

function DataTab({ c }: { c: CampDetail }) {
  const t = c.totals;
  return (
    <div className="stack">
      <div className="acc-stats">
        <Stat label="Inscriptos" value={t.participants} hint={`${c.legajo.filter((l) => l.kind === 'protagonista').length} protagonistas · ${c.legajo.filter((l) => l.kind === 'adulto').length} adultos`} />
        <Stat label="Legajos incompletos" value={t.incomplete} tone={t.incomplete ? 'warn' : 'ok'} />
        <Stat label="Cobrado" value={formatMoney(t.collected)} hint={`de ${formatMoney(t.expectedIncome)} esperado`} />
        <Stat label="Resultado" value={formatMoney(t.resultado)} tone={t.resultado >= 0 ? 'ok' : 'danger'} hint={`Gastos ${formatMoney(t.realExpense)} · presup. ${formatMoney(t.planned)}`} />
      </div>
      <Card title="Datos del campamento">
        <dl className="dl">
          <dt>Estado</dt>
          <dd>
            <Badge tone={CAMP_STATUS_TONE[c.status]}>{CAMP_STATUS_LABELS[c.status]}</Badge>
            {c.approvedBy && c.approvedAt ? <span className="muted"> · aprobado por {c.approvedBy.name} el {formatDate(c.approvedAt.slice(0, 10))}</span> : null}
          </dd>
          <dt>Tipo</dt>
          <dd>{CAMP_TYPE_LABELS[c.type]}</dd>
          <dt>Fechas</dt>
          <dd>
            {campDates(c.startDate, c.endDate)} ({c.nights === 1 ? '1 noche' : `${c.nights} noches`})
          </dd>
          <dt>Organiza</dt>
          <dd>{c.ownerUnit ? <UnitBadge unit={c.ownerUnit} /> : <Badge tone="bordo">Grupo</Badge>}</dd>
          <dt>Unidades que participan</dt>
          <dd>
            <div className="row" style={{ gap: 4 }}>
              {c.units.length ? c.units.map((u) => <UnitBadge key={u.id} unit={u} short />) : '—'}
            </div>
          </dd>
          <dt>Lugar</dt>
          <dd>
            {c.site ? (
              <>
                <Link to="/campamentos/lugares">{c.site.name}</Link>
                {c.site.location ? ` · ${c.site.location}` : ''}
                {c.place ? <div className="muted">{c.place}</div> : null}
                {c.site.contact ? <div className="muted">Contacto: {c.site.contact}</div> : null}
              </>
            ) : (
              c.place ?? '—'
            )}
          </dd>
          <dt>Jefe/a de Campo</dt>
          <dd>
            {c.responsible ? <Link to={`/adultos/${c.responsible.id}`}>{adultName(c.responsible)}</Link> : <span className="muted">Sin elegir</span>}
            {c.responsibleWoodBadge === false ? (
              <div className="alert alert-warn" style={{ marginTop: 6 }}>
                No tiene registrada la Insignia de Madera en Programa, que es requisito para ser Jefe/a de Campo.
              </div>
            ) : null}
          </dd>
          <dt>Costo por protagonista</dt>
          <dd>{formatMoney(c.cost)}</dd>
          <dt>Descripción</dt>
          <dd style={{ whiteSpace: 'pre-wrap' }}>{c.description ?? '—'}</dd>
          {c.status === 'rendido' ? (
            <>
              <dt>Evaluación del lugar</dt>
              <dd>
                {c.siteRating ? <Stars value={c.siteRating} /> : '—'} {c.siteReview ?? ''}
              </dd>
            </>
          ) : null}
        </dl>
      </Card>
    </div>
  );
}

// ---------------- Inscripción y legajo ----------------
function Check({ ok, onClick, disabled, label }: { ok: boolean; onClick?: () => void; disabled?: boolean; label: string }) {
  const content = <span className={ok ? 'yes' : 'no'}>{ok ? '✓' : '✗'}</span>;
  if (!onClick || disabled) return <span aria-label={`${label}: ${ok ? 'sí' : 'no'}`}>{content}</span>;
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={onClick} aria-label={`${label}: ${ok ? 'sí' : 'no'} (cambiar)`} title="Clic para cambiar">
      {content}
    </button>
  );
}

const nameOf = (l: LegajoRow) => (l.member ? `${l.member.lastName}, ${l.member.firstName}` : l.adult ? `${l.adult.lastName}, ${l.adult.firstName}` : '—');

function LegajoTab({ c, refetch }: { c: CampDetail; refetch: () => unknown }) {
  const toast = useToast();
  const { can: canDo } = useAuth();
  // Autorizaciones del campamento en PDF: la firmada de cada chico o, si falta, la planilla ya completa para firmar en papel
  const canAuth = c.legajo.some((l) => l.member && canDo('member_documents', 'edit', l.member.unitId));
  const [pdfBusy, setPdfBusy] = useState('');
  const signedCount = c.legajo.filter((l) => l.signedAuthorization).length;
  const downloadAuth = async (l: LegajoRow) => {
    if (!l.signedAuthorization) return;
    try {
      await api.download(`/authorizations/${l.signedAuthorization.id}/pdf`, `Autorización - ${l.member?.lastName ?? ''} ${l.member?.firstName ?? ''}.pdf`);
    } catch (e) {
      toast.error(e);
    }
  };
  const authPdf = async (only: '' | 'faltan' | 'firmadas') => {
    setPdfBusy(only || 'todas');
    try {
      await api.download(`/authorizations/camp/${c.id}/pdf${only ? `?only=${only}` : ''}`, `Autorizaciones - ${c.name}.pdf`);
    } catch (e) {
      toast.error(e);
    } finally {
      setPdfBusy('');
    }
  };
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<LegajoRow | null>(null);
  const [filter, setFilter] = useState<'todos' | 'incompletos'>('todos');
  const editable = c.canEdit && c.status !== 'rendido';
  const rows = c.legajo.filter((l) => filter === 'todos' || !l.complete);
  const quick = async (l: LegajoRow, patch: Partial<Pick<LegajoRow, 'authorizationPresented' | 'dniPresented'>>) => {
    try {
      await api.put(`/camps/enrollments/${l.id}`, {
        cost: l.cost,
        discountPct: l.discountPct,
        authorizationPresented: l.authorizationPresented,
        authorizationDate: l.authorizationDate,
        dniPresented: l.dniPresented,
        notes: l.notes,
        ...patch,
        ...(patch.authorizationPresented && !l.authorizationDate ? { authorizationDate: new Date().toISOString().slice(0, 10) } : {}),
      });
      await refetch();
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <div className="stack">
      <div className="row between no-print">
        <div className="row">
          {editable ? (
            <>
              <ConfirmButton
                variant="primary"
                title="Inscribir a todos"
                message={`Se inscriben todos los protagonistas activos de ${c.units.length ? c.units.map((u) => u.name).join(', ') : 'las unidades participantes'}${
                  c.cost > 0 ? `, con un cargo de ${formatMoney(c.cost)} en su cuenta` : ''
                }. Los que ya están inscriptos no se duplican.`}
                confirmLabel="Inscribir"
                onConfirm={async () => {
                  try {
                    const r = await api.post<{ added: number }>(`/camps/${c.id}/enrollments`, { allFromUnits: true });
                    toast.ok(`Se inscribieron ${r.added}`);
                    await refetch();
                  } catch (e) {
                    toast.error(e);
                  }
                }}
              >
                <Users /> Inscribir a todos
              </ConfirmButton>
              <Button variant="secondary" onClick={() => setPicking(true)}>
                <UserPlus /> Elegir inscriptos
              </Button>
            </>
          ) : null}
          <label className="row muted" style={{ gap: 6 }}>
            <input type="checkbox" checked={filter === 'incompletos'} onChange={(e) => setFilter(e.target.checked ? 'incompletos' : 'todos')} /> Solo legajos incompletos
          </label>
          {canAuth && c.legajo.some((l) => l.member) ? (
            <>
              <Button
                variant="secondary"
                id="btn-camp-authorizations"
                loading={pdfBusy === 'todas'}
                title="Un PDF con la autorización de cada inscripto: la firmada o, si falta, la planilla ya completa con los datos del campamento"
                onClick={() => authPdf('')}
              >
                <Download /> Autorizaciones en PDF
              </Button>
              <Button variant="ghost" size="sm" loading={pdfBusy === 'faltan'} title="Solo las que faltan, con los datos del campamento ya completos, para imprimir y firmar en papel" onClick={() => authPdf('faltan')}>
                Solo las que faltan firmar
              </Button>
              {signedCount ? (
                <LinkButton to={`/autorizaciones?campId=${c.id}`} variant="secondary" size="sm">
                  <FileSignature /> Ver las {signedCount} firmadas
                </LinkButton>
              ) : null}
            </>
          ) : null}
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer /> Imprimir legajo
        </Button>
      </div>
      <h2 className="print-only">
        {c.name} · {campDates(c.startDate, c.endDate)} · Legajo
      </h2>
      <Card bodyClass="table-wrap">
        {!rows.length ? (
          <Empty>{c.legajo.length ? 'Todos los legajos están completos.' : 'Todavía no hay inscriptos.'}</Empty>
        ) : (
          <table className="table" id="camp-legajo">
            <thead>
              <tr>
                <th>Inscripto</th>
                <th className="check-cell">Autorización</th>
                <th className="check-cell">DNI</th>
                <th>Ficha médica</th>
                <th>Legajo</th>
                <th className="num">A pagar</th>
                <th>Pago</th>
                <th className="no-print" />
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td>
                    <span className="legajo-name">
                      {l.member ? <Link to={`/protagonistas/${l.member.id}`}>{nameOf(l)}</Link> : nameOf(l)}
                    </span>
                    <div className="muted">
                      {l.member ? (
                        <>
                          {l.member.unit?.name ?? 'Sin unidad'}
                          {l.member.smallGroup ? ` · ${l.member.smallGroup.name}` : ''}
                          {l.member.dni ? ` · DNI ${l.member.dni}` : ''}
                        </>
                      ) : (
                        <>Adulto{l.adult?.dni ? ` · DNI ${l.adult.dni}` : ''}</>
                      )}
                    </div>
                    {l.notes ? <div className="muted">{l.notes}</div> : null}
                  </td>
                  <td className="check-cell">
                    {l.kind === 'protagonista' ? (
                      <>
                        <Check ok={l.authorizationPresented} label="Autorización" disabled={!editable} onClick={() => quick(l, { authorizationPresented: !l.authorizationPresented })} />
                        {/* Firmada en la app: verla, bajarla y saber si le falta el aval */}
                        {l.signedAuthorization ? (
                          <div className="no-print camp-auth">
                            <Link to={`/autorizaciones/${l.signedAuthorization.id}`} title={`Firmó ${l.signedAuthorization.signerName} el ${formatDate(l.signedAuthorization.signedAt.slice(0, 10))}`}>
                              Ver
                            </Link>
                            {' · '}
                            <button type="button" className="link-btn" onClick={() => void downloadAuth(l)} title="Descargar en PDF">
                              PDF
                            </button>
                            {!l.signedAuthorization.hasAval ? <div className="camp-auth-warn">Falta el aval</div> : null}
                          </div>
                        ) : l.member && canDo('member_documents', 'edit', l.member.unitId) ? (
                          /* Firma en pantalla: la madre, el padre o el tutor firma con el dedo sobre la planilla de SAAC */
                          <div className="no-print">
                            <Link to={`/autorizaciones/firmar?kind=campamento&memberId=${l.member.id}&campId=${c.id}`} title="Hacer firmar la autorización en este dispositivo">
                              Firmar acá
                            </Link>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="check-cell">
                    <Check ok={l.dniPresented} label="DNI" disabled={!editable} onClick={() => quick(l, { dniPresented: !l.dniPresented })} />
                  </td>
                  <td className="nowrap">
                    {l.fichaMedica ? (
                      <span className="row" style={{ gap: 6 }}>
                        <DocDot status={l.fichaMedica} /> {DOC_STATUS_LABELS[l.fichaMedica]}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className="semaforo">
                      <span className={`dot ${l.complete ? 'ok' : 'bad'}`} /> {l.complete ? 'Completo' : 'Incompleto'}
                    </span>
                  </td>
                  <td className="num">
                    {l.kind === 'protagonista' ? (
                      <>
                        <Money value={l.net} />
                        {l.discountPct ? <div className="muted">−{l.discountPct}%</div> : null}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {l.charge ? (
                      <Badge tone={l.charge.status === 'pagado' ? 'ok' : l.charge.status === 'parcial' ? 'info' : l.charge.status === 'anulado' ? 'neutral' : 'warn'}>
                        {CHARGE_STATUS_LABELS[l.charge.status]}
                        {l.charge.status === 'parcial' ? ` ${formatMoney(l.charge.paid)}` : ''}
                      </Badge>
                    ) : l.kind === 'protagonista' ? (
                      <span className="muted">Sin cargo</span>
                    ) : null}
                  </td>
                  <td className="num nowrap no-print">
                    {editable ? (
                      <>
                        <Button variant="ghost" size="sm" aria-label="Editar inscripción" onClick={() => setEditing(l)}>
                          <Pencil />
                        </Button>
                        <ConfirmButton
                          variant="ghost"
                          size="sm"
                          title="Quitar inscripción"
                          message={`¿Quitar a ${nameOf(l)} del campamento? Si tiene el cargo sin pagar, se anula.`}
                          confirmLabel="Quitar"
                          onConfirm={async () => {
                            try {
                              await api.del(`/camps/enrollments/${l.id}`);
                              await refetch();
                            } catch (e) {
                              toast.error(e);
                            }
                          }}
                        >
                          <Trash2 />
                        </ConfirmButton>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="muted no-print">
        Legajo completo = autorización firmada + DNI + ficha médica vigente a la fecha de inicio (los adultos: DNI). La ficha médica se carga en la ficha del protagonista →
        Documentación. Los pagos del campamento se registran en la ficha del protagonista → Pagos.
      </p>
      {picking ? <EnrollPicker c={c} onClose={() => setPicking(false)} onDone={refetch} /> : null}
      {editing ? <EnrollmentDialog l={editing} onClose={() => setEditing(null)} onSaved={refetch} /> : null}
    </div>
  );
}

function EnrollPicker({ c, onClose, onDone }: { c: CampDetail; onClose: () => void; onDone: () => unknown }) {
  const toast = useToast();
  const { can } = useAuth();
  const unitIds = useMemo(() => c.units.map((u) => u.id), [c.units]);
  const members = useQuery({
    queryKey: ['camp-pick-members', c.id],
    enabled: can('members', 'view'),
    queryFn: async () => {
      const lists = unitIds.length ? await Promise.all(unitIds.map((u) => api.get<MemberListItem[]>(`/members?unitId=${u}`).catch(() => []))) : [await api.get<MemberListItem[]>('/members')];
      return lists.flat().sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
    },
  });
  const adults = useAdults(can('adults', 'view'));
  const [kind, setKind] = useState<'members' | 'adults'>('members');
  const [q, setQ] = useState('');
  const [selM, setSelM] = useState<string[]>([]);
  const [selA, setSelA] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const enrolledM = new Set(c.legajo.map((l) => l.member?.id).filter(Boolean));
  const enrolledA = new Set(c.legajo.map((l) => l.adult?.id).filter(Boolean));
  const match = (s: string) => s.toLowerCase().includes(q.trim().toLowerCase());
  const save = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ added: number }>(`/camps/${c.id}/enrollments`, { memberIds: selM, adultIds: selA });
      toast.ok(`Se inscribieron ${r.added}`);
      await onDone();
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Elegir inscriptos"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={busy} disabled={!selM.length && !selA.length} onClick={save}>
            Inscribir {selM.length + selA.length || ''}
          </Button>
        </>
      }
    >
      <div className="stack">
        <Tabs
          tabs={[
            { key: 'members', label: `Protagonistas${selM.length ? ` (${selM.length})` : ''}` },
            { key: 'adults', label: `Adultos${selA.length ? ` (${selA.length})` : ''}` },
          ]}
          value={kind}
          onChange={setKind}
        />
        <Input placeholder="Buscar por nombre" value={q} onChange={(e) => setQ(e.target.value)} />
        {kind === 'members' ? (
          members.isLoading ? (
            <Loading />
          ) : !can('members', 'view') ? (
            <p className="muted">No tenés permiso para ver protagonistas: usá «Inscribir a todos».</p>
          ) : (
            <div className="pick-list">
              {(members.data ?? [])
                .filter((m) => match(`${m.lastName} ${m.firstName}`))
                .map((m) => {
                  const already = enrolledM.has(m.id);
                  return (
                    <label key={m.id} className={already ? 'disabled' : ''}>
                      <input
                        type="checkbox"
                        disabled={already}
                        checked={already || selM.includes(m.id)}
                        onChange={(e) => setSelM(e.target.checked ? [...selM, m.id] : selM.filter((x) => x !== m.id))}
                      />
                      <span>
                        {m.lastName}, {m.firstName} <span className="muted">· {m.unit?.name ?? 'sin unidad'}</span>
                        {already ? <span className="muted"> · ya inscripto</span> : null}
                      </span>
                    </label>
                  );
                })}
            </div>
          )
        ) : adults.isLoading ? (
          <Loading />
        ) : (
          <div className="pick-list">
            {(adults.data ?? [])
              .filter((a) => a.status !== 'baja' && match(`${a.lastName} ${a.firstName} ${a.totem ?? ''}`))
              .map((a) => {
                const already = enrolledA.has(a.id);
                return (
                  <label key={a.id} className={already ? 'disabled' : ''}>
                    <input
                      type="checkbox"
                      disabled={already}
                      checked={already || selA.includes(a.id)}
                      onChange={(e) => setSelA(e.target.checked ? [...selA, a.id] : selA.filter((x) => x !== a.id))}
                    />
                    <span>
                      {adultName(a)}
                      {already ? <span className="muted"> · ya inscripto</span> : null}
                    </span>
                  </label>
                );
              })}
          </div>
        )}
        {c.cost > 0 ? <p className="muted" style={{ margin: 0 }}>A cada protagonista se le carga {formatMoney(c.cost)} en su cuenta (los adultos no pagan desde acá).</p> : null}
      </div>
    </Modal>
  );
}

function EnrollmentDialog({ l, onClose, onSaved }: { l: LegajoRow; onClose: () => void; onSaved: () => unknown }) {
  const toast = useToast();
  type F = z.input<typeof enrollmentSchema>;
  const { register, handleSubmit, formState, setError, watch } = useForm<F>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      cost: l.cost,
      discountPct: l.discountPct,
      authorizationPresented: l.authorizationPresented,
      authorizationDate: l.authorizationDate ?? '',
      dniPresented: l.dniPresented,
      notes: l.notes ?? '',
    },
  });
  const e = formState.errors;
  const cost = Number(watch('cost') || 0);
  const pct = Number(watch('discountPct') || 0);
  const onSubmit = handleSubmit(async (v) => {
    try {
      await api.put(`/camps/enrollments/${l.id}`, v);
      toast.ok('Inscripción actualizada');
      await onSaved();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err);
    }
  });
  return (
    <Modal
      title={`Inscripción · ${nameOf(l)}`}
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
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        {l.kind === 'protagonista' ? (
          <>
            <Field label="Costo" error={e.cost?.message}>
              <Input type="number" step="0.01" min="0" {...register('cost')} />
            </Field>
            <Field label="Descuento / beca (%)" error={e.discountPct?.message} hint={`A pagar: ${formatMoney(Math.round(cost * (1 - pct / 100) * 100) / 100)}`}>
              <Input type="number" min="0" max="100" {...register('discountPct')} />
            </Field>
            <Field label=" ">
              <Checkbox label="Presentó la autorización firmada" {...register('authorizationPresented')} />
            </Field>
            <Field label="Fecha de la autorización">
              <Input type="date" {...register('authorizationDate')} />
            </Field>
          </>
        ) : (
          <>
            <input type="hidden" {...register('cost')} />
            <input type="hidden" {...register('discountPct')} />
          </>
        )}
        <Field label=" " full>
          <Checkbox label="Presentó copia del DNI" {...register('dniPresented')} />
        </Field>
        <Field label="Observaciones" full hint="Ej: dieta especial, llega el sábado, medicación">
          <Input {...register('notes')} />
        </Field>
      </form>
    </Modal>
  );
}
