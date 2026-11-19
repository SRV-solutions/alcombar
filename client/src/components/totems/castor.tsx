import { INK, type TotemArt } from './types';

/** Castor: sentado, de frente, con una ramita entre las manos. Dientes delanteros naranjas, cola ancha y chata con escamas. */
const FUR = '#8b5a3c';
const FUR_DARK = '#744a31';
const BELLY = '#b4865f';
const MUZZLE = '#cfab8a';
const FOOT = '#4f3b31';
const TAIL = '#5a4840';
const TAIL_LINE = '#7b675c';
const TOOTH = '#ea8a2c';
const WOOD = '#c09460';

const art: TotemArt = {
  bg: '#cfe8e6',
  face: [50, 18, 120],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="134" cy="213" rx="90" ry="9" fill="#000" opacity="0.12" />
      {/* cola chata con escamas */}
      <path d="M136 196 C146 192 156 192 162 194 L162 210 C154 212 144 212 136 210 Z" fill={TAIL} />
      <g transform="translate(190 202) rotate(6)">
        <ellipse cx="0" cy="0" rx="37" ry="16" fill={TAIL} />
        <path d="M16.3 -9.4 L29.9 2.9 M1.1 -11 L22 7.8 M-11.4 -10.2 L11.4 10.2 M-22 -7.8 L-1.1 11 M-29.9 -2.9 L-16.3 9.4 M-29.9 2.9 L-16.3 -9.4 M-22 7.8 L-1.1 -11 M-11.4 10.2 L11.4 -10.2 M1.1 11 L22 -7.8 M16.3 9.4 L29.9 -2.9" stroke={TAIL_LINE} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M-34 6.6 A37 16 0 0 0 36 3.7 C24 12 -16 14 -34 6.6 Z" fill="#000" opacity="0.14" />
        <ellipse cx="-8" cy="-9" rx="18" ry="4" fill="#fff" opacity="0.14" />
      </g>
      {/* ancas */}
      <ellipse cx="76" cy="182" rx="28" ry="28" fill={FUR_DARK} />
      <ellipse cx="144" cy="182" rx="28" ry="28" fill={FUR_DARK} />
      {/* cuerpo y panza */}
      <path d="M110 96 C74 96 54 132 54 168 C54 198 74 212 110 212 C146 212 166 198 166 168 C166 132 146 96 110 96 Z" fill={FUR} />
      <path d="M110 120 C90 120 82 146 82 172 C82 196 94 208 110 208 C126 208 138 196 138 172 C138 146 130 120 110 120 Z" fill={BELLY} />
      <path d="M142 110 C158 128 168 150 166 170 C165 198 146 212 110 212 C142 202 154 168 142 110 Z" fill="#000" opacity="0.09" />
      {/* patas traseras palmeadas */}
      <ellipse cx="72" cy="208" rx="23" ry="8" fill={FOOT} />
      <ellipse cx="148" cy="208" rx="23" ry="8" fill={FOOT} />
      <path d="M58 207 v4 M66 208 v4 M154 208 v4 M162 207 v4" stroke="#6e5648" strokeWidth="1.6" strokeLinecap="round" />
      {/* ramita */}
      <path d="M58 156 C80 150 120 144 160 138 L161 145 C120 151 80 157 59 163 Z" fill={WOOD} />
      <ellipse cx="59" cy="159.5" rx="3.5" ry="4" fill="#ecd3a6" />
      <ellipse cx="160.5" cy="141.5" rx="3.5" ry="4" fill="#ecd3a6" />
      <path d="M150 140 C154 128 164 124 172 126 C168 134 160 140 150 140 Z" fill="#6aa84f" />
      <path d="M152 139 q8 -6 18 -12" stroke="#4f8a3a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* brazos y manos sobre la ramita */}
      <path d="M80 116 C68 126 70 144 82 152 C90 157 98 152 97 144 C94 136 92 126 94 120 Z" fill={FUR} />
      <path d="M140 116 C152 126 150 144 138 152 C130 157 122 152 123 144 C126 136 128 126 126 120 Z" fill={FUR} />
      <ellipse cx="90" cy="152" rx="9" ry="7" fill={FOOT} />
      <ellipse cx="130" cy="147" rx="9" ry="7" fill={FOOT} />
      {/* orejas */}
      <circle cx="68" cy="46" r="12" fill={FUR_DARK} />
      <circle cx="152" cy="46" r="12" fill={FUR_DARK} />
      <circle cx="69" cy="47" r="6" fill={FOOT} />
      <circle cx="151" cy="47" r="6" fill={FOOT} />
      {/* cabeza */}
      <ellipse cx="110" cy="76" rx="50" ry="44" fill={FUR} />
      <ellipse cx="90" cy="48" rx="22" ry="9" fill="#fff" opacity="0.14" />
      <path d="M142 42 C160 56 166 80 158 98 C150 112 136 118 122 120 C146 108 154 76 142 42 Z" fill="#000" opacity="0.08" />
      {/* hocico: cachetes, nariz y dientes naranjas */}
      <rect x="101.5" y="100" width="17" height="23" rx="3.5" fill={TOOTH} />
      <path d="M110 102 v20" stroke="#c76d1a" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="103.5" y="108" width="3.5" height="12" rx="1.6" fill="#fff" opacity="0.35" />
      <ellipse cx="97" cy="96" rx="16" ry="12.5" fill={MUZZLE} />
      <ellipse cx="123" cy="96" rx="16" ry="12.5" fill={MUZZLE} />
      <path d="M100 84 q10 -6 20 0 q-2 8 -10 9 q-8 -1 -10 -9 Z" fill={INK} />
      <ellipse cx="106" cy="84" rx="3" ry="1.6" fill="#fff" opacity="0.4" />
      <path d="M86 96 l-22 -3 M86 101 l-22 4 M134 96 l22 -3 M134 101 l22 4" stroke="#4a3328" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      {/* ojos */}
      <circle cx="87" cy="66" r="6.5" fill={INK} />
      <circle cx="133" cy="66" r="6.5" fill={INK} />
      <circle cx="89.3" cy="63.6" r="2.2" fill="#fff" />
      <circle cx="135.3" cy="63.6" r="2.2" fill="#fff" />
    </>
  ),
};
export default art;
