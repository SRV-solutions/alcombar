import { TOTEM_ANIMALS } from '@shared';
import { TotemAvatar, TotemFull, totemHasArt } from './TotemAvatar';

/**
 * Solo en desarrollo (/dev/totems): la lámina de los animales, para dibujarlos mirándolos.
 * ?solo=puma,hornero muestra solo esos; ?faltan lista los que todavía no tienen dibujo.
 */
export function TotemPreview() {
  const params = new URLSearchParams(window.location.search);
  const only = (params.get('solo') ?? '').split(',').filter(Boolean);
  const list = TOTEM_ANIMALS.filter((a) => (only.length ? only.includes(a.key) : totemHasArt(a.key)));
  const missing = TOTEM_ANIMALS.filter((a) => !totemHasArt(a.key));
  return (
    <div style={{ padding: 16, background: '#1d1614', minHeight: '100vh', color: '#f3ebe6', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {list.map((a) => (
          <div key={a.key} style={{ background: '#2a211e', borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {a.label} <span style={{ opacity: 0.6, fontWeight: 400 }}>{a.key}</span>
            </div>
            {totemHasArt(a.key) ? (
              <>
                <TotemFull animal={a.key} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                  <TotemAvatar animal={a.key} size={96} />
                  <TotemAvatar animal={a.key} size={56} />
                  <TotemAvatar animal={a.key} size={36} />
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.6 }}>sin dibujo</div>
            )}
          </div>
        ))}
      </div>
      {params.has('faltan') ? <p>Faltan {missing.length}: {missing.map((m) => m.key).join(', ')}</p> : null}
    </div>
  );
}
