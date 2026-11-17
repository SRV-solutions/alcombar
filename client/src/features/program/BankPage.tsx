import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, ExternalLink, Library, Search } from 'lucide-react';
import { BRANCHES, BRANCH_INFO, formatDate, OPPORTUNITY_TYPES, OPPORTUNITY_TYPE_LABELS } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Button, Card, Empty, ErrorBox, Input, LinkButton, Loading, Modal, PageHeader, Select, UnitBadge } from '../../components/ui';
import { SheetStatusBadge, SheetView, typeLabel, useAreas, useCompetencies } from './common';
import { DuplicateDialog } from './SheetDetailPage';
import type { Sheet, SheetSummary } from './types';

function Preview({ id, onClose, onUse }: { id: string; onClose: () => void; onUse: (s: Sheet) => void }) {
  const q = useQuery({ queryKey: ['program-sheet', id], queryFn: () => api.get<Sheet>(`/program/sheets/${id}`) });
  const { unitsWith } = useAuth();
  const creatable = unitsWith('activities', 'create');
  return (
    <Modal
      wide
      title={q.data ? `${q.data.code} · ${q.data.name}` : 'Ficha'}
      onClose={onClose}
      footer={
        q.data ? (
          <>
            <LinkButton to={`/programa/fichas/${id}`} variant="secondary">
              <ExternalLink /> Ver ficha completa
            </LinkButton>
            {creatable === 'all' || creatable.length ? (
              <Button onClick={() => onUse(q.data!)}>
                <Copy /> Usar en mi unidad
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : <SheetView sheet={q.data!} />}
    </Modal>
  );
}

/** Banco de fichas del Grupo: buscar entre las fichas aprobadas, realizadas y evaluadas de todas las unidades. */
export function BankPage() {
  const [branch, setBranch] = useState('');
  const [areaId, setAreaId] = useState('');
  const [competencyId, setCompetencyId] = useState('');
  const [type, setType] = useState('');
  const [place, setPlace] = useState('');
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [using, setUsing] = useState<Sheet | null>(null);
  const areas = useAreas(branch || null);
  const comps = useCompetencies(branch || null);
  const list = useQuery({
    queryKey: ['program-bank', branch, areaId, competencyId, type, place, q],
    queryFn: () => api.get<SheetSummary[]>(`/program/sheets/bank${qs({ branch, areaId, competencyId, type, place, q })}`),
  });

  return (
    <>
      <PageHeader
        title="Banco de fichas"
        sub="Las fichas aprobadas, realizadas y evaluadas de todas las unidades. Buscá una idea y usala en tu unidad: se copia en borrador para adaptarla."
      />
      <div className="toolbar">
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--muted)' }} />
          <Input placeholder="Buscar en nombre, descripción, objetivos o lugar" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 32, width: '100%' }} />
        </div>
        <Select value={branch} onChange={(e) => (setBranch(e.target.value), setAreaId(''), setCompetencyId(''))} aria-label="Rama" style={{ width: 'auto' }}>
          <option value="">Todas las ramas</option>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>
              {BRANCH_INFO[b].label}
            </option>
          ))}
        </Select>
        <Select value={areaId} onChange={(e) => setAreaId(e.target.value)} aria-label="Área" style={{ width: 'auto' }} disabled={!branch}>
          <option value="">{branch ? 'Todas las áreas' : 'Área (elegí la rama)'}</option>
          {areas.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select value={competencyId} onChange={(e) => setCompetencyId(e.target.value)} aria-label="Competencia" style={{ width: 'auto', maxWidth: 260 }} disabled={!branch}>
          <option value="">{branch ? 'Todas las competencias' : 'Competencia (elegí la rama)'}</option>
          {comps.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.number ? `${c.number}. ` : ''}
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo" style={{ width: 'auto' }}>
          <option value="">Todos los tipos</option>
          {OPPORTUNITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {OPPORTUNITY_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Input placeholder="Lugar" value={place} onChange={(e) => setPlace(e.target.value)} aria-label="Lugar" style={{ width: 160 }} />
      </div>
      <Card bodyClass="table-wrap">
        {list.isLoading ? (
          <Loading />
        ) : list.error ? (
          <div className="card-body">
            <ErrorBox error={list.error} />
          </div>
        ) : !list.data?.length ? (
          <Empty icon={<Library />}>No hay fichas con esos filtros. El banco se arma con las fichas aprobadas de todas las unidades.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ficha</th>
                <th>Unidad</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((s) => (
                <tr key={s.id} className="clickable" onClick={() => setPreview(s.id)}>
                  <td>
                    <strong>{s.name}</strong>
                    <div className="muted">
                      {s.area?.name ?? ''}
                      {s.competencies?.length ? ` · ${s.competencies.length} competencias` : ''}
                      {s.place ? ` · ${s.place}` : ''}
                    </div>
                  </td>
                  <td>
                    <UnitBadge unit={s.unit} short />
                  </td>
                  <td>{typeLabel(s.opportunityType)}</td>
                  <td className="nowrap">{formatDate(s.date) || '—'}</td>
                  <td>
                    <SheetStatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {list.data?.length ? <p className="muted mt">{list.data.length} fichas · tocá una para verla</p> : null}
      {preview ? (
        <Preview
          id={preview}
          onClose={() => setPreview(null)}
          onUse={(s) => {
            setPreview(null);
            setUsing(s);
          }}
        />
      ) : null}
      {using ? <DuplicateDialog sheet={using} onClose={() => setUsing(null)} /> : null}
    </>
  );
}
