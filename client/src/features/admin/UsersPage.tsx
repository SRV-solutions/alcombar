import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Link2, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { userCreateSchema, userUpdateSchema } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { adultName, useAdults, useRoles, useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { UserInfo } from '../../lib/types';
import { Badge, Button, Card, Checkbox, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select } from '../../components/ui';

export interface LinkInfo {
  url: string;
  purpose: 'invite' | 'reset';
  emailSent: boolean;
  userName: string;
  userEmail: string | null;
}

const fmtDateTime = (s: string | null) => (s ? new Date(s).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export function UsersPage() {
  const { can } = useAuth();
  const toast = useToast();
  const users = useQuery({ queryKey: ['users'], queryFn: () => api.get<UserInfo[]>('/users') });
  const [editing, setEditing] = useState<UserInfo | 'new' | null>(null);
  // Desde la ficha de un adulto: ?editar=<usuario> abre su usuario; ?nuevo=<adulto> abre el alta con el adulto elegido
  const [params, setParams] = useSearchParams();
  const wantEdit = params.get('editar');
  const presetAdultId = params.get('nuevo');
  useEffect(() => {
    if (!users.data || editing) return;
    if (wantEdit) {
      const u = users.data.find((x) => x.id === wantEdit);
      if (u && !u.memberId) setEditing(u);
      setParams({}, { replace: true });
    } else if (presetAdultId) {
      const existing = users.data.find((x) => x.adultId === presetAdultId);
      setEditing(existing ?? 'new');
      if (existing) setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users.data, wantEdit, presetAdultId]);
  const [link, setLink] = useState<LinkInfo | null>(null);
  const [q, setQ] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const genLink = useMutation({
    mutationFn: async (u: UserInfo) => {
      const r = await api.post<{ url: string; purpose: 'invite' | 'reset'; emailSent: boolean }>(`/users/${u.id}/link`);
      return { ...r, userName: u.name, userEmail: u.email };
    },
    onSuccess: (r) => setLink(r),
    onError: (e) => toast.error(e),
  });

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (users.data ?? []).filter(
      (u) => (showInactive || u.active) && (!term || u.name.toLowerCase().includes(term) || (u.email ?? '').toLowerCase().includes(term)),
    );
  }, [users.data, q, showInactive]);

  const canEdit = can('users', 'edit');

  return (
    <>
      <PageHeader
        title="Usuarios"
        sub={
          <>
            Quién puede entrar a la app y con qué permisos. Cada cuenta es de un adulto del Grupo (sus datos están en <Link to="/adultos">Adultos</Link>) y recibe un enlace para elegir su contraseña; los rovers entran con su DNI.
          </>
        }
        actions={
          can('users', 'create') ? (
            <Button onClick={() => setEditing('new')}>
              <UserPlus /> Nuevo usuario
            </Button>
          ) : null
        }
      />
      <div className="toolbar">
        <Input className="grow" placeholder="Buscar por nombre o email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Checkbox label="Mostrar desactivados" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
      </div>
      <Card bodyClass="">
        {users.isLoading ? (
          <Loading />
        ) : users.error ? (
          <div className="card-body">
            <ErrorBox error={users.error} />
          </div>
        ) : !list.length ? (
          <Empty>No hay usuarios para mostrar.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Roles</th>
                  <th>Estado</th>
                  <th>Último ingreso</th>
                  {canEdit ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    {/* Nombre, email y adulto en una sola columna: casi siempre el adulto es la misma persona */}
                    <td className="user-cell">
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div className="muted user-email">{u.email ?? 'Entra con su DNI (todavía sin mail)'}</div>
                      {u.memberId ? (
                        <div className="muted user-email">
                          Rover · <Link to={`/protagonistas/${u.memberId}`}>ver su ficha</Link>
                        </div>
                      ) : u.adult && adultName(u.adult).replace(/s*(«.*»)$/, '').trim().toLowerCase() !== u.name.trim().toLowerCase() ? (
                        <div className="muted user-email">Adulto: {adultName(u.adult)}</div>
                      ) : u.adult?.totem ? (
                        <div className="muted user-email">«{u.adult.totem}»</div>
                      ) : !u.adult ? (
                        <div className="muted user-email">Sin adulto vinculado</div>
                      ) : null}
                    </td>
                    <td>
                      {u.userRoles.length ? (
                        <div className="row" style={{ gap: 4 }}>
                          {u.userRoles.map((ur) => (
                            <Badge key={ur.id} tone={ur.role.key === 'superadmin' ? 'bordo' : 'neutral'}>
                              {ur.role.name}
                              {ur.unit ? ` (${ur.unit.code})` : ''}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">Sin roles</span>
                      )}
                    </td>
                    <td>
                      {/* Un solo estado: desactivado, sin contraseña todavía o activo */}
                      {!u.active ? (
                        <Badge>Desactivado</Badge>
                      ) : !u.hasPassword ? (
                        <>
                          <Badge tone="warn">Sin contraseña</Badge>
                          <div className="muted user-email">
                            {u.invite?.state === 'vigente'
                              ? `Enlace enviado, vence el ${new Date(u.invite.expiresAt!).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })}`
                              : u.invite?.state === 'vencida'
                                ? 'El enlace venció'
                                : 'Nunca se le envió el enlace'}
                          </div>
                        </>
                      ) : (
                        <Badge tone="ok">Activo</Badge>
                      )}
                    </td>
                    <td className="nowrap">{fmtDateTime(u.lastLoginAt)}</td>
                    {canEdit ? (
                      <td className="nowrap">
                        {/* La cuenta de un rover se maneja desde su ficha (acceso, contraseña y suspensión) */}
                        {u.memberId ? null : (
                        <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                            <Pencil /> Editar
                          </Button>
                          {u.active ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={genLink.isPending && genLink.variables?.id === u.id}
                              onClick={() => genLink.mutate(u)}
                              title={u.hasPassword ? 'Enlace para restablecer la contraseña' : 'Nuevo enlace de invitación'}
                            >
                              <Link2 /> Generar enlace
                            </Button>
                          ) : null}
                        </div>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing ? (
        <UserFormModal
          user={editing === 'new' ? null : editing}
          presetAdultId={editing === 'new' ? presetAdultId : null}
          onClose={() => {
            setEditing(null);
            if (presetAdultId) setParams({}, { replace: true });
          }}
          onCreated={(l) => {
            setEditing(null);
            setLink(l);
          }}
        />
      ) : null}
      {link ? <LinkModal link={link} onClose={() => setLink(null)} /> : null}
    </>
  );
}

/**
 * El acceso a la app de una persona, en un solo lugar: alta o edición (mail, roles, activo) y el enlace para entrar.
 * Lo usan la lista y la ficha de Adultos; al cerrar ya quedó todo actualizado.
 */
export function AccessDialog({ user, presetAdultId, fixedAdult, onClose }: { user: UserInfo | null; presetAdultId?: string | null; fixedAdult?: boolean; onClose: () => void }) {
  const [link, setLink] = useState<LinkInfo | null>(null);
  if (link) return <LinkModal link={link} onClose={onClose} />;
  return <UserFormModal user={user} presetAdultId={presetAdultId} fixedAdult={fixedAdult} onClose={onClose} onCreated={setLink} />;
}

// ---------------- Modal con el enlace ----------------
function LinkModal({ link, onClose }: { link: LinkInfo; onClose: () => void }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      toast.ok('Enlace copiado');
    } catch {
      toast.info('No se pudo copiar automáticamente: seleccioná el enlace y copialo a mano');
    }
  };
  const isInvite = link.purpose === 'invite';
  return (
    <Modal
      title={isInvite ? 'Enlace de invitación' : 'Enlace para restablecer la contraseña'}
      onClose={onClose}
      footer={<Button onClick={onClose}>Listo</Button>}
    >
      <p>
        {isInvite ? 'Con este enlace' : 'Con este enlace'} <strong>{link.userName}</strong> ({link.userEmail}){' '}
        {isInvite ? 'elige su contraseña y entra por primera vez.' : 'elige una contraseña nueva.'}
      </p>
      {link.emailSent ? (
        <div className="alert alert-ok">También se envió por email a {link.userEmail}.</div>
      ) : (
        <div className="alert alert-warn">
          Todavía no está configurado el envío de emails: copiá el enlace y mandáselo vos por WhatsApp o email.
        </div>
      )}
      <div className="row mt" style={{ flexWrap: 'nowrap' }}>
        <Input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} style={{ flex: 1 }} aria-label="Enlace" />
        <Button variant="secondary" onClick={() => void copy()}>
          <Copy /> {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <p className="muted mt">
        Sirve una sola vez y vence en {isInvite ? '72 horas' : '60 minutos'}. Si vence, generá uno nuevo desde la lista de usuarios.
      </p>
    </Modal>
  );
}

// ---------------- Alta / edición ----------------
interface FormValues {
  email: string;
  name: string;
  adultId: string;
  active: boolean;
  roles: { roleId: string; unitId: string | null }[];
}

function UserFormModal({
  user,
  presetAdultId,
  fixedAdult,
  onClose,
  onCreated,
}: {
  user: UserInfo | null;
  presetAdultId?: string | null;
  /** Abierto desde la ficha de un adulto: la persona ya está elegida. */
  fixedAdult?: boolean;
  onClose: () => void;
  onCreated: (l: LinkInfo) => void;
}) {
  const isNew = !user;
  const { me, can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const roles = useRoles();
  const units = useUnits();
  const canSeeAdults = can('adults', 'view');
  const adults = useAdults(canSeeAdults);
  const autoName = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isNew ? userCreateSchema : userUpdateSchema),
    defaultValues: user
      ? {
          email: user.email ?? '',
          name: user.name,
          adultId: user.adultId ?? '',
          active: user.active,
          roles: user.userRoles.map((ur) => ({ roleId: ur.roleId, unitId: ur.unitId ?? '' })),
        }
      : { email: '', name: '', adultId: presetAdultId ?? '', active: true, roles: [{ roleId: '', unitId: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'roles' });
  const roleRows = watch('roles');
  // Los roles, unidades y adultos llegan después de abrir el formulario: hasta que estén, no se dibujan las filas
  // de roles (si no, el desplegable queda en "Elegí un rol…" aunque el usuario ya tenga ese rol)
  const catalogsReady = !!roles.data && !!units.data;
  useEffect(() => {
    if (!adults.data) return;
    setValue('adultId', getValues('adultId'));
    // Alta desde la ficha de un adulto: trae su nombre y su mail
    if (isNew && presetAdultId) {
      const a = adults.data.find((x) => x.id === presetAdultId) as { firstName: string; lastName: string; email?: string | null } | undefined;
      if (a) {
        const n = `${a.firstName} ${a.lastName}`;
        if (!getValues('name')) {
          setValue('name', n);
          autoName.current = n;
        }
        if (!getValues('email') && a.email) setValue('email', a.email);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adults.data, getValues, setValue]);
  const roleById = (id: string) => roles.data?.find((r) => r.id === id);
  const isSelf = user?.id === me?.user.id;
  // El acceso se ve en Usuarios y también en la lista y la ficha de Adultos
  const refreshAll = () => Promise.all([qc.invalidateQueries({ queryKey: ['users'] }), qc.invalidateQueries({ queryKey: ['adults'] }), qc.invalidateQueries({ queryKey: ['adult'] })]);
  const [linking, setLinking] = useState(false);
  const genLink = async () => {
    if (!user) return;
    setLinking(true);
    try {
      const r = await api.post<{ url: string; purpose: 'invite' | 'reset'; emailSent: boolean }>(`/users/${user.id}/link`);
      await refreshAll();
      onCreated({ ...r, userName: user.name, userEmail: user.email });
    } catch (e) {
      toast.error(e);
    } finally {
      setLinking(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    // Un rol de alcance Unidad necesita la unidad
    let invalid = false;
    values.roles.forEach((r, i) => {
      if (roleById(r.roleId)?.scope === 'unit' && !r.unitId) {
        setError(`roles.${i}.unitId`, { message: 'Elegí la unidad' });
        invalid = true;
      }
    });
    if (invalid) return;
    const seen = new Set<string>();
    const rolesPayload = values.roles
      .map((r) => ({ roleId: r.roleId, unitId: roleById(r.roleId)?.scope === 'unit' ? r.unitId || null : null }))
      .filter((r) => {
        const k = `${r.roleId}|${r.unitId ?? ''}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    try {
      if (isNew) {
        const r = await api.post<{ user: UserInfo; inviteUrl: string; emailSent: boolean }>('/users', {
          email: values.email,
          name: values.name,
          adultId: values.adultId || null,
          roles: rolesPayload,
        });
        await refreshAll();
        toast.ok(fixedAdult ? 'Acceso creado' : 'Usuario creado');
        onCreated({ url: r.inviteUrl, purpose: 'invite', emailSent: r.emailSent, userName: r.user.name, userEmail: r.user.email });
      } else {
        const r = await api.put<UserInfo & { invite: { url: string; emailSent: boolean } | null }>(`/users/${user.id}`, {
          email: values.email,
          name: values.name,
          adultId: values.adultId || null,
          active: values.active,
          roles: rolesPayload,
        });
        await refreshAll();
        toast.ok(r.email !== user.email ? 'Email corregido' : fixedAdult ? 'Acceso actualizado' : 'Usuario actualizado');
        // Si todavía no había elegido contraseña, la invitación salió de nuevo a la dirección correcta
        if (r.invite) onCreated({ url: r.invite.url, purpose: 'invite', emailSent: r.invite.emailSent, userName: r.name, userEmail: r.email });
        else onClose();
      }
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(e);
    }
  });

  const adultField = register('adultId', {
    onChange: (e: { target: { value: string } }) => {
      const a = adults.data?.find((x) => x.id === e.target.value);
      const current = getValues('name').trim();
      if (a && (!current || current === autoName.current)) {
        const n = `${a.firstName} ${a.lastName}`;
        setValue('name', n, { shouldValidate: true });
        autoName.current = n;
      }
    },
  });

  return (
    <Modal
      wide
      title={fixedAdult ? (isNew ? 'Dar acceso a la app' : `Acceso a la app: ${user.name}`) : isNew ? 'Nuevo usuario' : `Editar usuario: ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" loading={isSubmitting}>
            {isNew ? 'Crear y generar invitación' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={onSubmit} noValidate>
        <div className="form-grid">
          <Field label="Email" required error={errors.email?.message} hint={
              isNew
                ? 'Con este email va a iniciar sesión'
                : user.hasPassword
                  ? 'Si lo cambiás, pasa a iniciar sesión con el nuevo (la contraseña es la misma)'
                  : 'Si lo corregís, la invitación sale de nuevo al email nuevo y la anterior deja de servir'
            }
          >
            <Input type="email" autoComplete="off" invalid={!!errors.email} {...register('email')} />
          </Field>
          <div style={{ display: fixedAdult ? 'none' : 'contents' }}>
          <Field
            label="Adulto vinculado"
            error={errors.adultId?.message}
            hint={canSeeAdults ? 'La ficha de adulto de esta persona (opcional)' : 'No tenés permiso para ver adultos'}
          >
            <Select disabled={!canSeeAdults || adults.isLoading} {...adultField}>
              <option value="">— Sin vincular —</option>
              {(adults.data ?? []).map((a) => {
                const taken = !!a.user && a.user.id !== user?.id;
                return (
                  <option key={a.id} value={a.id} disabled={taken}>
                    {a.lastName}, {a.firstName}
                    {a.totem ? ` («${a.totem}»)` : ''}
                    {taken ? ' — ya tiene usuario' : ''}
                  </option>
                );
              })}
            </Select>
          </Field>
          </div>
          <Field label="Nombre para mostrar" required error={errors.name?.message}>
            <Input invalid={!!errors.name} {...register('name')} />
          </Field>
          {!isNew ? (
            <Field label="Estado" hint={isSelf ? 'No podés desactivar tu propio usuario' : 'Los usuarios no se borran: se desactivan y conservan su historial'}>
              <Checkbox label="Usuario activo" disabled={isSelf} {...register('active')} />
            </Field>
          ) : null}
        </div>

        <h3 className="mt" style={{ marginTop: 22 }}>
          Roles
        </h3>
        {user ? (
          <div className="current-roles">
            <span className="muted">Roles que tiene ahora:</span>
            {user.userRoles.length ? (
              user.userRoles.map((ur) => (
                <Badge key={ur.id} tone={ur.role.key === 'superadmin' ? 'bordo' : 'neutral'}>
                  {ur.role.name}
                  {ur.unit ? ` (${ur.unit.code})` : ''}
                </Badge>
              ))
            ) : (
              <strong>ninguno</strong>
            )}
          </div>
        ) : null}
        <p className="muted">
          Abajo los podés cambiar, quitar o sumar otros. Los roles de alcance Unidad se limitan a la unidad elegida. Una persona puede tener varios roles.
        </p>
        {errors.roles?.message ? <div className="alert alert-error mb">{errors.roles.message}</div> : null}
        {!catalogsReady ? <Loading /> : null}
        <div className="stack" style={{ marginTop: 8, display: catalogsReady ? undefined : 'none' }}>
          {catalogsReady && fields.map((f, i) => {
            const row = roleRows?.[i];
            const role = row ? roleById(row.roleId) : undefined;
            const roleOptions = (roles.data ?? []).filter((r) => r.key !== 'superadmin' || me?.isSuperadmin || r.id === f.roleId);
            return (
              <div key={f.id} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Select
                    invalid={!!errors.roles?.[i]?.roleId}
                    aria-label="Rol"
                    {...register(`roles.${i}.roleId` as const, {
                      onChange: () => setValue(`roles.${i}.unitId` as const, ''),
                    })}
                  >
                    <option value="">Elegí un rol…</option>
                    {roleOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.scope === 'unit' ? 'Unidad' : 'Grupo'})
                      </option>
                    ))}
                  </Select>
                  {errors.roles?.[i]?.roleId ? <span className="error" style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>Elegí un rol</span> : null}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {role?.scope === 'unit' ? (
                    <>
                      <Select invalid={!!errors.roles?.[i]?.unitId} aria-label="Unidad" {...register(`roles.${i}.unitId` as const)}>
                        <option value="">Elegí la unidad…</option>
                        {(units.data ?? []).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </Select>
                      {errors.roles?.[i]?.unitId ? (
                        <span className="error" style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>
                          {errors.roles[i]?.unitId?.message ?? 'Elegí la unidad'}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <div className="muted" style={{ padding: '8px 2px' }}>
                      {role ? 'Vale para todo el Grupo' : ''}
                    </div>
                  )}
                </div>
                <Button variant="ghost" className="btn-icon" onClick={() => remove(i)} aria-label="Quitar rol" title="Quitar rol">
                  <Trash2 />
                </Button>
              </div>
            );
          })}
          {!fields.length ? <div className="alert alert-warn">Sin roles, el usuario va a poder entrar pero no va a ver ningún módulo.</div> : null}
        </div>
        <div style={{ marginTop: 10 }}>
          <Button variant="secondary" size="sm" onClick={() => append({ roleId: '', unitId: '' })}>
            <Plus /> Agregar rol
          </Button>
        </div>
        {fixedAdult && user?.active ? (
          <div className="access-link">
            <div>
              <strong>Enlace para entrar</strong>
              <div className="muted">
                {user.hasPassword ? 'Si se olvidó la contraseña, con un enlace nuevo elige otra.' : 'Todavía no eligió su contraseña: generale un enlace de invitación nuevo.'} Le llega por mail y lo podés copiar para mandárselo por WhatsApp.
              </div>
            </div>
            <Button variant="secondary" size="sm" loading={linking} onClick={() => void genLink()}>
              <Link2 /> Generar enlace
            </Button>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
