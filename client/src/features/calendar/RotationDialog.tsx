import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { todayIso } from '@shared';
import { api } from '../../lib/api';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Badge, Button, Checkbox, Field, Input, Modal, Select, UnitBadge } from '../../components/ui';
import { addDays, longDate, WEEKDAYS } from './types';

interface PlanRow {
  date: string;
  unit: { id: string; name: string; code: string; branch: string } | null;
  skipped: boolean;
  existing: string[];
}

/**
 * Servicio rotativo: reparte las unidades por turno (en el orden en que se tildan) entre los sábados
 * (u otro día) de un período. Primero muestra la vista previa y después crea los eventos.
 */
export function RotationDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const units = useUnits();
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(addDays(todayIso(), 90));
  const [weekday, setWeekday] = useState(6);
  const [order, setOrder] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [place, setPlace] = useState('');
  const [skipExisting, setSkipExisting] = useState(true);
  const [plan, setPlan] = useState<PlanRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const body = () => ({ from, to, unitIds: order, weekday, startTime, endTime, place, skipExisting });
  const toggle = (id: string) => {
    setPlan(null);
    setOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const preview = async () => {
    setBusy(true);
    try {
      setPlan((await api.post<{ plan: PlanRow[] }>('/calendar/rotation/preview', body())).plan);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ created: number }>('/calendar/rotation', body());
      toast.ok(`Se cargaron ${r.created} servicios en el calendario`);
      await qc.invalidateQueries({ queryKey: ['calendar'] });
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  const toCreate = plan?.filter((p) => !p.skipped).length ?? 0;

  return (
    <Modal
      title="Servicio rotativo"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={preview} loading={busy && !plan} disabled={!order.length}>
            Ver vista previa
          </Button>
          <Button onClick={create} loading={busy && !!plan} disabled={!plan || !toCreate}>
            Crear {toCreate || ''} servicios
          </Button>
        </>
      }
    >
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          Tildá las unidades en el orden en que les toca el servicio: la app las reparte por turno entre los días elegidos.
        </p>
        <div className="form-grid">
          <Field label="Desde" required>
            <Input type="date" value={from} onChange={(e) => (setFrom(e.target.value), setPlan(null))} />
          </Field>
          <Field label="Hasta" required>
            <Input type="date" value={to} onChange={(e) => (setTo(e.target.value), setPlan(null))} />
          </Field>
          <Field label="Día de la semana">
            <Select value={weekday} onChange={(e) => (setWeekday(Number(e.target.value)), setPlan(null))}>
              {WEEKDAYS.map((w, i) => (
                <option key={w} value={i}>
                  {w[0].toUpperCase() + w.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Lugar">
            <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ej: Sede" />
          </Field>
          <Field label="Hora de inicio" hint="Vacío = todo el día">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="Hora de fin">
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!startTime} />
          </Field>
          <Field label="Unidades (en orden)" full>
            <div className="rot-units">
              {(units.data ?? [])
                .filter((u) => u.active)
                .map((u) => {
                  const pos = order.indexOf(u.id);
                  return (
                    <label key={u.id} className="rot-unit">
                      <input type="checkbox" checked={pos >= 0} onChange={() => toggle(u.id)} />
                      <span className={`rot-order ${pos >= 0 ? 'on' : ''}`}>{pos >= 0 ? pos + 1 : ''}</span>
                      <UnitBadge unit={u} />
                    </label>
                  );
                })}
            </div>
          </Field>
          <div className="full">
            <Checkbox label="Saltear los días que ya tienen un servicio cargado" checked={skipExisting} onChange={(e) => (setSkipExisting(e.target.checked), setPlan(null))} />
          </div>
        </div>

        {plan ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Unidad</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((p) => (
                  <tr key={p.date}>
                    <td className="nowrap" style={{ textTransform: 'capitalize' }}>
                      {longDate(p.date)}
                    </td>
                    <td>
                      {p.skipped ? (
                        <Badge>Ya tiene: {p.existing.join(', ')}</Badge>
                      ) : (
                        <>
                          <UnitBadge unit={p.unit} />
                          {p.existing.length ? <span className="muted"> (ya había: {p.existing.join(', ')})</span> : null}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!plan.length ? <p className="muted">No hay {WEEKDAYS[weekday]}s en ese período.</p> : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
