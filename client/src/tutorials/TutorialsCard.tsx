/** Mi perfil → Tutoriales: la guía de Luisito para volver a ver cada tutorial cuando quieras. */
import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PlayCircle, RotateCcw } from 'lucide-react';
import { Badge, Button, Card } from '../components/ui';
import { Luisito } from '../components/Luisito';
import { useHelpContext } from '../help/useHelpContext';
import { tutorialsFor } from './catalog';
import { startTutorial, useTutorialProgress } from './TutorialHost';
import './tutorials.css';

export function TutorialsCard() {
  const ctx = useHelpContext();
  const list = useMemo(() => tutorialsFor(ctx), [ctx]);
  const { data, resetAll } = useTutorialProgress();
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (location.hash === '#tutoriales') setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }, [location.hash]);
  if (!list.length) return null;
  const done = list.filter((t) => data.done.includes(t.id)).length;

  return (
    <div ref={ref} id="tutoriales">
      <Card>
        <div className="tutorials-head">
          <Luisito pose="wave" size={58} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>Tutoriales con Luisito</h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Te muestro dónde tocar para hacer cada cosa. Hiciste {done} de {list.length}.
            </p>
            <div className="tutorials-progress" aria-hidden="true">
              <span style={{ width: `${(done / list.length) * 100}%` }} />
            </div>
          </div>
        </div>
        <ul className="tutorials-list">
          {list.map((t) => {
            const status = data.done.includes(t.id) ? 'done' : data.skipped.includes(t.id) ? 'skipped' : 'new';
            return (
              <li key={t.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-name">
                    {t.title}
                    {status === 'done' ? <Badge tone="ok">Hecho</Badge> : null}
                    {status === 'skipped' ? <Badge>Omitido</Badge> : null}
                    {status === 'new' ? <Badge tone="info">Nuevo</Badge> : null}
                  </div>
                  <div className="t-desc">{t.description}</div>
                </div>
                <Button size="sm" variant={status === 'done' ? 'secondary' : 'primary'} onClick={() => startTutorial(t.id)}>
                  <PlayCircle /> {status === 'done' ? 'Repasar' : 'Ver'}
                </Button>
              </li>
            );
          })}
        </ul>
        {data.done.length > 0 || data.skipped.length > 0 ? (
          <Button variant="ghost" size="sm" className="mt" onClick={resetAll} title="Luisito vuelve a presentarse al entrar">
            <RotateCcw /> Empezar de cero
          </Button>
        ) : null}
        <p className="muted" style={{ margin: '10px 0 0' }}>
          También los encontrás en el buscador escribiendo "tutorial" o "ayuda".
        </p>
      </Card>
    </div>
  );
}
