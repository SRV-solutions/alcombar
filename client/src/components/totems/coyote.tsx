import { INK, type TotemArt } from './types';

/** Coyote: sentado, de frente. Más liviano que el lobo: gris amarillento, cara angosta de hocico largo, orejas grandes leonadas, patas finas y cola tupida de punta negra apoyada en el piso. */
const FUR = '#b19c78';
const FUR_DARK = '#90795a';
const MUZZLE = '#c19468';
const GRIZZLE = '#5f5243';
const TAWNY = '#c58b56';
const LEG = '#c39a6c';
const LIGHT = '#efe4d0';

const art: TotemArt = {
  bg: '#d6ecdf',
  face: [62, 8, 116],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="132" cy="218" rx="84" ry="9" fill="#000" opacity="0.12" />
      {/* cola tupida apoyada en el piso, de punta negra */}
      <path d="M150 182 C170 190 190 184 210 189 C220 191 228 196 232 202 C224 210 212 214 198 214 C178 214 160 210 146 204 Z" fill={FUR_DARK} />
      <path d="M232 202 C228 196 221 192 213 190 C210 197 210 206 214 213 C222 211 228 207 232 202 Z" fill={GRIZZLE} />
      <path d="M158 188 C176 194 192 190 208 193 C192 197 174 198 158 192 Z" fill="#fff" opacity="0.16" />
      <path d="M150 208 C170 214 196 216 214 212 C200 216 176 216 150 208 Z" fill="#000" opacity="0.1" />
      {/* ancas */}
      <ellipse cx="90" cy="188" rx="22" ry="25" fill={FUR_DARK} />
      <ellipse cx="150" cy="188" rx="22" ry="25" fill={FUR_DARK} />
      {/* cuerpo delgado */}
      <path d="M120 102 C96 102 82 136 84 172 C85 198 98 212 120 212 C142 212 155 198 156 172 C158 136 144 102 120 102 Z" fill={FUR} />
      <path d="M120 118 C107 118 101 140 101 164 C101 190 109 206 120 206 C131 206 139 190 139 164 C139 140 133 118 120 118 Z" fill={LIGHT} />
      <path d="M146 112 C156 130 158 152 156 172 C155 198 142 212 120 212 C140 200 150 168 146 112 Z" fill="#000" opacity="0.08" />
      {/* patas traseras */}
      <ellipse cx="86" cy="210" rx="16" ry="7" fill={LEG} />
      <ellipse cx="154" cy="210" rx="16" ry="7" fill={LEG} />
      {/* patas delanteras, largas y finas */}
      <path d="M104 148 C101 150 100 156 100 162 L102 205 C102 212 116 212 116 205 L117 162 C117 154 114 148 109 148 Z" fill={LEG} />
      <path d="M136 148 C139 150 140 156 140 162 L138 205 C138 212 124 212 124 205 L123 162 C123 154 126 148 131 148 Z" fill={LEG} />
      <path d="M137 150 C140 154 140 158 140 162 L138 205 C138 209 135 211 131 211 C135 190 137 170 137 150 Z" fill="#000" opacity="0.1" />
      <path d="M115 152 C117 156 117 160 117 164 L116 205 C116 209 113 211 110 211 C113 190 115 170 115 152 Z" fill="#000" opacity="0.08" />
      <ellipse cx="109" cy="208" rx="9.5" ry="5.5" fill={LIGHT} />
      <ellipse cx="131" cy="208" rx="9.5" ry="5.5" fill={LIGHT} />
      {/* orejas grandes, leonadas */}
      <path d="M80 76 C69 50 71 24 82 6 C98 16 110 34 113 52 Z" fill={TAWNY} />
      <path d="M160 76 C171 50 169 24 158 6 C142 16 130 34 127 52 Z" fill={TAWNY} />
      <path d="M86 66 C80 48 81 32 86 20 C95 28 102 39 105 50 Z" fill={LIGHT} />
      <path d="M154 66 C160 48 159 32 154 20 C145 28 138 39 135 50 Z" fill={LIGHT} />
      <path d="M160 76 C171 50 169 24 158 6 C164 30 162 56 150 72 Z" fill="#000" opacity="0.1" />
      {/* cabeza angosta */}
      <path d="M120 38 C142 38 158 50 162 68 C166 82 164 96 156 106 C148 118 136 128 120 132 C104 128 92 118 84 106 C76 96 74 82 78 68 C82 50 98 38 120 38 Z" fill={FUR} />
      <ellipse cx="100" cy="52" rx="13" ry="7" fill="#fff" opacity="0.15" />
      <path d="M150 50 C162 62 166 82 160 98 C154 112 142 124 128 130 C146 114 156 86 150 50 Z" fill="#000" opacity="0.08" />
      {/* labios y mejillas claros, hocico largo leonado */}
      <path d="M79 90 C88 98 100 102 110 102 L130 102 C140 102 152 98 161 90 C160 104 152 116 142 124 C134 130 126 134 120 134 C114 134 106 130 98 124 C88 116 80 104 79 90 Z" fill={LIGHT} />
      <path d="M106 70 C111 84 111 100 111 112 C113 121 127 121 129 112 C129 100 129 84 134 70 C126 65 114 65 106 70 Z" fill={MUZZLE} />
      <path d="M114 110 h12 q3 0 1.5 3 l-4.5 5 q-3 3 -6 0 l-4.5 -5 q-1.5 -3 1.5 -3 z" fill={INK} />
      <ellipse cx="117.5" cy="111.6" rx="2.4" ry="1" fill="#fff" opacity="0.35" />
      <path d="M120 119 v3 M120 122 q-5 5 -10 1 M120 122 q5 5 10 1" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* ojos */}
      <ellipse cx="101" cy="80" rx="7.5" ry="6.5" fill="#e8bd52" />
      <ellipse cx="139" cy="80" rx="7.5" ry="6.5" fill="#e8bd52" />
      <circle cx="101" cy="80" r="3.8" fill={INK} />
      <circle cx="139" cy="80" r="3.8" fill={INK} />
      <circle cx="103" cy="77.6" r="1.7" fill="#fff" />
      <circle cx="141" cy="77.6" r="1.7" fill="#fff" />
      <path d="M92 78 q8 -9 18 -2" stroke={GRIZZLE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M148 78 q-8 -9 -18 -2" stroke={GRIZZLE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
