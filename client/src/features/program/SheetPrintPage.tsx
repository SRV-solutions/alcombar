import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { BRANCH_INFO, formatDate, type Branch } from '@shared';
import { api } from '../../lib/api';
import { adultName } from '../../lib/queries';
import { Button, ErrorBox, Loading } from '../../components/ui';
import { explorationLabel, minutes, objectivesHeader, scopeLabel, typeLabel } from './common';
import type { Sheet } from './types';

const List = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  ) : (
    <>—</>
  );

/** Ficha en el formato del Grupo, lista para imprimir o guardar como PDF desde el navegador. */
export function SheetPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['program-sheet', id], queryFn: () => api.get<Sheet>(`/program/sheets/${id}`) });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const s = q.data!;
  const branch = s.unit.branch;
  const rows: [string, React.ReactNode][] = [
    ['Nombre de la actividad', s.name],
    ['Rama y unidad', `${BRANCH_INFO[branch as Branch]?.label ?? branch} · ${s.unit.name}`],
    ['Rango de edad', s.ageMin || s.ageMax ? `${s.ageMin ?? '?'} a ${s.ageMax ?? '?'} años` : '—'],
    ['Área de desarrollo', s.area?.name ?? '—'],
    ['Participantes', s.participants ?? '—'],
    [objectivesHeader(branch), <List key="o" items={s.objectives} />],
    ['Propósito (competencias)', <List key="c" items={s.competencies.map((c) => `${c.number ? `${c.number}. ` : ''}${c.name}`)} />],
    [explorationLabel(branch), s.exploration || '—'],
    ['Descripción de la actividad', s.description || '—'],
    ['Recupero', s.closing || '—'],
    ['Función de los demás educadores', s.otherEducators || '—'],
    ['Materiales', <List key="m" items={s.materials} />],
    ['Responsable de la actividad', s.responsible ? adultName(s.responsible) : '—'],
    ['Fecha, lugar y duración', [formatDate(s.date), s.place, minutes(s.durationMin)].filter(Boolean).join(' · ') || '—'],
    ['Tipo de oportunidad', `${typeLabel(s.opportunityType)} · ${scopeLabel(s.scope)}${s.nights ? ` · ${s.nights} noches` : ''}`],
    ['Ciclo de programa', s.cycle?.name ?? '—'],
    ...(s.outside ? ([['Seguridad (fuera de la sede)', s.safety || '—']] as [string, React.ReactNode][]) : []),
    ...(s.status === 'evaluada'
      ? ([
          ['Evaluación: qué funcionó', s.evalWorked || '—'],
          ['Evaluación: qué cambiar', s.evalChange || '—'],
          ['Asistencia', s.evalAttendance ?? '—'],
        ] as [string, React.ReactNode][])
      : []),
  ];
  return (
    <div className="print-sheet">
      <div className="row no-print mb" style={{ gap: 8 }}>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft /> Volver
        </Button>
        <Button onClick={() => window.print()}>
          <Printer /> Imprimir o guardar PDF
        </Button>
        <span className="muted">En la ventana de impresión elegí «Guardar como PDF» para tener el archivo.</span>
      </div>
      <div className="print-head">
        <div>
          <div className="brand">ALCOMBAR · Grupo Scout 155 Divina Providencia</div>
          <div>{s.unit.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="code">{s.code}</div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>
            {s.approvedBy && s.approvedAt ? `Aprobada por ${s.approvedBy.name} · ${new Date(s.approvedAt).toLocaleDateString('es-AR')}` : 'Sin aprobar'}
          </div>
        </div>
      </div>
      <h2 style={{ margin: '0 0 10px' }}>Ficha de actividad: {s.name}</h2>
      <table className="print-table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
