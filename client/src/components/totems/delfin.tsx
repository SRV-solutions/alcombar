import { INK, type TotemArt } from './types';

/** Delfín nariz de botella: saltando en arco sobre el agua. Gris con el lomo más oscuro, vientre claro, pico corto, aleta dorsal curva. */
const BODY = '#93a4b3';
const BODY_DARK = '#738596';
const BELLY = '#e2e8ed';
const SEA = '#5fa8d3';
const SEA_DARK = '#4791c0';
const FOAM = '#eef7fb';

const art: TotemArt = {
  bg: '#fbe6cc',
  face: [20, 30, 100],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      {/* agua de atrás y salpicadura */}
      <path d="M0 186 C16 180 32 180 48 186 C64 192 80 192 96 186 C112 180 128 180 144 186 C160 192 176 192 192 186 C208 180 224 180 240 186 L240 240 L0 240 Z" fill={SEA} />
      {/* aleta dorsal */}
      <path d="M116 58 C126 46 138 36 156 32 C150 44 150 58 158 74 Z" fill={BODY_DARK} />
      <path d="M156 32 C150 44 150 58 158 74 L148 70 C144 56 146 44 156 32 Z" fill="#000" opacity="0.12" />
      {/* aleta pectoral del otro lado */}
      <path d="M104 100 C112 110 120 116 130 118 C128 110 122 104 114 100 Z" fill="#62737f" />
      {/* cola */}
      <path d="M190 144 C198 150 210 152 222 150 C216 160 206 166 196 164 C190 170 180 174 168 174 C174 164 182 152 190 144 Z" fill={BODY_DARK} />
      <path d="M196 164 C190 170 180 174 168 174 C176 168 184 162 192 152 Z" fill="#000" opacity="0.12" />
      {/* cuerpo */}
      <path d="M30 94 C30 88 40 84 52 82 C54 66 70 54 90 52 C126 50 160 70 180 102 C186 114 192 130 196 144 L188 150 C180 126 160 106 128 100 C100 96 80 104 60 102 C48 102 36 100 30 94 Z" fill={BODY} />
      {/* lomo oscuro */}
      <path d="M64 62 C84 50 124 48 152 64 C170 76 184 96 192 128 C180 102 162 82 136 74 C110 66 86 66 64 62 Z" fill={BODY_DARK} />
      {/* vientre claro */}
      <path d="M30 94 C36 100 48 102 60 102 C80 104 100 96 128 100 C160 106 180 126 188 150 C176 126 158 102 128 88 C106 80 84 90 64 92 C50 93 40 94 30 94 Z" fill={BELLY} />
      <ellipse cx="80" cy="62" rx="20" ry="6" fill="#fff" opacity="0.18" transform="rotate(-14 80 62)" />
      <path d="M178 100 C186 114 192 130 196 144 L188 150 C184 136 178 122 168 112 Z" fill="#000" opacity="0.1" />
      {/* aleta pectoral */}
      <path d="M82 92 C86 106 94 118 108 124 C110 112 104 100 94 92 Z" fill={BODY_DARK} />
      {/* espiráculo */}
      <path d="M100 55 q4 -2 8 0" stroke="#5d6d7c" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* boca y ojo */}
      <path d="M35 95 C44 98 54 97 60 92" stroke="#5d6d7c" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="72" cy="78" r="4.6" fill={INK} />
      <circle cx="73.6" cy="76.4" r="1.6" fill="#fff" />
      {/* olas y gotas */}
      <path d="M160 190 C160 180 164 172 170 168 C170 178 168 186 166 192 Z M176 190 C178 178 184 170 192 166 C190 176 186 184 180 192 Z M150 192 C146 184 144 178 146 172 C152 178 154 184 156 192 Z" fill={FOAM} />
      <circle cx="206" cy="172" r="3" fill={FOAM} />
      <circle cx="214" cy="160" r="2.2" fill={FOAM} />
      <circle cx="140" cy="166" r="2.4" fill={FOAM} />
      <circle cx="222" cy="168" r="2" fill={FOAM} />
      <circle cx="132" cy="176" r="1.8" fill={FOAM} />
      <path d="M0 204 C16 198 32 198 48 204 C64 210 80 210 96 204 C112 198 128 198 144 204 C160 210 176 210 192 204 C208 198 224 198 240 204 L240 240 L0 240 Z" fill={SEA_DARK} />
      <path d="M10 183 q12 -4 24 0 M74 189 q12 -4 24 0 M200 183 q12 -4 24 0" stroke={FOAM} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M20 213 q12 -4 24 0 M150 215 q12 -4 24 0" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.45" />
      <circle cx="40" cy="226" r="3" fill="#fff" opacity="0.5" />
      <circle cx="120" cy="224" r="2.4" fill="#fff" opacity="0.5" />
    </>
  ),
};
export default art;
