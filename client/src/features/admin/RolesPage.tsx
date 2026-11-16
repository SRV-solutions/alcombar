import { Fragment, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Lock, Plus } from 'lucide-react';
import { ACTION_LABELS, ACTIONS, MODULE_KEYS, MODULES, roleSchema, type Action, type ModuleInfo, type ModuleKey } from '@shared';
import { ApiError, api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useRoles } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { RoleInfo } from '../../lib/types';
import { Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Textarea } from '../../components/ui';

const moduleInfo = (k: string): ModuleInfo | undefined => (MODULES as Record<string, ModuleInfo>)[k];

export function RolesPage() {
  const { can } = useAuth();
  const roles = useRoles();
  const [editing, setEditing] = useState<RoleInfo | 'new' | null>(null);

  return (
    <>
      <PageHeader
        title="Roles y permisos"
        sub="Un rol agrupa permisos (módulo + acción). Al asignarlo a un usuario se elige el alcance: todo el Grupo o una unidad."
        actions={
          can('roles', 'create') ? (
            <Button onClick={() => setEditing('new')}>
              <Plus /> Nuevo rol
            </Button>
          ) : null
        }
      />
      <Card bodyClass="">
        {roles.isLoading ? (
          <Loading />
        ) : roles.error ? (
          <div className="card-body">
            <ErrorBox error={roles.error} />
          </div>
        ) : !roles.data?.length ? (
          <Empty>No hay roles.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Rol</th>
                  <th>Alcance</th>
                  <th>Descripción</th>
                  <th className="num">Usuarios</th>
                  <th className="num">Permisos</th>
                </tr>
              </thead>
              <tbody>
                {roles.data.map((r) => (
                  <tr key={r.id} className="clickable" onClick={() => setEditing(r)}>
                    <td style={{ fontWeight: 600 }}>
                      <div className="row" style={{ gap: 6 }}>
                        {r.name}
                        {r.isSystem ? (
                          <Badge tone="bordo">
                            <Lock size={12} /> Fijo
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td>{r.scope === 'unit' ? <Badge tone="info">Unidad</Badge> : <Badge tone="gold">Grupo</Badge>}</td>
                    <td className="muted">{r.description}</td>
                    <td className="num">{r.userCount}</td>
                    <td className="num">{r.isSystem ? 'Todos' : r.permissions.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing ? <RoleEditor role={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function RoleEditor({ role, onClose }: { role: RoleInfo | null; onClose: () => void }) {
  const isNew = !role;
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const readOnly = !!role?.isSystem || (isNew ? !can('roles', 'create') : !can('roles', 'edit'));

  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [scope, setScope] = useState<'group' | 'unit'>(role?.scope ?? 'group');
  // clave "modulo:accion" → unitLimited
  const [perms, setPerms] = useState<Map<string, boolean>>(
    () => new Map((role?.permissions ?? []).map((p) => [`${p.module}:${p.action}`, p.unitLimited])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const scopeLocked = !isNew && (role?.userCount ?? 0) > 0;

  const sections = useMemo(() => {
    const out: [string, ModuleKey[]][] = [];
    for (const k of MODULE_KEYS) {
      const s = MODULES[k].section;
      const entry = out.find((x) => x[0] === s);
      if (entry) entry[1].push(k);
      else out.push([s, [k]]);
    }
    return out;
  }, []);

  const toggle = (module: ModuleKey, action: Action) => {
    const key = `${module}:${action}`;
    setPerms((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, MODULES[module].unitScoped); // en roles de unidad, por defecto limitado a su unidad
      return next;
    });
  };
  const toggleLimited = (key: string) =>
    setPerms((prev) => {
      const next = new Map(prev);
      next.set(key, !next.get(key));
      return next;
    });
  const toggleModule = (module: ModuleKey) => {
    const mod = MODULES[module];
    const allOn = mod.actions.every((a) => perms.has(`${module}:${a}`));
    setPerms((prev) => {
      const next = new Map(prev);
      for (const a of mod.actions) {
        const key = `${module}:${a}`;
        if (allOn) next.delete(key);
        else if (!next.has(key)) next.set(key, mod.unitScoped);
      }
      return next;
    });
  };

  const save = async () => {
    const payload = {
      name,
      description,
      scope,
      permissions: [...perms].map(([key, limited]) => {
        const [module, action] = key.split(':');
        return { module, action, unitLimited: scope === 'unit' && !!moduleInfo(module)?.unitScoped && limited };
      }),
    };
    const parsed = roleSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path.join('.') || '_'] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (isNew) await api.post('/roles', payload);
      else await api.put(`/roles/${role.id}`, payload);
      await qc.invalidateQueries({ queryKey: ['roles'] });
      toast.ok(isNew ? 'Rol creado' : 'Permisos guardados');
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.details) setErrors(e.details);
      else toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.del(`/roles/${role!.id}`);
      await qc.invalidateQueries({ queryKey: ['roles'] });
      toast.ok('Rol eliminado');
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };

  const cbStyle = { width: 16, height: 16, accentColor: 'var(--bordo)', cursor: readOnly ? 'default' : 'pointer' } as const;

  return (
    <Modal
      wide
      title={isNew ? 'Nuevo rol' : role.name}
      onClose={onClose}
      footer={
        <>
          {!isNew && !role.isSystem && can('roles', 'delete') && role.userCount === 0 ? (
            <div style={{ marginRight: 'auto' }}>
              <ConfirmButton
                title="Eliminar rol"
                message={
                  <>
                    ¿Eliminar el rol <strong>{role.name}</strong>? No está asignado a ningún usuario.
                  </>
                }
                confirmLabel="Eliminar"
                onConfirm={remove}
              >
                Eliminar rol
              </ConfirmButton>
            </div>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            {readOnly ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!readOnly ? (
            <Button loading={saving} onClick={() => void save()}>
              {isNew ? 'Crear rol' : 'Guardar'}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nombre" required error={errors.name}>
          <Input value={name} disabled={readOnly} invalid={!!errors.name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field
          label="Alcance"
          error={errors.scope}
          hint={scopeLocked ? 'No se puede cambiar: el rol ya está asignado a usuarios' : 'Unidad: al asignarlo se elige la unidad de la persona'}
        >
          <Select value={scope} disabled={readOnly || scopeLocked} onChange={(e) => setScope(e.target.value as 'group' | 'unit')}>
            <option value="group">Grupo</option>
            <option value="unit">Unidad</option>
          </Select>
        </Field>
        <Field label="Descripción" full error={errors.description}>
          <Textarea value={description ?? ''} disabled={readOnly} rows={2} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
      {errors._ || errors.permissions ? <div className="alert alert-error mt">{errors._ ?? errors.permissions}</div> : null}

      {role?.isSystem ? (
        <div className="alert alert-info mt">
          <strong>Tiene todos los permisos; están fijos en el código.</strong> Así el sistema nunca se queda sin administrador.
        </div>
      ) : (
        <>
          <h3 style={{ marginTop: 20 }}>Permisos</h3>
          {scope === 'unit' ? (
            <p className="muted">
              <strong>Solo su unidad:</strong> si está marcado, el permiso vale solo para la unidad asignada; si no, vale para todo el Grupo (por
              ejemplo, ver protagonistas de todas las unidades).
            </p>
          ) : (
            <p className="muted">En un rol de alcance Grupo, todos los permisos valen para todas las unidades.</p>
          )}
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="table matrix">
              <thead>
                <tr>
                  <th>Módulo</th>
                  {ACTIONS.map((a) => (
                    <th key={a}>{ACTION_LABELS[a]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sections.map(([section, keys]) => (
                  <Fragment key={section}>
                    <tr className="section-row">
                      <td colSpan={ACTIONS.length + 1}>{section}</td>
                    </tr>
                    {keys.map((k) => {
                      const mod: ModuleInfo = MODULES[k];
                      return (
                        <tr key={k}>
                          <td>
                            {readOnly ? (
                              <div style={{ fontWeight: 600 }}>{mod.label}</div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleModule(k)}
                                title="Marcar o desmarcar todo el módulo"
                                style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', fontWeight: 600, cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
                              >
                                {mod.label}
                              </button>
                            )}
                            {mod.description ? <div className="muted" style={{ fontSize: '0.78rem' }}>{mod.description}</div> : null}
                          </td>
                          {ACTIONS.map((a) => {
                            if (!mod.actions.includes(a)) {
                              return (
                                <td key={a}>
                                  <span className="muted">·</span>
                                </td>
                              );
                            }
                            const key = `${k}:${a}`;
                            const checked = perms.has(key);
                            return (
                              <td key={a} style={{ verticalAlign: 'top' }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={readOnly}
                                  onChange={() => toggle(k, a)}
                                  aria-label={`${mod.label}: ${ACTION_LABELS[a]}`}
                                  style={cbStyle}
                                />
                                {scope === 'unit' && mod.unitScoped && checked ? (
                                  <label
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 3,
                                      fontSize: '0.68rem',
                                      color: perms.get(key) ? 'var(--bordo)' : 'var(--gris)',
                                      marginTop: 2,
                                      whiteSpace: 'nowrap',
                                      cursor: readOnly ? 'default' : 'pointer',
                                    }}
                                    title="Si está marcado, vale solo para la unidad asignada"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!!perms.get(key)}
                                      disabled={readOnly}
                                      onChange={() => toggleLimited(key)}
                                      style={{ width: 12, height: 12, accentColor: 'var(--bordo)' }}
                                    />
                                    solo su unidad
                                  </label>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {!readOnly ? <p className="muted mt">Tocá el nombre de un módulo para marcar o desmarcar todas sus acciones.</p> : null}
        </>
      )}
    </Modal>
  );
}
