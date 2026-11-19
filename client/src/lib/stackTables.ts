/**
 * Tablas que en el celular se apilan (clase «stack-sm»): cada fila pasa a ser una tarjeta y cada celda lleva delante
 * el nombre de su columna. Ese nombre sale del encabezado: acá se copia a cada celda (data-label) y se mantiene al día
 * cuando la tabla cambia. Así una tabla se vuelve apilable solo con agregarle la clase.
 */
function label(table: HTMLTableElement) {
  const heads = [...table.querySelectorAll<HTMLTableCellElement>('thead th')].map((th) => (th.textContent ?? '').trim());
  if (!heads.length) return;
  for (const row of table.querySelectorAll<HTMLTableRowElement>('tbody tr')) {
    [...row.cells].forEach((td, i) => {
      const text = heads[i] ?? '';
      if (td.dataset.label !== text) td.dataset.label = text;
    });
  }
}

export function installStackTables(root: HTMLElement): () => void {
  let queued = false;
  const run = () => {
    queued = false;
    root.querySelectorAll<HTMLTableElement>('table.stack-sm').forEach(label);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(root, { childList: true, subtree: true });
  schedule();
  return () => observer.disconnect();
}
