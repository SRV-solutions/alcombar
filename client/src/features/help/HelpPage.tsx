import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, PlayCircle, Search } from 'lucide-react';
import { searchHelp, visibleHelp } from '../../help/helpIndex';
import { useHelpContext } from '../../help/useHelpContext';
import { Luisito } from '../../components/Luisito';
import { Badge, Button, Card, Empty, Input, PageHeader } from '../../components/ui';
import { tutorialsFor } from '../../tutorials/catalog';
import { startTutorial, useTutorialProgress } from '../../tutorials/TutorialHost';
import '../../components/search.css';

/** Índice de todo lo que se puede hacer, por sección, con buscador. Solo muestra lo que esta persona puede usar. */
export function HelpPage() {
  const ctx = useHelpContext();
  const [q, setQ] = useState('');
  const all = useMemo(() => visibleHelp(ctx).filter((e) => e.section !== 'Tutoriales'), [ctx]);
  const hits = useMemo(() => (q.trim() ? searchHelp(ctx, q, 50) : null), [ctx, q]);
  const sections = useMemo(() => [...new Set(all.map((e) => e.section))], [all]);
  const tutorials = useMemo(() => tutorialsFor(ctx), [ctx]);
  const { data } = useTutorialProgress();

  return (
    <>
      <PageHeader
        title="Ayuda e índice"
        sub="¿No te acordás dónde estaba algo? Escribilo como lo dirías: “asistencia”, “ficha médica”, “patrulla”, “pasar a la manada”. También funciona desde la barra de arriba (Ctrl+K)."
      />
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={18} style={{ position: 'absolute', left: 12, top: 15, color: 'var(--muted, #888)', pointerEvents: 'none' }} />
        <Input
          style={{ paddingLeft: 40, minHeight: 48, fontSize: 16 }}
          placeholder="¿Qué querés hacer?"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          aria-label="Buscar en la ayuda"
        />
      </div>

      {hits && !hits.length ? (
        <Card>
          <Empty icon={<BookOpen />}>Nada coincide. Probá con otra palabra.</Empty>
        </Card>
      ) : null}

      <div className="stack">
        {(hits ? ['Resultados'] : sections).map((section) => {
          const items = hits ?? all.filter((e) => e.section === section);
          if (!items.length) return null;
          return (
            <Card key={section} title={section} bodyClass="">
              <ul className="help-list">
                {items.map((e) => (
                  <li key={e.id}>
                    <Link to={e.path} className="help-item">
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="gsearch-title">
                          {e.title}
                          {hits ? <span className="gsearch-sub-inline"> · {e.section}</span> : null}
                        </span>
                        <span className="help-desc">{e.description}</span>
                      </span>
                      <ChevronRight size={18} className="gsearch-enter" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}

        {!hits && tutorials.length ? (
          <Card
            title={
              <h2 className="row" style={{ gap: 10 }}>
                <span style={{ color: 'var(--primary, #7a1f2b)', display: 'inline-flex' }}>
                  <Luisito pose="wave" size={30} />
                </span>
                Tutoriales con Luisito
              </h2>
            }
            actions={<Link to="/perfil#tutoriales">Ver mi avance</Link>}
            bodyClass=""
          >
            <ul className="help-list">
              {tutorials.map((t) => (
                <li key={t.id} className="help-item">
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="gsearch-title row" style={{ gap: 6 }}>
                      {t.title}
                      {data.done.includes(t.id) ? <Badge tone="ok">Hecho</Badge> : null}
                    </span>
                    <span className="help-desc">{t.description}</span>
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => startTutorial(t.id)}>
                    <PlayCircle /> Ver
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
      <style>{`
        .help-list { list-style: none; margin: 0; padding: 0; }
        .help-list > li { border-bottom: 1px solid var(--border, #e6dfd2); }
        .help-list > li:last-child { border-bottom: none; }
        .help-item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; color: inherit; text-decoration: none !important; }
        a.help-item:hover { background: var(--surface-2, #f6f1e7); }
        .help-desc { display: block; font-size: 0.85rem; color: var(--muted, #666); margin-top: 2px; }
      `}</style>
    </>
  );
}
