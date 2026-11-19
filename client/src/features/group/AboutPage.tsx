import { Fragment, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Textarea } from '../../components/ui';
import './about.css';

interface Page {
  id: string;
  title: string;
  body: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

/**
 * Texto simple a pantalla: párrafos separados por una línea en blanco, «## » para un subtítulo y «- » para una lista.
 * Sin HTML: lo que se escribe se muestra tal cual.
 */
function renderBody(body: string): ReactNode {
  const blocks = body.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocks.map((block, i) => {
    const lines = block.split('\n').filter((l) => l.trim());
    if (!lines.length) return null;
    if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
      return (
        <ul key={i}>
          {lines.map((l, j) => (
            <li key={j}>{l.replace(/^\s*[-•]\s+/, '')}</li>
          ))}
        </ul>
      );
    }
    if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) return <h3 key={i}>{lines[0].replace(/^#{1,3}\s+/, '')}</h3>;
    return (
      <p key={i}>
        {lines.map((l, j) => (
          <Fragment key={j}>
            {j ? <br /> : null}
            {l}
          </Fragment>
        ))}
      </p>
    );
  });
}
const anchor = (id: string) => `seccion-${id.slice(0, 8)}`;

/** Sobre el Grupo: su historia, sus jefes y jefas, la tribu… Lo lee cualquiera que entra a la app; lo edita quien administra el Grupo. */
export function AboutPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['group-pages'], queryFn: () => api.get<{ canEdit: boolean; pages: Page[] }>('/group/pages') });
  const [editing, setEditing] = useState<Page | 'new' | null>(null);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const { canEdit, pages } = q.data!;
  const refresh = () => qc.invalidateQueries({ queryKey: ['group-pages'] });
  const visible = canEdit ? pages : pages.filter((p) => p.body?.trim());
  const move = async (i: number, dir: -1 | 1) => {
    const ids = pages.map((p) => p.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    try {
      await api.put('/group/pages/order', { ids });
      await refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        title="Sobre el Grupo"
        sub="Nuestra historia y lo que nos hace quienes somos. Para que lo conozca cualquiera que llega al Grupo."
        actions={
          canEdit ? (
            <Button onClick={() => setEditing('new')}>
              <Plus /> Nueva sección
            </Button>
          ) : null
        }
      />
      {!visible.length ? (
        <Card>
          <Empty icon={<BookOpen />}>{canEdit ? 'Todavía no hay nada escrito. Empezá por una sección.' : 'Todavía no hay nada escrito.'}</Empty>
        </Card>
      ) : (
        <div className="about">
          {visible.length > 1 ? (
            <nav className="about-index" aria-label="Secciones">
              {visible.map((p) => (
                <a key={p.id} href={`#${anchor(p.id)}`}>
                  {p.title}
                </a>
              ))}
            </nav>
          ) : null}
          <div className="about-pages">
            {visible.map((p) => {
              const i = pages.findIndex((x) => x.id === p.id);
              return (
                <section key={p.id} id={anchor(p.id)} className="card about-page">
                  <div className="card-header">
                    <h2>{p.title}</h2>
                    {canEdit ? (
                      <div className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
                        <button className="btn btn-ghost btn-icon" aria-label="Subir la sección" disabled={i === 0} onClick={() => void move(i, -1)}>
                          <ArrowUp />
                        </button>
                        <button className="btn btn-ghost btn-icon" aria-label="Bajar la sección" disabled={i === pages.length - 1} onClick={() => void move(i, 1)}>
                          <ArrowDown />
                        </button>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                          <Pencil /> Editar
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <div className="card-body about-body">
                    {p.body?.trim() ? renderBody(p.body) : <p className="muted">Esta sección está vacía: mientras no tenga texto, solo la ve quien puede editarla.</p>}
                    {canEdit && p.body?.trim() ? (
                      <p className="muted about-meta">
                        Última edición: {new Date(p.updatedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {p.updatedBy ? ` · ${p.updatedBy}` : ''}
                      </p>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
      {editing ? (
        <PageDialog
          page={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      ) : null}
    </>
  );
}

function PageDialog({ page, onClose, onSaved }: { page: Page | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const [title, setTitle] = useState(page?.title ?? '');
  const [body, setBody] = useState(page?.body ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!title.trim()) return setError('Ponele un título');
    setBusy(true);
    try {
      if (page) await api.put(`/group/pages/${page.id}`, { title, body });
      else await api.post('/group/pages', { title, body });
      await onSaved();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      wide
      title={page ? 'Editar la sección' : 'Nueva sección'}
      onClose={onClose}
      footer={
        <>
          {page ? (
            <ConfirmButton
              variant="ghost"
              title="Borrar la sección"
              message={`Se borra «${page.title}» con todo su texto. No se puede deshacer.`}
              confirmLabel="Borrar"
              onConfirm={async () => {
                await api.del(`/group/pages/${page.id}`);
                await onSaved();
              }}
            >
              <Trash2 /> Borrar
            </ConfirmButton>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Guardar
          </Button>
        </>
      }
    >
      <Field label="Título" required error={error ?? undefined}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: Historia del Grupo" autoFocus={!page} />
      </Field>
      <div style={{ height: 12 }} />
      <Field label="Texto" hint="Dejá una línea en blanco entre párrafos. Una línea que empieza con «## » queda como subtítulo y las que empiezan con «- » arman una lista.">
        <Textarea rows={16} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribí o pegá el texto acá…" />
      </Field>
    </Modal>
  );
}
