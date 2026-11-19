import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { animalFromTotem, TOTEM_ANIMALS, totemAnimalLabel } from '@shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Card } from '../../components/ui';
import { TotemAvatar, TotemAvatarButton, totemHasArt } from '../../components/TotemAvatar';

/** Foto de perfil: quien tiene tótem elige el dibujo de su animal. Por ahora no se suben imágenes. */
export function TotemAvatarCard() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const adult = me?.user.adult;
  if (!adult?.totem?.trim()) return null;
  const mine = animalFromTotem(adult.totem);
  const current = adult.avatar ?? null;
  // Primero el animal de su tótem; después el resto de la tribu
  const options = TOTEM_ANIMALS.filter((a) => totemHasArt(a.key)).sort((a, b) => Number(b.key === mine) - Number(a.key === mine) || a.label.localeCompare(b.label, 'es'));
  const choose = async (avatar: string | null) => {
    if (avatar === current) return;
    setBusy(avatar ?? 'none');
    try {
      await api.put('/auth/me/avatar', { avatar });
      await Promise.all([qc.invalidateQueries({ queryKey: ['me'] }), qc.invalidateQueries({ queryKey: ['adults'] }), qc.invalidateQueries({ queryKey: ['adult'] })]);
      toast.ok(avatar ? 'Foto de perfil actualizada' : 'Quedaste sin foto de perfil');
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card title="Tu foto de perfil">
      <div className="avatar-current">
        {current && totemHasArt(current) ? <TotemAvatarButton animal={current} size={84} name={me?.user.name} totem={adult.totem} /> : <span className="avatar-empty" aria-hidden />}
        <div>
          <strong>«{adult.totem}»</strong>
          <div className="muted">
            {current
              ? `Tu foto de perfil: ${totemAnimalLabel(current)}. Tocala para verla grande, con el animal completo.`
              : mine && totemHasArt(mine)
                ? 'Elegí el dibujo de tu animal: se ve al lado de tu nombre.'
                : 'Tu animal todavía no está dibujado: mientras tanto podés elegir otro de la tribu, o avisarnos para sumarlo.'}
          </div>
        </div>
      </div>
      <div className="avatar-grid" role="radiogroup" aria-label="Animal de tu foto de perfil">
        {options.map((a) => (
          <button
            key={a.key}
            type="button"
            role="radio"
            aria-checked={current === a.key}
            className={`avatar-option ${current === a.key ? 'chosen' : ''}`}
            disabled={!!busy}
            onClick={() => void choose(a.key)}
          >
            <span className="avatar-pic">
              <TotemAvatar animal={a.key} size={56} />
              {current === a.key ? (
                <span className="avatar-check">
                  <Check size={12} />
                </span>
              ) : null}
            </span>
            <span className="avatar-name">
              {a.label}
              {a.key === mine ? <small>Tu tótem</small> : null}
            </span>
          </button>
        ))}
      </div>
      {current ? (
        <button type="button" className="link-btn" style={{ marginTop: 12, fontSize: '0.87rem' }} disabled={!!busy} onClick={() => void choose(null)}>
          Quedarme sin foto
        </button>
      ) : null}
    </Card>
  );
}
