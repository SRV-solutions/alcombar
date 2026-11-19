import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Cake, CalendarCheck, CalendarDays, Check, FileCheck2 } from 'lucide-react';
import { formatDate } from '@shared';
import { api } from '../../lib/api';
import { Card, LinkButton } from '../../components/ui';
import './my-unit.css';

interface MyUnit {
  id: string;
  name: string;
  code: string;
  branch: string;
  members: number;
  canTakeAttendance: boolean;
  attendance: { last: string | null; takenToday: boolean };
  program: { date: string; items: number; first: string[] } | null;
  canSeeProgram: boolean;
  docsPending: number | null;
  birthdays: { name: string; day: number; month: number; today: boolean }[];
}

/**
 * «Mi unidad»: lo primero que ve un educador al entrar, pensado para el sábado con el celular en la mano.
 * Pasar lista a un toque, qué toca en el próximo encuentro, a quién le falta un papel y quién cumple años.
 */
export function MyUnitCards() {
  const q = useQuery({ queryKey: ['dashboard-mine'], queryFn: () => api.get<{ units: MyUnit[] }>('/dashboard/mine'), staleTime: 60_000 });
  const units = q.data?.units ?? [];
  if (!units.length) return null;
  return (
    <div className="my-units">
      {units.map((u) => (
        <Card key={u.id} title={units.length > 1 ? u.name : `Tu unidad · ${u.name}`}>
          {u.canTakeAttendance ? (
            <div className="my-unit-main">
              <LinkButton to={`/asistencia?unitId=${u.id}`}>
                <CalendarCheck /> Pasar lista
              </LinkButton>
              <span className="muted">
                {u.attendance.takenToday ? (
                  <>
                    <Check size={14} style={{ verticalAlign: '-2px' }} /> Hoy ya se pasó lista
                  </>
                ) : u.attendance.last ? (
                  `Última vez: ${formatDate(u.attendance.last)}`
                ) : (
                  'Todavía no se pasó lista'
                )}
              </span>
            </div>
          ) : null}
          <ul className="list-plain my-unit-rows">
            {u.canSeeProgram ? (
              <li>
                <Link to={`/programa/sabado?unitId=${u.id}${u.program ? `&date=${u.program.date}` : ''}`} className="my-unit-row">
                  <CalendarDays />
                  <span>
                    <strong>{u.program ? `Programa del ${formatDate(u.program.date)}` : 'El próximo encuentro todavía no tiene programa'}</strong>
                    <span className="muted">{u.program ? (u.program.first.length ? u.program.first.join(' — ') + (u.program.items > 3 ? ` y ${u.program.items - 3} más` : '') : 'Sin actividades cargadas') : 'Tocá para armarlo'}</span>
                  </span>
                </Link>
              </li>
            ) : null}
            {u.docsPending !== null ? (
              <li>
                <Link to={`/documentacion?unitId=${u.id}`} className="my-unit-row">
                  <FileCheck2 />
                  <span>
                    <strong>{u.docsPending ? `${u.docsPending} de ${u.members} con documentación pendiente` : 'Documentación al día'}</strong>
                    <span className="muted">{u.docsPending ? 'Les falta o se les venció algún papel obligatorio' : `Los ${u.members} tienen todo lo obligatorio`}</span>
                  </span>
                </Link>
              </li>
            ) : null}
            {u.birthdays.length ? (
              <li>
                <span className="my-unit-row">
                  <Cake />
                  <span>
                    <strong>{u.birthdays.some((b) => b.today) ? '¡Hoy hay cumpleaños!' : 'Cumpleaños de esta semana'}</strong>
                    <span className="muted">{u.birthdays.map((b) => `${b.name} (${b.today ? 'hoy' : `${b.day}/${b.month}`})`).join(' · ')}</span>
                  </span>
                </span>
              </li>
            ) : null}
          </ul>
        </Card>
      ))}
    </div>
  );
}
