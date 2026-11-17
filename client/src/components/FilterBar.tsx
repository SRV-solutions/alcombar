import { useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

/**
 * Barra de búsqueda + filtros. En la compu los filtros van al lado del buscador; en el celular quedan detrás del
 * botón «Filtros (n)» para que el buscador ocupe todo el ancho y la lista quede a la vista.
 */
export function FilterBar({
  value,
  onChange,
  placeholder,
  active,
  onClear,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** Cuántos filtros hay aplicados (se muestra en el botón del celular). */
  active: number;
  onClear?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="toolbar filterbar">
      <div className="filterbar-search">
        <Search size={16} className="filterbar-icon" />
        <input
          className="input"
          type="search"
          inputMode="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
        />
        {value ? (
          <button type="button" className="filterbar-clear" onClick={() => onChange('')} aria-label="Borrar la búsqueda">
            <X size={16} />
          </button>
        ) : null}
      </div>
      <button type="button" className={`btn btn-secondary filterbar-toggle ${active ? 'has' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <SlidersHorizontal /> Filtros{active ? ` (${active})` : ''}
      </button>
      <div className={`filterbar-filters ${open ? 'open' : ''}`}>
        {children}
        {active && onClear ? (
          <button type="button" className="link-btn filterbar-reset" onClick={onClear}>
            Sacar filtros
          </button>
        ) : null}
      </div>
    </div>
  );
}
