import { INK, type TotemArt } from './types';

/** Petrel: ave marina oscura planeando al ras de las olas, con un ala casi tocando el agua. Pico con el tubo de la nariz arriba. */
const DARK = '#45404b';
const DARK_DEEP = '#36323b';
const FACE = '#6d6773';
const BILL = '#dccf9f';
const BILL_DARK = '#bfae78';
const SEA = '#6c9fbf';
const SEA_DARK = '#557f9f';

const art: TotemArt = {
  bg: '#efe3d6',
  face: [30, 70, 88],
  art: (
    <>
      <circle cx="120" cy="116" r="102" fill="#fff" opacity="0.35" />
      {/* mar */}
      <path d="M0 186 C24 178 44 174 64 180 C84 186 100 192 124 188 C150 184 170 172 194 176 C214 180 228 186 240 184 L240 240 L0 240 Z" fill={SEA} />
      <path d="M0 212 C24 204 48 204 72 210 C96 216 120 218 144 212 C168 206 192 204 216 210 C226 212 234 212 240 211 L240 240 L0 240 Z" fill={SEA_DARK} />
      <path d="M176 176 C186 170 200 170 210 176 M30 184 q12 -6 24 -2 M94 196 q12 4 24 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" />
      <circle cx="204" cy="166" r="2.2" fill="#fff" opacity="0.8" />
      <circle cx="212" cy="160" r="1.6" fill="#fff" opacity="0.8" />
      <circle cx="196" cy="162" r="1.4" fill="#fff" opacity="0.8" />
      <ellipse cx="120" cy="190" rx="50" ry="3.5" fill="#000" opacity="0.08" />
      {/* ala de atrás, hacia arriba */}
      <path d="M112 108 C140 84 180 56 224 34 C208 58 174 92 140 118 Z" fill={DARK_DEEP} />
      <path d="M118 106 C146 86 180 62 216 42 C190 62 162 86 132 108 Z" fill="#fff" opacity="0.08" />
      {/* cola */}
      <path d="M162 110 C172 108 184 110 192 116 C186 124 174 128 162 128 Z" fill={DARK_DEEP} />
      {/* cuerpo */}
      <path d="M62 116 C66 100 96 94 126 100 C148 104 164 110 176 118 C164 128 146 134 122 134 C94 134 66 130 62 116 Z" fill={DARK} />
      <path d="M80 126 C100 132 124 134 146 130 C158 128 168 124 176 118 C164 132 144 138 120 138 C100 138 86 134 80 126 Z" fill="#000" opacity="0.12" />
      <ellipse cx="116" cy="104" rx="22" ry="4" fill="#fff" opacity="0.1" />
      {/* ala de adelante, bajando hacia el agua */}
      <path d="M104 116 C134 128 170 150 200 176 C172 170 142 156 118 136 Z" fill={DARK} />
      <path d="M106 118 C132 128 160 144 186 164 C160 154 136 142 114 128 Z" fill="#fff" opacity="0.1" />
      <path d="M200 176 C188 172 178 168 168 164 C176 168 186 174 192 178 Z" fill={DARK_DEEP} />
      {/* cabeza */}
      <circle cx="82" cy="110" r="22" fill={DARK} />
      <path d="M62 112 C62 124 72 132 86 132 C80 126 76 118 76 110 Z" fill={FACE} />
      <ellipse cx="76" cy="96" rx="10" ry="4.5" fill="#fff" opacity="0.14" />
      {/* pico con tubo */}
      <path d="M64 104 C54 104 44 108 38 114 C34 118 35 123 39 123 C40 120 42 118 46 118 L66 116 Z" fill={BILL} />
      <path d="M46 118 L66 116 L64 122 C58 124 50 123 46 121 Z" fill={BILL_DARK} />
      <path d="M38 114 C34 118 35 123 39 123 C40 121 41 119 43 118 C41 117 39 116 38 114 Z" fill="#8f8160" />
      <path d="M66 100 C60 98 52 100 48 104 C48 108 52 110 58 109 L66 108 Z" fill={BILL_DARK} />
      <ellipse cx="49.5" cy="105.5" rx="1.8" ry="2" fill={INK} />
      {/* ojo */}
      <path d="M74 114 q5 3 10 0" stroke={FACE} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="79" cy="106" r="5.2" fill={FACE} />
      <circle cx="79" cy="106" r="4" fill={INK} />
      <circle cx="80.4" cy="104.6" r="1.5" fill="#fff" />
    </>
  ),
};
export default art;
