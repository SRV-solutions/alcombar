/**
 * Buscador global (barra superior, Ctrl+K), como en sentryx: dónde está cada cosa (índice de ayuda y
 * tutoriales) y, según los permisos, protagonistas y adultos por nombre. Flechas para moverse, Enter abre.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CornerDownLeft, PlayCircle, Search, UserRound, UsersRound } from 'lucide-react';
import { BRANCH_INFO, type Branch } from '@shared';
import { api, qs } from '../lib/api';
import { useAuth } from '../lib/auth';
import { searchHelp, type HelpEntry } from '../help/helpIndex';
import { useHelpContext } from '../help/useHelpContext';
import './search.css';

interface MemberHit {
  id: string;
  firstName: string;
  lastName: string;
  status?: string;
  unit: { code: string; name: string } | null;
  smallGroup?: { name: string } | null;
  dni?: string | null;
  branch?: string | null;
}
interface AdultHit {
  id: string;
  firstName: string;
  lastName: string;
  totem: string | null;
  assignments?: { position: string; unit: { code: string } | null; supportTeam: { name: string } | null }[];
}
type Result = { kind: 'help'; entry: HelpEntry } | { kind: 'member'; m: MemberHit } | { kind: 'adult'; a: AdultHit };

const useDebounced = (value: string, ms = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

const resultKey = (r: Result) => (r.kind === 'help' ? `h-${r.entry.id}` : r.kind === 'member' ? `m-${r.m.id}` : `a-${r.a.id}`);

export function GlobalSearch({ compact }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const ctx = useHelpContext();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dq = useDebounced(q).trim();
  const help = useMemo(() => searchHelp(ctx, q, 6), [ctx, q]);
  const canMembers = can('members', 'view');
  const canAdults = can('adults', 'view');

  const members = useQuery({
    queryKey: ['search-members', dq],
    queryFn: () => api.get<MemberHit[]>(`/members${qs({ q: dq, status: 'todos', limit: 8 })}`),
    enabled: canMembers && dq.length >= 2,
    staleTime: 30_000,
  });
  const adults = useQuery({
    queryKey: ['search-adults', dq],
    queryFn: () => api.get<AdultHit[]>(`/adults${qs({ q: dq })}`),
    enabled: canAdults && dq.length >= 2,
    staleTime: 30_000,
  });

  // Si busca un DNI o encuentra personas, las personas van primero; la ayuda, después.
  const looksLikeDni = /^[\d.\s-]{3,}$/.test(dq);
  const results: Result[] = useMemo(() => {
    const people: Result[] = [
      ...(members.data ?? []).slice(0, 6).map((m) => ({ kind: 'member' as const, m })),
      ...(adults.data ?? []).slice(0, 4).map((a) => ({ kind: 'adult' as const, a })),
    ];
    const helpHits: Result[] = looksLikeDni ? [] : help.map((entry) => ({ kind: 'help' as const, entry }));
    return people.length ? [...people, ...helpHits.slice(0, 4)] : helpHits;
  }, [help, members.data, adults.data, looksLikeDni]);
  useEffect(() => setActive(0), [results.length, q]);

  // Ctrl+K / Cmd+K enfoca el buscador desde cualquier pantalla (solo el visible).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        const el = inputRef.current;
        if (!el || el.getClientRects().length === 0) return;
        e.preventDefault();
        el.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (r: Result) => {
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
    if (r.kind === 'help') navigate(r.entry.path);
    else if (r.kind === 'member') navigate(`/protagonistas/${r.m.id}`);
    else navigate(`/adultos/${r.a.id}`);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const fetching = members.isFetching || adults.isFetching;
  const memberSub = (m: MemberHit) => {
    const where = m.unit ? m.unit.name : m.branch ? `${BRANCH_INFO[m.branch as Branch]?.label ?? m.branch} · por asignar` : 'Sin unidad';
    const dni = looksLikeDni && m.dni ? ` · DNI ${m.dni}` : '';
    return `Protagonista · ${where}${m.smallGroup ? ` · ${m.smallGroup.name}` : ''}${dni}${m.status === 'baja' ? ' · Baja' : ''}`;
  };
  const adultSub = (a: AdultHit) => {
    const cargos = (a.assignments ?? []).map((x) => `${x.position}${x.unit ? ` (${x.unit.code})` : x.supportTeam ? ` (${x.supportTeam.name})` : ''}`);
    return `Adulto${a.totem ? ` · «${a.totem}»` : ''}${cargos.length ? ` · ${cargos.join(', ')}` : ''}`;
  };

  return (
    <div ref={boxRef} className={`gsearch ${compact ? 'gsearch-compact' : ''}`}>
      <Search size={16} className="gsearch-icon" />
      <input
        ref={inputRef}
        className="input gsearch-input"
        placeholder={compact ? 'Buscar persona, DNI o pantalla…' : 'Buscá una persona (nombre, apellido o DNI) o qué querés hacer…  (Ctrl+K)'}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="Buscar en ALCOMBAR"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="gsearch-list"
        autoComplete="off"
      />
      {open && q.trim() ? (
        <div className="gsearch-menu" role="listbox" id="gsearch-list">
          {!results.length ? (
            <div className="gsearch-empty">
              {fetching
                ? 'Buscando…'
                : looksLikeDni
                  ? 'No hay nadie con ese DNI (o no lo podés ver).'
                  : 'Nada por acá. Probá con otra palabra (por ejemplo "asistencia", "patrulla", "ficha médica") o con el apellido.'}
            </div>
          ) : null}
          {results.map((r, i) => (
            <div key={resultKey(r)} style={{ display: 'contents' }}>
              {i === 0 || (results[i - 1].kind === 'help') !== (r.kind === 'help') ? (
                <div className="gsearch-section">{r.kind === 'help' ? 'Dónde está cada cosa' : 'Personas'}</div>
              ) : null}
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={`gsearch-item ${i === active ? 'active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
              >
                <span className="gsearch-kind">
                  {r.kind === 'help' ? (
                    r.entry.section === 'Tutoriales' ? (
                      <PlayCircle size={16} />
                    ) : (
                      <BookOpen size={16} />
                    )
                  ) : r.kind === 'member' ? (
                    <UserRound size={16} />
                  ) : (
                    <UsersRound size={16} />
                  )}
                </span>
                <span className="gsearch-body">
                  {r.kind === 'help' ? (
                    <>
                      <span className="gsearch-title">
                        {r.entry.title} <span className="gsearch-sub-inline">· {r.entry.section}</span>
                      </span>
                      <span className="gsearch-sub">{r.entry.description}</span>
                    </>
                  ) : r.kind === 'member' ? (
                    <>
                      <span className="gsearch-title">
                        {r.m.lastName}, {r.m.firstName}
                      </span>
                      <span className="gsearch-sub">{memberSub(r.m)}</span>
                    </>
                  ) : (
                    <>
                      <span className="gsearch-title">
                        {r.a.lastName}, {r.a.firstName}
                      </span>
                      <span className="gsearch-sub">{adultSub(r.a)}</span>
                    </>
                  )}
                </span>
                {i === active ? <CornerDownLeft size={14} className="gsearch-enter" /> : null}
              </button>
            </div>
          ))}
          <div className="gsearch-foot">
            ↑↓ para moverte · Enter para abrir ·{' '}
            <a
              href="/ayuda"
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                setQ('');
                navigate('/ayuda');
              }}
            >
              Ver el índice completo
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
