import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Library, Plus, Search } from 'lucide-react';
import { formatDate, SHEET_STATUSES, SHEET_STATUS_LABELS } from '@shared';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { adultName } from '../../lib/queries';
import { Card, Empty, ErrorBox, Input, LinkButton, Loading, PageHeader, Select } from '../../components/ui';
import { SheetStatusBadge, typeLabel, UnitSelect, useProgramUnit } from './common';
import { searchSheet, SheetHitLine } from './sheetSearch';
import type { Cycle, SheetSummary } from './types';

/** Programa → Fichas de actividad de una unidad. */
export function SheetsPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { unitId, setUnitId, unit, options, loading } = useProgramUnit('view');
  const [status, setStatus] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [q, setQ] = useState('');
  const sheets = useQuery({
    queryKey: ['program-sheets', unitId, status, cycleId],
    queryFn: () => api.get<SheetSummary[]>(`/program/sheets${qs({ unitId, status, cycleId })}`),
    enabled: !!unitId,
  });
  const cycles = useQuery({
    queryKey: ['program-cycles', unitId],
    queryFn: () => api.get<Cycle[]>(`/program/cycles${qs({ unitId })}`),
    enabled: !!unitId,
  });
  // Busca en toda la ficha (no solo en el nombre): objetivos, descripción, materiales… y muestra dónde lo encontró
  const rows = useMemo(() => {
    const out: { sheet: SheetSummary; hit: ReturnType<typeof searchSheet> }[] = [];
    for (const s of sheets.data ?? []) {
      const hit = searchSheet(s, q);
      if (hit) out.push({ sheet: s, hit });
    }
    return out;
  }, [sheets.data, q]);
  const canCreate = !!unitId && can('activities', 'create', unitId);

  if (loading) return <Loading />;
  if (!options.length) return <Empty>No tenés unidades para ver fichas.</Empty>;
  return (
    <>
      <PageHeader
        title="Fichas de actividad"
        sub="Las fichas de la unidad: se cargan, se aprueban, se realizan y se evalúan. Se imprimen con el formato del Grupo."
        actions={
          <>
            <LinkButton to="/programa/banco" variant="secondary">
              <Library /> Banco de fichas
            </LinkButton>
            {canCreate ? (
              <LinkButton to={`/programa/fichas/nueva${qs({ unitId })}`}>
                <Plus /> Nueva ficha
              </LinkButton>
            ) : null}
          </>
        }
      />
      <div className="toolbar">
        <UnitSelect value={unitId} onChange={(id) => (setUnitId(id), setCycleId(''))} options={options} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado" style={{ width: 'auto' }}>
          <option value="">Todos los estados</option>
          {SHEET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SHEET_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select value={cycleId} onChange={(e) => setCycleId(e.target.value)} aria-label="Ciclo" style={{ width: 'auto' }}>
          <option value="">Todos los ciclos</option>
          {cycles.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--muted)' }} />
          <Input placeholder="Buscar en el nombre o en el contenido de la ficha" aria-label="Buscar fichas por nombre o por contenido" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 32, width: '100%' }} />
        </div>
      </div>
      <Card bodyClass="table-wrap">
        {sheets.isLoading ? (
          <Loading />
        ) : sheets.error ? (
          <div className="card-body">
            <ErrorBox error={sheets.error} />
          </div>
        ) : !rows.length ? (
          <Empty icon={<FileText />}>
            {sheets.data?.length ? 'Ninguna ficha tiene eso, ni en el nombre ni en el contenido.' : `${unit?.name ?? 'La unidad'} todavía no tiene fichas.`}
            {canCreate && !sheets.data?.length ? (
              <div className="mt">
                <LinkButton to={`/programa/fichas/nueva${qs({ unitId })}`}>
                  <Plus /> Cargar la primera ficha
                </LinkButton>
              </div>
            ) : null}
          </Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Ficha</th>
                <th>Fecha</th>
                <th>Ciclo</th>
                <th>Responsable</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ sheet: s, hit }) => (
                <tr key={s.id} className="clickable" onClick={() => navigate(`/programa/fichas/${s.id}`)}>
                  <td className="nowrap muted">{s.code}</td>
                  <td>
                    <strong>{s.name}</strong>
                    <div className="muted">
                      {typeLabel(s.opportunityType)}
                      {s.area ? ` · ${s.area.name}` : ''}
                    </div>
                    {hit?.where ? <SheetHitLine hit={hit.where} /> : null}
                  </td>
                  <td className="nowrap">{formatDate(s.date) || <span className="muted">Sin fecha</span>}</td>
                  <td>{s.cycle?.name ?? <span className="muted">—</span>}</td>
                  <td>{s.responsible ? adultName(s.responsible) : <span className="muted">—</span>}</td>
                  <td>
                    <SheetStatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {rows.length ? <p className="muted mt">{rows.length} fichas</p> : null}
    </>
  );
}
