/**
 * Crédito de quien hizo la app: "Powered by SRV" con el logo, enlazado a wearesrv.com.
 * - sidebar: compacto, sobre el bordó del menú.
 * - auth: debajo de los formularios de ingreso.
 * - page: al pie de páginas como Ayuda.
 */
export function PoweredBySrv({ variant = 'sidebar' }: { variant?: 'sidebar' | 'auth' | 'page' }) {
  return (
    <a
      className={`powered-srv powered-srv-${variant}`}
      href="https://wearesrv.com"
      target="_blank"
      rel="noopener noreferrer"
      title="Creada y desarrollada por SRV · wearesrv.com"
    >
      <span className="powered-srv-logo">
        <img src="/brand/srv-logo-64.png" srcSet="/brand/srv-logo-64.png 1x, /brand/srv-logo-128.png 2x" alt="" width={22} height={22} />
      </span>
      <span className="powered-srv-text">
        <span className="powered-srv-label">
          Powered by <strong>SRV</strong>
        </span>
        <span className="powered-srv-sub">{variant === 'sidebar' ? 'wearesrv.com' : 'Creada y desarrollada por SRV · wearesrv.com'}</span>
      </span>
    </a>
  );
}
