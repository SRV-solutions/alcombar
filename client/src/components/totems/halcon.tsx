import { INK, type TotemArt } from './types';

/** Halcón peregrino: posado en una cornisa de roca, de tres cuartos. Lomo gris pizarra, capucha y bigotera oscuras, pecho claro barrado. */
const SLATE = '#5d6878';
const SLATE_DARK = '#465060';
const HOOD = '#333b48';
const CREAM = '#f4ecdf';
const CREAM_SHADE = '#e2d6c2';
const BAR = '#727b89';
const YELLOW = '#f2c230';
const BEAK = '#5f6b7a';
const ROCK = '#a59a8c';
const ROCK_LIGHT = '#bcb2a5';

const art: TotemArt = {
  bg: '#f4d9c1',
  face: [44, 28, 104],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      {/* cornisa de roca */}
      <path d="M14 240 C14 220 24 206 48 201 C80 196 112 194 134 197 C146 199 150 212 148 240 Z" fill={ROCK} />
      <path d="M48 201 C80 196 112 194 134 197 C140 198 144 202 146 207 C118 205 86 206 56 210 C46 208 44 203 48 201 Z" fill={ROCK_LIGHT} />
      <path d="M134 197 C146 199 150 212 148 240 L132 240 C136 224 138 208 134 197 Z" fill="#000" opacity="0.12" />
      <path d="M40 222 l14 6 M96 220 l10 10 l12 -2" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.15" />
      {/* cola barrada */}
      <path d="M134 178 L156 174 L170 222 C164 228 154 230 148 228 Z" fill={SLATE} />
      <path d="M140 192 l20 -3 M144 204 l20 -3 M147 216 l19 -3" stroke={SLATE_DARK} strokeWidth="2.6" strokeLinecap="round" />
      {/* cuerpo y pecho barrado */}
      <path d="M88 96 C70 116 70 160 90 182 C106 198 140 198 154 180 C170 160 166 112 148 96 C132 82 104 82 88 96 Z" fill={CREAM} />
      <path d="M112 186 C128 190 144 188 154 180 C146 194 128 198 110 194 Z" fill={CREAM_SHADE} />
      <path d="M84 140 q4 2.5 8 0 M96 142 q4 2.5 8 0 M108 141 q4 2.5 8 0 M80 152 q4 2.5 8 0 M92 154 q4 2.5 8 0 M104 154 q4 2.5 8 0 M116 152 q4 2.5 8 0 M84 166 q4 2.5 8 0 M96 167 q4 2.5 8 0 M108 167 q4 2.5 8 0 M92 179 q4 2.5 8 0 M104 180 q4 2.5 8 0 M116 178 q4 2.5 8 0" stroke={BAR} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M90 118 l2 3 M100 122 l2 3 M88 128 l2 3" stroke={BAR} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {/* garras */}
      <path d="M102 190 L101 199 M101 199 l-7 2 M101 199 l1 5 M101 199 l7 2 M122 190 L122 199 M122 199 l-7 2 M122 199 l1 5 M122 199 l7 2" stroke={YELLOW} strokeWidth="4.2" strokeLinecap="round" fill="none" />
      {/* ala de punta fina */}
      <path d="M128 94 C154 98 170 124 168 156 C166 184 160 206 152 224 C140 204 126 182 120 158 C114 134 114 108 128 94 Z" fill={SLATE} />
      <path d="M130 98 C146 104 156 118 160 134 C148 128 134 126 120 128 C118 116 122 104 130 98 Z" fill="#fff" opacity="0.1" />
      <path d="M130 140 q16 6 30 4 M128 156 q16 6 32 2 M134 172 q12 6 26 2" stroke={SLATE_DARK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M160 120 C170 140 168 172 158 200 C156 210 154 218 152 224 C150 200 160 160 160 120 Z" fill="#000" opacity="0.12" />
      {/* cabeza con capucha */}
      <circle cx="98" cy="72" r="30" fill={HOOD} />
      <ellipse cx="90" cy="52" rx="14" ry="6" fill="#fff" opacity="0.12" />
      <path d="M103 86 C110 82 120 84 126 90 C126 100 120 108 110 110 C104 104 101 96 103 86 Z" fill={CREAM} />
      <path d="M70 82 C72 94 78 104 90 108 C100 110 108 106 112 102 C104 102 96 98 92 92 C90 96 86 98 82 96 C78 92 76 88 76 82 Z" fill={CREAM} />
      <path d="M116 92 C120 96 122 100 120 104 C116 108 110 110 106 108 C112 104 116 98 116 92 Z" fill={CREAM_SHADE} />
      {/* pico corto ganchudo y cera amarilla */}
      <path d="M72 62 C64 60 56 64 54 72 C52 78 54 84 58 84 C58 80 60 78 64 78 L74 78 Z" fill={BEAK} />
      <path d="M54 72 C52 78 54 84 58 84 C58 81 59 79 61 78 C57 77 55 75 54 72 Z" fill="#3f4855" />
      <path d="M70 61 C75 60 78 64 78 68 L78 76 C76 79 72 79 70 78 Z" fill={YELLOW} />
      {/* ojo con anillo amarillo */}
      <circle cx="90" cy="68" r="8" fill={YELLOW} />
      <circle cx="90" cy="68" r="5.4" fill={INK} />
      <circle cx="92" cy="66" r="1.9" fill="#fff" />
    </>
  ),
};
export default art;
