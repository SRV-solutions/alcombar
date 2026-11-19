import { INK, type TotemArt } from './types';

/** Zorro colorado: sentado, de frente, con la cola tupida de punta blanca rodeando las patas. Hocico fino, mejillas y pecho blancos, orejas con borde negro y medias negras. */
const FUR = '#d9763a';
const FUR_DARK = '#b95c27';
const FUR_LIGHT = '#eb9658';
const WHITE = '#fbf3e8';
const BLACK = '#3b2a25';

const art: TotemArt = {
  bg: '#d2e6ee',
  face: [54, 12, 132],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="118" cy="221" rx="82" ry="8" fill="#000" opacity="0.12" />
      {/* ancas */}
      <ellipse cx="88" cy="186" rx="23" ry="25" fill={FUR_DARK} />
      <ellipse cx="152" cy="186" rx="23" ry="25" fill={FUR_DARK} />
      {/* cuerpo y pecho */}
      <path d="M120 100 C94 100 78 134 80 170 C81 196 96 210 120 210 C144 210 159 196 160 170 C162 134 146 100 120 100 Z" fill={FUR} />
      <path d="M120 112 C106 112 100 132 101 154 C102 172 110 186 120 186 C130 186 138 172 139 154 C140 132 134 112 120 112 Z" fill={WHITE} />
      <path d="M148 112 C158 130 162 152 160 172 C159 196 144 210 120 210 C142 200 152 170 148 112 Z" fill="#000" opacity="0.08" />
      {/* patas delanteras con medias negras */}
      <path d="M100 150 C97 152 96 158 96 164 L98 204 C98 211 114 211 114 204 L115 164 C115 156 112 150 106 150 Z" fill={FUR} />
      <path d="M140 150 C143 152 144 158 144 164 L142 204 C142 211 126 211 126 204 L125 164 C125 156 128 150 134 150 Z" fill={FUR} />
      <path d="M97 178 L98 204 C98 211 114 211 114 204 L114.7 178 C109 182 103 182 97 178 Z" fill={BLACK} />
      <path d="M143 178 L142 204 C142 211 126 211 126 204 L125.3 178 C131 182 137 182 143 178 Z" fill={BLACK} />
      {/* cola tupida rodeando las patas */}
      <path d="M162 174 C186 180 200 196 194 210 C188 224 156 228 120 228 C88 228 58 226 44 216 C36 210 38 200 48 198 C70 204 96 207 120 207 C146 207 164 203 170 195 C172 187 168 179 162 174 Z" fill={FUR} />
      <path d="M194 210 C188 224 156 228 120 228 C96 228 80 227 70 226 C102 221 160 222 190 204 Z" fill="#000" opacity="0.1" />
      <path d="M80 205 C106 210 142 210 164 201 C150 210 104 214 80 205 Z" fill="#fff" opacity="0.18" />
      <path d="M72 226 C58 224 47 220 44 216 C36 210 38 200 48 198 C58 201 66 203 74 204 C67 211 66 220 72 226 Z" fill={WHITE} />
      {/* orejas grandes con borde negro */}
      <path d="M70 78 C61 52 63 28 74 10 C92 18 108 34 114 52 Z" fill={BLACK} />
      <path d="M170 78 C179 52 177 28 166 10 C148 18 132 34 126 52 Z" fill={BLACK} />
      <path d="M76 74 C69 54 71 36 78 23 C91 32 102 43 108 55 Z" fill={FUR} />
      <path d="M164 74 C171 54 169 36 162 23 C149 32 138 43 132 55 Z" fill={FUR} />
      <path d="M83 66 C79 53 80 42 83 34 C91 41 97 49 101 57 Z" fill={WHITE} />
      <path d="M157 66 C161 53 160 42 157 34 C149 41 143 49 139 57 Z" fill={WHITE} />
      {/* cabeza, con mejillas anchas */}
      <path d="M120 40 C146 40 162 54 166 72 C172 80 180 90 188 98 C174 100 162 106 152 114 C144 122 132 128 120 128 C108 128 96 122 88 114 C78 106 66 100 52 98 C60 90 68 80 74 72 C78 54 94 40 120 40 Z" fill={FUR} />
      <ellipse cx="102" cy="54" rx="20" ry="9" fill="#fff" opacity="0.15" />
      {/* mejillas y hocico blancos */}
      <path d="M52 98 C64 94 78 88 90 82 C98 92 108 98 120 98 C132 98 142 92 150 82 C162 88 176 94 188 98 C174 100 162 106 152 114 C144 122 132 128 120 128 C108 128 96 122 88 114 C78 106 66 100 52 98 Z" fill={WHITE} />
      <path d="M188 98 C174 100 162 106 152 114 C144 122 132 128 120 128 C140 120 160 102 176 96 Z" fill="#000" opacity="0.07" />
      <path d="M108 72 C112 86 112 98 113 108 C116 113 124 113 127 108 C128 98 128 86 132 72 C126 68 114 68 108 72 Z" fill={FUR_LIGHT} />
      <path d="M113 105 h14 q3 0 1.5 3 l-5 6 q-3 3 -6 0 l-5 -6 q-1.5 -3 1.5 -3 z" fill={INK} />
      <ellipse cx="117" cy="107" rx="2.6" ry="1.1" fill="#fff" opacity="0.35" />
      <path d="M120 115 v3 M120 118 q-5 5 -10 1 M120 118 q5 5 10 1" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* ojos */}
      <ellipse cx="99" cy="80" rx="8.5" ry="7" fill="#f0b33f" />
      <ellipse cx="141" cy="80" rx="8.5" ry="7" fill="#f0b33f" />
      <ellipse cx="99" cy="80" rx="3.2" ry="6" fill={INK} />
      <ellipse cx="141" cy="80" rx="3.2" ry="6" fill={INK} />
      <circle cx="101.4" cy="77" r="1.9" fill="#fff" />
      <circle cx="143.4" cy="77" r="1.9" fill="#fff" />
      <path d="M89 78 q10 -10 21 -1" stroke={BLACK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M151 78 q-10 -10 -21 -1" stroke={BLACK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
