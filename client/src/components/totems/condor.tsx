import { INK, type TotemArt } from './types';

/** Cóndor andino: de perfil, posado en una roca con el ala abierta. Negro, banda blanca en el ala, collar blanco y cabeza pelada rojiza. */
const BLACK = '#33302f';
const BLACK_DARK = '#252223';
const BLACK_LIGHT = '#4a4545';
const WHITE = '#f4f1ea';
const WHITE_SHADE = '#d9d3c8';
const SKIN = '#c47d6d';
const SKIN_DARK = '#9e5a4e';
const COMB = '#7e3b37';
const BEAK = '#ece0c2';
const ROCK = '#9a938b';
const ROCK_LIGHT = '#b3ada5';

const art: TotemArt = {
  bg: '#ebe1f3',
  face: [30, 24, 100],
  art: (
    <>
      <circle cx="120" cy="118" r="102" fill="#fff" opacity="0.35" />
      {/* roca */}
      <path d="M8 240 C10 214 24 196 50 190 C80 184 110 190 140 186 C176 182 206 194 222 214 C228 222 232 232 232 240 Z" fill={ROCK} />
      <path d="M50 190 C80 184 110 190 140 186 C160 184 178 186 194 192 C170 192 146 196 120 196 C96 196 72 194 50 190 Z" fill={ROCK_LIGHT} />
      <path d="M170 188 C200 194 222 212 232 240 L194 240 C196 218 188 200 170 188 Z" fill="#000" opacity="0.12" />
      <path d="M40 214 l14 8 l-4 10 M150 210 l10 12 M96 222 l12 6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.15" />
      {/* cola */}
      <path d="M144 178 C160 180 178 186 190 194 C182 199 164 199 150 194 Z" fill={BLACK_DARK} />
      {/* cuerpo */}
      <path d="M92 106 C76 128 78 164 98 182 C116 196 148 194 162 178 C176 160 170 126 152 110 C134 96 108 94 92 106 Z" fill={BLACK} />
      <path d="M92 116 C84 132 84 156 94 172 C92 152 94 134 102 120 Z" fill="#fff" opacity="0.08" />
      {/* patas */}
      <path d="M108 184 L106 194 M106 194 l-8 3 M106 194 l2 5 M106 194 l8 2 M126 184 L126 194 M126 194 l-8 3 M126 194 l2 5 M126 194 l8 2" stroke="#8f8782" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* plumas largas de la punta del ala */}
      <path d="M186 68 C188 50 193 38 200 30 C205 42 203 56 196 66 Z" fill={BLACK_DARK} />
      <path d="M197 66 C202 48 208 36 216 30 C219 42 215 56 207 66 Z" fill={BLACK_DARK} />
      <path d="M207 68 C214 54 221 44 228 40 C229 51 223 62 214 72 Z" fill={BLACK_DARK} />
      <path d="M212 76 C220 68 226 62 230 58 C231 67 226 75 216 80 Z" fill={BLACK_DARK} />
      {/* ala abierta */}
      <path d="M128 108 C140 84 160 64 186 58 C200 54 214 56 222 62 C216 86 206 106 196 122 C186 138 172 156 160 174 C150 150 138 128 128 108 Z" fill={BLACK} />
      <path d="M146 130 C156 110 172 92 194 82 C202 79 208 80 210 85 C204 102 196 116 188 128 C178 144 168 158 160 172 C154 158 150 144 146 130 Z" fill={WHITE} />
      <path d="M160 128 l16 18 M170 114 l16 16 M182 102 l14 12" stroke={WHITE_SHADE} strokeWidth="2" strokeLinecap="round" />
      <path d="M134 104 C146 84 162 70 182 64 C170 74 156 88 146 104 Z" fill={BLACK_LIGHT} />
      <path d="M196 122 C186 138 172 156 160 174 C164 158 172 144 182 130 Z" fill="#000" opacity="0.14" />
      {/* collar de plumón blanco */}
      <path d="M74 108 C78 98 92 92 106 94 C118 96 128 102 130 110 C126 115 120 117 114 115 C110 121 102 121 98 117 C92 123 84 121 81 115 C76 117 72 113 74 108 Z" fill={WHITE} />
      <path d="M106 110 C112 112 120 112 128 108 C124 114 120 116 114 115 C110 117 108 114 106 110 Z" fill={WHITE_SHADE} />
      {/* cuello y cabeza pelados */}
      <path d="M72 94 C70 80 80 68 92 66 C104 66 110 78 108 98 C98 102 82 102 72 94 Z" fill={SKIN} />
      <circle cx="80" cy="66" r="23" fill={SKIN} />
      <ellipse cx="72" cy="54" rx="10" ry="5" fill="#fff" opacity="0.16" />
      <path d="M96 52 C104 64 104 80 96 90 C92 96 86 98 80 98 C94 88 100 72 96 52 Z" fill={SKIN_DARK} opacity="0.7" />
      <path d="M86 86 q6 4 12 2 M88 94 q6 3 12 1" stroke={SKIN_DARK} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* cresta */}
      <path d="M57 62 C53 54 56 46 62 45 C62 38 70 34 75 38 C78 32 87 33 88 40 C93 41 95 47 91 51 C82 48 72 50 64 56 C61 58 59 60 58 63 Z" fill={COMB} />
      <ellipse cx="70" cy="41" rx="4" ry="2" fill="#fff" opacity="0.2" />
      {/* pico */}
      <path d="M62 58 C52 58 44 62 40 70 C37 76 38 83 42 84 C42 80 45 77 49 76 L64 76 Z" fill={BEAK} />
      <path d="M64 58 C60 59 57 62 56 66 C55 70 56 74 58 76 L64 76 Z" fill="#5a4440" />
      <path d="M49 77 L64 77 L62 82 C56 83 52 82 49 80 Z" fill="#c9bc9c" />
      {/* ojo */}
      <circle cx="76" cy="62" r="4.6" fill={INK} />
      <circle cx="77.6" cy="60.4" r="1.6" fill="#fff" />
    </>
  ),
};
export default art;
