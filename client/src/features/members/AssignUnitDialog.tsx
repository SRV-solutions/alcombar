import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BRANCH_INFO, type Branch } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Button, Field, Modal, Select } from '../../components/ui';

/**
 * Asigna la unidad a protagonistas que estaban "por asignar" (importados de Mi Rincón con su rama).
 * Solo ofrece las unidades de esa rama en las que la persona puede editar protagonistas.
 */
export function AssignUnitDialog({
  memberIds,
  branch,
  onClose,
  onDone,
}: {
  memberIds: string[];
  branch: string | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const units = useUnits();
  const options = (units.data ?? []).filter((u) => u.active && (!branch || u.branch === branch) && can('members', 'edit', u.id));
  const [unitId, setUnitId] = useState(options.length === 1 ? options[0].id : '');
  const [smallGroupId, setSmallGroupId] = useState('');
  const [busy, setBusy] = useState(false);
  const unit = options.find((u) => u.id === unitId);
  const info = branch ? BRANCH_INFO[branch as Branch] : null;

  const save = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ assigned: number; alreadyAssigned: number; otherBranch: string[] }>('/members/assign-unit', {
        memberIds,
        unitId,
        smallGroupId,
      });
      const parts = [`${r.assigned} ${r.assigned === 1 ? 'protagonista asignado' : 'protagonistas asignados'} a ${unit?.name}`];
      if (r.alreadyAssigned) parts.push(`${r.alreadyAssigned} ya tenían unidad`);
      if (r.otherBranch.length) parts.push(`${r.otherBranch.length} son de otra rama`);
      toast.ok(parts.join(' · '));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['members'] }),
        qc.invalidateQueries({ queryKey: ['member'] }),
        qc.invalidateQueries({ queryKey: ['units'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Asignar unidad"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy} disabled={!unitId}>
            Asignar {memberIds.length > 1 ? `a ${memberIds.length}` : ''}
          </Button>
        </>
      }
    >
      <div className="stack">
        <p style={{ margin: 0 }}>
          {memberIds.length === 1
            ? `Este protagonista${info ? ` de ${info.label}` : ''} todavía no tiene unidad. Elegí a cuál va.`
            : `Estos ${memberIds.length} protagonistas${info ? ` de ${info.label}` : ''} todavía no tienen unidad. Elegí a cuál van.`}
        </p>
        {!options.length ? (
          <div className="alert alert-warn">
            No tenés permiso para asignar protagonistas a ninguna unidad{info ? ` de ${info.label}` : ''}. Lo puede hacer el Jefe/a de esa unidad,
            Secretaría o Jefatura.
          </div>
        ) : (
          <div className="form-grid">
            <Field label="Unidad" required>
              <Select value={unitId} onChange={(e) => (setUnitId(e.target.value), setSmallGroupId(''))}>
                <option value="">Elegí la unidad</option>
                {options.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={info?.smallGroup.one ?? 'Pequeño grupo'} hint="Opcional: se puede elegir después">
              <Select value={smallGroupId} onChange={(e) => setSmallGroupId(e.target.value)} disabled={!unit || !unit.smallGroups.length}>
                <option value="">Sin asignar</option>
                {unit?.smallGroups
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}
