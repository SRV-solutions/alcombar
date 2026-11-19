import { INK, type TotemArt } from './types';

/** Koala: abrazado a una rama de eucalipto, con la cara hacia nosotros. Gris, orejas redondas de pelo blanco esponjoso y nariz grande negra. */
const FUR = '#9a9fa5';
const FUR_DARK = '#7d828a';
const FUR_LIGHT = '#b8bcc1';
const WHITE = '#f4f2ee';
const NOSE = '#2f2a2b';
const BARK = '#c9b496';
const BARK_DARK = '#a38b69';
const LEAF = '#7fa58c';
const LEAF_DARK = '#5c8a6b';
const LEAF_LIGHT = '#a5c4ae';

const art: TotemArt = {
  bg: '#f6e4cf',
  face: [36, 14, 128],
  art: (
    <>
      <circle cx="120" cy="122" r="102" fill="#fff" opacity="0.35" />
      {/* rama de eucalipto */}
      <path d="M150 -4 C153 40 147 120 152 244 L178 244 C173 120 179 40 174 -4 Z" fill={BARK} />
      <path d="M153 -4 C156 40 150 120 155 244 L160 244 C155 120 161 40 158 -4 Z" fill="#fff" opacity="0.2" />
      <path d="M170 -4 C175 40 169 120 174 244 L178 244 C173 120 179 40 174 -4 Z" fill="#000" opacity="0.1" />
      <path d="M165 14 q2 14 -1 26 M160 150 q2 12 0 22 M167 214 q2 10 0 18" stroke={BARK_DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* ramitas con hojas */}
      <path d="M172 52 C186 46 198 38 208 26 M176 166 C188 170 198 178 206 188" stroke={BARK_DARK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M190 40 C200 44 206 56 204 72 C196 62 190 52 190 40 Z" fill={LEAF} />
      <path d="M206 28 C218 30 226 38 228 50 C218 46 210 38 206 28 Z" fill={LEAF_DARK} />
      <path d="M200 34 C206 22 214 16 226 14 C220 24 212 32 200 34 Z" fill={LEAF_LIGHT} />
      <path d="M196 176 C206 176 214 184 216 196 C206 194 198 186 196 176 Z" fill={LEAF} />
      <path d="M206 188 C210 198 210 210 204 220 C200 210 200 198 206 188 Z" fill={LEAF_DARK} />
      {/* mano de atrás, agarrada a la rama */}
      <ellipse cx="178" cy="102" rx="7" ry="9" fill={FUR_DARK} />
      <path d="M183 96 l4 -1 M185 102 l4 0 M183 108 l4 1" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      {/* cuerpo */}
      <path d="M108 96 C80 98 62 128 64 162 C66 192 86 210 114 208 C140 206 158 188 160 160 C162 126 140 96 108 96 Z" fill={FUR} />
      <path d="M146 118 C156 134 160 152 156 172 C152 188 144 198 134 204 C144 184 150 152 146 118 Z" fill="#e4e4e2" />
      <path d="M72 144 C74 122 88 106 104 100 C92 112 82 128 78 148 Z" fill="#fff" opacity="0.14" />
      <path d="M66 172 C72 196 92 210 114 208 C136 206 150 196 156 182 C140 198 96 204 66 172 Z" fill="#000" opacity="0.08" />
      {/* pata abrazando la rama */}
      <path d="M84 182 C96 200 124 210 150 206 C160 204 168 200 176 202 C182 206 178 216 168 218 C140 222 104 218 86 204 Z" fill={FUR} />
      <path d="M86 204 C104 218 140 222 168 218 C176 216 180 212 180 208 C168 214 120 216 86 204 Z" fill="#000" opacity="0.1" />
      <ellipse cx="174" cy="208" rx="9" ry="8" fill={FUR_DARK} />
      <path d="M180 202 l5 -1 M182 208 l5 0 M180 214 l5 1" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      {/* brazo abrazando la rama */}
      <path d="M110 116 C126 108 152 110 170 118 C180 122 184 132 176 138 C160 136 138 138 118 142 C106 140 102 124 110 116 Z" fill={FUR} />
      <path d="M118 142 C138 138 160 136 176 138 C170 142 150 144 124 146 Z" fill="#000" opacity="0.1" />
      <ellipse cx="176" cy="128" rx="8" ry="9.5" fill={FUR_DARK} />
      <path d="M182 122 l5 -1 M184 128 l5 0 M182 134 l5 1" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      {/* orejas redondas y esponjosas */}
      <circle cx="56" cy="48" r="23" fill={FUR} />
      <circle cx="144" cy="46" r="23" fill={FUR} />
      <ellipse cx="54" cy="50" rx="14" ry="15" fill={WHITE} />
      <ellipse cx="146" cy="48" rx="14" ry="15" fill={WHITE} />
      <path d="M36 38 l-5 -3 M33 48 l-6 0 M35 58 l-5 3 M164 36 l5 -3 M167 46 l6 0 M165 56 l5 3" stroke={WHITE} strokeWidth="2.6" strokeLinecap="round" />
      {/* cabeza */}
      <ellipse cx="100" cy="80" rx="46" ry="38" fill={FUR} />
      <ellipse cx="84" cy="56" rx="18" ry="8" fill="#fff" opacity="0.15" />
      <path d="M128 52 C142 62 148 78 144 94 C140 106 128 116 114 118 C134 104 140 78 128 52 Z" fill="#000" opacity="0.08" />
      <ellipse cx="72" cy="96" rx="10" ry="7" fill={FUR_LIGHT} />
      <ellipse cx="128" cy="96" rx="10" ry="7" fill={FUR_LIGHT} />
      {/* nariz grande */}
      <path d="M100 72 C110 72 115 83 113 96 C111 104 106 108 100 108 C94 108 89 104 87 96 C85 83 90 72 100 72 Z" fill={NOSE} />
      <ellipse cx="95" cy="81" rx="3" ry="5.5" fill="#fff" opacity="0.22" />
      <path d="M92 112 q8 5 16 0" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* ojos */}
      <circle cx="77" cy="80" r="4.8" fill={INK} />
      <circle cx="123" cy="80" r="4.8" fill={INK} />
      <circle cx="78.6" cy="78.2" r="1.7" fill="#fff" />
      <circle cx="124.6" cy="78.2" r="1.7" fill="#fff" />
    </>
  ),
};
export default art;
