import { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileDown, FileUp, RotateCcw } from 'lucide-react';
import { matchImportHeader, MEMBER_IMPORT_COLUMNS, normalizeKey, type MemberImportKey, type MemberImportRow } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnits } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, Field, LinkButton, PageHeader, Select, Textarea } from '../../components/ui';

interface PreviewRow {
  row: number;
  status: 'new' | 'update' | 'error';
  errors: string[];
  warnings: string[];
  display: { name: string; unit: string | null; smallGroup: string | null; birthDate: string | null; dni: string | null; guardians: number };
}
interface Preview {
  results: PreviewRow[];
  summary: { new: number; update: number; error: number };
}
interface CommitResult {
  stats: { created: number; updated: number; skipped: number; guardiansCreated: number; smallGroupsCreated: number };
}

type Mapped = { header: string; key: MemberImportKey | 'nombre_completo' | null };

const REQUIRED: MemberImportKey[] = ['unidad', 'apellido', 'nombre', 'fecha_nacimiento'];
const isFullNameHeader = (h: string) => /apellido.*nombre|nombre.*apellido|nombre_completo/.test(normalizeKey(h));

async function readFileText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    // Excel en Windows guarda "CSV (delimitado por comas)" en Windows-1252
    return new TextDecoder('windows-1252').decode(buf);
  }
}

function downloadTemplate() {
  const header = MEMBER_IMPORT_COLUMNS.map((c) => c.key).join(';');
  const example = MEMBER_IMPORT_COLUMNS.map((c) => c.example).join(';');
  const blob = new Blob(['﻿' + header + '\r\n' + example + '\r\n'], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-protagonistas.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Pérez, Juana" → [Pérez, Juana]; "Pérez Juana María" → [Pérez, Juana María] */
function splitFullName(full: string): [string, string] {
  const s = full.trim().replace(/\s+/g, ' ');
  if (s.includes(',')) {
    const [a, ...b] = s.split(',');
    return [a.trim(), b.join(',').trim()];
  }
  const parts = s.split(' ');
  return [parts[0] ?? '', parts.slice(1).join(' ')];
}

export function MemberImportPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const units = useUnits();
  const { unitsWith } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Mapped[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [fixedUnit, setFixedUnit] = useState('');
  const [paste, setPaste] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<CommitResult | null>(null);

  const allowed = unitsWith('members', 'create');
  const allowedUnits = (units.data ?? []).filter((u) => allowed === 'all' || allowed.includes(u.id));

  const hasKey = (k: string) => mapping.some((m) => m.key === k);
  const hasFullName = hasKey('nombre_completo');
  const missing = REQUIRED.filter((k) => {
    if (k === 'unidad') return !hasKey('unidad') && !fixedUnit;
    if ((k === 'apellido' || k === 'nombre') && hasFullName) return false;
    return !hasKey(k);
  });

  const rows: MemberImportRow[] = useMemo(() => {
    return rawRows
      .map((r) => {
        const o: MemberImportRow = {};
        for (const m of mapping) {
          if (!m.key) continue;
          const v = (r[m.header] ?? '').toString().trim();
          if (m.key === 'nombre_completo') {
            if (v && !o.apellido && !o.nombre) {
              const [ap, no] = splitFullName(v);
              o.apellido = ap;
              o.nombre = no;
            }
          } else if (o[m.key] === undefined || o[m.key] === '') o[m.key] = v;
        }
        if (fixedUnit && !o.unidad) o.unidad = units.data?.find((u) => u.id === fixedUnit)?.code ?? '';
        return o;
      })
      .filter((o) => Object.values(o).some((v) => v && v.trim()));
  }, [rawRows, mapping, fixedUnit, units.data]);

  function loadText(text: string, name: string) {
    const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });
    const fields = (parsed.meta.fields ?? []).filter(Boolean);
    if (!fields.length || !parsed.data.length) {
      toast.error('No se encontraron filas. Revisá que la primera fila tenga los encabezados.');
      return;
    }
    const used = new Set<string>();
    const map: Mapped[] = fields.map((h) => {
      let key: Mapped['key'] = matchImportHeader(h);
      if (!key && isFullNameHeader(h)) key = 'nombre_completo';
      if (key && used.has(key)) key = null;
      if (key) used.add(key);
      return { header: h, key };
    });
    setSource(name);
    setMapping(map);
    setRawRows(parsed.data);
    setPreview(null);
    setDone(null);
  }

  async function onFile(file: File) {
    if (/\.(xlsx|xls|ods)$/i.test(file.name)) {
      toast.error('Guardá la planilla como CSV, o copiá las filas y pegalas en el cuadro de abajo.');
      return;
    }
    loadText(await readFileText(file), file.name);
  }

  async function runPreview() {
    setBusy(true);
    try {
      setPreview(await api.post<Preview>('/members/import/preview', { rows }));
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function runCommit() {
    setBusy(true);
    try {
      const res = await api.post<CommitResult>('/members/import/commit', { rows });
      setDone(res);
      toast.ok('Importación terminada');
      await qc.invalidateQueries({ queryKey: ['members'] });
      await qc.invalidateQueries({ queryKey: ['units'] });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSource(null);
    setMapping([]);
    setRawRows([]);
    setPreview(null);
    setDone(null);
    setPaste('');
    setFixedUnit('');
  }

  const toImport = preview ? preview.summary.new + preview.summary.update : 0;
  const shown = preview ? preview.results.filter((r) => !onlyIssues || r.errors.length || r.warnings.length) : [];

  return (
    <>
      <PageHeader
        title="Importar protagonistas"
        crumbs={[{ to: '/protagonistas', label: 'Protagonistas' }]}
        sub="Cargá la nómina desde una planilla. Antes de guardar vas a ver una vista previa con lo que se crea, lo que se actualiza y lo que tiene errores."
        actions={
          <Button variant="secondary" onClick={downloadTemplate}>
            <FileDown /> Descargar plantilla
          </Button>
        }
      />

      {done ? (
        <Card>
          <div className="stack" style={{ textAlign: 'center', padding: '12px 0' }}>
            <CheckCircle2 size={44} color="var(--ok)" style={{ margin: '0 auto' }} />
            <h2>Importación terminada</h2>
            <p>
              <strong>{done.stats.created}</strong> protagonistas nuevos · <strong>{done.stats.updated}</strong> actualizados ·{' '}
              <strong>{done.stats.guardiansCreated}</strong> responsables cargados
              {done.stats.smallGroupsCreated ? (
                <>
                  {' '}
                  · <strong>{done.stats.smallGroupsCreated}</strong> pequeños grupos creados
                </>
              ) : null}
            </p>
            {done.stats.skipped ? <p className="muted">{done.stats.skipped} filas con errores no se importaron: corregilas en la planilla y volvé a importarla.</p> : null}
            <div className="row" style={{ justifyContent: 'center' }}>
              <LinkButton to="/protagonistas">Ver el padrón</LinkButton>
              <Button variant="secondary" onClick={reset}>
                <RotateCcw /> Importar otra planilla
              </Button>
            </div>
          </div>
        </Card>
      ) : !source ? (
        <div className="stack">
          <Card title="1. Subí la planilla">
            <div
              className={`dropzone ${drag ? 'drag' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files[0];
                if (f) void onFile(f);
              }}
            >
              <FileUp size={32} color="var(--bordo)" />
              <p style={{ margin: '8px 0 4px' }}>
                <strong>Arrastrá el archivo CSV acá</strong> o hacé clic para elegirlo
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Google Sheets: Archivo → Descargar → Valores separados por comas (.csv). Excel: Guardar como → CSV UTF-8.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,text/csv"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                  e.target.value = '';
                }}
              />
            </div>
            <div className="mt">
              <Field label="…o pegá las filas copiadas de la planilla (incluyendo la fila de encabezados)">
                <Textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} placeholder="unidad	apellido	nombre	fecha_nacimiento	…" />
              </Field>
              <div className="form-actions" style={{ marginTop: 10 }}>
                <Button disabled={!paste.trim()} onClick={() => loadText(paste, 'filas pegadas')}>
                  Usar filas pegadas
                </Button>
              </div>
            </div>
          </Card>
          <Card title="Columnas que reconoce">
            <p>
              Los nombres de las columnas pueden estar escritos de distintas formas (por ejemplo «Fecha de nacimiento» o «fecha_nacimiento»). Si la planilla tiene
              una sola columna «Apellido y nombre», también funciona. Si no tiene la columna unidad, te va a preguntar de qué unidad son.
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Columna</th>
                    <th>Qué va</th>
                    <th>Ejemplo</th>
                  </tr>
                </thead>
                <tbody>
                  {MEMBER_IMPORT_COLUMNS.map((c) => (
                    <tr key={c.key}>
                      <td>
                        <code>{c.key}</code> {c.required ? <Badge tone="bordo">obligatoria</Badge> : null}
                      </td>
                      <td>{c.label}</td>
                      <td className="muted">{c.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted mt">Fechas en formato dd/mm/aaaa. No incluyas datos de salud: la documentación se marca después desde la app.</p>
          </Card>
        </div>
      ) : (
        <div className="stack">
          <Card
            title={`2. Columnas de «${source}» · ${rows.length} filas`}
            actions={
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw /> Elegir otra
              </Button>
            }
          >
            <div className="row" style={{ gap: 6 }}>
              {mapping.map((m) => (
                <span key={m.header} title={m.key ? `→ ${m.key}` : 'No se reconoce: se ignora'}>
                  <Badge tone={m.key ? 'ok' : 'neutral'}>
                    {m.header}
                    {m.key && normalizeKey(m.header) !== m.key ? ` → ${m.key === 'nombre_completo' ? 'apellido + nombre' : m.key}` : ''}
                    {!m.key ? ' (se ignora)' : ''}
                  </Badge>
                </span>
              ))}
            </div>
            {hasFullName ? (
              <div className="alert alert-warn mt">
                Se separa «apellido y nombre» así: si hay coma, lo de antes es el apellido; si no, la primera palabra. Revisá los apellidos compuestos en la vista previa.
              </div>
            ) : null}
            {!hasKey('unidad') ? (
              <div className="mt" style={{ maxWidth: 420 }}>
                <Field label="La planilla no tiene columna «unidad». ¿De qué unidad son todos?" required>
                  <Select value={fixedUnit} onChange={(e) => setFixedUnit(e.target.value)}>
                    <option value="">Elegí la unidad</option>
                    {allowedUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            ) : null}
            {missing.length ? (
              <div className="alert alert-error mt">
                Faltan columnas obligatorias: {missing.map((k) => MEMBER_IMPORT_COLUMNS.find((c) => c.key === k)?.label ?? k).join(', ')}.
              </div>
            ) : null}
            <div className="form-actions">
              <Button onClick={runPreview} loading={busy && !preview} disabled={!!missing.length || !rows.length}>
                {preview ? 'Volver a validar' : 'Validar y ver vista previa'}
              </Button>
            </div>
          </Card>

          {preview ? (
            <Card
              title="3. Vista previa"
              actions={
                <>
                  <Badge tone="ok">{preview.summary.new} nuevos</Badge>
                  <Badge tone="info">{preview.summary.update} se actualizan</Badge>
                  <Badge tone={preview.summary.error ? 'danger' : 'neutral'}>{preview.summary.error} con errores</Badge>
                </>
              }
              bodyClass=""
            >
              <div className="card-body" style={{ paddingBottom: 0 }}>
                <label className="checkbox">
                  <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />
                  Ver solo filas con errores o avisos
                </label>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="num">Fila</th>
                      <th>Estado</th>
                      <th>Protagonista</th>
                      <th>Unidad</th>
                      <th>Pequeño grupo</th>
                      <th>Nacimiento</th>
                      <th>DNI</th>
                      <th className="num">Resp.</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.row} className={r.errors.length ? 'row-error' : r.warnings.length ? 'row-warn' : ''}>
                        <td className="num muted">{r.row}</td>
                        <td>
                          {r.status === 'new' ? <Badge tone="ok">Nuevo</Badge> : r.status === 'update' ? <Badge tone="info">Actualiza</Badge> : <Badge tone="danger">Error</Badge>}
                        </td>
                        <td className="nowrap">{r.display.name}</td>
                        <td>{r.display.unit ?? '—'}</td>
                        <td>{r.display.smallGroup ?? '—'}</td>
                        <td className="nowrap">{r.display.birthDate ? r.display.birthDate.split('-').reverse().join('/') : '—'}</td>
                        <td>{r.display.dni ?? '—'}</td>
                        <td className="num">{r.display.guardians}</td>
                        <td style={{ minWidth: 260 }}>
                          {r.errors.map((e) => (
                            <div key={e} style={{ color: 'var(--danger)' }}>
                              ✗ {e}
                            </div>
                          ))}
                          {r.warnings.map((w) => (
                            <div key={w} style={{ color: 'var(--warn)' }}>
                              ! {w}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card-body">
                {preview.summary.error ? (
                  <div className="alert alert-warn mb">
                    Las filas con errores no se importan. Podés corregirlas en la planilla y volver a subirla: los que ya estén cargados se actualizan, no se duplican.
                  </div>
                ) : null}
                <div className="form-actions" style={{ marginTop: 0 }}>
                  <Button variant="gold" onClick={runCommit} loading={busy} disabled={!toImport}>
                    Importar {toImport} protagonistas
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
