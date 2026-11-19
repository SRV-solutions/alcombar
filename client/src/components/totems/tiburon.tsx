import { INK, type TotemArt } from './types';

/** Tiburón: de perfil, nadando bajo el agua. Gris azulado con el vientre blanco, aleta dorsal alta, branquias, cola en media luna; sonrisa cerrada, sin dientes. */
const BODY = '#7f97ad';
const BODY_DARK = '#647d94';
const BELLY = '#f1f4f6';
const BELLY_SHADE = '#d6dde4';
const LINE = '#4d6378';

const art: TotemArt = {
  bg: '#f4efcf',
  face: [10, 64, 104],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      {/* ondas del agua */}
      <path d="M54 34 q14 -6 28 0 t28 0 M148 40 q12 -5 24 0 t24 0 M40 206 q14 -6 28 0 t28 0 M150 202 q12 -5 24 0 t24 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* aleta dorsal */}
      <path d="M96 92 C104 76 118 58 136 46 C134 60 134 78 142 98 Z" fill={BODY_DARK} />
      <path d="M136 46 C134 60 134 78 142 98 L132 96 C128 80 130 62 136 46 Z" fill="#000" opacity="0.12" />
      <path d="M104 84 C110 74 118 64 128 56 C122 66 116 76 112 88 Z" fill="#fff" opacity="0.14" />
      {/* segunda dorsal y aleta anal */}
      <path d="M166 104 C170 98 174 94 180 92 C180 98 181 104 184 108 Z" fill={BODY_DARK} />
      <path d="M166 136 C170 142 174 146 180 148 C180 142 182 136 184 132 Z" fill={BODY_DARK} />
      {/* cola en media luna */}
      <path d="M196 112 C204 96 212 80 222 66 C226 82 224 100 214 116 C220 124 226 134 228 146 C216 142 206 132 196 122 Z" fill={BODY_DARK} />
      <path d="M214 116 C220 124 226 134 228 146 C216 142 206 132 196 122 Z" fill="#000" opacity="0.1" />
      {/* cuerpo */}
      <path d="M20 118 C22 106 40 96 66 92 C100 86 140 90 170 102 C182 107 192 110 202 110 L204 122 C194 124 184 128 172 132 C140 146 100 150 70 146 C46 142 26 132 20 122 C19 120 19 119 20 118 Z" fill={BODY} />
      {/* vientre blanco */}
      <path d="M20 120 C26 132 46 142 70 146 C100 150 140 146 172 132 C184 128 194 124 204 122 C186 122 160 126 130 128 C100 130 70 128 48 124 C36 122 26 120 20 120 Z" fill={BELLY} />
      <path d="M60 140 C90 148 130 146 160 136 C140 146 104 150 72 146 Z" fill={BELLY_SHADE} />
      <ellipse cx="66" cy="100" rx="26" ry="6" fill="#fff" opacity="0.18" transform="rotate(-8 66 100)" />
      <path d="M150 96 C170 102 184 108 202 110 L204 122 C190 124 176 126 160 124 C170 118 166 104 150 96 Z" fill="#000" opacity="0.1" />
      {/* aleta pectoral */}
      <path d="M86 132 C92 146 102 160 118 168 C120 156 114 142 102 134 Z" fill={BODY_DARK} />
      <path d="M118 168 C120 156 114 142 102 134 L108 134 C116 142 120 154 118 168 Z" fill="#000" opacity="0.12" />
      <path d="M138 140 C142 148 148 152 156 154 C154 148 152 142 150 138 Z" fill={BODY_DARK} />
      {/* branquias */}
      <path d="M78 106 q-4 9 0 18 M86 104 q-4 10 0 20 M94 104 q-4 10 0 20" stroke={LINE} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* boca y ojo */}
      <path d="M30 128 C38 134 50 134 58 128" stroke={LINE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="48" cy="110" r="5.2" fill={INK} />
      <circle cx="49.8" cy="108.2" r="1.8" fill="#fff" />
      <circle cx="30" cy="116" r="1.4" fill={LINE} />
      {/* burbujas */}
      <circle cx="24" cy="92" r="4" fill="#fff" />
      <circle cx="32" cy="78" r="3" fill="#fff" />
      <circle cx="24" cy="64" r="5" fill="#fff" />
      <circle cx="200" cy="170" r="3.4" fill="#fff" />
      <circle cx="210" cy="182" r="2.2" fill="#fff" />
      <circle cx="36" cy="54" r="2.4" fill="#fff" />
    </>
  ),
};
export default art;
