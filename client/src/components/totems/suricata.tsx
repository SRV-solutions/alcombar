import { INK, type TotemArt } from './types';

/** Suricata: parada en dos patas, bien erguida, de guardia sobre su montículo de arena. Pelaje arena, panza clara, ojeras oscuras, orejitas oscuras a los costados, manitos colgando y la cola de apoyo con punta oscura. */
const FUR = '#c9a678';
const FUR_DARK = '#a8865b';
const FUR_LIGHT = '#e6d0aa';
const PATCH = '#5a4130';
const SAND = '#ead39f';
const SAND_DARK = '#d6bb83';

const art: TotemArt = {
  bg: '#d2e4f2',
  face: [74, 8, 92],
  art: (
    <>
      <circle cx="120" cy="118" r="102" fill="#fff" opacity="0.35" />
      {/* montículo de arena */}
      <path d="M22 240 C32 214 76 202 120 202 C164 202 208 214 218 240 Z" fill={SAND} />
      <path d="M164 205 C192 212 212 224 218 240 L186 240 C186 226 180 214 164 205 Z" fill="#000" opacity="0.08" />
      <path d="M52 226 q8 -3 14 0 M150 224 q10 -3 18 0 M90 232 q6 -2 12 0 M178 232 q6 -2 10 0" stroke={SAND_DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="124" cy="208" rx="50" ry="6" fill="#000" opacity="0.12" />
      {/* cola de apoyo, con la punta oscura */}
      <path d="M140 204 C166 210 194 210 208 200 C214 196 213 189 207 190 C196 198 170 200 140 196 Z" fill={FUR} />
      <path d="M208 200 C214 196 213 189 207 190 C205 194 205 197 208 200 Z" fill={PATCH} />
      {/* ancas */}
      <ellipse cx="92" cy="186" rx="14" ry="20" fill={FUR_DARK} />
      <ellipse cx="148" cy="186" rx="14" ry="20" fill={FUR_DARK} />
      {/* cuerpo largo y erguido, panza clara */}
      <path d="M120 78 C98 78 86 100 84 130 C82 162 88 192 102 206 L138 206 C152 192 158 162 156 130 C154 100 142 78 120 78 Z" fill={FUR} />
      <path d="M120 98 C106 98 100 118 100 142 C100 170 106 192 114 204 L126 204 C134 192 140 170 140 142 C140 118 134 98 120 98 Z" fill={FUR_LIGHT} />
      <path d="M140 90 C152 104 158 126 156 150 C154 176 148 196 138 206 L130 206 C146 184 150 130 140 90 Z" fill="#000" opacity="0.08" />
      <path d="M100 86 C92 100 88 116 88 132 C92 116 98 102 106 92 Z" fill="#fff" opacity="0.14" />
      {/* patas */}
      <ellipse cx="99" cy="207" rx="13" ry="5" fill={FUR_DARK} />
      <ellipse cx="141" cy="207" rx="13" ry="5" fill={FUR_DARK} />
      <path d="M92 205 v3.5 M99 204.5 v4 M106 205 v3.5 M134 205 v3.5 M141 204.5 v4 M148 205 v3.5" stroke={PATCH} strokeWidth="1.3" strokeLinecap="round" />
      {/* brazos con las manitos colgando */}
      <path d="M92 100 C84 110 86 126 98 134 L108 132 C106 122 100 110 96 100 Z" fill={FUR} />
      <path d="M148 100 C156 110 154 126 142 134 L132 132 C134 122 140 110 144 100 Z" fill={FUR} />
      <path d="M148 100 C156 110 154 126 142 134 L138 134 C148 124 150 112 148 100 Z" fill="#000" opacity="0.1" />
      <path d="M90 108 C88 120 92 130 102 134 L108 132 C100 128 94 120 90 108 Z M150 108 C152 120 148 130 138 134 L132 132 C140 128 146 120 150 108 Z" fill="#000" opacity="0.1" />
      <ellipse cx="104" cy="134" rx="7.5" ry="5" fill={FUR_DARK} />
      <ellipse cx="136" cy="134" rx="7.5" ry="5" fill={FUR_DARK} />
      <path d="M100 136 v3 M104 136.5 v3 M108 136 v3 M132 136 v3 M136 136.5 v3 M140 136 v3" stroke={PATCH} strokeWidth="1.2" strokeLinecap="round" />
      {/* orejitas oscuras a los costados */}
      <ellipse cx="84" cy="50" rx="7" ry="9.5" fill={PATCH} />
      <ellipse cx="156" cy="50" rx="7" ry="9.5" fill={PATCH} />
      {/* cabeza redonda con el hocico en punta */}
      <path d="M120 16 C96 16 82 32 82 50 C82 66 96 78 108 86 C112 89 116 91 120 91 C124 91 128 89 132 86 C144 78 158 66 158 50 C158 32 144 16 120 16 Z" fill={FUR} />
      <ellipse cx="106" cy="28" rx="16" ry="6.5" fill="#fff" opacity="0.18" />
      <path d="M144 28 C156 38 160 54 154 66 C148 76 138 84 128 88 C144 74 152 52 144 28 Z" fill="#000" opacity="0.08" />
      <path d="M108 58 C111 70 114 80 120 87 C126 80 129 70 132 58 C127 54 113 54 108 58 Z" fill={FUR_LIGHT} />
      {/* ojeras oscuras */}
      <path d="M95 44 C97 37 108 36 112 43 C116 51 113 62 105 65 C97 66 92 55 95 44 Z" fill={PATCH} />
      <path d="M145 44 C143 37 132 36 128 43 C124 51 127 62 135 65 C143 66 148 55 145 44 Z" fill={PATCH} />
      {/* nariz y boca */}
      <path d="M114 79 h12 q2.5 0 1 2.5 l-5 5 q-2 2 -4 0 l-5 -5 q-1.5 -2.5 1 -2.5 z" fill={INK} />
      <path d="M120 87 v2 M120 89 q-3 3 -6 1 M120 89 q3 3 6 1" stroke={PATCH} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* ojos */}
      <circle cx="104" cy="50" r="5" fill={INK} />
      <circle cx="136" cy="50" r="5" fill={INK} />
      <circle cx="106" cy="47.8" r="1.9" fill="#fff" />
      <circle cx="138" cy="47.8" r="1.9" fill="#fff" />
    </>
  ),
};
export default art;
