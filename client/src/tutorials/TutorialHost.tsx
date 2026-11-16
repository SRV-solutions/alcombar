/**
 * Motor de los tutoriales de Luisito (montado una vez en el Layout). Mismo esquema que sentryx:
 *  - Arranca solo "Primeros pasos" la primera vez que alguien entra (si no lo hizo ni lo omitió).
 *  - Cualquier pantalla puede abrir uno: startTutorial(id), o un link con ?tutorial=id (lo usa el buscador).
 *  - Cada paso lleva a su pantalla, ilumina el elemento y Luisito lo explica. Se puede omitir siempre.
 *  - Al terminar, Luisito ofrece el siguiente tutorial que le corresponde: se aprende de a poco.
 *  - El avance se guarda en la cuenta (sirve en cualquier dispositivo): /auth/me/tutorials.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useHelpContext } from '../help/useHelpContext';
import { Luisito } from '../components/Luisito';
import { tutorialById, tutorialsFor, type Tutorial, type TutorialStep } from './catalog';
import './tutorials.css';

export interface TutorialProgress {
  done: string[];
  skipped: string[];
}

// ---------- estado global (sin contexto: cualquier pantalla puede abrir un tutorial) ----------
let current: { id: string; step: number } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const startTutorial = (id: string) => {
  if (!tutorialById(id)) return;
  current = { id, step: 0 };
  emit();
};
const goTo = (step: number) => {
  if (current) current = { ...current, step };
  emit();
};
const close = () => {
  current = null;
  emit();
};

export const useTutorialProgress = () => {
  const qc = useQueryClient();
  const { me } = useAuth();
  const progress = useQuery({
    queryKey: ['my-tutorials'],
    queryFn: () => api.get<TutorialProgress>('/auth/me/tutorials'),
    enabled: !!me,
    staleTime: 5 * 60_000,
  });
  const save = useMutation({
    mutationFn: (p: TutorialProgress) => api.put<TutorialProgress>('/auth/me/tutorials', p),
    onMutate: (p) => qc.setQueryData(['my-tutorials'], p),
    onSuccess: (p) => qc.setQueryData(['my-tutorials'], p),
  });
  const data = progress.data ?? { done: [], skipped: [] };
  const mark = useCallback(
    (id: string, as: 'done' | 'skipped' | 'reset') =>
      save.mutate({
        done: as === 'done' ? [...new Set([...data.done, id])] : data.done.filter((x) => (as === 'reset' ? x !== id : true)),
        skipped: as === 'skipped' ? [...new Set([...data.skipped, id])] : data.skipped.filter((x) => x !== id),
      }),
    [data, save],
  );
  const resetAll = () => save.mutate({ done: [], skipped: [] });
  return { progress, data, mark, resetAll };
};

// ---------- ubicar el elemento a señalar ----------
const visible = (el: HTMLElement) => {
  if (el.closest('.tour-bubble')) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
};
const findTarget = (target: TutorialStep['target']) => {
  if (!target) return null;
  let els: HTMLElement[] = [];
  try {
    els = [...document.querySelectorAll<HTMLElement>(target.selector)].filter(visible);
  } catch {
    return null;
  }
  if (target.text) els = els.filter((el) => (el.textContent ?? '').includes(target.text!));
  // Sin texto, gana el primero en la página; con texto, el más específico (texto más corto).
  if (!target.text) return els[0] ?? null;
  return els.sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0))[0] ?? null;
};

const PAD = 6;

function StepView({
  tutorial,
  index,
  next,
  onSkip,
  onFinish,
  onNext,
}: {
  tutorial: Tutorial;
  index: number;
  next: Tutorial | null;
  onSkip: () => void;
  onFinish: () => void;
  onNext: () => void;
}) {
  const step = tutorial.steps[index];
  const last = index === tutorial.steps.length - 1;
  const navigate = useNavigate();
  const location = useLocation();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [searching, setSearching] = useState(!!step.target);
  const bubble = useRef<HTMLDivElement>(null);
  const [bubbleH, setBubbleH] = useState(220);
  const mobile = typeof window !== 'undefined' && window.innerWidth < 900;

  // Ir a la pantalla del paso.
  useEffect(() => {
    if (!step.route) return;
    const [path, query] = step.route.split('?');
    if (location.pathname !== path || (query && !location.search.includes(query))) navigate(step.route);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Buscar el elemento (la pantalla puede tardar en cargar) y seguirlo si se mueve.
  useEffect(() => {
    setRect(null);
    if (!step.target) {
      setSearching(false);
      return;
    }
    setSearching(true);
    let el: HTMLElement | null = null;
    let tries = 0;
    const find = setInterval(() => {
      el = findTarget(step.target);
      if (el || ++tries > 25) {
        clearInterval(find);
        setSearching(false);
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          setTimeout(() => el && setRect(el.getBoundingClientRect()), 350);
        }
      }
    }, 160);
    const follow = () => {
      if (el && document.contains(el)) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', follow);
    window.addEventListener('scroll', follow, true);
    const tick = setInterval(follow, 600);
    return () => {
      clearInterval(find);
      clearInterval(tick);
      window.removeEventListener('resize', follow);
      window.removeEventListener('scroll', follow, true);
    };
  }, [index, tutorial.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (bubble.current) setBubbleH(bubble.current.offsetHeight);
  });

  // Globo: debajo del elemento si entra, si no arriba; al lado si el elemento es alto; sin elemento, centrado.
  const W = Math.min(390, window.innerWidth - 24);
  let style: React.CSSProperties;
  if (mobile || !rect) {
    style = mobile ? { left: 12, right: 12, bottom: 12 } : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: W };
  } else {
    const below = rect.bottom + PAD + 14 + bubbleH < window.innerHeight;
    const top = below ? rect.bottom + PAD + 14 : Math.max(12, rect.top - PAD - 14 - bubbleH);
    const side = rect.height > window.innerHeight * 0.5 && rect.right + W + 24 < window.innerWidth;
    style = side
      ? { top: Math.min(Math.max(12, rect.top + 40), window.innerHeight - bubbleH - 12), left: rect.right + PAD + 14, width: W }
      : { top, left: Math.min(Math.max(12, rect.left + rect.width / 2 - W / 2), window.innerWidth - W - 12), width: W };
  }

  return (
    <div className="tour-layer" aria-live="polite">
      {rect ? (
        <div className="tour-spot" style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
      ) : (
        <div className="tour-dim" />
      )}
      <div ref={bubble} className="tour-bubble" style={style} role="dialog" aria-label={`Tutorial: ${tutorial.title}`}>
        <div className="tour-head">
          <div className="tour-guide">
            <Luisito pose={step.pose ?? 'idle'} size={mobile ? 54 : 66} />
          </div>
          <div className="tour-text">
            <div className="tour-meta">
              {tutorial.title} · {index + 1} de {tutorial.steps.length}
            </div>
            <strong className="tour-title">{step.title}</strong>
            <p>{step.text}</p>
            {step.target && !rect && !searching ? (
              <span className="tour-meta">
                No lo encuentro en esta pantalla: puede estar más abajo, en otra pestaña{mobile ? ' o en el menú ☰' : ''}, o no tenés datos cargados todavía.
              </span>
            ) : null}
          </div>
        </div>
        <div className="tour-dots">
          {tutorial.steps.map((_s, i) => (
            <span key={i} className={i === index ? 'on' : ''} />
          ))}
        </div>
        <div className="tour-actions">
          {!last ? (
            <button type="button" className="btn btn-sm btn-ghost" style={{ marginRight: 'auto' }} onClick={onSkip}>
              Omitir tutorial
            </button>
          ) : null}
          {index > 0 ? (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => goTo(index - 1)}>
              Atrás
            </button>
          ) : null}
          {!last ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                if (step.clickOnNext) findTarget(step.target)?.click();
                goTo(index + 1);
              }}
            >
              Siguiente
            </button>
          ) : null}
          {last ? (
            <button type="button" className={`btn btn-sm ${next ? 'btn-secondary' : 'btn-primary'}`} onClick={onFinish}>
              Terminar
            </button>
          ) : null}
          {last && next ? (
            <button type="button" className="btn btn-sm btn-gold" onClick={onNext}>
              Seguir: {next.title}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TutorialHost() {
  const cur = useSyncExternalStore(subscribe, () => current);
  const { me } = useAuth();
  const ctx = useHelpContext();
  const { progress, data, mark } = useTutorialProgress();
  const location = useLocation();
  const navigate = useNavigate();
  const autoStarted = useRef(false);

  // ?tutorial=id (buscador, ayuda, links): abre el tutorial y limpia la dirección.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('tutorial');
    if (!id) return;
    params.delete('tutorial');
    navigate(`${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`, { replace: true });
    startTutorial(id);
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Primera vez: Luisito se presenta solo.
  useEffect(() => {
    if (!me || !progress.data || autoStarted.current || current) return;
    autoStarted.current = true;
    if (data.done.includes('bienvenida') || data.skipped.includes('bienvenida')) return;
    const t = setTimeout(() => {
      if (!current) startTutorial('bienvenida');
    }, 1200);
    return () => clearTimeout(t);
  }, [me, progress.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cur || !me) return null;
  const tutorial = tutorialById(cur.id);
  if (!tutorial) return null;
  const next = tutorialsFor(ctx).find((t) => t.id !== tutorial.id && !data.done.includes(t.id) && !data.skipped.includes(t.id)) ?? null;
  return (
    <StepView
      key={tutorial.id}
      tutorial={tutorial}
      index={Math.min(cur.step, tutorial.steps.length - 1)}
      next={next}
      onSkip={() => {
        mark(tutorial.id, 'skipped');
        close();
      }}
      onFinish={() => {
        mark(tutorial.id, 'done');
        close();
      }}
      onNext={() => {
        mark(tutorial.id, 'done');
        if (next) startTutorial(next.id);
      }}
    />
  );
}
