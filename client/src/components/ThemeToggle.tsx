import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../lib/theme';

/**
 * compact: un solo botón con el ícono de luna o sol, en la barra de arriba junto a Ayuda y los avisos.
 * Completo: tres opciones Claro / Oscuro / Sistema (Mi perfil).
 */
export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, preference, setPreference, toggle } = useTheme();
  if (compact) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-icon theme-toggle"
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
        title={theme === 'dark' ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
      >
        {theme === 'dark' ? <Sun /> : <Moon />}
      </button>
    );
  }
  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Claro', icon: <Sun size={15} /> },
    { value: 'dark', label: 'Oscuro', icon: <Moon size={15} /> },
    { value: 'system', label: 'Como el sistema', icon: <Monitor size={15} /> },
  ];
  return (
    <div className="segmented theme-segmented" role="radiogroup" aria-label="Tema de la app">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={preference === o.value}
          className={preference === o.value ? 'on' : ''}
          onClick={() => setPreference(o.value)}
        >
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  );
}
