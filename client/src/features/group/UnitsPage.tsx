import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { Pencil, Plus } from 'lucide-react';
import { BRANCHES, BRANCH_INFO, KIDS_PER_ADULT, requiredAdults, unitSchema, type Branch } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { Unit } from '../../lib/types';
import { Badge, Button, Checkbox, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, UnitBadge } from '../../components/ui';

type UnitForm = z.input<typeof unitSchema>;

export function UnitFormModal({ unit, onClose }: { unit?: Unit; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UnitForm>({
    resolver: zodResolver(unitSchema),
    defaultValues: unit
      ? { code: unit.code, name: unit.name, branch: unit.branch as Branch, kidsPerAdult: unit.kidsPerAdult, active: unit.active }
      : { code: '', name: '', branch: 'scouts', kidsPerAdult: KIDS_PER_ADULT.scouts, active: true },
  });
  // Al cambiar de rama, el número pasa al de la rama nueva salvo que lo hayan escrito distinto a mano
  const lastBranch = useRef<Branch>((unit?.branch as Branch) ?? 'scouts');
  const branchField = register('branch', {
    onChange: (e: { target: { value: string } }) => {
      const next = e.target.value as Branch;
      const current = getValues('kidsPerAdult');
      if (current === null || current === undefined || Number(current) === KIDS_PER_ADULT[lastBranch.current]) {
        setValue('kidsPerAdult', KIDS_PER_ADULT[next], { shouldValidate: true });
      }
      lastBranch.current = next;
    },
  });
  const branch = watch('branch') as Branch;
  const perAdult = Number(watch('kidsPerAdult')) || KIDS_PER_ADULT[branch];

  const onSubmit = async (values: UnitForm) => {
    try {
      if (unit) await api.put(`/group/units/${unit.id}`, values);
      else await api.post('/group/units', values);
      await qc.invalidateQueries({ queryKey: ['units'] });
      toast.ok(unit ? 'Unidad actualizada' : 'Unidad creada');
      onClose();
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(e);
    }
  };

  return (
    <Modal
      title={unit ? `Editar ${unit.name}` : 'Nueva unidad'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="unit-form" loading={isSubmitting}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="unit-form" className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Nombre" required error={errors.name?.message} full>
          <Input {...register('name')} invalid={!!errors.name} placeholder="Unidad Scout Luis Conde" />
        </Field>
        <Field label="Código" required error={errors.code?.message} hint="Abreviatura corta, por ejemplo USLC">
          <Input {...register('code')} invalid={!!errors.code} style={{ textTransform: 'uppercase' }} />
        </Field>
        <Field label="Rama" required error={errors.branch?.message}>
          <Select {...branchField} invalid={!!errors.branch}>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {BRANCH_INFO[b].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Protagonistas por adulto"
          error={errors.kidsPerAdult?.message}
          hint={
            unit?.memberCount
              ? `1 adulto cada ${perAdult}: con ${unit.memberCount} protagonistas hacen falta ${requiredAdults(unit.memberCount, perAdult)} adultos como mínimo`
              : `1 adulto cada ${perAdult} protagonistas. En ${BRANCH_INFO[branch].label} lo habitual es ${KIDS_PER_ADULT[branch]}`
          }
        >
          <Input
            type="number"
            min={1}
            max={50}
            placeholder={String(KIDS_PER_ADULT[branch])}
            {...register('kidsPerAdult', { setValueAs: (v) => (v === '' || v === null || v === undefined ? null : Number(v)) })}
            invalid={!!errors.kidsPerAdult}
          />
        </Field>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <Checkbox {...register('active')} label="Unidad activa" />
        </div>
      </form>
    </Modal>
  );
}

export function UnitsPage() {
  const { can } = useAuth();
  const units = useUnits();
  const [editing, setEditing] = useState<Unit | 'new' | null>(null);

  const totalMembers = (units.data ?? []).reduce((a, u) => a + u.memberCount, 0);

  return (
    <>
      <PageHeader
        title="Unidades"
        sub={units.data ? `${units.data.length} unidades · ${totalMembers} protagonistas activos` : undefined}
        actions={
          can('group', 'create') ? (
            <Button onClick={() => setEditing('new')}>
              <Plus /> Nueva unidad
            </Button>
          ) : null
        }
      />
      {units.isLoading ? (
        <Loading />
      ) : units.error ? (
        <ErrorBox error={units.error} />
      ) : !units.data?.length ? (
        <Empty>Todavía no hay unidades cargadas.</Empty>
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Código</th>
                  <th className="num">Protagonistas</th>
                  <th className="num">Adultos {new Date().getFullYear()}</th>
                  <th className="num">Pequeños grupos</th>
                  <th>Estado</th>
                  {can('group', 'edit') ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {BRANCHES.map((b) => {
                  const list = units.data!.filter((u) => u.branch === b);
                  if (!list.length) return null;
                  return (
                    <BranchRows key={b} branch={b} units={list} canEdit={can('group', 'edit')} onEdit={(u) => setEditing(u)} />
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {editing ? <UnitFormModal unit={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function BranchRows({ branch, units, canEdit, onEdit }: { branch: Branch; units: Unit[]; canEdit: boolean; onEdit: (u: Unit) => void }) {
  const info = BRANCH_INFO[branch];
  return (
    <>
      <tr className="branch-row">
        <td colSpan={canEdit ? 7 : 6} style={{ borderLeft: `4px solid ${info.color}` }}>
          {info.label}
        </td>
      </tr>
      {units.map((u) => {
        const shortAdults = u.adultCount < u.minAdults;
        return (
          <tr key={u.id}>
            <td>
              <Link to={`/grupo/unidades/${u.id}`}>
                <UnitBadge unit={u} />
              </Link>
            </td>
            <td>
              <code>{u.code}</code>
            </td>
            <td className="num">{u.memberCount}</td>
            <td className="num">
              {u.adultCount}
              {u.memberCount ? (
                <span className="muted" title={`1 adulto cada ${u.kidsPerAdult} protagonistas`}>
                  {' '}
                  / mín. {u.minAdults}
                </span>
              ) : null}{' '}
              {shortAdults ? <Badge tone="warn">Faltan {u.minAdults - u.adultCount}</Badge> : null}
            </td>
            <td className="num">{u.smallGroups.filter((s) => s.active).length}</td>
            <td>{u.active ? <Badge tone="ok">Activa</Badge> : <Badge>Inactiva</Badge>}</td>
            {canEdit ? (
              <td className="num">
                <Button variant="ghost" size="sm" onClick={() => onEdit(u)} aria-label={`Editar ${u.name}`}>
                  <Pencil /> Editar
                </Button>
              </td>
            ) : null}
          </tr>
        );
      })}
    </>
  );
}
