import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Columns3, FileCheck2 } from 'lucide-react';
import { DOC_STATUS_LABELS, documentLabel, type DocStatus } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import type { DocumentType } from '../../lib/types';
import { Button, Card, DocDot, Empty, ErrorBox, Loading, PageHeader, Select } from '../../components/ui';
import { DocumentDialog } from '../members/MemberDialogs';
import './documents.css';

interface Cell {
  presented: boolean;
  notApplicable: boolean;
  presentedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  status: DocStatus;
}
interface Board {
  canEdit: boolean;
  types: DocumentType[];
  members: { id: string; firstName: string; lastName: string; smallGroup: { id: string; name: string } | null; documents: Record<string, Cell> }[];
}

/** Título corto de cada columna (el nombre completo se ve al pasar el mouse). */
const SHORT: Record<string, string> = {
  aut_ingreso: 'Ingreso',
  ficha_medica: 'Salud (DJS)',
  aut_salidas: 'Salidas cercanas',
  aut_imagen: 'Imagen',
  vacunas: 'Vacunas',
  obra_social: 'Obra social',
  dni_protagonista: 'DNI',
  dni_responsables: 'DNI resp.',
  partida_nacimiento: 'Partida',
  aut_retiro: 'Se retira solo/a',
  aut_retiro_terceros: 'Retiro por otros',
};
const shortName = (t: DocumentType) => (t.code && SHORT[t.code]) || (t.name.length > 18 ? `${t.name.slice(0, 17)}…` : t.name);
/** Fecha corta: 31/12/26 */
const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;

// Columnas ocultas, recordadas en este navegador
const HIDDEN_KEY = 'doc-board-hidden';
function readHidden(): string[] | null {
  try {
    const v = localStorage.getItem(HIDDEN_KEY);
    return v ? (JSON.parse(v) as string[]) : null;
  } catch {
    return null;
  }
}
function saveHidden(ids: string[]) {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids));
  } catch {
    /* sin almacenamiento: vale para esta visita */
  }
}

/** Elegir qué documentos se ven en el tablero. */
function ColumnPicker({ types, hidden, onChange }: { types: DocumentType[]; hidden: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const visible = types.filter((t) => !hidden.includes(t.id)).length;
  const toggle = (id: string) => onChange(hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id]);
  return (
    <div className="col-picker" ref={box}>
      <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Columns3 /> Columnas ({visible}/{types.length})
      </Button>
      {open ? (
        <div className="col-picker-menu" role="dialog" aria-label="Columnas a mostrar">
          <div className="col-picker-actions">
            <button type="button" className="link-btn" onClick={() => onChange([])}>
              Todas
            </button>
            <button type="button" className="link-btn" onClick={() => onChange(types.filter((t) => !t.required).map((t) => t.id))}>
              Solo obligatorias
            </button>
          </div>
          {types.map((t) => (
            <label key={t.id} className="checkbox col-picker-item">
              <input type="checkbox" checked={!hidden.includes(t.id)} onChange={() => toggle(t.id)} />
              <span>
                {t.name}
                {!t.required ? <span className="muted"> · opcional</span> : null}
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DocumentsPage() {
  const { can, me } = useAuth();
  const qc = useQueryClient();
  const units = useUnits();
  const [params, setParams] = useSearchParams();
  const [onlyPending, setOnlyPending] = useState(false);
  const [editing, setEditing] = useState<{ memberId: string; memberName: string; type: DocumentType; cell: Cell } | null>(null);
  const [hidden, setHidden] = useState<string[] | null>(readHidden);
  const viewable = (units.data ?? []).filter((u) => can('member_documents', 'view', u.id));
  const myUnit = me?.roles.find((r) => r.unit)?.unit?.id;
  const unitId = params.get('unitId') || (viewable.some((u) => u.id === myUnit) ? myUnit! : viewable[0]?.id ?? '');

  const board = useQuery({
    queryKey: ['doc-board', unitId],
    queryFn: () => api.get<Board>(`/documents/board${qs({ unitId })}`),
    enabled: !!unitId,
  });

  if (units.isLoading) return <Loading />;
  const data = board.data;
  // La primera vez se ocultan los opcionales (retiro); después, lo que haya elegido
  const hiddenIds = hidden ?? (data?.types ?? []).filter((t) => !t.required).map((t) => t.id);
  const setHiddenIds = (ids: string[]) => {
    setHidden(ids);
    saveHidden(ids);
  };
  const types = (data?.types ?? []).filter((t) => !hiddenIds.includes(t.id));
  const rows = (data?.members ?? []).filter((m) => !onlyPending || types.some((t) => m.documents[t.id]?.status !== 'ok'));

  /** "No corresponde" u "Opcional": no falta, pero tampoco está entregado. */
  const exempt = (c: Cell) => !c.presented && c.status === 'ok';
  const cellText = (c: Cell, t: DocumentType) => {
    if (exempt(c)) return c.notApplicable ? 'N/C' : '—';
    if (c.status === 'missing') return 'Falta';
    if (t.hasExpiry && c.expiresAt) return c.status === 'expired' ? `Venció ${shortDate(c.expiresAt)}` : shortDate(c.expiresAt);
    return 'Sí';
  };

  return (
    <>
      <PageHeader title="Documentación" sub="Qué entregó cada protagonista y cuándo vence. No se guarda el contenido de los documentos." />
      <div className="toolbar">
        <Select value={unitId} onChange={(e) => setParams({ unitId: e.target.value }, { replace: true })} aria-label="Unidad">
          {viewable.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <label className="checkbox">
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
          Solo con pendientes
        </label>
        {data?.types.length ? <ColumnPicker types={data.types} hidden={hiddenIds} onChange={setHiddenIds} /> : null}
        <span className="row muted" style={{ gap: 12, marginLeft: 'auto', fontSize: '0.85rem', flexWrap: 'wrap' }}>
          {(['ok', 'expiring', 'expired', 'missing'] as DocStatus[]).map((s) => (
            <span key={s} className="row" style={{ gap: 5 }}>
              <DocDot status={s} /> {DOC_STATUS_LABELS[s]}
            </span>
          ))}
          <span title="No corresponde">N/C = no corresponde</span>
        </span>
      </div>

      <Card bodyClass="table-wrap">
        {board.isLoading ? (
          <Loading />
        ) : board.error ? (
          <div className="card-body">
            <ErrorBox error={board.error} />
          </div>
        ) : !data?.members.length ? (
          <Empty icon={<FileCheck2 />}>La unidad no tiene protagonistas activos.</Empty>
        ) : !types.length ? (
          <Empty icon={<FileCheck2 />}>No elegiste ninguna columna: tocá «Columnas» para mostrar documentos.</Empty>
        ) : (
          <table className="table doc-board">
            <thead>
              <tr>
                <th className="doc-sticky">Protagonista</th>
                {types.map((t) => {
                  const ok = data.members.filter((m) => m.documents[t.id]?.presented && (m.documents[t.id]?.status === 'ok' || m.documents[t.id]?.status === 'expiring')).length;
                  return (
                    <th key={t.id} title={t.name}>
                      {shortName(t)}
                      <div className="doc-count">
                        {ok}/{data.members.length}
                        {t.required ? '' : ' · opc.'}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="nowrap doc-sticky">
                    <Link to={`/protagonistas/${m.id}`}>
                      {m.lastName}, {m.firstName}
                    </Link>
                    {m.smallGroup ? <div className="muted">{m.smallGroup.name}</div> : null}
                  </td>
                  {types.map((t) => {
                    const c = m.documents[t.id];
                    const label = documentLabel(c.status, c, t.required);
                    return (
                      <td key={t.id}>
                        <button
                          className="doc-cell"
                          disabled={!data.canEdit}
                          title={`${t.name}: ${label}${c.expiresAt ? ` (vence ${shortDate(c.expiresAt)})` : ''}${c.notes ? ` · ${c.notes}` : ''}`}
                          onClick={() => setEditing({ memberId: m.id, memberName: `${m.firstName} ${m.lastName}`, type: t, cell: c })}
                        >
                          <DocDot status={c.status} muted={exempt(c)} label={label} />
                          <span className={c.status === 'missing' || exempt(c) ? 'muted' : ''}>{cellText(c, t)}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {data?.canEdit ? <p className="muted mt">Hacé clic en una celda para marcar la entrega o cambiar el vencimiento. Pasando el mouse ves el detalle.</p> : null}

      {editing ? (
        <DocumentDialog
          memberId={editing.memberId}
          memberName={editing.memberName}
          doc={{ documentTypeId: editing.type.id, name: editing.type.name, hasExpiry: editing.type.hasExpiry, required: editing.type.required, ...editing.cell }}
          onClose={() => setEditing(null)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ['doc-board', unitId] });
            void qc.invalidateQueries({ queryKey: ['members'] });
            void qc.invalidateQueries({ queryKey: ['member', editing.memberId] });
          }}
        />
      ) : null}
    </>
  );
}
