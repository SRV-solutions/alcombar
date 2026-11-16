import { Luisito } from './Luisito';

/**
 * Logo de la app: Luisito, la figura del Grupo Scout 155.
 * Toma el color del contenedor (currentColor): oro en la barra lateral, bordó en el ingreso (oro en modo oscuro).
 */
export function Logo({ className = '', animated = false, size = 40 }: { className?: string; animated?: boolean; size?: number }) {
  return <Luisito className={`logo ${className}`} size={size} animated={animated} pose="wave" />;
}
