import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Search } from 'lucide-react';
import { formatDate } from '@shared';
import { api, qs } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, Card, Input } from '../../components/ui';
import { SheetStatusBadge } from './common';
import type { Sheet, SheetSummary } from './types';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Ficha nueva a partir de otra: buscar entre las fichas de la unidad (todas) y las del banco del Grupo (aprobadas,
 * realizadas o evaluadas), y copiar su contenido al formulario para modificarlo. No toca la ficha original.
 */
export function CloneSheetPicker({ unitId, onPick }: { unitId: string; onPick: (s: Sheet) => void }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const term = q.trim();
  const own = useQuery({ queryKey: ['program-sheets', unitId, '', ''], queryFn: () => api.get<SheetSummary[]>(`/program/sheets${qs({ unitId })}`), enabled: !!unitId });
  const bank = useQuery({
    queryKey: ['program-bank', '', '', '', '', '', term],
    queryFn: () => api.get<SheetSummary[]>(`/program/sheets/bank${qs({ q: term })}`),
    enabled: term.length >= 2,
  });
  const results = useMemo(() => {
    if (term.length < 2) return [];
    const words = fold(term).split(/\s+/).filter(Boolean);
    const match = (s: SheetSummary) => words.every((w) => fold(`${s.code} ${s.name} ${s.place ?? ''}`).includes(w));
    const seen = new Set<string>();
    const out: { sheet: SheetSummary; mine: boolean }[] = [];
    for (const s of own.data ?? []) if (match(s) && !seen.has(s.id)) (seen.add(s.id), out.push({ sheet: s, mine: true }));
    for (const s of bank.data ?? []) if (!seen.has(s.id)) (seen.add(s.id), out.push({ sheet: s, mine: false }));
    return out.slice(0, 12);
  }, [term, own.data, bank.data]);

  const use = async (id: string) => {
    setLoadingId(id);
    try {
      const s = await api.get<Sheet>(`/program/sheets/${id}`);
      onPick(s);
      setPicked(`${s.code} · ${s.name}`);
      setQ('');
    } catch (e) {
      toast.error(e);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card title="¿Partís de una ficha que ya existe?">
      {picked ? (
        <p style={{ marginTop: 0 }}>
          Copiaste <strong>{picked}</strong>. Cambiá lo que necesites abajo: se guarda como una ficha nueva y la original no se toca.
        </p>
      ) : (
        <p className="muted" style={{ marginTop: 0 }}>
          Buscá por nombre, código o lugar entre las fichas de la unidad y las del banco del Grupo, y copiá su contenido para modificarlo.
        </p>
      )}
      {!unitId ? (
        <p className="muted" style={{ marginBottom: 0 }}>Elegí primero la unidad.</p>
      ) : (
        <>
          <div className="clone-search">
            <Search aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: juego de postas, campamento, REME…" aria-label="Buscar una ficha para copiar" />
          </div>
          {term.length >= 2 ? (
            results.length ? (
              <ul className="list-plain clone-results">
                {results.map(({ sheet: s, mine }) => (
                  <li key={s.id}>
                    <span className="clone-main">
                      <strong>
                        {s.code} · {s.name}
                      </strong>
                      <span className="muted">
                        {[mine ? 'De tu unidad' : s.unit?.name, s.date ? formatDate(s.date) : null, s.place].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      <SheetStatusBadge status={s.status} />
                      <Button size="sm" variant="secondary" loading={loadingId === s.id} disabled={!!loadingId} onClick={() => void use(s.id)}>
                        <Copy /> Copiar
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : own.isLoading || bank.isLoading ? (
              <p className="muted">Buscando…</p>
            ) : (
              <p className="muted" style={{ marginBottom: 0 }}>No hay fichas con eso.</p>
            )
          ) : null}
        </>
      )}
    </Card>
  );
}
