import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpenCheck, ExternalLink, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS, formatDate, MINUTE_STATUS_LABELS, MINUTE_STATUSES } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Input, Loading, PageHeader, Select, Tabs, UnitBadge } from '../../components/ui';
import { DocumentDialog, MinuteDialog } from './Dialogs';
import { categoryLabel, kindLabel, minuteNumber, statusLabel, type DocLink, type MinuteRow } from './types';
import './library.css';

type Tab = 'actas' | 'documentos';

export function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'documentos' ? 'documentos' : 'actas';
  return (
    <>
      <PageHeader title="Actas y documentos" sub="Actas del Consejo de Grupo y documentos del Grupo (enlaces al Drive)." />
      <Tabs
        tabs={[
          { key: 'actas', label: 'Actas del Consejo' },
          { key: 'documentos', label: 'Documentos' },
        ]}
        value={tab}
        onChange={(k) => setParams(k === 'actas' ? {} : { tab: k }, { replace: true })}
      />
      {tab === 'actas' ? <MinutesTab /> : <DocumentsTab />}
    </>
  );
}

function MinutesTab() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const list = useQuery({ queryKey: ['library', 'minutes', q, year, status], queryFn: () => api.get<MinuteRow[]>(`/library/minutes${qs({ q, year, status })}`) });
  const current = new Date().getFullYear();

  return (
    <>
      <div className="toolbar">
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--muted)' }} />
          <Input placeholder="Buscar en las actas" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 32, width: '100%' }} />
        </div>
        <Select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Año">
          <option value="">Todos los años</option>
          {Array.from({ length: 6 }, (_, i) => current - i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
          <option value="">Todas</option>
          {MINUTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MINUTE_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        {can('documents', 'create') ? (
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nueva acta
          </Button>
        ) : null}
      </div>
      <Card bodyClass="table-wrap">
        {list.isLoading ? (
          <Loading />
        ) : list.error ? (
          <div className="card-body">
            <ErrorBox error={list.error} />
          </div>
        ) : !list.data?.length ? (
          <Empty icon={<BookOpenCheck />}>{q || year || status ? 'No hay actas con esos filtros.' : 'Todavía no hay actas cargadas.'}</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Fecha</th>
                <th>Título</th>
                <th>Reunión</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((m) => (
                <tr key={m.id} className="clickable" onClick={() => navigate(`/actas/${m.id}`)}>
                  <td className="nowrap">{minuteNumber(m)}</td>
                  <td className="nowrap">{formatDate(m.date)}</td>
                  <td>
                    <strong>{m.title}</strong>
                  </td>
                  <td>{kindLabel(m.kind)}</td>
                  <td>
                    <Badge tone={m.status === 'aprobada' ? 'ok' : 'warn'}>{statusLabel(m.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {creating ? <MinuteDialog onClose={() => setCreating(false)} onSaved={(id) => navigate(`/actas/${id}`)} /> : null}
    </>
  );
}

function DocumentsTab() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [dialog, setDialog] = useState<{ doc?: DocLink } | null>(null);
  const list = useQuery({ queryKey: ['library', 'documents', q, category], queryFn: () => api.get<DocLink[]>(`/library/documents${qs({ q, category })}`) });
  const groups = DOCUMENT_CATEGORIES.map((c) => ({ c, docs: (list.data ?? []).filter((d) => d.category === c) })).filter((g) => g.docs.length);

  return (
    <>
      <div className="toolbar">
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--muted)' }} />
          <Input placeholder="Buscar documento" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 32, width: '100%' }} />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {DOCUMENT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        {can('documents', 'create') ? (
          <Button onClick={() => setDialog({})}>
            <Plus /> Nuevo documento
          </Button>
        ) : null}
      </div>
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorBox error={list.error} />
      ) : !groups.length ? (
        <Card>
          <Empty icon={<FileText />}>{q || category ? 'No hay documentos con esos filtros.' : 'Todavía no hay documentos. Cargá los enlaces del Drive (reglamentos, planillas, autorizaciones…).'}</Empty>
        </Card>
      ) : (
        groups.map((g) => (
          <div key={g.c} className="doc-group">
            <Card title={`${categoryLabel(g.c)} (${g.docs.length})`}>
              {g.docs.map((d) => (
                <div key={d.id} className="doc-row">
                  <div>
                    <a className="doc-title" href={d.url} target="_blank" rel="noopener noreferrer">
                      {d.title} <ExternalLink size={14} />
                    </a>
                    {d.unit ? (
                      <span style={{ marginLeft: 8 }}>
                        <UnitBadge unit={d.unit} short />
                      </span>
                    ) : null}
                    {d.description ? <div className="doc-desc">{d.description}</div> : null}
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    {can('documents', 'edit') ? (
                      <Button variant="ghost" size="sm" onClick={() => setDialog({ doc: d })} aria-label={`Editar ${d.title}`}>
                        <Pencil />
                      </Button>
                    ) : null}
                    {can('documents', 'delete') ? (
                      <ConfirmButton
                        variant="ghost"
                        size="sm"
                        title="Eliminar documento"
                        message={`¿Quitar «${d.title}» del repositorio? El archivo en el Drive no se borra.`}
                        confirmLabel="Eliminar"
                        onConfirm={async () => {
                          try {
                            await api.del(`/library/documents/${d.id}`);
                            toast.ok('Documento quitado');
                            await qc.invalidateQueries({ queryKey: ['library', 'documents'] });
                          } catch (e) {
                            toast.error(e);
                          }
                        }}
                      >
                        <Trash2 />
                      </ConfirmButton>
                    ) : null}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        ))
      )}
      {dialog ? <DocumentDialog doc={dialog.doc} onClose={() => setDialog(null)} /> : null}
    </>
  );
}
