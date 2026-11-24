import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, Save } from 'lucide-react';
import { BRANCH_INFO, BRANCHES, campPermitSchema, type CampPermitInput, type SignatureData } from '@shared';
import { api } from '../../lib/api';
import { applyServerErrors } from '../../lib/forms';
import { useToast } from '../../lib/toast';
import { Button, Card, ErrorBox, Field, Input, Loading } from '../../components/ui';
import { CampPermitSignature } from './CampPermitSignature';
import type { CampDetail, CampPermit } from './types';

type Key = keyof CampPermit['values'];
/** Lo que conviene tener completo antes de presentar el permiso (no impide descargarlo). */
const EXPECTED: [Key, string][] = [
  ['placeLocality', 'localidad'],
  ['placeProvince', 'provincia'],
  ['placeAddress', 'dirección del lugar'],
  ['healthName', 'unidad sanitaria más cercana'],
  ['healthPhone', 'teléfono de la unidad sanitaria'],
  ['policeName', 'destacamento policial'],
  ['policePhone', 'teléfono del destacamento'],
  ['campPhone', 'celular en el campamento'],
  ['departureTime', 'hora de salida'],
  ['arrivalTime', 'hora de llegada'],
  ['chiefLevel', 'nivel de formación del Jefe/a de Campo'],
  ['zoneDirectorName', 'Director/a de Zona del lugar'],
  ['zoneDirectorContact', 'fecha y medio del aviso al Director/a de Zona'],
];

/**
 * Permiso de Acampe (la planilla de Scouts de Argentina, para subir a Cruz del Sur) y plan del campamento, en PDF.
 * Lo que la app ya sabe sale solo: Grupo, cantidades por rama, fechas, Jefe/a de Campo. Acá se completa el resto.
 */
export function CampPermitTab({ c }: { c: CampDetail }) {
  const toast = useToast();
  const qc = useQueryClient();
  const key = ['camp-permit', c.id];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<CampPermit>(`/camps/${c.id}/permit`) });
  const { register, handleSubmit, formState, setError, reset, watch } = useForm<CampPermitInput>({ resolver: zodResolver(campPermitSchema) });
  const [busy, setBusy] = useState('');
  useEffect(() => {
    if (q.data) reset(q.data.values as CampPermitInput);
  }, [q.data, reset]);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const p = q.data!;
  const e = formState.errors;
  const ro = !p.canEdit;
  const values = watch();
  const companions = Number(values.companions || 0) || 0;
  const noOne = p.auto.beneficiaries + p.auto.leaders === 0;
  const missing = [
    ...(noOne ? ['inscriptos (las cantidades salen de «Inscripción y legajo»)'] : []),
    ...(!noOne && !p.auto.leaders ? ['adultos inscriptos (los dirigentes son los adultos anotados en «Inscripción y legajo»)'] : []),
    ...(p.auto.chief ? (p.auto.chief.dni ? [] : ['DNI del Jefe/a de Campo (se carga en su ficha de adulto)']) : ['Jefe/a de Campo (se elige en «Editar»)']),
    ...EXPECTED.filter(([k]) => !String(values[k] ?? '').trim()).map(([, label]) => label),
  ];

  /** Guarda lo que está en pantalla. Devuelve si salió bien. */
  const save = (quiet = false) =>
    new Promise<boolean>((resolve) => {
      void handleSubmit(
        async (v) => {
          try {
            const saved = await api.put<CampPermit>(`/camps/${c.id}/permit`, v);
            qc.setQueryData(key, saved);
            reset(saved.values as CampPermitInput);
            if (!quiet) toast.ok('Datos del permiso guardados');
            resolve(true);
          } catch (err) {
            if (!applyServerErrors(err, setError)) toast.error(err);
            resolve(false);
          }
        },
        () => {
          toast.error(new Error('Revisá los campos marcados'));
          resolve(false);
        },
      )();
    });
  const download = async (what: 'permiso' | 'plan' | 'plan-sin-nomina') => {
    setBusy(what);
    try {
      // El PDF sale de lo guardado: si hay cambios sin guardar, se guardan primero
      if (what === 'permiso' && p.canEdit && (formState.isDirty || !p.saved) && !(await save(true))) return;
      if (what === 'permiso') await api.download(`/camps/${c.id}/permit/pdf`, `Permiso de acampe - ${c.name}.pdf`);
      else await api.download(`/camps/${c.id}/plan/pdf${what === 'plan-sin-nomina' ? '?nomina=0' : ''}`, `${c.name} - Plan.pdf`);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy('');
    }
  };
  /** Firma: antes se guarda lo que haya sin guardar, porque se firma lo que quedó guardado. */
  const sign = async (body: { signature?: SignatureData; useSaved?: boolean }) => {
    if (p.canEdit && (formState.isDirty || !p.saved) && !(await save(true))) throw new Error('No se pudieron guardar los datos del permiso');
    const signed = await api.post<CampPermit>(`/camps/${c.id}/permit/sign`, body);
    qc.setQueryData(key, signed);
    toast.ok('Permiso firmado');
  };
  const unsign = async () => {
    try {
      qc.setQueryData(key, await api.del<CampPermit>(`/camps/${c.id}/permit/sign`));
      toast.ok('Se quitó la firma');
    } catch (err) {
      toast.error(err);
    }
  };
  const f = (name: Key, label: string, o: { hint?: string; full?: boolean; type?: string; placeholder?: string } = {}) => (
    <Field label={label} hint={o.hint} full={o.full} error={e[name]?.message as string | undefined}>
      <Input type={o.type} placeholder={o.placeholder} disabled={ro} invalid={!!e[name]} {...register(name)} />
    </Field>
  );

  return (
    <div className="stack">
      <Card
        title="Permiso de Acampe"
        actions={
          <>
            {p.canEdit ? (
              <Button variant="secondary" loading={busy === 'guardar'} onClick={async () => { setBusy('guardar'); await save(); setBusy(''); }}>
                <Save /> Guardar
              </Button>
            ) : null}
            <Button id="btn-permit-pdf" loading={busy === 'permiso'} onClick={() => download('permiso')}>
              <Download /> Descargar el permiso (PDF)
            </Button>
          </>
        }
      >
        <p style={{ marginTop: 0 }}>
          Es la planilla de Scouts de Argentina (versión 07-21), lista para subir a Cruz del Sur. El Grupo, las cantidades por rama, las fechas y el Jefe/a de Campo salen
          solos del campamento; acá se completa lo demás. El Jefe/a de Campo lo puede firmar acá mismo, en pantalla; la aprobación de la Jefatura de Grupo y del Distrito queda
          en blanco.
        </p>
        {p.copiedFrom ? (
          <div className="alert alert-info">Los datos del lugar se tomaron del permiso de «{p.copiedFrom.name}», que fue en el mismo lugar. Revisalos y guardá.</div>
        ) : null}
        {missing.length ? (
          <div className="alert alert-warn">
            <strong>Sin completar:</strong> {missing.join(' · ')}.
          </div>
        ) : (
          <div className="alert alert-ok">Está todo lo que pide la planilla.</div>
        )}
      </Card>

      <form className="stack" noValidate onSubmit={(ev) => ev.preventDefault()}>
        <Card title="Grupo y contingente">
          <dl className="dl">
            <dt>Grupo Scout</dt>
            <dd>
              N° {p.auto.group.number} · {p.auto.group.name} · Distrito {p.auto.group.district} · Zona {p.auto.group.zone}
            </dd>
            <dt>Ramas que acampan</dt>
            <dd>
              {noOne
                ? 'Todavía no hay inscriptos'
                : BRANCHES.filter((b) => p.auto.branches[b]).map((b) => `${BRANCH_INFO[b].label}: ${p.auto.branches[b]}`).join(' · ') || '—'}
            </dd>
            <dt>Contingente</dt>
            <dd>
              Beneficiarios: <strong>{p.auto.beneficiaries}</strong> · Dirigentes: <strong>{p.auto.leaders}</strong> · Total: <strong>{p.auto.beneficiaries + p.auto.leaders + companions}</strong>
            </dd>
          </dl>
          <div className="form-grid" style={{ marginTop: 12 }}>
            {f('companions', 'Acompañantes', { type: 'number', hint: 'Quienes van sin ser protagonistas ni educadores (cocina, apoyo). Vacío si no hay.' })}
          </div>
        </Card>

        <Card title="Empresa de transporte">
          <div className="form-grid">
            {f('transportCompany', 'Nombre o razón social', { placeholder: 'Ej: Trenes Argentinos' })}
            {f('transportAddress', 'Dirección')}
            {f('transportPhone', 'Teléfono')}
            {f('transportLicense', 'N° de habilitación')}
          </div>
        </Card>

        <Card title="Referencias del lugar de campamento">
          <div className="form-grid">
            {f('placeLocality', 'Localidad')}
            {f('placeProvince', 'Provincia')}
            {f('placeAddress', 'Dirección')}
            {f('placeOwner', 'Propietario')}
            {f('placeContact', 'Teléfono / correo electrónico')}
            {f('placeNearestTown', 'Población más cercana')}
            {f('healthName', 'Unidad sanitaria más cercana', { placeholder: 'Hospital o sala' })}
            {f('healthPhone', 'Teléfono de la unidad sanitaria')}
            {f('healthAddress', 'Dirección de la unidad sanitaria', { full: true })}
            {f('policeName', 'Destacamento policial')}
            {f('policePhone', 'Teléfono del destacamento')}
            {f('policeAddress', 'Dirección del destacamento', { full: true })}
            {f('directions', 'Cómo llegar al lugar u otros datos de interés', { full: true })}
          </div>
        </Card>

        <Card title="Salida, llegada y apoyo">
          <div className="form-grid">
            {f('departureDate', 'Fecha de salida al campamento', { type: 'date' })}
            {f('departureTime', 'Hora de salida', { type: 'time' })}
            {f('arrivalDate', 'Fecha de llegada', { type: 'date', hint: 'El Grupo pone acá la vuelta; si tu Distrito pide la llegada al lugar, cambiala.' })}
            {f('arrivalTime', 'Hora de llegada', { type: 'time' })}
            {f('campPhone', 'Teléfono celular en el campamento')}
            {f('vehicle', 'Vehículo de apoyo', { placeholder: 'Ej: vehículo propio' })}
            {f('vehiclePlate', 'Patente')}
            {f('vehicleBrand', 'Marca')}
            {f('vehicleModel', 'Modelo')}
          </div>
        </Card>

        <Card title="Jefe/a de Campo">
          <dl className="dl">
            <dt>Nombre y apellido</dt>
            <dd>{p.auto.chief?.name ?? <span className="muted">Sin elegir (se elige en «Editar»)</span>}</dd>
            <dt>DNI</dt>
            <dd>{p.auto.chief ? (p.auto.chief.dni ?? <span className="muted">Sin cargar en su ficha</span>) : '—'}</dd>
          </dl>
          <div className="form-grid" style={{ marginTop: 12 }}>
            {f('chiefEmail', 'Mail')}
            {f('chiefPhone', 'Teléfono')}
            {f('chiefLevel', 'Nivel de formación', { placeholder: 'Ej: Intermedio, Insignia de Madera' })}
          </div>
        </Card>

        <Card title="Director/a de Zona del lugar de campamento">
          <div className="form-grid">
            {f('zoneDirectorName', 'Nombre y apellido')}
            {f('zoneDirectorZone', 'Zona')}
            {f('zoneDirectorPhone', 'Teléfono particular')}
            {f('zoneDirectorMobile', 'Teléfono celular')}
            {f('zoneDirectorEmail', 'Mail')}
            {f('zoneDirectorContact', 'Fecha y medio de comunicación', { placeholder: 'Ej: mail enviado el 25/7/26' })}
          </div>
        </Card>
      </form>

      <CampPermitSignature p={p} onSign={sign} onRemove={unsign} />

      {p.canEdit ? (
        <div className="row no-print">
          <Button variant="secondary" loading={busy === 'guardar'} onClick={async () => { setBusy('guardar'); await save(); setBusy(''); }}>
            <Save /> Guardar
          </Button>
          <Button loading={busy === 'permiso'} onClick={() => download('permiso')}>
            <Download /> Descargar el permiso (PDF)
          </Button>
        </div>
      ) : null}

      <Card
        title="Plan del campamento"
        actions={
          <Button id="btn-plan-pdf" loading={busy === 'plan'} onClick={() => download('plan')}>
            <Download /> Descargar el plan (PDF)
          </Button>
        }
      >
        <p style={{ marginTop: 0 }}>
          El documento del campamento para presentar: objetivos, lugar, costo, el programa de cada día (horario, actividad, responsable, materiales y comentarios), la lista
          de materiales y la nómina de adultos y protagonistas inscriptos con su DNI.
        </p>
        <p className="muted" style={{ marginBottom: 8 }}>
          Sale de lo cargado: los objetivos son la «Descripción» del campamento (un objetivo por renglón), el programa es el de «Programa y cronograma», los materiales
          son los de «Logística» y la nómina, los inscriptos.
        </p>
        <Button variant="ghost" size="sm" loading={busy === 'plan-sin-nomina'} onClick={() => download('plan-sin-nomina')}>
          Descargarlo sin la nómina
        </Button>
      </Card>
    </div>
  );
}
