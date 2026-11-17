import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, Users } from 'lucide-react';
import { BRANCH_INFO, COMPETENCIES_PER_STAGE, formatDate, type Branch } from '@shared';
import { api, qs } from '../../lib/api';
import { Badge, Card, Empty, ErrorBox, LinkButton, Loading, PageHeader, Select } from '../../components/ui';
import { UnitSelect, useProgramUnit } from '../program/common';
import type { Board, Standards } from './types';
import './progression.css';

/** Barritas por área: cuántas competencias eligió (azul) y logró (verde) en cada una. */
export function AreaBalance({ areas, byArea, wide }: { areas: { id: string; name: string }[]; byArea: Record<string, { chosen: number; achieved: number }>; wide?: boolean }) {
  const max = Math.max(1, ...Object.values(byArea).map((x) => x.chosen));
  const rows = [...areas, ...(byArea.sin_area ? [{ id: 'sin_area', name: 'Sin área' }] : [])];
  return (
    <div className={`area-balance ${wide ? 'wide' : ''}`}>
      {rows.map((a) => {
        const v = byArea[a.id] ?? { chosen: 0, achieved: 0 };
        return (
          <div key={a.id} className="ab" title={`${a.name}: ${v.chosen} elegidas, ${v.achieved} logradas`}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wide ? a.name : a.name.split(' ')[0]}</span>
            <span className="track">
              <span style={{ width: `${(v.chosen / max) * 100}%` }} />
              <span className="got" style={{ width: `${(v.achieved / max) * 100}%` }} />
            </span>
            <span className="n">{wide ? `${v.achieved}/${v.chosen}` : v.chosen}</span>
          </div>
        );
      })}
    </div>
  );
}

function StandardsCard({ s, branchLabel }: { s: Standards; branchLabel: string }) {
  const t = s.targets;
  const tile = (label: string, value: number, target?: number) => (
    <div className={`std ${target && value >= target ? 'done' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {target ? <small> / {target}</small> : null}
      </div>
      {target ? (
        <div className={`meter ${value >= target ? 'ok' : ''}`}>
          <span style={{ width: `${Math.min(100, (value / target) * 100)}%` }} />
        </div>
      ) : null}
    </div>
  );
  return (
    <Card title={`Estándares de la unidad · ${s.year}`}>
      <div className="std-grid">
        {tile('Descubiertas', s.descubiertas, t?.descubiertas)}
        {tile('Proyectos de unidad', s.proyectos, t?.proyectos)}
        {tile('Noches de campamento', s.noches, t?.noches)}
        {tile('Actividades realizadas', s.realizadas)}
      </div>
      <p className="muted" style={{ margin: '10px 0 0', fontSize: '0.85rem' }}>
        {t
          ? `Meta anual de la Rama Scouts: ${t.descubiertas} descubiertas, ${t.proyectos} proyectos de unidad y al menos ${t.noches} noches de campamento.`
          : `${branchLabel}: sin metas anuales definidas; se muestran los totales del año.`}{' '}
        Cuentan las fichas marcadas como realizadas o evaluadas, con fecha en el año. Las noches suman también los campamentos realizados en los que participó la unidad.
      </p>
    </Card>
  );
}

/** Progresión → tablero de la unidad: etapa, competencias y revisiones de cada protagonista, y estándares anuales. */
export function BoardPage() {
  const navigate = useNavigate();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { unitId, setUnitId, options, loading } = useProgramUnit('view', 'progression');
  const q = useQuery({ queryKey: ['progression-board', unitId, year], queryFn: () => api.get<Board>(`/progression/board${qs({ unitId, year })}`), enabled: !!unitId });
  if (loading) return <Loading />;
  if (!options.length) return <Empty>No tenés unidades para ver la progresión.</Empty>;
  const b = q.data;
  return (
    <>
      <PageHeader
        title="Progresión"
        sub="El camino de cada protagonista: etapas, competencias, roles y revisiones de fin de ciclo."
        actions={
          <LinkButton to="/progresion/esquemas" variant="secondary">
            <BookOpen /> Esquemas y catálogos
          </LinkButton>
        }
      />
      <div className="toolbar">
        <UnitSelect value={unitId} onChange={setUnitId} options={options} />
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Año" style={{ width: 'auto' }}>
          {[thisYear, thisYear - 1, thisYear - 2].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : b ? (
        <div className="stack" style={{ gap: 16 }}>
          <StandardsCard s={b.standards} branchLabel={BRANCH_INFO[b.unit.branch as Branch]?.label ?? b.unit.name} />
          {!b.scheme?.stages.length ? (
            <div className="alert alert-info">
              El esquema de progresión de esta rama está <strong>a definir</strong>: todavía no tiene etapas cargadas. Se cargan en <strong>Esquemas y catálogos → Etapas</strong>.
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Esquema {b.scheme.name} (v{b.scheme.version}): {b.scheme.stages.map((s) => s.name).join(' → ')}. Se recomiendan {COMPETENCIES_PER_STAGE.min} a {COMPETENCIES_PER_STAGE.max}{' '}
              competencias por etapa, repartidas entre las áreas.
            </p>
          )}
          <Card title={`Protagonistas (${b.members.length})`} bodyClass="table-wrap">
            {!b.members.length ? (
              <Empty icon={<Users />}>No hay protagonistas activos en esta unidad. Los que están «por asignar» aparecen cuando se los pasa a la unidad.</Empty>
            ) : (
              <table className="table progression-board">
                <thead>
                  <tr>
                    <th>Protagonista</th>
                    <th>Etapa</th>
                    <th>Insignia</th>
                    <th className="num">Competencias</th>
                    <th>Por área</th>
                    <th>Última revisión</th>
                  </tr>
                </thead>
                <tbody>
                  {b.members.map((m) => (
                    <tr key={m.id} className="clickable" onClick={() => navigate(`/progresion/${m.id}`)}>
                      <td>
                        <strong>
                          {m.lastName}, {m.firstName}
                        </strong>
                        <div className="muted">
                          {m.smallGroup?.name ?? ''}
                          {m.promiseDate ? `${m.smallGroup ? ' · ' : ''}Promesa ${formatDate(m.promiseDate)}` : ''}
                        </div>
                        {m.transition ? <Badge tone="warn">En transición</Badge> : null}
                      </td>
                      <td>
                        {m.currentStage ? (
                          <>
                            {m.currentStage.name}
                            {m.currentStage.startedAt ? <div className="muted">desde {formatDate(m.currentStage.startedAt)}</div> : null}
                          </>
                        ) : (
                          <span className="muted">Sin etapa</span>
                        )}
                      </td>
                      <td>
                        {m.currentStage?.insigniaAt ? (
                          <span className="row" style={{ gap: 4 }}>
                            <Award size={14} /> {formatDate(m.currentStage.insigniaAt)}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="num">
                        {m.competencies.achieved}/{m.competencies.total}
                        {m.competencies.total && (m.competencies.total < COMPETENCIES_PER_STAGE.min || m.competencies.total > COMPETENCIES_PER_STAGE.max) ? (
                          <div className="muted" title={`Se recomiendan ${COMPETENCIES_PER_STAGE.min} a ${COMPETENCIES_PER_STAGE.max} por etapa`}>
                            {m.competencies.total < COMPETENCIES_PER_STAGE.min ? 'pocas' : 'muchas'}
                          </div>
                        ) : null}
                      </td>
                      <td>{m.competencies.total ? <AreaBalance areas={b.areas} byArea={m.competencies.byArea} /> : <span className="muted">—</span>}</td>
                      <td className="nowrap">{m.lastReview ? formatDate(m.lastReview) : <span className="muted">Nunca</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}
