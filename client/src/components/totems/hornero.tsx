import { INK, type TotemArt } from './types';

/** Hornero: de perfil, parado sobre su nido de barro. Lomo rojizo, garganta y vientre claros, ceja clara. */
const RUFOUS = '#b5673a';
const RUFOUS_DARK = '#8c4a26';
const CREAM = '#f1dfc0';
const MUD = '#a67649';
const MUD_DARK = '#7d5433';

const art: TotemArt = {
  bg: '#f6e4bd',
  face: [22, 30, 118],
  art: (
    <>
      <circle cx="120" cy="118" r="102" fill="#fff" opacity="0.35" />
      {/* nido de barro */}
      <path d="M34 240 C34 196 66 172 116 172 C166 172 198 196 198 240 Z" fill={MUD} />
      <path d="M150 180 C180 192 198 214 198 240 L160 240 C166 216 162 196 150 180 Z" fill="#000" opacity="0.1" />
      <path d="M78 240 C76 216 84 200 98 200 C112 200 120 216 118 240 Z" fill={MUD_DARK} />
      <path d="M52 214 q10 -4 18 0 M130 196 q12 -3 22 2 M140 222 q10 -4 20 0 M56 232 q8 -3 14 0" stroke={MUD_DARK} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* patas */}
      <path d="M116 150 v24 M136 148 v26 M106 175 h14 M126 175 h14" stroke="#5b4636" strokeWidth="3.4" strokeLinecap="round" />
      {/* cola */}
      <path d="M160 104 L212 82 L208 106 L168 128 Z" fill={RUFOUS_DARK} />
      <path d="M164 112 L210 92 L208 106 L168 128 Z" fill="#000" opacity="0.12" />
      {/* cuerpo */}
      <ellipse cx="124" cy="116" rx="54" ry="39" fill={RUFOUS} transform="rotate(-13 124 116)" />
      <path d="M64 96 C68 122 92 150 132 154 C160 156 172 142 176 128 C150 146 104 138 84 96 Z" fill={CREAM} />
      {/* ala */}
      <path d="M108 100 C132 90 160 98 176 118 C152 132 124 132 108 118 Z" fill={RUFOUS_DARK} />
      <path d="M118 112 q22 8 46 4 M122 120 q18 6 36 3" stroke="#000" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.18" />
      {/* cabeza */}
      <circle cx="80" cy="84" r="30" fill={RUFOUS} />
      <ellipse cx="70" cy="68" rx="16" ry="8" fill="#fff" opacity="0.14" />
      <path d="M56 96 C60 110 72 122 90 128 C82 116 78 104 78 94 Z" fill={CREAM} />
      <path d="M53 78 L20 88 L53 94 Z" fill="#5b4636" />
      <path d="M53 86 L20 88 L53 94 Z" fill="#000" opacity="0.18" />
      <path d="M58 68 q16 -9 32 -1" stroke="#efd2a8" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="72" cy="80" r="5.4" fill={INK} />
      <circle cx="73.6" cy="78.2" r="1.7" fill="#fff" />
    </>
  ),
};
export default art;
