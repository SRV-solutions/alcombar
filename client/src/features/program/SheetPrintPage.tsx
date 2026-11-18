import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { formatDate } from '@shared';
import { api } from '../../lib/api';
import { adultName } from '../../lib/queries';
import { Button, ErrorBox, Loading } from '../../components/ui';
import { explorationLabel, minutes, objectivesHeader } from './common';
import type { Sheet } from './types';
import './sheet-pdf.css';

const Bullets = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul>
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  ) : (
    <span className="empty">—</span>
  );
const Text = ({ children }: { children: ReactNode }) => <div className="txt">{children || <span className="empty">—</span>}</div>;

/** Espera a que carguen los logos antes de abrir la ventana de impresión (si no, salen en blanco). */
async function imagesReady() {
  const imgs = [...document.querySelectorAll<HTMLImageElement>('.saac-sheet img')];
  await Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => ((i.onload = r), (i.onerror = r))))));
}

/**
 * Ficha de actividades con el formato oficial de Scouts de Argentina (logos y tabla de la ficha REME).
 * «Descargar PDF» abre la ventana de impresión del navegador con el nombre de archivo ya puesto: se elige
 * «Guardar como PDF». El encabezado con los logos se repite en cada hoja.
 */
export function SheetPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = useQuery({ queryKey: ['program-sheet', id], queryFn: () => api.get<Sheet>(`/program/sheets/${id}`) });
  const s = q.data;

  // El título de la pestaña es el nombre que el navegador propone para el PDF
  useEffect(() => {
    if (!s) return;
    const prev = document.title;
    document.title = `REME - ${s.name}`.replace(/[\\/:*?"<>|]/g, '');
    return () => {
      document.title = prev;
    };
  }, [s]);

  const download = async () => {
    await imagesReady();
    window.print();
  };
  // Desde la ficha, el botón «Descargar PDF» llega con ?descargar=1 y abre la descarga solo
  useEffect(() => {
    if (s && params.get('descargar') === '1') void download();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  if (!s) return null;
  const branch = s.unit.branch;
  const age = s.ageMin || s.ageMax ? `${s.ageMin ?? '?'}-${s.ageMax ?? '?'}` : '';
  const participants = `${s.unit.code}${s.participants ? ` (${s.participants})` : ''}`;

  return (
    <div className="saac-wrap">
      <div className="saac-toolbar no-print">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft /> Volver
        </Button>
        <Button onClick={download}>
          <Download /> Descargar PDF
        </Button>
        <span className="muted">Se abre la ventana de impresión: en «Destino» elegí «Guardar como PDF».</span>
      </div>

      <table className="saac-sheet">
        <thead>
          <tr>
            <td>
              <div className="saac-logos">
                <img src="/saac/saac-izquierda.png" alt="Scouts de Argentina" className="side" />
                <img src="/saac/liderando-el-presente.png" alt="Liderando el presente" className="center" />
                <img src="/saac/saac-derecha.png" alt="Scouts de Argentina" className="side" />
              </div>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <table className="saac-form">
                <colgroup>
                  <col style={{ width: '41%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '21%' }} />
                  <col style={{ width: '22%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <th colSpan={4} className="title">
                      FICHA DE ACTIVIDADES
                    </th>
                  </tr>
                  <tr>
                    <th>NOMBRE DE LA ACTIVIDAD</th>
                    <th>RANGO DE EDAD</th>
                    <th>ÁREA DE DESARROLLO</th>
                    <th>PARTICIPANTES</th>
                  </tr>
                  <tr className="center">
                    <td>{s.name}</td>
                    <td>{age}</td>
                    <td>{s.area?.name ?? ''}</td>
                    <td>{participants}</td>
                  </tr>

                  <tr>
                    <th colSpan={4}>
                      OBJETIVOS DE LA ACTIVIDAD
                      <br />
                      {objectivesHeader(branch)}
                    </th>
                  </tr>
                  <tr>
                    <td colSpan={4}>
                      <Bullets items={s.objectives} />
                    </td>
                  </tr>

                  <tr>
                    <th colSpan={4}>
                      PROPÓSITO
                      <br />
                      Esta actividad brinda experiencias relacionadas con las siguientes competencias educativas:
                    </th>
                  </tr>
                  <tr>
                    <td colSpan={4}>
                      <Bullets items={s.competencies.map((c) => c.name)} />
                    </td>
                  </tr>

                  <tr>
                    <th colSpan={4}>{explorationLabel(branch).toUpperCase()}</th>
                  </tr>
                  <tr>
                    <td colSpan={4}>
                      <Text>{s.exploration}</Text>
                    </td>
                  </tr>

                  <tr>
                    <th colSpan={4}>DESCRIPCIÓN DE LA ACTIVIDAD</th>
                  </tr>
                  <tr>
                    <td colSpan={4}>
                      <Text>{s.description}</Text>
                    </td>
                  </tr>

                  <tr>
                    <th colSpan={4}>RECUPERO</th>
                  </tr>
                  <tr>
                    <td colSpan={4}>
                      <Text>{s.closing}</Text>
                    </td>
                  </tr>

                  {s.outside ? (
                    <>
                      <tr>
                        <th colSpan={4}>SEGURIDAD (ACTIVIDAD FUERA DE LA SEDE)</th>
                      </tr>
                      <tr>
                        <td colSpan={4}>
                          <Text>{s.safety}</Text>
                        </td>
                      </tr>
                    </>
                  ) : null}

                  <tr className="keep">
                    <th colSpan={2}>FUNCIÓN DE LOS DEMÁS EDUCADORES</th>
                    <th colSpan={2}>MATERIALES</th>
                  </tr>
                  <tr className="center keep">
                    <td colSpan={2}>
                      <Text>{s.otherEducators}</Text>
                    </td>
                    <td colSpan={2}>{s.materials.length ? s.materials.join(', ') : ''}</td>
                  </tr>
                  <tr className="keep">
                    <th>RESPONSABLE DE LA ACTIVIDAD</th>
                    <th>FECHA</th>
                    <th>LUGAR DE LA ACTIVIDAD</th>
                    <th>DURACIÓN</th>
                  </tr>
                  <tr className="center keep">
                    <td>{s.responsible ? adultName(s.responsible) : ''}</td>
                    <td>{s.date ? formatDate(s.date) : ''}</td>
                    <td>{s.place ?? ''}</td>
                    <td>{minutes(s.durationMin)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="saac-foot">
                {s.code} · Grupo Scout 155 Divina Providencia
                {s.approvedBy && s.approvedAt ? ` · Aprobada por ${s.approvedBy.name} el ${new Date(s.approvedAt).toLocaleDateString('es-AR')}` : ''}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
