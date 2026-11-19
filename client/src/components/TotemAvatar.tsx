import { useState } from 'react';
import { totemAnimalLabel } from '@shared';
import { Modal } from './ui';
import type { TotemArt } from './totems/types';

/**
 * Los animales de los tótems de la Tribu. Cada uno es un archivo en ./totems/<clave>.tsx con su ilustración de cuerpo
 * entero; acá se arma el registro solo. La foto de perfil es el recorte de la cabeza de esa misma ilustración.
 */
const modules = import.meta.glob<{ default: TotemArt }>('./totems/*.tsx', { eager: true });
const ART: Record<string, TotemArt> = {};
for (const [path, mod] of Object.entries(modules)) {
  const key = path.replace(/^.*\/([a-z]+)\.tsx$/, '$1');
  if (mod.default?.art) ART[key] = mod.default;
}

/** ¿Este animal ya tiene su dibujo? */
export const totemHasArt = (animal: string | null | undefined) => !!animal && !!ART[animal];

/** La foto de perfil: la cabeza del animal en un círculo. Si el animal no está dibujado, no muestra nada. */
export function TotemAvatar({ animal, size = 40, className }: { animal: string | null | undefined; size?: number; className?: string }) {
  const a = animal ? ART[animal] : undefined;
  if (!a) return null;
  const [x, y, s] = a.face;
  return (
    <svg
      viewBox={`${x} ${y} ${s} ${s}`}
      width={size}
      height={size}
      role="img"
      aria-label={totemAnimalLabel(animal) ?? undefined}
      className={`totem-avatar ${className ?? ''}`}
      style={{ borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'block' }}
    >
      <rect x="-240" y="-240" width="720" height="720" fill={a.bg} />
      {a.art}
    </svg>
  );
}

/** El animal completo, a lo ancho del lugar que tenga. */
export function TotemFull({ animal, className }: { animal: string | null | undefined; className?: string }) {
  const a = animal ? ART[animal] : undefined;
  if (!a) return null;
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label={totemAnimalLabel(animal) ?? undefined} className={`totem-full ${className ?? ''}`} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 20 }}>
      <rect width="240" height="240" fill={a.bg} />
      {a.art}
    </svg>
  );
}

/** La foto de perfil que, al tocarla, se abre grande con el animal completo. */
export function TotemAvatarButton({ animal, size = 40, name, totem }: { animal: string | null | undefined; size?: number; name?: string | null; totem?: string | null }) {
  const [open, setOpen] = useState(false);
  if (!totemHasArt(animal)) return null;
  const label = totemAnimalLabel(animal) ?? '';
  return (
    <>
      <button type="button" className="totem-btn" onClick={() => setOpen(true)} aria-label={`Ver grande la foto de perfil${name ? ` de ${name}` : ''}: ${label}`} title="Ver el animal completo">
        <TotemAvatar animal={animal} size={size} />
      </button>
      {open ? (
        <Modal title={totem ? `«${totem}»` : label} onClose={() => setOpen(false)}>
          <div className="totem-view">
            <TotemFull animal={animal} />
            <div className="totem-view-caption">
              <strong>{label}</strong>
              {name ? <span className="muted">{name}</span> : null}
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
