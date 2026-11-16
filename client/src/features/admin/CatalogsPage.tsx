import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus } from 'lucide-react';
import { COURSE_KIND_LABELS, COURSE_KINDS, courseSchema, documentTypeSchema, type CourseKind } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { applyServerErrors } from '../../lib/forms';
import { useCourses, useDocumentTypes } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { Course, DocumentType } from '../../lib/types';
import { Badge, Button, Card, Checkbox, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select } from '../../components/ui';

export function CatalogsPage() {
  const { can } = useAuth();
  const docTypes = useDocumentTypes();
  const courses = useCourses();
  const [docEdit, setDocEdit] = useState<DocumentType | 'new' | null>(null);
  const [courseEdit, setCourseEdit] = useState<Course | 'new' | null>(null);
  const canDocs = can('group', 'edit');
  const canCourseCreate = can('training', 'create');
  const canCourseEdit = can('training', 'edit');

  return (
    <>
      <PageHeader title="Catálogos" sub="Listas que usa el resto de la app. Se pueden ampliar sin tocar el código." />
      <div className="stack">
        <Card
          title="Documentación de protagonistas"
          actions={
            canDocs ? (
              <Button size="sm" onClick={() => setDocEdit('new')}>
                <Plus /> Agregar
              </Button>
            ) : null
          }
          bodyClass=""
        >
          <p className="muted" style={{ padding: '12px 20px 0' }}>
            Solo se registra si cada documento fue presentado y cuándo vence. No se guarda su contenido ni datos de salud.
          </p>
          {docTypes.isLoading ? (
            <Loading />
          ) : docTypes.error ? (
            <div className="card-body">
              <ErrorBox error={docTypes.error} />
            </div>
          ) : !docTypes.data?.length ? (
            <Empty>No hay tipos de documento.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="num" style={{ width: 60 }}>
                      Orden
                    </th>
                    <th>Documento</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                    {canDocs ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {docTypes.data.map((d) => (
                    <tr key={d.id}>
                      <td className="num">{d.sortOrder}</td>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td>{d.hasExpiry ? 'Tiene vencimiento' : <span className="muted">No vence</span>}</td>
                      <td>{d.active ? <Badge tone="ok">Activo</Badge> : <Badge>Inactivo</Badge>}</td>
                      {canDocs ? (
                        <td className="num">
                          <Button variant="ghost" size="sm" onClick={() => setDocEdit(d)}>
                            <Pencil /> Editar
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Cursos de formación"
          actions={
            canCourseCreate ? (
              <Button size="sm" onClick={() => setCourseEdit('new')}>
                <Plus /> Agregar
              </Button>
            ) : null
          }
          bodyClass=""
        >
          {courses.isLoading ? (
            <Loading />
          ) : courses.error ? (
            <div className="card-body">
              <ErrorBox error={courses.error} />
            </div>
          ) : !courses.data?.length ? (
            <Empty>No hay cursos cargados.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    {canCourseEdit ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {courses.data.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{COURSE_KIND_LABELS[c.kind as CourseKind] ?? c.kind}</td>
                      <td>{c.active ? <Badge tone="ok">Activo</Badge> : <Badge>Inactivo</Badge>}</td>
                      {canCourseEdit ? (
                        <td className="num">
                          <Button variant="ghost" size="sm" onClick={() => setCourseEdit(c)}>
                            <Pencil /> Editar
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {docEdit ? (
        <DocTypeModal
          docType={docEdit === 'new' ? null : docEdit}
          nextOrder={Math.max(0, ...(docTypes.data ?? []).map((d) => d.sortOrder)) + 1}
          onClose={() => setDocEdit(null)}
        />
      ) : null}
      {courseEdit ? <CourseModal course={courseEdit === 'new' ? null : courseEdit} onClose={() => setCourseEdit(null)} /> : null}
    </>
  );
}

interface DocForm {
  name: string;
  hasExpiry: boolean;
  active: boolean;
  sortOrder: number | string;
}

function DocTypeModal({ docType, nextOrder, onClose }: { docType: DocumentType | null; nextOrder: number; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DocForm>({
    resolver: zodResolver(documentTypeSchema),
    defaultValues: docType
      ? { name: docType.name, hasExpiry: docType.hasExpiry, active: docType.active, sortOrder: docType.sortOrder }
      : { name: '', hasExpiry: false, active: true, sortOrder: nextOrder },
  });
  const onSubmit = handleSubmit(async (values) => {
    try {
      if (docType) await api.put(`/group/document-types/${docType.id}`, values);
      else await api.post('/group/document-types', values);
      await qc.invalidateQueries({ queryKey: ['document-types'] });
      toast.ok(docType ? 'Documento actualizado' : 'Documento agregado');
      onClose();
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(e);
    }
  });
  return (
    <Modal
      title={docType ? 'Editar documento' : 'Nuevo documento'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="doctype-form" loading={isSubmitting}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="doctype-form" onSubmit={onSubmit} noValidate>
        <div className="form-grid">
          <Field label="Nombre" required full error={errors.name?.message} hint="Por ejemplo: Autorización de campamento">
            <Input invalid={!!errors.name} {...register('name')} />
          </Field>
          <Field label="Orden" error={errors.sortOrder?.message} hint="Posición en las columnas del tablero">
            <Input type="number" min={0} invalid={!!errors.sortOrder} {...register('sortOrder')} />
          </Field>
          <div className="field" style={{ justifyContent: 'flex-end', gap: 10 }}>
            <Checkbox label="Tiene fecha de vencimiento" {...register('hasExpiry')} />
            <Checkbox label="Activo (se controla en el tablero)" {...register('active')} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

interface CourseForm {
  name: string;
  kind: string;
  active: boolean;
}

function CourseModal({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: course ? { name: course.name, kind: course.kind, active: course.active } : { name: '', kind: 'curso', active: true },
  });
  const onSubmit = handleSubmit(async (values) => {
    try {
      if (course) await api.put(`/group/courses/${course.id}`, values);
      else await api.post('/group/courses', values);
      await qc.invalidateQueries({ queryKey: ['courses'] });
      toast.ok(course ? 'Curso actualizado' : 'Curso agregado');
      onClose();
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(e);
    }
  });
  return (
    <Modal
      title={course ? 'Editar curso' : 'Nuevo curso'}
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
      <form id="course-form" onSubmit={onSubmit} noValidate>
        <div className="form-grid">
          <Field label="Nombre" required full error={errors.name?.message}>
            <Input invalid={!!errors.name} {...register('name')} />
          </Field>
          <Field label="Tipo" required error={errors.kind?.message}>
            <Select invalid={!!errors.kind} {...register('kind')}>
              {COURSE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {COURSE_KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <Checkbox label="Activo" {...register('active')} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
