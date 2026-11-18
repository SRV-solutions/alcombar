import { Link } from 'react-router-dom';
import { CalendarPlus, Download, FileText, Pencil } from 'lucide-react';
import { adultName } from '../../lib/queries';
import { Badge, Card, Empty, UnitBadge } from '../../components/ui';
import { minutes, SheetStatusBadge } from '../program/common';
import type { CampDetail, CampProgramItem } from './types';

/** Fechas ISO entre dos días, inclusive. */
function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (d <= end && out.length < 62) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
const longDate = (iso: string) => {
  const s = new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function Item({ i, canView }: { i: CampProgramItem; canView: boolean }) {
  const meta = [i.responsible ? `A cargo: ${adultName(i.responsible)}` : null, i.durationMin ? minutes(i.durationMin) : null, i.notes].filter(Boolean);
  return (
    <li className="camp-item">
      <span className="time">{i.time ?? ''}</span>
      <div className="what">
        {i.sheet ? (
          <span className="sheet">
            <FileText aria-hidden />
            {canView ? <Link to={`/programa/fichas/${i.sheet.id}`}>{i.sheet.name}</Link> : i.sheet.name}
            <span className="code">{i.sheet.code}</span>
          </span>
        ) : (
          <span className="title">{i.title}</span>
        )}
        {i.sheet && i.title && i.title !== i.sheet.name ? <span className="muted"> · {i.title}</span> : null}
        {meta.length ? <div className="meta">{meta.join(' · ')}</div> : null}
      </div>
    </li>
  );
}

/**
 * Programa y cronograma del campamento. Cada día es el programa del día de la unidad (el mismo de "Programa del
 * sábado"): se arma con ese editor y las fichas quedan enlazadas, sin cargar nada dos veces.
 */
export function CampProgramTab({ c }: { c: CampDetail }) {
  const p = c.program;
  const dates = datesBetween(c.startDate, c.endDate);
  const multi = p.units.length > 1;
  const units = [...p.units].sort((a, b) => Number(b.unit.id === c.ownerUnitId) - Number(a.unit.id === c.ownerUnitId));
  const canViewUnit = (id: string | null) => !!id && !!p.units.find((u) => u.unit.id === id)?.canView;

  return (
    <div className="stack">
      {c.description || c.materials ? (
        <Card title="Propuesta y objetivos">
          {c.description ? <div className="camp-pre">{c.description}</div> : null}
          {c.materials ? (
            <>
              <h4 className="camp-sub">Materiales</h4>
              <div className="camp-pre">{c.materials}</div>
            </>
          ) : null}
        </Card>
      ) : null}

      <Card title="Cronograma">
        {!units.length ? (
          <Empty>Elegí qué unidad organiza el campamento (en «Editar») para armar el cronograma.</Empty>
        ) : (
          <div className="camp-days">
            {dates.map((date) => (
              <section key={date} className="camp-day">
                <h3>{longDate(date)}</h3>
                {units.map(({ unit, canView, canEdit }) => {
                  const day = p.days.find((d) => d.date === date && d.unitId === unit.id);
                  if (!day && !canEdit && multi) return null;
                  return (
                    <div key={unit.id} className="camp-day-unit">
                      {multi ? <UnitBadge unit={unit} short /> : null}
                      {day?.items.length ? (
                        <ol className="camp-items">
                          {day.items.map((i) => (
                            <Item key={i.id} i={i} canView={canView} />
                          ))}
                        </ol>
                      ) : (
                        <p className="muted camp-empty">Todavía no hay cronograma para este día.</p>
                      )}
                      {day?.notes ? <p className="muted camp-day-notes">{day.notes}</p> : null}
                      {canEdit ? (
                        <Link className="btn btn-ghost btn-sm no-print" to={`/programa/sabado?unitId=${unit.id}&date=${date}`}>
                          {day ? <Pencil /> : <CalendarPlus />} {day ? 'Editar este día' : 'Armar el cronograma'}
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Fichas del campamento (${p.sheets.length})`}>
        {!p.sheets.length ? (
          <Empty>No hay fichas con fecha dentro del campamento ni enlazadas al cronograma.</Empty>
        ) : (
          <ul className="camp-sheets">
            {p.sheets.map((s) => (
              <li key={s.id}>
                <div className="name">
                  {canViewUnit(s.unitId) ? <Link to={`/programa/fichas/${s.id}`}>{s.name}</Link> : s.name}
                  <span className="code">{s.code}</span>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <SheetStatusBadge status={s.status} />
                  {!s.inSchedule ? <Badge tone="warn">Fuera del cronograma</Badge> : null}
                  {canViewUnit(s.unitId) ? (
                    <Link className="btn btn-ghost btn-sm" to={`/programa/fichas/${s.id}/imprimir?descargar=1`} title="Descargar la ficha en PDF">
                      <Download /> PDF
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
