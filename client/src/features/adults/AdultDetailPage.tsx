import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { adultCourseSchema, ageAt, BRANCHES, BRANCH_INFO, COURSE_KIND_LABELS, documentLabel, formatDate, trainingSummary, type Branch, type CourseKind } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { adultName, useCourses } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { AdultCourse, AdultDetail, Assignment, MemberDoc } from '../../lib/types';
import { DocumentDialog } from '../members/MemberDialogs';
import {
  Badge,
  Button,
  Card,
  ConfirmButton,
  DocDot,
  Empty,
  ErrorBox,
  Field,
  Input,
  LinkButton,
  Loading,
  Modal,
  PageHeader,
  Select,
  Textarea,
  UnitBadge,
} from '../../components/ui';
import { AdultStatusBadge } from './AdultsPage';
import { AssignmentModal } from './AssignmentModal';
import { ExperiencesCard, HabilitationsCard } from './TrainingRecords';

// ---------------- Formación ----------------
const courseFormSchema = adultCourseSchema.extend({ courseId: z.string().uuid('Elegí un curso') });
type CourseForm = z.input<typeof courseFormSchema>;

function CourseModal({ adultId, item, onClose }: { adultId: string; item?: AdultCourse; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const courses = useCourses();
  const {
    register,
    watch,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CourseForm>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: item
      ? {
          courseId: item.courseId,
          completedAt: item.completedAt ?? '',
          modulesDone: item.modulesDone ?? '',
          certificateUrl: item.certificateUrl ?? '',
          registryNumber: item.registryNumber ?? '',
          place: item.place ?? '',
          branch: (item.branch as Branch | null) ?? '',
          notes: item.notes ?? '',
        }
      : { courseId: '', completedAt: '', modulesDone: '', certificateUrl: '', registryNumber: '', place: '', branch: '', notes: '' },
  });

  const onSubmit = async (values: CourseForm) => {
    try {
      if (item) await api.put(`/adults/courses/${item.id}`, values);
      else await api.post(`/adults/${adultId}/courses`, values);
      await Promise.all([qc.invalidateQueries({ queryKey: ['adult', adultId] }), qc.invalidateQueries({ queryKey: ['adults'] })]);
      toast.ok(item ? 'Formación actualizada' : 'Formación registrada');
      onClose();
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(e);
    }
  };

  const available = (courses.data ?? []).filter((c) => c.active || c.id === item?.courseId);
  const selected = available.find((c) => c.id === watch('courseId'));
  const isIM = selected?.kind === 'insignia_madera';
  return (
    <Modal
      title={item ? 'Editar formación' : 'Registrar formación'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="course-form" loading={isSubmitting}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="course-form" className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Curso / insignia" required error={errors.courseId?.message} full hint="Los cursos se administran en Catálogos">
          <Select {...register('courseId')} invalid={!!errors.courseId}>
            <option value="">— Elegí —</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({COURSE_KIND_LABELS[c.kind as CourseKind] ?? c.kind})
              </option>
            ))}
          </Select>
        </Field>
        {selected?.totalModules ? (
          <Field label={`Módulos aprobados (de ${selected.totalModules})`} error={errors.modulesDone?.message}>
            <Input type="number" min={0} max={selected.totalModules} {...register('modulesDone')} invalid={!!errors.modulesDone} />
          </Field>
        ) : null}
        <Field
          label={isIM ? 'Fecha otorgada' : 'Fecha de aprobación'}
          error={errors.completedAt?.message}
          hint={selected?.totalModules ? 'Cuando completa todos los módulos' : undefined}
        >
          <Input type="date" {...register('completedAt')} invalid={!!errors.completedAt} />
        </Field>
        {isIM ? (
          <>
            <Field label="Registro SAAC" error={errors.registryNumber?.message} hint="El número de registro, como figura en Mi Rincón">
              <Input {...register('registryNumber')} invalid={!!errors.registryNumber} placeholder="21578" />
            </Field>
            <Field label="Lugar" error={errors.place?.message} hint="Dónde se otorgó">
              <Input {...register('place')} invalid={!!errors.place} />
            </Field>
            <Field label="Rama" error={errors.branch?.message}>
              <Select {...register('branch')}>
                <option value="">— Sin rama —</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {BRANCH_INFO[b].label}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : null}
        <Field label="Certificado (enlace)" error={errors.certificateUrl?.message} hint="Enlace al archivo en el Drive">
          <Input type="url" placeholder="https://drive.google.com/…" {...register('certificateUrl')} invalid={!!errors.certificateUrl} />
        </Field>
        <Field label="Notas" error={errors.notes?.message} full>
          <Textarea {...register('notes')} style={{ minHeight: 60 }} />
        </Field>
      </form>
    </Modal>
  );
}

const DOC_TONE = { ok: 'ok', expiring: 'warn', expired: 'danger', missing: 'neutral' } as const;

// ---------------- Página ----------------
export function AdultDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [assignment, setAssignment] = useState<Assignment | 'new' | null>(null);
  const [course, setCourse] = useState<AdultCourse | 'new' | null>(null);
  const [doc, setDoc] = useState<MemberDoc | null>(null);

  const adult = useQuery({ queryKey: ['adult', id], queryFn: () => api.get<AdultDetail>(`/adults/${id}`) });

  if (adult.isLoading) return <Loading />;
  if (adult.error) return <ErrorBox error={adult.error} />;
  const a = adult.data;
  if (!a) return <Empty>No se encontró el adulto.</Empty>;

  const canEdit = can('adults', 'edit');
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['adult', id] }),
      qc.invalidateQueries({ queryKey: ['adults'] }),
      qc.invalidateQueries({ queryKey: ['units'] }),
      qc.invalidateQueries({ queryKey: ['organigrama'] }),
    ]);

  const removeAdult = async () => {
    try {
      await api.del(`/adults/${a.id}`);
      await qc.invalidateQueries({ queryKey: ['adults'] });
      toast.ok('Adulto eliminado');
      navigate('/adultos');
    } catch (e) {
      toast.error(e);
    }
  };
  const removeAssignment = async (x: Assignment) => {
    try {
      await api.del(`/adults/assignments/${x.id}`);
      await refresh();
      toast.ok('Cargo eliminado');
    } catch (e) {
      toast.error(e);
    }
  };
  const removeCourse = async (x: AdultCourse) => {
    try {
      await api.del(`/adults/courses/${x.id}`);
      await refresh();
      toast.ok('Formación eliminada');
    } catch (e) {
      toast.error(e);
    }
  };

  const age = ageAt(a.birthDate);
  const assignments = [...a.assignments].sort((x, y) => y.year - x.year);
  const courses = [...a.courses].sort((x, y) => (y.completedAt ?? '').localeCompare(x.completedAt ?? ''));
  const training = trainingSummary(
    a.courses.map((c) => ({ name: c.course?.name ?? '', modulesDone: c.modulesDone })),
    age,
  );
  const dash = <span className="muted">—</span>;

  return (
    <>
      <PageHeader
        crumbs={[{ to: '/adultos', label: 'Adultos' }]}
        title={`${a.firstName} ${a.lastName}`}
        sub={
          <span className="row" style={{ gap: 8 }}>
            {a.totem ? <span>«{a.totem}»</span> : null}
            <AdultStatusBadge status={a.status} />
            {a.user ? <Badge tone={a.user.active ? 'info' : 'neutral'}>{a.user.active ? 'Usa la app' : 'Usuario desactivado'}</Badge> : null}
          </span>
        }
        actions={
          <>
            {canEdit ? (
              <LinkButton to={`/adultos/${a.id}/editar`} variant="secondary">
                <Pencil /> Editar
              </LinkButton>
            ) : null}
            {can('adults', 'delete') ? (
              <ConfirmButton
                title="Eliminar adulto"
                message={
                  <p>
                    ¿Querés eliminar a <strong>{a.firstName} {a.lastName}</strong>? Si dejó el Grupo, conviene marcarlo como <em>Baja</em> para conservar su
                    historial.
                  </p>
                }
                confirmLabel="Eliminar"
                onConfirm={removeAdult}
              >
                <Trash2 /> Eliminar
              </ConfirmButton>
            ) : null}
          </>
        }
      />

      <div className="stack">
        <div className="grid grid-2">
          <Card title="Datos personales">
            <dl className="dl">
              <dt>DNI</dt>
              <dd>{a.dni ?? dash}</dd>
              <dt>Fecha de nacimiento</dt>
              <dd>{a.birthDate ? `${formatDate(a.birthDate)}${age !== null ? ` (${age} años)` : ''}` : dash}</dd>
              <dt>Email</dt>
              <dd>{a.email ? <a href={`mailto:${a.email}`}>{a.email}</a> : dash}</dd>
              <dt>Teléfono</dt>
              <dd>{a.phone ? <a href={`tel:${a.phone.replace(/[^\d+]/g, '')}`}>{a.phone}</a> : dash}</dd>
              <dt>Dirección</dt>
              <dd>{a.address ?? dash}</dd>
              <dt>Ingreso al Grupo</dt>
              <dd>{a.joinedAt ? formatDate(a.joinedAt) : dash}</dd>
              {a.memberRecord ? (
                <>
                  <dt>Fue protagonista</dt>
                  <dd>
                    <Link to={`/protagonistas/${a.memberRecord.id}`}>Ver su historia como protagonista</Link>
                    <div className="muted">
                      {[
                        a.memberRecord.promiseDate ? `Promesa: ${formatDate(a.memberRecord.promiseDate)}` : null,
                        a.memberRecord.departedAt ? `Partida: ${formatDate(a.memberRecord.departedAt)}` : null,
                        a.memberRecord.unit ? `desde ${a.memberRecord.unit.name}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </dd>
                </>
              ) : null}
              {a.notes ? (
                <>
                  <dt>Notas</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>{a.notes}</dd>
                </>
              ) : null}
            </dl>
          </Card>
          <Card title="Asesoramiento personal">
            <dl className="dl">
              <dt>Su APF</dt>
              <dd>{a.advisor ? <Link to={`/adultos/${a.advisor.id}`}>{adultName(a.advisor)}</Link> : <span className="muted">Sin asignar</span>}</dd>
              <dt>Asesora a</dt>
              <dd>
                {a.advisees.length ? (
                  <ul className="list-plain">
                    {a.advisees.map((x) => (
                      <li key={x.id}>
                        <Link to={`/adultos/${x.id}`}>{adultName(x)}</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="muted">Nadie</span>
                )}
              </dd>
            </dl>
          </Card>
        </div>

        <Card
          title="Cargos por año"
          bodyClass=""
          actions={
            canEdit ? (
              <Button size="sm" onClick={() => setAssignment('new')}>
                <Plus /> Agregar cargo
              </Button>
            ) : null
          }
        >
          {!assignments.length ? (
            <Empty>Sin cargos registrados.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Año</th>
                    <th>Cargo</th>
                    <th>Unidad / equipo</th>
                    <th>Notas</th>
                    {canEdit ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((x) => (
                    <tr key={x.id}>
                      <td>{x.year}</td>
                      <td>{x.position}</td>
                      <td>
                        {x.unit ? (
                          <UnitBadge unit={x.unit} />
                        ) : x.supportTeam ? (
                          x.supportTeam.name
                        ) : x.branch ? (
                          <Badge tone="warn">Por asignar · {BRANCH_INFO[x.branch as Branch]?.label ?? x.branch}</Badge>
                        ) : (
                          <span className="muted">Grupo</span>
                        )}
                      </td>
                      <td className="muted">{x.notes}</td>
                      {canEdit ? (
                        <td className="num nowrap">
                          <Button variant="ghost" size="sm" onClick={() => setAssignment(x)} aria-label="Editar cargo">
                            <Pencil />
                          </Button>
                          <ConfirmButton
                            size="sm"
                            title="Eliminar cargo"
                            message={<p>¿Eliminar el cargo «{x.position}» de {x.year}?</p>}
                            confirmLabel="Eliminar"
                            onConfirm={() => removeAssignment(x)}
                          >
                            <Trash2 />
                          </ConfirmButton>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Documentación" bodyClass="">
          {!a.documents?.length ? (
            <Empty>No hay documentos definidos para adultos (se agregan en Administración → Catálogos).</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Estado</th>
                    <th>Entregado</th>
                    <th>Vence</th>
                    <th>Notas</th>
                    {canEdit ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {a.documents.map((d) => {
                    const exempt = !d.presented && d.status === 'ok';
                    const label = documentLabel(d.status, d, d.required);
                    return (
                      <tr key={d.documentTypeId}>
                        <td>{d.name}</td>
                        <td>
                          <span className="row" style={{ gap: 6 }}>
                            <DocDot status={d.status} muted={exempt} label={label} />
                            <Badge tone={exempt ? 'neutral' : DOC_TONE[d.status]}>{label}</Badge>
                          </span>
                        </td>
                        <td>{formatDate(d.presentedAt) || '—'}</td>
                        <td>{d.hasExpiry ? formatDate(d.expiresAt) || '—' : <span className="muted">No vence</span>}</td>
                        <td className="muted">{d.notes}</td>
                        {canEdit ? (
                          <td className="num">
                            <Button size="sm" variant="secondary" onClick={() => setDoc(d)}>
                              Actualizar
                            </Button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title={
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <h2>Formación</h2>
              <Badge tone={training.summary.startsWith('Insignia') ? 'ok' : training.summary === 'Sin formación registrada' ? 'warn' : 'info'}>
                {training.summary}
              </Badge>
            </div>
          }
          bodyClass=""
          actions={
            can('training', 'create') ? (
              <Button size="sm" onClick={() => setCourse('new')}>
                <Plus /> Registrar formación
              </Button>
            ) : null
          }
        >
          {!courses.length ? (
            <Empty>Sin formación registrada.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Curso / insignia</th>
                    <th>Tipo</th>
                    <th>Aprobado</th>
                    <th>Certificado</th>
                    <th>Notas</th>
                    {can('training', 'edit') || can('training', 'delete') ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {c.course?.name}
                        {c.course?.totalModules ? (
                          <span className="muted">
                            {' '}
                            · {c.modulesDone ?? 0}/{c.course.totalModules} módulos
                          </span>
                        ) : null}
                        {c.registryNumber || c.place || c.branch ? (
                          <div className="muted" style={{ fontSize: '0.85em' }}>
                            {[
                              c.registryNumber ? `Registro SAAC ${c.registryNumber}` : null,
                              c.place,
                              c.branch ? BRANCH_INFO[c.branch as Branch]?.label ?? c.branch : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        ) : null}
                      </td>
                      <td>{COURSE_KIND_LABELS[c.course?.kind as CourseKind] ?? c.course?.kind}</td>
                      <td className="nowrap">{c.completedAt ? formatDate(c.completedAt) : dash}</td>
                      <td>
                        {c.certificateUrl ? (
                          <a href={c.certificateUrl} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 4 }}>
                            Ver <ExternalLink size={14} />
                          </a>
                        ) : (
                          dash
                        )}
                      </td>
                      <td className="muted">{c.notes}</td>
                      {can('training', 'edit') || can('training', 'delete') ? (
                        <td className="num nowrap">
                          {can('training', 'edit') ? (
                            <Button variant="ghost" size="sm" onClick={() => setCourse(c)} aria-label="Editar formación">
                              <Pencil />
                            </Button>
                          ) : null}
                          {can('training', 'delete') ? (
                            <ConfirmButton
                              size="sm"
                              title="Eliminar formación"
                              message={<p>¿Eliminar «{c.course?.name}» del registro de formación?</p>}
                              confirmLabel="Eliminar"
                              onConfirm={() => removeCourse(c)}
                            >
                              <Trash2 />
                            </ConfirmButton>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <HabilitationsCard adultId={a.id} items={a.habilitations ?? []} />
        <ExperiencesCard adultId={a.id} items={a.experiences ?? []} />
      </div>

      {assignment ? <AssignmentModal adultId={a.id} item={assignment === 'new' ? undefined : assignment} onClose={() => setAssignment(null)} /> : null}
      {doc ? <DocumentDialog adultId={a.id} memberName={adultName(a)} doc={doc} onClose={() => setDoc(null)} onSaved={() => void refresh()} /> : null}
      {course ? <CourseModal adultId={a.id} item={course === 'new' ? undefined : course} onClose={() => setCourse(null)} /> : null}
    </>
  );
}
