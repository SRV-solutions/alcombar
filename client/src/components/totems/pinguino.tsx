import { INK, type TotemArt } from './types';

/** Pingüino de Magallanes: parado de frente en la playa. Pecho blanco con las dos bandas negras, franja blanca que rodea la cara. */
const BLACK = '#2d3038';
const BLACK_LIGHT = '#454955';
const WHITE = '#fbfaf6';
const WHITE_SHADE = '#e6e4de';
const PINK = '#eaa6a0';
const PINK_DARK = '#cf8580';
const BILL = '#555865';
const SAND = '#ecdcb8';
const SEA = '#8cc0d9';

const art: TotemArt = {
  bg: '#e3eef8',
  face: [62, 14, 116],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      {/* mar y playa */}
      <path d="M0 182 C30 178 60 178 90 182 C120 186 150 186 180 182 C200 179 220 179 240 182 L240 240 L0 240 Z" fill={SEA} />
      <path d="M0 208 C40 200 80 198 120 200 C160 202 200 200 240 206 L240 240 L0 240 Z" fill={SAND} />
      <path d="M0 208 C40 200 80 198 120 200 C160 202 200 200 240 206" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M20 190 q10 -4 20 0 M196 190 q10 -4 20 0" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.7" />
      <ellipse cx="120" cy="220" rx="62" ry="8" fill="#000" opacity="0.12" />
      <ellipse cx="34" cy="222" rx="6" ry="3.5" fill="#cbb995" />
      <ellipse cx="206" cy="226" rx="5" ry="3" fill="#cbb995" />
      {/* aletas */}
      <path d="M70 112 C56 124 46 146 42 168 C40 177 47 179 51 172 C59 158 67 144 73 134 Z" fill={BLACK} />
      <path d="M170 112 C184 124 194 146 198 168 C200 177 193 179 189 172 C181 158 173 144 167 134 Z" fill={BLACK} />
      <path d="M170 112 C184 124 194 146 198 168 C200 177 193 179 189 172 C190 152 182 132 170 120 Z" fill="#000" opacity="0.2" />
      {/* cuerpo */}
      <path d="M120 22 C152 22 172 50 174 86 C178 120 184 160 176 190 C168 212 146 220 120 220 C94 220 72 212 64 190 C56 160 62 120 66 86 C68 50 88 22 120 22 Z" fill={BLACK} />
      <path d="M98 30 C84 40 74 60 72 84 C70 100 70 118 68 134 C64 112 64 90 70 70 C76 52 86 38 98 30 Z" fill="#fff" opacity="0.14" />
      {/* pecho blanco y las dos bandas */}
      <path d="M120 116 C150 116 166 140 166 170 C166 198 148 214 120 214 C92 214 74 198 74 170 C74 140 90 116 120 116 Z" fill={WHITE} />
      <path d="M156 136 C164 150 166 170 164 186 C160 202 146 212 128 214 C148 202 158 176 156 136 Z" fill={WHITE_SHADE} />
      <path d="M84 208 C80 186 80 160 88 146 C96 132 108 128 120 128 C132 128 144 132 152 146 C160 160 160 186 156 208 L148 206 C152 186 152 164 146 153 C140 143 130 138 120 138 C110 138 100 143 94 153 C88 164 88 186 92 206 Z" fill={BLACK} />
      <circle cx="110" cy="176" r="2.2" fill={BLACK} />
      <circle cx="132" cy="186" r="2" fill={BLACK} />
      <circle cx="122" cy="196" r="1.8" fill={BLACK} />
      {/* franja blanca alrededor de la cara */}
      <path d="M111 50 C100 41 84 47 79 63 C75 81 90 101 120 103 C150 101 165 81 161 63 C156 47 140 41 129 50 C140 50 150 58 150 69 C150 85 138 93 120 93 C102 93 90 85 90 69 C90 58 100 50 111 50 Z" fill={WHITE} />
      <path d="M150 69 C150 85 138 93 120 93 C102 93 90 85 90 69 C94 80 104 86 120 86 C136 86 146 80 150 69 Z" fill={BLACK_LIGHT} opacity="0.5" />
      {/* ojos con la piel rosada */}
      <ellipse cx="105" cy="66" rx="8.5" ry="7.5" fill={PINK} />
      <ellipse cx="135" cy="66" rx="8.5" ry="7.5" fill={PINK} />
      <circle cx="105" cy="66" r="4.4" fill={INK} />
      <circle cx="135" cy="66" r="4.4" fill={INK} />
      <circle cx="106.6" cy="64.4" r="1.6" fill="#fff" />
      <circle cx="136.6" cy="64.4" r="1.6" fill="#fff" />
      {/* pico */}
      <path d="M112 71 C114 67 126 67 128 71 L123 88 C122 91 118 91 117 88 Z" fill={BILL} />
      <path d="M114.5 78 h11" stroke="#b9bbc2" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="117.5" cy="72" rx="2" ry="1.2" fill="#fff" opacity="0.3" />
      {/* patas rosadas */}
      <path d="M86 216 C88 208 98 206 106 208 C112 210 114 216 112 220 C104 222 94 222 86 216 Z" fill={PINK} />
      <path d="M154 216 C152 208 142 206 134 208 C128 210 126 216 128 220 C136 222 146 222 154 216 Z" fill={PINK} />
      <path d="M94 216 v3 M102 216 v4 M138 216 v4 M146 216 v3" stroke={PINK_DARK} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
};
export default art;
