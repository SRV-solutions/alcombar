import { INK, type TotemArt } from './types';

/** Rata: sentada, de frente, con las manitos juntas. Pelaje gris pardo, orejas redondas rosadas, hocico en punta, cola larga pelada. */
const FUR = '#8f8279';
const FUR_DARK = '#7a6d64';
const BELLY = '#d3c8bd';
const PINK = '#e9a7a4';
const PINK_DARK = '#d48b8b';
const EAR = '#d7a9a3';

const art: TotemArt = {
  bg: '#d7edd9',
  face: [56, 22, 128],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="128" cy="214" rx="82" ry="9" fill="#000" opacity="0.12" />
      {/* cola pelada */}
      <path d="M146 210 C170 221 200 222 218 204 C232 190 232 166 218 155 C210 150 199 155 196 162 C202 160 210 158 215 163 C223 172 222 190 210 199 C194 211 170 210 148 198 Z" fill={PINK} />
      <path d="M176 216 v-8 M198 215 l-2 -8 M216 203 l-5 -5 M225 184 l-6 -1 M222 166 l-5 2" stroke={PINK_DARK} strokeWidth="1.6" strokeLinecap="round" />
      {/* ancas */}
      <ellipse cx="82" cy="184" rx="26" ry="27" fill={FUR_DARK} />
      <ellipse cx="158" cy="184" rx="26" ry="27" fill={FUR_DARK} />
      {/* cuerpo y panza */}
      <path d="M120 104 C88 104 68 136 68 170 C68 198 86 212 120 212 C154 212 172 198 172 170 C172 136 152 104 120 104 Z" fill={FUR} />
      <path d="M120 124 C102 124 94 148 94 172 C94 196 104 209 120 209 C136 209 146 196 146 172 C146 148 138 124 120 124 Z" fill={BELLY} />
      <path d="M150 116 C166 134 174 154 172 172 C171 198 154 212 120 212 C150 202 162 170 150 116 Z" fill="#000" opacity="0.08" />
      {/* patas traseras */}
      <ellipse cx="80" cy="209" rx="21" ry="7.5" fill={PINK} />
      <ellipse cx="160" cy="209" rx="21" ry="7.5" fill={PINK} />
      <path d="M64 207 v4 M70 208 v4 M170 208 v4 M176 207 v4" stroke={PINK_DARK} strokeWidth="1.6" strokeLinecap="round" />
      {/* bracitos y manos juntas */}
      <path d="M92 128 C82 136 84 152 96 160 C102 164 110 162 112 156 C106 150 100 142 102 132 Z" fill={FUR} />
      <path d="M148 128 C158 136 156 152 144 160 C138 164 130 162 128 156 C134 150 140 142 138 132 Z" fill={FUR} />
      <ellipse cx="112" cy="157" rx="7.5" ry="6" fill={PINK} />
      <ellipse cx="128" cy="157" rx="7.5" ry="6" fill={PINK} />
      <path d="M109 152 v4 M114 152 v4 M126 152 v4 M131 152 v4" stroke={PINK_DARK} strokeWidth="1.4" strokeLinecap="round" />
      {/* orejas */}
      <circle cx="78" cy="50" r="25" fill={EAR} />
      <circle cx="162" cy="50" r="25" fill={EAR} />
      <circle cx="80" cy="52" r="17" fill={PINK} />
      <circle cx="160" cy="52" r="17" fill={PINK} />
      <path d="M176 36 C186 48 186 64 174 72 C178 60 180 48 176 36 Z" fill="#000" opacity="0.08" />
      {/* cabeza */}
      <path d="M120 36 C152 36 170 58 168 82 C166 106 142 124 120 132 C98 124 74 106 72 82 C70 58 88 36 120 36 Z" fill={FUR} />
      <ellipse cx="102" cy="54" rx="22" ry="9" fill="#fff" opacity="0.14" />
      <path d="M156 52 C170 68 170 92 156 108 C146 119 132 127 120 132 C142 118 160 92 156 52 Z" fill="#000" opacity="0.08" />
      {/* hocico */}
      <path d="M120 94 C134 94 143 104 141 114 C138 124 128 129 120 132 C112 129 102 124 99 114 C97 104 106 94 120 94 Z" fill={BELLY} />
      <path d="M113 121 q7 -4.5 14 0 q-2 7.5 -7 8.5 q-5 -1 -7 -8.5 Z" fill={PINK_DARK} />
      <ellipse cx="117.5" cy="122" rx="2.6" ry="1.4" fill="#fff" opacity="0.5" />
      <path d="M101 112 l-30 -7 M101 118 l-30 3 M139 112 l30 -7 M139 118 l30 3" stroke="#5b504a" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      {/* ojos */}
      <ellipse cx="101" cy="80" rx="7" ry="8" fill={INK} />
      <ellipse cx="139" cy="80" rx="7" ry="8" fill={INK} />
      <circle cx="103.6" cy="76.6" r="2.4" fill="#fff" />
      <circle cx="141.6" cy="76.6" r="2.4" fill="#fff" />
    </>
  ),
};
export default art;
