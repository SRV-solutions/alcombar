import { INK, type TotemArt } from './types';

/** Huillín (nutria de río patagónica): sentado en una piedra a la orilla del agua. Pardo oscuro, garganta clara, bigotes, orejas chicas y cola gruesa. */
const FUR = '#6e4a33';
const FUR_DARK = '#553829';
const FUR_LIGHT = '#9a7458';
const THROAT = '#dcc9aa';
const ROCK = '#a0a8aa';
const WATER = '#7db7d6';
const WATER_DARK = '#5d9cc0';
const FOAM = '#e8f4fa';

const art: TotemArt = {
  bg: '#e3eed6',
  face: [68, 22, 104],
  art: (
    <>
      <circle cx="120" cy="118" r="102" fill="#fff" opacity="0.35" />
      {/* piedra */}
      <path d="M48 214 C44 190 66 168 110 166 C152 164 192 174 198 198 C200 206 198 212 196 216 Z" fill={ROCK} />
      <path d="M62 190 C70 176 90 170 110 169 C92 176 76 184 68 196 Z" fill="#fff" opacity="0.2" />
      <path d="M198 198 C200 206 198 212 196 216 L150 216 C176 208 192 196 186 172 C194 180 197 188 198 198 Z" fill="#000" opacity="0.12" />
      {/* cola gruesa */}
      <path d="M156 156 C176 165 198 165 222 157 C208 175 180 186 148 177 Z" fill={FUR_DARK} />
      <path d="M164 163 C180 168 196 168 212 163 C198 170 180 172 164 168 Z" fill="#fff" opacity="0.12" />
      {/* cuerpo */}
      <path d="M120 94 C97 94 85 122 85 152 C85 178 99 192 120 192 C141 192 155 178 155 152 C155 122 143 94 120 94 Z" fill={FUR} />
      <path d="M142 108 C152 124 156 142 155 158 C153 180 140 192 120 192 C144 180 150 150 142 108 Z" fill="#000" opacity="0.1" />
      <path d="M90 150 C90 128 97 112 110 102 C101 116 96 132 96 152 Z" fill="#fff" opacity="0.1" />
      {/* garganta y pecho claros */}
      <path d="M120 102 C104 102 98 118 100 132 C102 142 110 148 120 148 C130 148 138 142 140 132 C142 118 136 102 120 102 Z" fill={THROAT} />
      {/* brazos con las manos juntas en el pecho */}
      <path d="M90 120 C86 136 90 150 102 154 C110 156 116 150 112 142 C104 138 98 128 98 116 Z" fill={FUR_DARK} />
      <path d="M150 120 C154 136 150 150 138 154 C130 156 124 150 128 142 C136 138 142 128 142 116 Z" fill={FUR_DARK} />
      <ellipse cx="109" cy="148" rx="7.5" ry="6" fill={FUR_DARK} />
      <ellipse cx="131" cy="148" rx="7.5" ry="6" fill={FUR_DARK} />
      {/* patas traseras palmeadas */}
      <ellipse cx="100" cy="192" rx="15" ry="6.5" fill={FUR_DARK} />
      <ellipse cx="140" cy="192" rx="15" ry="6.5" fill={FUR_DARK} />
      <path d="M92 193 v3 M100 194 v3 M108 193 v3 M132 193 v3 M140 194 v3 M148 193 v3" stroke={FUR_LIGHT} strokeWidth="1.6" strokeLinecap="round" />
      {/* orejas chicas */}
      <circle cx="84" cy="52" r="8.5" fill={FUR_DARK} />
      <circle cx="156" cy="52" r="8.5" fill={FUR_DARK} />
      <circle cx="84.5" cy="53" r="4" fill={FUR_LIGHT} />
      <circle cx="155.5" cy="53" r="4" fill={FUR_LIGHT} />
      {/* cabeza ancha y chata */}
      <ellipse cx="120" cy="72" rx="43" ry="31" fill={FUR} />
      <ellipse cx="104" cy="50" rx="18" ry="7" fill="#fff" opacity="0.14" />
      <path d="M148 48 C162 58 166 76 160 90 C154 100 144 104 134 105 C152 94 158 70 148 48 Z" fill="#000" opacity="0.1" />
      {/* hocico, mentón claro y bigotes */}
      <ellipse cx="120" cy="99" rx="13" ry="6.5" fill={THROAT} />
      <ellipse cx="110" cy="88" rx="13" ry="10" fill={FUR_LIGHT} />
      <ellipse cx="130" cy="88" rx="13" ry="10" fill={FUR_LIGHT} />
      <path d="M110 76 C114 72 126 72 130 76 C131 82 125 86 120 86 C115 86 109 82 110 76 Z" fill={INK} />
      <ellipse cx="116" cy="76" rx="3" ry="1.3" fill="#fff" opacity="0.35" />
      <path d="M120 86 v4 M120 90 q-5 4 -10 1 M120 90 q5 4 10 1" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M100 87 l-24 -5 M100 91 l-24 2 M101 95 l-20 8 M140 87 l24 -5 M140 91 l24 2 M139 95 l20 8" stroke="#f3eadb" strokeWidth="1.2" strokeLinecap="round" />
      {/* ojos */}
      <circle cx="100" cy="66" r="5.2" fill={INK} />
      <circle cx="140" cy="66" r="5.2" fill={INK} />
      <circle cx="101.8" cy="64.2" r="1.8" fill="#fff" />
      <circle cx="141.8" cy="64.2" r="1.8" fill="#fff" />
      {/* agua del río */}
      <path d="M0 204 C24 198 44 210 70 206 C100 200 120 212 150 206 C180 200 204 210 240 202 L240 240 L0 240 Z" fill={WATER} />
      <path d="M0 222 C30 218 60 228 100 224 C140 220 180 230 240 222 L240 240 L0 240 Z" fill={WATER_DARK} />
      <path d="M30 213 q10 -4 20 0 M116 215 q12 -4 24 0 M184 213 q10 -4 20 0 M70 230 q8 -3 16 0 M160 232 q8 -3 16 0" stroke={FOAM} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
