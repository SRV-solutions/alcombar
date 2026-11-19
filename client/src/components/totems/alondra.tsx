import { INK, type TotemArt } from './types';

/** Alondra: de perfil, en el pasto, cantando con el pico abierto. Parda y rayada, con una crestita en la nuca. */
const BROWN = '#b48a5a';
const BROWN_DARK = '#7a5636';
const BROWN_LIGHT = '#c9a372';
const STREAK = '#6b4a2f';
const CREAM = '#f2e6c8';
const BILL = '#cdb08a';
const BILL_DARK = '#8c6a4a';
const GRASS = '#7fae6a';
const GRASS_DARK = '#5f8f4f';

const art: TotemArt = {
  bg: '#d3eadb',
  face: [26, 42, 106],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="122" cy="206" rx="70" ry="9" fill="#000" opacity="0.12" />
      {/* notas del canto */}
      <ellipse cx="26" cy="40" rx="5.5" ry="4.2" fill={GRASS_DARK} transform="rotate(-20 26 40)" />
      <path d="M31 38 V20 q6 2 8 8" stroke={GRASS_DARK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <ellipse cx="50" cy="26" rx="4.6" ry="3.6" fill={GRASS} transform="rotate(-20 50 26)" />
      <path d="M54.5 24.5 V12" stroke={GRASS} strokeWidth="2.2" strokeLinecap="round" />
      {/* patas */}
      <path d="M112 166 L108 200 M128 166 L128 200 M96 201 h22 M117 201 h21" stroke="#b08670" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      {/* cola */}
      <path d="M154 146 L206 176 C210 180 208 188 202 189 L148 166 Z" fill={BROWN_DARK} />
      <path d="M150 162 L202 189 C206 188 209 184 208 180 L204 183 C204 185 202 186 200 186 Z" fill={CREAM} />
      {/* cuerpo */}
      <ellipse cx="126" cy="140" rx="50" ry="34" fill={BROWN} transform="rotate(22 126 140)" />
      <path d="M66 104 C70 132 92 162 130 170 C148 173 162 168 170 160 C140 160 104 140 88 104 Z" fill={CREAM} />
      <path d="M168 120 C176 136 174 158 162 168 C150 176 136 176 124 172 C146 168 166 150 168 120 Z" fill="#000" opacity="0.1" />
      {/* rayas del pecho */}
      <path d="M82 116 l2 5 M90 112 l2 5 M88 126 l2 5 M97 122 l2 5 M95 136 l2 5 M104 132 l2 5 M104 146 l2 4 M113 142 l2 4" stroke={STREAK} strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
      {/* ala con plumas ribeteadas */}
      <path d="M108 112 C132 102 162 116 178 144 C158 158 130 154 114 138 C104 128 102 118 108 112 Z" fill={BROWN_LIGHT} />
      <path d="M118 120 q10 6 18 4 M128 132 q10 6 20 4 M144 124 q10 6 18 6 M150 140 q8 4 16 3" stroke={STREAK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M120 116 q10 4 18 2 M146 120 q8 4 14 6" stroke={CREAM} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M114 106 l10 -3 M128 108 l10 0 M140 112 l9 3" stroke={STREAK} strokeWidth="2.4" strokeLinecap="round" />
      {/* crestita */}
      <path d="M72 70 C84 60 100 56 120 56 C112 62 106 68 102 78 Z" fill={BROWN_DARK} />
      <path d="M84 66 C94 61 104 59 114 59 C106 63 100 67 96 72 Z" fill={BROWN} />
      {/* cabeza */}
      <circle cx="84" cy="94" r="28" fill={BROWN} />
      <ellipse cx="76" cy="76" rx="13" ry="6" fill="#fff" opacity="0.16" />
      <path d="M78 74 l4 -3 M88 72 l5 -2 M96 78 l5 -2" stroke={STREAK} strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="95" cy="104" rx="10" ry="8" fill={BROWN_DARK} opacity="0.22" />
      <path d="M58 104 C62 116 72 124 86 128 C80 120 76 110 76 102 Z" fill={CREAM} />
      <path d="M64 84 q12 -9 27 -4" stroke="#f3e2bf" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* pico abierto, cantando */}
      <path d="M61 86 C54 82 47 77 42 74 C43 80 43 85 44 89 C50 91 55 92 61 93 Z" fill="#e5877f" />
      <path d="M62 80 C55 77 47 74 40 72 C46 79 53 85 60 90 Z" fill={BILL_DARK} />
      <path d="M61 92 C55 92 48 91 42 90 C48 94 54 97 61 98 Z" fill={BILL} />
      {/* ojo */}
      <circle cx="76" cy="91" r="4.8" fill={INK} />
      <circle cx="77.6" cy="89.4" r="1.6" fill="#fff" />
      {/* pasto */}
      <path d="M34 208 C34 194 38 184 46 176 C44 188 46 198 48 208 Z M44 208 C46 196 52 188 60 184 C56 194 54 202 54 208 Z" fill={GRASS} />
      <path d="M176 208 C178 196 182 186 190 180 C188 190 188 200 190 208 Z M186 208 C190 198 196 192 206 190 C200 198 198 204 198 208 Z" fill={GRASS} />
      <path d="M90 206 C92 198 96 192 102 190 C100 196 100 202 100 206 Z M140 206 C140 198 144 192 150 188 C148 196 148 202 150 206 Z" fill={GRASS_DARK} />
    </>
  ),
};
export default art;
