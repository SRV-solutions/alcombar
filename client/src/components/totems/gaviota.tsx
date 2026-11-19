import { INK, type TotemArt } from './types';

/** Gaviota: de perfil, parada en un pilote junto al mar. Blanca, lomo gris, puntas de ala negras, pico amarillo con mancha roja, patas amarillas. */
const WHITE = '#fdfcf8';
const WHITE_SHADE = '#e3e6e8';
const GRAY = '#a9b5c1';
const GRAY_DARK = '#8f9cab';
const BLACK = '#2e3036';
const YELLOW = '#f4c430';
const YELLOW_DARK = '#d9a51f';
const RED = '#e0453a';
const WOOD = '#a07a54';
const WOOD_LIGHT = '#c8a27a';
const SEA = '#78b3cc';
const SEA_DARK = '#5d9cb9';

const art: TotemArt = {
  bg: '#c7e5e6',
  face: [20, 22, 108],
  art: (
    <>
      <circle cx="120" cy="118" r="102" fill="#fff" opacity="0.35" />
      {/* pilote de madera */}
      <path d="M92 180 L92 240 L140 240 L140 180 Z" fill={WOOD} />
      <path d="M128 180 L140 180 L140 240 L128 240 Z" fill="#000" opacity="0.12" />
      <path d="M102 192 v20 M114 198 v16" stroke="#7d5a3b" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <ellipse cx="116" cy="180" rx="24" ry="6.5" fill={WOOD_LIGHT} />
      <ellipse cx="116" cy="180" rx="14" ry="3.5" fill="none" stroke={WOOD} strokeWidth="1.6" strokeLinecap="round" />
      {/* mar */}
      <path d="M0 204 C20 196 40 196 60 204 C80 212 100 212 120 204 C140 196 160 196 180 204 C200 212 220 212 240 204 L240 240 L0 240 Z" fill={SEA} />
      <path d="M0 222 C24 216 48 216 72 222 C96 228 120 228 144 222 C168 216 192 216 216 222 C226 224 234 224 240 223 L240 240 L0 240 Z" fill={SEA_DARK} />
      <path d="M22 202 q10 -5 20 0 M170 202 q10 -5 20 0 M84 210 q8 3 16 0 M134 210 q8 3 16 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.75" />
      {/* patas amarillas */}
      <path d="M110 158 L108 176 M128 158 L130 176" stroke={YELLOW} strokeWidth="4.2" strokeLinecap="round" />
      <path d="M96 180 C100 175 108 174 114 177 C110 181 102 182 96 180 Z M120 180 C124 175 132 174 138 177 C134 181 126 182 120 180 Z" fill={YELLOW_DARK} />
      {/* cuerpo */}
      <path d="M72 104 C62 124 70 152 100 162 C128 170 162 160 186 140 C194 133 200 126 204 120 C180 118 150 108 126 98 C106 90 82 92 72 104 Z" fill={WHITE} />
      <path d="M150 150 C140 160 120 166 100 162 C112 160 132 156 150 150 Z" fill={WHITE_SHADE} />
      <path d="M74 112 C70 130 78 148 96 156 C86 144 82 128 84 112 Z" fill={WHITE_SHADE} opacity="0.35" />
      {/* ala gris con punta negra */}
      <path d="M100 100 C128 90 162 96 186 106 C200 112 212 116 222 118 C210 128 194 134 176 138 C150 142 120 136 104 124 C96 118 94 106 100 100 Z" fill={GRAY} />
      <path d="M104 102 C124 96 148 98 170 104 C150 104 126 106 106 112 Z" fill="#fff" opacity="0.2" />
      <path d="M130 130 C150 134 170 132 186 126 C172 136 150 140 128 136 Z" fill={GRAY_DARK} />
      <path d="M186 108 C200 112 212 116 222 118 C212 126 198 132 182 136 C188 128 190 118 186 108 Z" fill={BLACK} />
      <circle cx="206" cy="121" r="2.6" fill="#fff" />
      <circle cx="196" cy="125" r="2.1" fill="#fff" />
      <path d="M112 128 C130 138 158 141 180 137" stroke={WHITE} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* cabeza */}
      <circle cx="84" cy="70" r="28" fill={WHITE} />
      <path d="M100 48 C114 60 114 82 104 94 C98 100 90 102 82 102 C98 94 106 74 100 48 Z" fill={WHITE_SHADE} />
      <path d="M64 86 C70 96 80 100 92 99 C84 104 74 104 66 98 Z" fill={WHITE_SHADE} opacity="0.7" />
      {/* pico amarillo con la mancha roja */}
      <path d="M60 64 C48 64 37 67 29 71 C26 73 26 76 29 77 C38 76 48 75 61 75 Z" fill={YELLOW} />
      <path d="M61 75 C50 76 40 77 30 78 C32 82 38 84 44 84 C50 84 56 82 61 80 Z" fill={YELLOW_DARK} />
      <ellipse cx="40" cy="80.5" rx="4.2" ry="2.8" fill={RED} />
      <path d="M44 68 q8 -2 14 -2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* ojo */}
      <path d="M68 58 q8 -4 16 -1" stroke={WHITE_SHADE} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="75" cy="65" r="4.6" fill={INK} />
      <circle cx="76.6" cy="63.4" r="1.6" fill="#fff" />
    </>
  ),
};
export default art;
