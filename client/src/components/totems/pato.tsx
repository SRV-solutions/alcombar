import { INK, type TotemArt } from './types';

/** Pato (ánade real): nadando, de perfil. Cabeza verde con collar blanco, pecho castaño, lomo gris, espejo azul en el ala, colita rizada. */
const GREEN = '#2f7d4f';
const GREEN_DARK = '#225f3b';
const CHESTNUT = '#8b4a2b';
const CHESTNUT_DARK = '#6f3820';
const GRAY = '#dcd8d0';
const GRAY_DARK = '#c3beb4';
const WING = '#a8978a';
const BLUE = '#3c62b5';
const TAIL = '#2b2b2e';
const BILL = '#f3c33b';
const BILL_DARK = '#d9a226';
const WATER = '#8fc4dd';
const WATER_DARK = '#72aecb';

const art: TotemArt = {
  bg: '#f6efc2',
  face: [24, 28, 106],
  art: (
    <>
      <circle cx="120" cy="116" r="102" fill="#fff" opacity="0.35" />
      {/* cola rizada */}
      <path d="M184 122 C196 114 210 116 216 124 C218 134 208 142 194 146 Z" fill={TAIL} />
      <path d="M206 124 C212 120 220 121 222 126 C220 131 212 133 206 132 Z" fill="#f4f1ea" />
      <path d="M194 120 C192 110 200 106 205 110 C208 114 204 118 201 116" stroke={TAIL} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* cuerpo */}
      <ellipse cx="134" cy="140" rx="66" ry="34" fill={GRAY} />
      <path d="M184 120 C200 134 198 160 176 170 C160 176 140 176 124 174 C156 168 184 152 184 120 Z" fill={GRAY_DARK} />
      <ellipse cx="128" cy="116" rx="40" ry="8" fill="#fff" opacity="0.4" />
      {/* ala con el espejo azul */}
      <path d="M108 118 C138 106 176 112 198 130 C180 146 148 150 120 142 C110 138 104 126 108 118 Z" fill={WING} />
      <path d="M148 134 C162 134 174 134 186 131 L184 140 C170 143 158 144 146 142 Z" fill={BLUE} />
      <path d="M147 133 C162 133 174 133 186 130 M146 143 C160 145 172 144 184 141" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M118 124 q20 -6 40 -4 M124 132 q14 -2 24 0" stroke="#000" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.15" />
      {/* pecho castaño */}
      <path d="M60 108 C54 128 62 150 84 160 C94 164 104 166 112 166 C102 150 98 128 102 108 C88 112 72 112 60 108 Z" fill={CHESTNUT} />
      <path d="M100 116 C98 134 102 152 112 166 C104 166 98 164 92 162 C88 146 90 128 100 116 Z" fill={CHESTNUT_DARK} />
      <ellipse cx="72" cy="122" rx="6" ry="10" fill="#fff" opacity="0.15" />
      {/* cuello y collar blanco */}
      <path d="M62 92 C60 100 60 106 62 110 C76 114 90 114 104 108 C104 100 102 94 98 88 Z" fill={GREEN_DARK} />
      <path d="M61 103 C74 109 90 109 104 103 L105 109 C90 115 74 115 61 110 Z" fill="#fff" />
      {/* cabeza verde */}
      <circle cx="82" cy="76" r="30" fill={GREEN} />
      <ellipse cx="72" cy="58" rx="14" ry="7" fill="#fff" opacity="0.18" />
      <path d="M102 54 C114 66 114 86 104 98 C98 104 90 106 82 106 C98 96 108 78 102 54 Z" fill={GREEN_DARK} />
      {/* pico */}
      <path d="M58 76 C48 76 36 78 30 84 C26 88 28 94 36 95 C46 96 54 94 62 92 Z" fill={BILL} />
      <path d="M36 95 C46 96 54 94 62 92 L62 96 C54 99 44 100 36 98 C32 97 30 95 32 94 Z" fill={BILL_DARK} />
      <ellipse cx="31" cy="88" rx="2.6" ry="3" fill="#4a4636" />
      <path d="M38 92 q10 2 21 -2" stroke={BILL_DARK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <ellipse cx="50" cy="82" rx="2" ry="1.2" fill={BILL_DARK} />
      {/* ojo */}
      <circle cx="76" cy="70" r="4.8" fill={INK} />
      <circle cx="77.6" cy="68.4" r="1.6" fill="#fff" />
      {/* agua */}
      <path d="M0 160 C20 152 40 152 60 160 C80 168 100 168 120 160 C140 152 160 152 180 160 C200 168 220 168 240 160 L240 240 L0 240 Z" fill={WATER} />
      <path d="M0 196 C24 188 48 188 72 196 C96 204 120 204 144 196 C168 188 192 188 216 196 C226 199 234 199 240 198 L240 240 L0 240 Z" fill={WATER_DARK} />
      <ellipse cx="130" cy="168" rx="72" ry="5" fill="#000" opacity="0.1" />
      <path d="M44 166 q10 4 20 0 M196 166 q10 4 20 0 M100 182 q12 4 24 0 M30 212 q10 -4 20 0 M170 214 q10 -4 20 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
    </>
  ),
};
export default art;
