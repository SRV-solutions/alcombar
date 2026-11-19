import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Copy, Search } from 'lucide-react';
import { formatDate } from '@shared';
import { api, qs } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, Card, Input } from '../../components/ui';
import { SheetStatusBadge } from './common';
import { searchSheet, SheetHitLine, type SheetHit } from './sheetSearch';
import type { Sheet, SheetSummary } from './types';

const MAX = 20;

/**
 * Ficha nueva a partir de otra: buscar entre las fichas de la unidad (todas) y las del banco del Grupo (aprobadas,
 * realizadas o evaluadas), por su nombre o por lo que dice adentro, y copiar su contenido al formulario para modificarlo.
 * No toca la ficha original.
 */
export function CloneSheetPicker({ unitId, onPick }: { unitId: string; onPick: (s: Sheet) => void }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const term = q.trim();
  // Al banco se le pregunta cuando la persona deja de escribir un instante
  const [asked, setAsked] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setAsked(term), 250);
    return () => clearTimeout(t);
  }, [term]);
  const own = useQuery({ queryKey: ['program-sheets', unitId, '', ''], queryFn: () => api.get<SheetSummary[]>(`/program/sheets${qs({ unitId })}`), enabled: !!unitId });
  const bank = useQuery({
    queryKey: ['program-bank', '', '', '', '', '', asked],
    queryFn: () => api.get<SheetSummary[]>(`/program/sheets/bank${qs({ q: asked })}`),
    enabled: !!asked,
    placeholderData: keepPreviousData,
  });
  const { results, total } = useMemo(() => {
    if (!term) return { results: [], total: 0 };
    const seen = new Set<string>();
    const out: { sheet: SheetSummary; mine: boolean; where: SheetHit | null }[] = [];
    const add = (list: SheetSummary[] | undefined, mine: boolean) => {
      for (const s of list ?? []) {
        if (seen.has(s.id)) continue;
        const hit = searchSheet(s, term);
        if (!hit) continue;
        seen.add(s.id);
        out.push({ sheet: s, mine, where: hit.where });
      }
    };
    add(own.data, true);
    add(bank.data, false);
    // Primero las que coinciden por el nombre; después, las que lo tienen adentro
    out.sort((a, b) => Number(!!a.where) - Number(!!b.where));
    return { results: out.slice(0, MAX), total: out.length };
  }, [term, own.data, bank.data]);
  const searching = own.isLoading || bank.isFetching || asked !== term;

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
          Buscá entre las fichas de la unidad y las del banco del Grupo, por el nombre o por lo que dice adentro (objetivos, descripción, materiales…), y copiá su contenido para
          modificarlo.
        </p>
      )}
      {!unitId ? (
        <p className="muted" style={{ marginBottom: 0 }}>Elegí primero la unidad.</p>
      ) : (
        <>
          <div className="clone-search">
            <Search aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: postas, brújula, primeros auxilios, campamento…" aria-label="Buscar una ficha para copiar, por nombre o por contenido" />
          </div>
          {term ? (
            results.length ? (
              <>
                <ul className="list-plain clone-results">
                  {results.map(({ sheet: s, mine, where }) => (
                    <li key={s.id}>
                      <span className="clone-main">
                        <strong>
                          {s.code} · {s.name}
                        </strong>
                        <span className="muted">{[mine ? 'De tu unidad' : s.unit?.name, s.date ? formatDate(s.date) : null, s.place].filter(Boolean).join(' · ')}</span>
                        {where ? <SheetHitLine hit={where} /> : null}
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
                {total > MAX ? (
                  <p className="muted" style={{ marginBottom: 0 }}>
                    Hay {total} fichas con eso: se muestran las primeras {MAX}. Escribí algo más para afinar.
                  </p>
                ) : null}
              </>
            ) : searching ? (
              <p className="muted">Buscando…</p>
            ) : (
              <p className="muted" style={{ marginBottom: 0 }}>Ninguna ficha tiene eso, ni en el nombre ni en el contenido.</p>
            )
          ) : null}
        </>
      )}
    </Card>
  );
}
