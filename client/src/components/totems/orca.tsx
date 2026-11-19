import { INK, type TotemArt } from './types';

/** Orca: de perfil, nadando en la superficie. Negra, parche blanco detrás del ojo, mentón y vientre blancos, montura gris y aleta dorsal alta. */
const BLACK = '#252a32';
const BLACK_DARK = '#181c22';
const WHITE = '#f6f7f9';
const WHITE_SHADE = '#d9dfe6';
const SADDLE = '#9ea8b3';
const SEA = '#5d9fd0';
const SEA_DARK = '#4688bd';
const FOAM = '#eef6fc';

const art: TotemArt = {
  bg: '#d6edf7',
  face: [10, 60, 110],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      {/* aleta dorsal alta */}
      <path d="M98 84 C104 62 110 40 118 20 C126 30 134 56 144 90 Z" fill={BLACK} />
      <path d="M118 20 C126 30 134 56 144 90 L132 88 C130 62 124 40 118 20 Z" fill="#000" opacity="0.2" />
      {/* cola */}
      <path d="M198 96 C204 84 212 74 224 68 C226 78 222 88 214 96 C222 98 228 104 230 112 C218 114 206 108 198 104 Z" fill={BLACK} />
      <path d="M214 96 C222 98 228 104 230 112 C218 114 206 108 198 104 Z" fill="#000" opacity="0.2" />
      {/* cuerpo */}
      <path d="M20 116 C20 96 38 84 64 82 C98 80 136 84 166 96 C178 101 188 100 196 94 L204 104 C194 114 184 122 170 128 C150 142 120 150 88 150 C56 150 30 142 22 128 C20 124 20 120 20 116 Z" fill={BLACK} />
      {/* mentón y vientre blancos */}
      <path d="M21 121 C30 127 44 129 58 128 C76 128 92 136 108 144 C100 148 92 150 86 150 C56 150 30 142 22 128 C21 126 21 124 21 121 Z" fill={WHITE} />
      <path d="M112 150 C128 140 142 124 160 116 C170 112 180 112 186 116 C182 120 176 124 170 128 C150 142 130 148 112 150 Z" fill={WHITE} />
      <path d="M40 140 C56 146 76 148 96 146 C90 149 86 150 80 150 C60 150 46 146 40 140 Z" fill={WHITE_SHADE} />
      {/* montura gris */}
      <path d="M142 90 C152 88 164 92 174 99 C162 102 150 100 142 96 Z" fill={SADDLE} />
      <ellipse cx="62" cy="90" rx="26" ry="6" fill="#fff" opacity="0.14" transform="rotate(-6 62 90)" />
      <path d="M166 96 C178 101 188 100 196 94 L204 104 C190 118 170 130 150 140 C168 126 176 112 166 96 Z" fill="#000" opacity="0.14" />
      {/* parche del ojo */}
      <ellipse cx="74" cy="102" rx="13" ry="6.4" fill={WHITE} transform="rotate(-14 74 102)" />
      {/* aleta pectoral */}
      <path d="M66 138 C72 150 84 160 100 162 C108 162 108 154 100 148 C92 142 82 138 74 136 Z" fill={BLACK_DARK} />
      {/* espiráculo */}
      <path d="M84 82 q4 -2 8 0" stroke="#4a525d" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* boca y ojo */}
      <path d="M22 121 C34 127 46 128 56 126 C60 125 62 123 63 120" stroke={BLACK_DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="54" cy="110" r="5.4" fill="#dfe5ea" />
      <circle cx="54.3" cy="110.3" r="4" fill={INK} />
      <circle cx="55.8" cy="108.8" r="1.5" fill="#fff" />
      {/* olas */}
      <path d="M0 160 C14 154 28 154 42 160 C56 166 70 166 84 160 C98 154 112 154 126 160 C140 166 154 166 168 160 C182 154 196 154 210 160 C224 166 234 164 240 160 L240 240 L0 240 Z" fill={SEA} />
      <path d="M0 196 C20 190 40 190 60 196 C80 202 100 202 120 196 C140 190 160 190 180 196 C200 202 220 202 240 196 L240 240 L0 240 Z" fill={SEA_DARK} />
      <path d="M52 157 q12 -4 24 0 M136 157 q12 -4 24 0 M206 157 q12 -4 24 0" stroke={FOAM} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M78 160 C80 154 86 152 90 156 C94 152 100 154 100 160 Z M170 160 C172 155 178 154 181 157 C184 154 190 156 190 160 Z" fill={FOAM} />
      <circle cx="40" cy="180" r="3.6" fill="#fff" opacity="0.55" />
      <circle cx="100" cy="220" r="2.4" fill="#fff" opacity="0.45" />
      <circle cx="120" cy="184" r="2.6" fill="#fff" opacity="0.55" />
      <circle cx="190" cy="214" r="3" fill="#fff" opacity="0.45" />
    </>
  ),
};
export default art;
