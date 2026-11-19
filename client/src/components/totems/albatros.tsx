import { INK, type TotemArt } from './types';

/** Albatros: planeando sobre el mar con las alas larguísimas abiertas. Blanco, alas oscuras por arriba, pico largo rosado. */
const WHITE = '#fdfbf7';
const WHITE_SHADE = '#e2ded8';
const WING = '#3d3b44';
const WING_DARK = '#2b2930';
const WING_LIGHT = '#57555f';
const BILL = '#f0a3a2';
const BILL_DARK = '#d77a80';
const SEA = '#7fb4d1';
const SEA_DARK = '#5f98bb';

const art: TotemArt = {
  bg: '#fae3c0',
  face: [30, 88, 92],
  art: (
    <>
      <circle cx="120" cy="116" r="102" fill="#fff" opacity="0.35" />
      {/* mar */}
      <path d="M0 186 C20 178 40 178 60 186 C80 194 100 194 120 186 C140 178 160 178 180 186 C200 194 220 194 240 186 L240 240 L0 240 Z" fill={SEA} />
      <path d="M0 208 C24 200 48 200 72 208 C96 216 120 216 144 208 C168 200 192 200 216 208 C226 211 234 211 240 210 L240 240 L0 240 Z" fill={SEA_DARK} />
      <path d="M26 184 q10 -5 20 0 M146 184 q10 -5 20 0 M88 206 q10 -4 18 0 M196 206 q10 -4 18 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.75" />
      <ellipse cx="124" cy="196" rx="46" ry="3.5" fill="#000" opacity="0.08" />
      <circle cx="60" cy="196" r="1.8" fill="#fff" opacity="0.7" />
      <circle cx="186" cy="194" r="1.6" fill="#fff" opacity="0.7" />
      {/* ala izquierda */}
      <path d="M126 104 C108 92 88 80 68 78 C48 76 28 86 12 102 C30 108 52 112 72 112 C92 112 108 118 122 126 Z" fill={WING} />
      <path d="M12 102 C24 92 36 85 48 81 C42 90 36 98 32 106 C24 105 18 104 12 102 Z" fill={WING_DARK} />
      <path d="M124 103 C106 90 86 80 68 78 C52 77 38 82 26 90 C44 84 62 84 80 88 C96 92 110 98 124 108 Z" fill={WING_LIGHT} />
      {/* ala derecha */}
      <path d="M114 104 C132 92 152 80 172 78 C192 76 212 86 228 102 C210 108 188 112 168 112 C148 112 132 118 118 126 Z" fill={WING} />
      <path d="M228 102 C216 92 204 85 192 81 C198 90 204 98 208 106 C216 105 222 104 228 102 Z" fill={WING_DARK} />
      <path d="M118 104 C134 92 152 82 172 79 C186 77 200 81 212 88 C196 84 178 85 162 89 C146 93 132 100 118 110 Z" fill={WING_LIGHT} />
      {/* cuerpo y cola */}
      <path d="M150 116 C160 115 170 117 177 122 C172 128 162 132 152 132 Z" fill={WING_DARK} />
      <ellipse cx="152" cy="137" rx="7" ry="3" fill={BILL} transform="rotate(12 152 137)" />
      <ellipse cx="143" cy="139" rx="6" ry="2.6" fill={BILL_DARK} transform="rotate(12 143 139)" />
      <ellipse cx="128" cy="124" rx="34" ry="18" fill={WHITE} />
      <path d="M156 116 C164 124 162 136 148 140 C134 143 116 142 104 138 C124 138 146 134 156 116 Z" fill={WHITE_SHADE} />
      <ellipse cx="120" cy="112" rx="18" ry="5" fill="#fff" opacity="0.8" />
      <path d="M96 136 C104 140 114 142 124 141 C114 146 102 146 94 142 Z" fill={WHITE_SHADE} />
      {/* cabeza */}
      <circle cx="86" cy="128" r="21" fill={WHITE} />
      <path d="M100 113 C108 122 108 138 98 146 C92 150 84 150 78 148 C94 142 104 130 100 113 Z" fill={WHITE_SHADE} />
      {/* pico largo rosado, con la punta ganchuda */}
      <path d="M71 122 C60 124 48 128 38 132 C33 134 32 140 35 143 C37 140 40 139 44 139 L73 135 Z" fill={BILL} />
      <path d="M44 139 L73 135 L71 141 C61 143 51 143 44 141 Z" fill={BILL_DARK} />
      <path d="M38 132 C33 134 32 140 35 143 C37 141 39 139 42 138 C40 136 39 134 38 132 Z" fill="#c4646d" />
      <path d="M50 133 q10 -3 20 -5" stroke={BILL_DARK} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M48 128 q8 -3 16 -4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.45" />
      {/* ojo */}
      <path d="M76 117 q6 -4 13 -1" stroke="#8d8a92" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="82" cy="124" r="4.4" fill={INK} />
      <circle cx="83.5" cy="122.5" r="1.5" fill="#fff" />
    </>
  ),
};
export default art;
