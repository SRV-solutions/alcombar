import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import './search-select.css';

export interface SearchOption {
  value: string;
  label: string;
  /** Texto chico debajo (rama, sigla, explicación). */
  hint?: string;
  /** Título del grupo en la lista (ej. la rama). */
  group?: string;
  /** Palabras extra para encontrarla (ej. la sigla). */
  keywords?: string;
  /** Color de la marquita a la izquierda (ej. color de la rama). */
  color?: string;
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Lista desplegable con buscador. Se abre debajo del campo (no flota), así funciona igual dentro de un modal
 * y en el celular. Teclado: flechas, Enter para elegir, Escape para cerrar; escribir sobre el campo cerrado
 * lo abre y empieza a buscar.
 */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Elegí una opción',
  searchPlaceholder = 'Buscar…',
  emptyText = 'No hay coincidencias',
  invalid,
  disabled,
  id,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}) {
  const auto = useId();
  const baseId = id ?? auto;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    if (!words.length) return options;
    return options.filter((o) => {
      const text = fold(`${o.label} ${o.hint ?? ''} ${o.group ?? ''} ${o.keywords ?? ''}`);
      return words.every((w) => text.includes(w));
    });
  }, [options, q]);

  const openList = (seed = '') => {
    if (disabled) return;
    setQ(seed);
    const idx = seed ? 0 : Math.max(0, options.findIndex((o) => o.value === value));
    setActive(idx);
    setOpen(true);
  };
  const close = (focusTrigger = true) => {
    setOpen(false);
    setQ('');
    if (focusTrigger) requestAnimationFrame(() => trigger.current?.focus());
  };
  const pick = (o: SearchOption) => {
    onChange(o.value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openList();
    } else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      openList(e.key);
    }
  };
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[active]) pick(filtered[active]);
    } else if (e.key === 'Escape') {
      // Que no cierre el modal que lo contiene
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  let lastGroup: string | undefined;
  return (
    <div className={`sselect ${open ? 'open' : ''}`} ref={wrap}>
      {!open ? (
        <button
          ref={trigger}
          type="button"
          id={baseId}
          className={`sselect-trigger input ${invalid ? 'invalid' : ''}`}
          onClick={() => openList()}
          onKeyDown={onTriggerKey}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={false}
          aria-label={ariaLabel}
        >
          {selected ? (
            <span className="sselect-value">
              {selected.color ? <span className="sselect-dot" style={{ background: selected.color }} /> : null}
              <span className="sselect-text">
                <span className="sselect-label">{selected.label}</span>
                {selected.hint ? <span className="sselect-hint">{selected.hint}</span> : null}
              </span>
            </span>
          ) : (
            <span className="sselect-placeholder">{placeholder}</span>
          )}
          <ChevronDown className="sselect-chevron" aria-hidden />
        </button>
      ) : (
        <div className="sselect-panel">
          <div className="sselect-search">
            <Search aria-hidden />
            <input
              ref={search}
              className="input"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKey}
              placeholder={searchPlaceholder}
              role="combobox"
              aria-expanded
              aria-controls={`${baseId}-list`}
              aria-activedescendant={filtered[active] ? `${baseId}-opt-${active}` : undefined}
              aria-label={ariaLabel ?? searchPlaceholder}
              autoComplete="off"
              enterKeyHint="done"
            />
          </div>
          <ul className="sselect-list" id={`${baseId}-list`} role="listbox" ref={list}>
            {filtered.length ? (
              filtered.map((o, i) => {
                const header = o.group && o.group !== lastGroup ? o.group : null;
                lastGroup = o.group;
                return (
                  <li key={o.value} role="presentation">
                    {header ? <div className="sselect-group">{header}</div> : null}
                    <div
                      id={`${baseId}-opt-${i}`}
                      data-idx={i}
                      role="option"
                      aria-selected={o.value === value}
                      className={`sselect-option ${i === active ? 'active' : ''} ${o.value === value ? 'selected' : ''}`}
                      onMouseMove={() => setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(o)}
                    >
                      {o.color ? <span className="sselect-dot" style={{ background: o.color }} /> : null}
                      <span className="sselect-text">
                        <span className="sselect-label">{o.label}</span>
                        {o.hint ? <span className="sselect-hint">{o.hint}</span> : null}
                      </span>
                      {o.value === value ? <Check className="sselect-check" aria-hidden /> : null}
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="sselect-empty">{emptyText}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
