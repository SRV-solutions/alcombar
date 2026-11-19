import { INK, type TotemArt } from './types';

/** Franciscana (delfín del Plata): nadando bajo el agua, de perfil. Chica, pardo grisácea, pico muy largo y fino, frente abultada, aletas anchas y redondeadas. */
const BODY = '#a69788';
const BODY_DARK = '#8a7b6d';
const BACK = '#9a8b7d';
const BELLY = '#e6ddd1';
const BUBBLE = '#ffffff';

const art: TotemArt = {
  bg: '#d3ebe6',
  face: [14, 60, 112],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      {/* ondas del agua */}
      <path d="M40 44 q14 -6 28 0 t28 0 M150 50 q12 -5 24 0 t24 0 M30 200 q14 -6 28 0 t28 0 M146 196 q12 -5 24 0 t24 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* aleta dorsal, baja y redondeada */}
      <path d="M126 94 C134 86 142 80 150 78 C153 80 155 90 162 104 Z" fill={BODY_DARK} />
      <path d="M150 78 C153 80 155 90 162 104 L154 102 C152 94 151 86 150 78 Z" fill="#000" opacity="0.12" />
      {/* cola */}
      <path d="M194 122 C202 112 212 104 226 102 C226 112 220 120 210 125 C220 130 226 138 226 148 C212 146 202 138 194 130 Z" fill={BODY_DARK} />
      <path d="M210 125 C220 130 226 138 226 148 C212 146 202 138 194 130 Z" fill="#000" opacity="0.12" />
      {/* cuerpo con el pico largo y fino */}
      <path d="M12 126 C12 123 15 121 20 121 L60 117 C62 100 78 88 100 88 C134 88 168 102 196 120 L198 130 C176 142 150 154 118 154 C94 154 76 146 66 132 L20 131 C15 131 12 129 12 126 Z" fill={BODY} />
      {/* lomo más oscuro */}
      <path d="M64 108 C68 94 82 88 100 88 C134 88 168 102 196 120 C170 112 142 106 114 106 C94 106 78 108 64 108 Z" fill={BACK} />
      {/* mandíbula clara del pico */}
      <path d="M18 128 L64 128 C66 130 66 131 66 132 L20 131 C17 131 16 130 18 128 Z" fill={BELLY} />
      {/* vientre claro */}
      <path d="M66 132 C76 146 94 154 118 154 C150 154 176 142 198 130 C174 136 148 142 120 142 C100 142 82 138 66 132 Z" fill={BELLY} />
      <ellipse cx="96" cy="96" rx="18" ry="6" fill="#fff" opacity="0.18" transform="rotate(-10 96 96)" />
      <path d="M172 108 C184 114 192 118 196 120 L198 130 C186 136 172 142 160 146 C174 136 178 122 172 108 Z" fill="#000" opacity="0.1" />
      {/* aleta pectoral ancha */}
      <path d="M88 136 C88 148 92 160 102 166 C110 170 115 164 111 155 C107 147 100 140 94 135 Z" fill={BODY_DARK} />
      {/* espiráculo */}
      <path d="M104 89 q4 -2 8 0" stroke="#6b5e52" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* boca y ojo */}
      <path d="M18 126 L62 126 C66 126 70 125 73 121" stroke="#6b5e52" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="84" cy="113" r="4.2" fill={INK} />
      <circle cx="85.4" cy="111.6" r="1.5" fill="#fff" />
      {/* burbujas */}
      <circle cx="96" cy="74" r="4" fill={BUBBLE} opacity="0.75" />
      <circle cx="104" cy="60" r="3" fill={BUBBLE} opacity="0.75" />
      <circle cx="96" cy="48" r="5" fill={BUBBLE} opacity="0.75" />
      <circle cx="36" cy="104" r="3" fill={BUBBLE} opacity="0.75" />
      <circle cx="28" cy="92" r="4.4" fill={BUBBLE} opacity="0.75" />
      <circle cx="204" cy="168" r="3.4" fill={BUBBLE} opacity="0.6" />
      <circle cx="214" cy="182" r="2.2" fill={BUBBLE} opacity="0.6" />
      <circle cx="22" cy="80" r="2.6" fill={BUBBLE} opacity="0.75" />
      <circle cx="112" cy="36" r="2.4" fill={BUBBLE} opacity="0.75" />
    </>
  ),
};
export default art;
