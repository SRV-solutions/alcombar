import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, FileSignature, PenLine } from 'lucide-react';
import { AUTH_KIND_ANNUAL, AUTH_KIND_LABELS, AUTH_STATUS_LABELS, formatDate, type AuthKind } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { MemberListItem } from '../../lib/types';
import { SearchSelect } from '../../components/SearchSelect';
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHeader, Select, UnitBadge } from '../../components/ui';
import { AUTH_STATUS_TONE } from './AuthorizationDocPage';
import { SignDialog } from './SignDialog';
import type { AuthRow } from './types';
import './authorization.css';

/** Botón que baja el PDF de una autorización firmada. */
export function PdfButton({ row }: { row: Pick<AuthRow, 'id' | 'kind' | 'member'> }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={busy}
      title="Descargar en PDF"
      onClick={async () => {
        setBusy(true);
        try {
          await api.download(`/authorizations/${row.id}/pdf`, `${AUTH_KIND_LABELS[row.kind]} - ${row.member?.lastName ?? ''} ${row.member?.firstName ?? ''}.pdf`);
        } catch (e) {
          toast.error(e);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download /> PDF
    </Button>
  );
}

/** Detalle corto de a qué se refiere: el año o el campamento. */
export const authScope = (a: Pick<AuthRow, 'kind' | 'year' | 'camp' | 'activity'>) => (a.camp ? a.camp.name : a.activity ? a.activity : AUTH_KIND_ANNUAL[a.kind] ? `Año ${a.year}` : '');

/** Elegir a quién hacerle firmar y qué autorización (las de campamento se firman desde el legajo del campamento). */
export function NewAuthorizationDialog({ unitId, memberId, onClose }: { unitId?: string; memberId?: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [member, setMember] = useState(memberId ?? '');
  const [kind, setKind] = useState<AuthKind>('salidas_cercanas');
  const members = useQuery({
    queryKey: ['members', 'for-auth', unitId],
    queryFn: () => api.get<MemberListItem[]>(`/members${qs({ unitId, status: 'activo' })}`),
    enabled: !memberId && !!unitId,
  });
  return (
    <Modal
      title="Hacer firmar una autorización"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!member} onClick={() => navigate(`/autorizaciones/firmar${qs({ kind, memberId: member })}`)}>
            <PenLine /> Seguir
          </Button>
        </>
      }
    >
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          Se firma en persona: la madre, el padre o el tutor lee la planilla de Scouts de Argentina en tu celular o tablet y firma con el dedo.
        </p>
        {!memberId ? (
          <Field label="Protagonista" required>
            <SearchSelect
              value={member}
              onChange={setMember}
              placeholder={members.isLoading ? 'Cargando…' : 'Elegí al protagonista'}
              searchPlaceholder="Buscar por nombre"
              options={(members.data ?? []).map((m) => ({ value: m.id, label: `${m.lastName}, ${m.firstName}`, hint: m.smallGroup?.name }))}
            />
          </Field>
        ) : null}
        <Field label="Autorización" required hint="Para un campamento o salida: en el paso siguiente elegís el campamento ya cargado (sale todo completo) o completás lugar y fechas a mano.">
          <Select value={kind} onChange={(e) => setKind(e.target.value as AuthKind)}>
            <option value="salidas_cercanas">{AUTH_KIND_LABELS.salidas_cercanas}</option>
            <option value="imagen">{AUTH_KIND_LABELS.imagen}</option>
            <option value="ingreso">{AUTH_KIND_LABELS.ingreso}</option>
            <option value="retiro_solo">{AUTH_KIND_LABELS.retiro_solo}</option>
            <option value="retiro_terceros">{AUTH_KIND_LABELS.retiro_terceros}</option>
            <option value="campamento">Salida, acantonamiento o campamento</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

/** Autorizaciones firmadas en la app, por unidad: qué falta (testigos o aval) y aval de varias con una sola firma. */
export function AuthorizationsPage() {
  const { can, me } = useAuth();
  const units = useUnits();
  const qc = useQueryClient();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<'new' | 'aval' | null>(null);
  const viewable = (units.data ?? []).filter((u) => can('member_documents', 'view', u.id));
  const myUnit = me?.roles.find((r) => r.unit)?.unit?.id;
  // Desde un campamento: sus autorizaciones, de todas las unidades que van
  const campId = params.get('campId') ?? '';
  const unitId = campId ? '' : params.get('unitId') || (viewable.some((u) => u.id === myUnit) ? myUnit! : viewable[0]?.id ?? '');

  const list = useQuery({
    queryKey: ['authorizations', 'list', unitId, campId, status],
    queryFn: () => api.get<AuthRow[]>(`/authorizations${qs({ unitId, campId, status })}`),
    enabled: !!unitId || !!campId,
  });
  const campName = campId ? list.data?.find((r) => r.camp)?.camp?.name : null;
  if (units.isLoading) return <Loading />;
  const rows = list.data ?? [];
  const approvable = rows.filter((r) => r.canApprove);
  const chosen = approvable.filter((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <PageHeader
        title="Autorizaciones firmadas"
        sub="Las autorizaciones de madres, padres y tutores firmadas con el dedo en la app, sobre las planillas de Scouts de Argentina. Cada una se puede ver y descargar en PDF."
        actions={
          can('member_documents', 'edit', unitId) ? (
            <Button onClick={() => setDialog('new')}>
              <FileSignature /> Hacer firmar
            </Button>
          ) : null
        }
      />
      <div className="toolbar">
        {campId ? (
          <span className="row" style={{ gap: 8 }}>
            <b>{campName ?? 'Campamento'}</b>
            <Link to={`/campamentos/${campId}`}>Volver al campamento</Link>
            <button type="button" className="link-btn" onClick={() => setParams({}, { replace: true })}>
              Ver todas las de la unidad
            </button>
          </span>
        ) : (
          <Select
            value={unitId}
            onChange={(e) => {
              setParams({ unitId: e.target.value }, { replace: true });
              setSelected(new Set());
            }}
            aria-label="Unidad"
          >
            {viewable.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        )}
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
          <option value="">Vigentes</option>
          <option value="pendientes">Les falta el aval o un testigo</option>
          <option value="completa">Completas</option>
          <option value="anulada">Anuladas</option>
        </Select>
        {rows.length ? (
          <Button
            variant="secondary"
            size="sm"
            title="Un solo PDF con todas las de la lista, una por hoja"
            onClick={() =>
              api
                .download(campId ? `/authorizations/camp/${campId}/pdf?only=firmadas` : `/authorizations/pdf${qs({ unitId, status })}`, 'Autorizaciones firmadas.pdf')
                .catch(toast.error)
            }
          >
            <Download /> Bajar todas en un PDF
          </Button>
        ) : null}
        {approvable.length ? (
          <Button variant="secondary" size="sm" onClick={() => setSelected(new Set(selected.size === approvable.length ? [] : approvable.map((r) => r.id)))}>
            {selected.size === approvable.length ? 'Quitar la selección' : `Elegir las ${approvable.length} que esperan tu aval`}
          </Button>
        ) : null}
      </div>

      {chosen.length ? (
        <div className="move-bar">
          <span>
            {chosen.length} {chosen.length === 1 ? 'elegida' : 'elegidas'}
          </span>
          <Button size="sm" onClick={() => setDialog('aval')}>
            <PenLine /> Dar el aval con una firma
          </Button>
        </div>
      ) : null}

      <Card bodyClass="table-wrap">
        {list.isLoading ? (
          <Loading />
        ) : list.error ? (
          <div className="card-body">
            <ErrorBox error={list.error} />
          </div>
        ) : !rows.length ? (
          <Empty icon={<FileSignature />}>Todavía no hay autorizaciones firmadas con ese filtro.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>Protagonista</th>
                <th>Autorización</th>
                <th>Firmó</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.canApprove ? <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label="Elegir para dar el aval" /> : null}</td>
                  <td className="nowrap">
                    {r.member ? (
                      <Link to={`/protagonistas/${r.member.id}`}>
                        {r.member.lastName}, {r.member.firstName}
                      </Link>
                    ) : (
                      '—'
                    )}
                    {r.member?.unit && !unitId ? (
                      <div>
                        <UnitBadge unit={r.member.unit} short />
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <Link to={`/autorizaciones/${r.id}`}>{AUTH_KIND_LABELS[r.kind]}</Link>
                    {authScope(r) ? <div className="muted">{authScope(r)}</div> : null}
                  </td>
                  <td>
                    {r.signerName}
                    <div className="muted">{r.signerRole}</div>
                  </td>
                  <td className="nowrap">{formatDate(r.signedAt.slice(0, 10))}</td>
                  <td>
                    <Badge tone={AUTH_STATUS_TONE[r.status]}>{AUTH_STATUS_LABELS[r.status]}</Badge>
                    {r.pending ? <div className="muted">{r.pending}</div> : null}
                  </td>
                  <td className="num nowrap">
                    <PdfButton row={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {dialog === 'new' ? <NewAuthorizationDialog unitId={unitId} onClose={() => setDialog(null)} /> : null}
      {dialog === 'aval' ? (
        <SignDialog
          title={`Aval de ${chosen.length} ${chosen.length === 1 ? 'autorización' : 'autorizaciones'}`}
          confirmLabel="Dar el aval"
          onClose={() => setDialog(null)}
          onSign={async (signature) => {
            const r = await api.post<{ done: number }>('/authorizations/aval', { ids: chosen.map((c) => c.id), signature });
            toast.ok(`Aval registrado en ${r.done} ${r.done === 1 ? 'autorización' : 'autorizaciones'}`);
            setSelected(new Set());
            await qc.invalidateQueries({ queryKey: ['authorizations'] });
          }}
        >
          <p style={{ margin: 0 }}>Certificás que cada protagonista tiene el legajo personal completo y que quien firmó tiene su firma registrada en la autorización de ingreso:</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {chosen.slice(0, 12).map((c) => (
              <li key={c.id}>
                {c.member?.firstName} {c.member?.lastName} · {AUTH_KIND_LABELS[c.kind]} {authScope(c) ? `(${authScope(c)})` : ''}
              </li>
            ))}
            {chosen.length > 12 ? <li>y {chosen.length - 12} más</li> : null}
          </ul>
        </SignDialog>
      ) : null}
    </>
  );
}
