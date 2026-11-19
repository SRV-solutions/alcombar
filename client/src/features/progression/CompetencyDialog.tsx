// Una competencia de un protagonista: se le asignan desafíos (en la Manada, acciones de los Rastros) tildándolos de la
// lista del catálogo —requeridos, opcionales y de especialidad— o agregando uno propio, se marca cuáles logró y se
// anota cómo viene.
import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { challengeTerms, COMPETENCY_STATUSES, COMPETENCY_STATUS_LABELS, type ChallengeKind, type MemberChallenge } from '@shared';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import type { MemberCompetencyRow } from './types';

const CATALOG_KINDS: ChallengeKind[] = ['requerido', 'opcional', 'especialidad'];

export function CompetencyDialog({ row, branch, onClose, onSaved }: { row: MemberCompetencyRow; branch: string | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const t = challengeTerms(branch);
  const comp = row.competency;
  const [status, setStatus] = useState(row.status);
  const [achievedAt, setAchievedAt] = useState(row.achievedAt ?? '');
  const [notes, setNotes] = useState(row.notes ?? '');
  const [challenges, setChallenges] = useState<MemberChallenge[]>(row.challenges ?? []);
  const [own, setOwn] = useState('');
  const [busy, setBusy] = useState(false);

  const groups: { kind: ChallengeKind; items: string[] }[] = [
    { kind: 'requerido', items: comp?.requiredChallenges ?? [] },
    { kind: 'opcional', items: comp?.optionalChallenges ?? [] },
    { kind: 'especialidad', items: comp?.specialtyChallenges ?? [] },
  ];
  const inCatalog = new Set(groups.flatMap((g) => g.items));
  // Los propios y los que se le asignaron antes y ya no están en el catálogo
  const extras = challenges.filter((c) => !inCatalog.has(c.text));
  const find = (text: string) => challenges.find((c) => c.text === text);
  const toggle = (text: string, kind: ChallengeKind) =>
    setChallenges((list) => (list.some((c) => c.text === text) ? list.filter((c) => c.text !== text) : [...list, { text, kind, done: false, doneAt: null }]));
  const toggleDone = (text: string) => setChallenges((list) => list.map((c) => (c.text === text ? { ...c, done: !c.done, doneAt: null } : c)));
  const addOwn = () => {
    const text = own.trim();
    if (!text) return;
    if (find(text)) return toast.error(new Error(`${t.fem ? 'Esa' : 'Ese'} ${t.one} ya está en la lista`));
    setChallenges((list) => [...list, { text, kind: 'propio', done: false, doneAt: null }]);
    setOwn('');
  };
  const chooseAll = (kind: ChallengeKind, items: string[]) =>
    setChallenges((list) => [...list, ...items.filter((x) => !list.some((c) => c.text === x)).map((text) => ({ text, kind, done: false, doneAt: null }))]);

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/progression/member-competencies/${row.id}`, { status, achievedAt, notes, challenges });
      toast.ok('Competencia guardada');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const doneWord = t.fem ? 'lograda' : 'logrado';
  const doneButton = (c: MemberChallenge) => (
    <button type="button" className={`challenge-done ${c.done ? 'on' : ''}`} onClick={() => toggleDone(c.text)} aria-pressed={c.done}>
      {c.done ? (
        <>
          <Check size={13} /> {t.fem ? 'Lograda' : 'Logrado'}
        </>
      ) : (
        `Marcar ${doneWord}`
      )}
    </button>
  );
  const assigned = challenges.length;
  const done = challenges.filter((c) => c.done).length;
  const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);

  return (
    <Modal
      wide
      title={comp ? `${comp.number ? `${comp.number}. ` : ''}${comp.name}` : 'Competencia'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="challenge-picker">
        <p className="muted" style={{ margin: 0 }}>
          Tildá {t.fem ? 'las' : 'los'} {t.many} que eligió para trabajar esta competencia y marcá {t.fem ? 'las' : 'los'} que va logrando.
          {assigned ? ` Tiene ${assigned} ${plural(assigned, t.fem ? 'asignada' : 'asignado')}, ${done} ${plural(done, doneWord)}.` : ''}
        </p>
        {!inCatalog.size ? (
          <p className="muted">
            Esta competencia todavía no tiene {t.many} {t.fem ? 'cargadas' : 'cargados'} en el catálogo. Podés agregarle {t.many} {t.fem ? 'propias' : 'propios'} acá abajo.
          </p>
        ) : null}
        {groups.map((g) =>
          g.items.length ? (
            <section key={g.kind}>
              <header>
                <strong>{t.kinds[g.kind]}</strong>
                <span className="muted"> ({g.items.length})</span>
                {g.kind === 'requerido' && g.items.some((x) => !find(x)) ? (
                  <button type="button" className="link-btn" onClick={() => chooseAll(g.kind, g.items)}>
                    Elegir {t.fem ? 'todas' : 'todos'}
                  </button>
                ) : null}
              </header>
              {g.items.map((text) => {
                const c = find(text);
                return (
                  <div key={text} className={`challenge-row ${c ? 'on' : ''}`}>
                    <label>
                      <input type="checkbox" checked={!!c} onChange={() => toggle(text, g.kind)} />
                      <span>{text}</span>
                    </label>
                    {c ? doneButton(c) : null}
                  </div>
                );
              })}
            </section>
          ) : null,
        )}
        <section>
          <header>
            <strong>{t.kinds.propio}</strong>
            <span className="muted"> — por si surge {t.fem ? 'alguna' : 'alguno'} que no está en la lista</span>
          </header>
          {extras.map((c) => (
            <div key={c.text} className="challenge-row on">
              <label>
                <input type="checkbox" checked onChange={() => toggle(c.text, c.kind)} aria-label="Quitar" />
                <span>
                  {c.text}
                  {c.kind !== 'propio' ? <span className="muted"> ({CATALOG_KINDS.includes(c.kind) ? 'ya no está en el catálogo' : c.kind})</span> : null}
                </span>
              </label>
              {doneButton(c)}
              <button type="button" className="challenge-remove" onClick={() => toggle(c.text, c.kind)} aria-label={`Quitar ${t.one}`} title="Quitar">
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="row" style={{ gap: 8, flexWrap: 'nowrap', marginTop: 6 }}>
            <Input
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOwn();
                }
              }}
              placeholder={`Escribí ${t.fem ? 'una' : 'un'} ${t.one} ${t.fem ? 'propia' : 'propio'}…`}
              maxLength={600}
            />
            <Button variant="secondary" onClick={addOwn} disabled={!own.trim()}>
              <Plus /> Agregar
            </Button>
          </div>
        </section>
      </div>

      <div className="form-grid" style={{ marginTop: 18 }}>
        <Field label="Estado de la competencia">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {COMPETENCY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {COMPETENCY_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lograda el" hint="Si la marcás lograda sin fecha, queda hoy">
          <Input type="date" value={achievedAt} onChange={(e) => setAchievedAt(e.target.value)} />
        </Field>
        <Field label="Seguimiento" hint="Cómo viene con esta competencia" full>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 90 }} maxLength={4000} />
        </Field>
      </div>
    </Modal>
  );
}
