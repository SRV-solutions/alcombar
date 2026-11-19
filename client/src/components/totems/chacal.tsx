import { INK, type TotemArt } from './types';

/** Chacal: parado de tres cuartos, flaco y patilargo. Pelaje dorado con el lomo gris oscuro jaspeado, orejas grandes, garganta clara y cola tupida de punta negra. */
const GOLD = '#d3a052';
const GOLD_DARK = '#b5823b';
const GOLD_LIGHT = '#e8c27e';
const EAR = '#c48a40';
const SADDLE = '#5c5753';
const CREAM = '#f6ead2';

const art: TotemArt = {
  bg: '#e6def3',
  face: [31, 30, 102],
  art: (
    <>
      <circle cx="120" cy="122" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="142" cy="212" rx="78" ry="8" fill="#000" opacity="0.12" />
      {/* cola tupida de punta negra */}
      <path d="M194 122 C212 126 222 142 222 162 C222 178 218 190 210 196 C202 192 200 178 200 164 C200 150 196 138 188 130 Z" fill={GOLD_DARK} />
      <path d="M222 170 C222 182 218 190 210 196 C204 192 201 182 201 172 C208 176 216 176 222 170 Z" fill="#3e3936" />
      {/* patas del otro lado */}
      <path d="M96 150 C98 172 98 190 97 207 L107 207 C108 190 110 172 113 152 Z" fill={GOLD_DARK} />
      <path d="M166 150 C169 172 171 190 171 207 L181 207 C181 190 182 172 185 152 Z" fill={GOLD_DARK} />
      <ellipse cx="103" cy="208" rx="7" ry="3.8" fill="#9c6c33" />
      <ellipse cx="177" cy="208" rx="7" ry="3.8" fill="#9c6c33" />
      {/* cuerpo y pata trasera de este lado */}
      <path d="M92 130 C100 114 130 110 160 112 C184 114 202 118 204 136 C206 152 196 162 178 162 C158 162 140 160 124 158 C108 158 92 150 92 130 Z" fill={GOLD} />
      <path d="M172 122 C194 118 208 132 204 150 C202 160 196 166 194 178 L194 207 L182 207 C182 192 180 180 176 170 C168 158 164 132 172 122 Z" fill={GOLD} />
      <path d="M204 146 C202 158 196 166 194 178 L194 207 L188 207 C188 186 196 166 204 146 Z" fill="#000" opacity="0.08" />
      {/* lomo gris oscuro jaspeado */}
      <path d="M104 120 C118 110 150 108 176 112 C192 114 202 120 204 132 C196 130 188 134 178 132 C170 138 160 134 152 138 C144 134 134 138 126 134 C118 136 110 130 104 120 Z" fill={SADDLE} />
      <path d="M118 120 l4 2 M132 117 l4 2 M148 115 l4 2 M164 116 l4 2 M180 118 l4 2 M194 122 l3 2 M126 127 l4 2 M142 125 l4 2 M158 125 l4 2 M174 125 l4 2 M188 127 l3 2" stroke="#d2cbc0" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
      <ellipse cx="150" cy="113" rx="30" ry="3" fill="#fff" opacity="0.12" />
      {/* panza clara */}
      <path d="M118 156 C134 160 156 162 176 160 C160 166 132 166 118 156 Z" fill={CREAM} />
      {/* pata delantera de este lado */}
      <path d="M106 138 C104 162 108 186 108 207 L120 207 C120 186 122 164 124 142 Z" fill={GOLD} />
      <ellipse cx="114" cy="208" rx="8" ry="4.2" fill={GOLD_DARK} />
      <ellipse cx="188" cy="208" rx="8" ry="4.2" fill={GOLD_DARK} />
      {/* cuello y garganta */}
      <path d="M60 94 C58 118 68 140 88 152 C100 158 116 156 122 146 C126 134 124 120 118 110 C110 100 104 92 100 84 Z" fill={GOLD} />
      <path d="M60 94 C58 118 68 140 88 152 C94 150 98 144 98 136 C96 122 90 110 84 100 Z" fill={CREAM} />
      <path d="M118 110 C124 120 126 134 122 146 C116 156 104 158 96 156 C110 150 118 134 112 112 Z" fill="#000" opacity="0.08" />
      {/* orejas grandes */}
      <path d="M64 68 C52 48 50 26 58 10 C72 18 84 34 88 50 Z" fill={EAR} />
      <path d="M100 68 C112 48 114 26 106 10 C92 18 80 34 76 50 Z" fill={EAR} />
      <path d="M68 60 C61 46 60 32 63 22 C72 30 79 40 82 50 Z" fill={CREAM} />
      <path d="M96 60 C103 46 104 32 101 22 C92 30 85 40 82 50 Z" fill={CREAM} />
      {/* cabeza */}
      <path d="M82 44 C100 44 112 54 114 68 C116 80 112 90 106 98 C100 108 92 116 82 120 C72 116 64 108 58 98 C52 90 48 80 50 68 C52 54 64 44 82 44 Z" fill={GOLD} />
      <ellipse cx="72" cy="56" rx="12" ry="6" fill="#fff" opacity="0.15" />
      <path d="M104 52 C114 62 116 78 110 92 C104 104 96 114 88 118 C98 104 106 82 104 52 Z" fill="#000" opacity="0.08" />
      {/* cara clara y hocico */}
      <path d="M52 90 C60 98 70 102 76 102 L88 102 C94 102 104 98 112 90 C110 102 100 112 92 117 C88 120 85 122 82 122 C79 122 76 120 72 117 C64 112 54 102 52 90 Z" fill={CREAM} />
      <path d="M75 72 C77 84 77 98 77 108 C79 113 85 113 87 108 C87 98 87 84 89 72 C85 68 79 68 75 72 Z" fill={GOLD_LIGHT} />
      <path d="M76 106 h12 q3 0 1.5 3 l-4.5 5 q-3 3 -6 0 l-4.5 -5 q-1.5 -3 1.5 -3 z" fill={INK} />
      <path d="M82 115 v2 M82 117 q-4 4 -8 1 M82 117 q4 4 8 1" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* ojos */}
      <ellipse cx="67" cy="80" rx="6.5" ry="5.8" fill="#e7a93f" />
      <ellipse cx="97" cy="80" rx="6.5" ry="5.8" fill="#e7a93f" />
      <circle cx="67" cy="80" r="3.3" fill={INK} />
      <circle cx="97" cy="80" r="3.3" fill={INK} />
      <circle cx="68.8" cy="78" r="1.5" fill="#fff" />
      <circle cx="98.8" cy="78" r="1.5" fill="#fff" />
      <path d="M59 78 q7 -8 15 -2 M105 78 q-7 -8 -15 -2" stroke="#7a5326" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
