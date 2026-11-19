import type { ReactNode } from 'react';

/**
 * El dibujo de un animal de la Tribu: una ilustración de cuerpo entero en un lienzo de 240 × 240.
 * La foto de perfil es un recorte de esa misma ilustración (la cabeza); al tocarla se ve el animal completo.
 */
export interface TotemArt {
  /** Color de fondo del lienzo (pastel, que contraste con el animal). */
  bg: string;
  /** Recorte para la foto de perfil: [x, y, lado] de un cuadrado que encierra la cabeza con un poco de aire. */
  face: [number, number, number];
  /** El dibujo, en coordenadas 0–240. Sin <defs>, ids, degradés ni texto. */
  art: ReactNode;
}

/** Tinta para ojos, hocicos y detalles oscuros: la misma en todos los animales. */
export const INK = '#2a1a16';
