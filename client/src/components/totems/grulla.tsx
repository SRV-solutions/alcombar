import { INK, type TotemArt } from './types';

/** Grulla: de perfil, parada en el agua de un bañado. Gris clara, cuello largo negro y blanco, corona roja, plumas caídas atrás. */
const GRAY = '#c7cbd3';
const GRAY_DARK = '#aeb3bd';
const BLACK = '#3a3c44';
const WHITE = '#fbfaf7';
const RED = '#d6403a';
const BILL = '#8d9478';
const LEG = '#4a4d56';
const WATER = '#9fcde0';

const art: TotemArt = {
  bg: '#f8e0d6',
  face: [22, 10, 100],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      {/* juncos */}
      <path d="M204 214 C204 180 206 150 210 120 M214 214 C216 188 220 168 226 150" stroke="#7d9a5a" strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="210" cy="126" rx="4.5" ry="13" fill="#8a5f3c" transform="rotate(6 210 126)" />
      <ellipse cx="225" cy="156" rx="4" ry="11" fill="#8a5f3c" transform="rotate(16 225 156)" />
      {/* agua */}
      <ellipse cx="124" cy="214" rx="100" ry="14" fill={WATER} />
      <ellipse cx="124" cy="218" rx="80" ry="8" fill="#000" opacity="0.06" />
      {/* patas largas */}
      <path d="M134 150 L131 182 L134 214 M152 150 L156 182 L150 214" stroke={LEG} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx="134" cy="214" rx="11" ry="3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="150" cy="214" rx="11" ry="3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M40 210 q10 -3 20 0 M184 220 q8 -3 16 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* cuerpo */}
      <path d="M100 120 C104 104 130 96 158 100 C178 104 190 114 192 128 C192 146 174 156 148 156 C120 156 100 142 100 120 Z" fill={GRAY} />
      <path d="M186 116 C194 130 188 150 168 154 C156 156 142 156 132 154 C160 150 182 138 186 116 Z" fill="#000" opacity="0.08" />
      <path d="M116 112 C138 102 168 106 184 120 C168 134 138 138 118 128 Z" fill={GRAY_DARK} />
      <path d="M120 110 C136 104 154 104 168 108 C150 110 134 114 122 120 Z" fill="#fff" opacity="0.2" />
      {/* plumas caídas de atrás */}
      <path d="M168 116 C190 118 204 132 208 150 C210 162 206 174 198 182 C196 168 190 158 182 152 C186 162 186 172 182 180 C176 166 168 156 158 150 Z" fill={BLACK} />
      <path d="M176 128 q16 8 24 28 M170 136 q12 10 14 30" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.18" />
      {/* cuello */}
      <path d="M66 58 C68 80 80 96 94 110 C100 116 102 124 102 132 L120 128 C118 114 112 102 104 92 C96 82 94 72 94 56 Z" fill={GRAY} />
      <path d="M66 58 C68 80 80 96 94 110 C97 113 99 116 100 120 L106 110 C98 100 90 88 86 76 C84 68 84 62 86 56 Z" fill={BLACK} />
      <path d="M86 52 C92 58 93 68 92 78 C92 88 96 96 104 104 C99 96 100 86 101 76 C102 64 98 56 92 50 Z" fill={WHITE} />
      {/* cabeza */}
      <circle cx="78" cy="50" r="20" fill={BLACK} />
      <path d="M80 46 C86 44 94 46 97 52 C97 60 95 66 92 72 C90 64 86 56 80 52 Z" fill={WHITE} />
      <path d="M66 34 C72 28 84 28 90 34 C86 38 78 39 70 39 Z" fill={RED} />
      <ellipse cx="74" cy="32" rx="5" ry="2" fill="#fff" opacity="0.3" />
      {/* pico largo */}
      <path d="M62 44 L24 57 C22 58 22 60 24 60 L62 56 Z" fill={BILL} />
      <path d="M62 51 L24 59 C22 59.5 22 60 24 60 L62 56 Z" fill="#000" opacity="0.15" />
      <path d="M34 54.5 L24 57 C22 58 22 60 24 60 L34 59.2 Z" fill="#c9c6a6" />
      {/* ojo */}
      <circle cx="78" cy="47" r="5.4" fill="#e9e4da" />
      <circle cx="78" cy="47" r="3.8" fill={INK} />
      <circle cx="79.4" cy="45.6" r="1.4" fill="#fff" />
    </>
  ),
};
export default art;
