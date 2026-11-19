import { INK, type TotemArt } from './types';

/** Cobra: erguida de frente sobre sus anillos, con la capucha abierta. Pardo dorada, el frente de la capucha claro con las escamas del vientre y la banda oscura de la garganta. */
const BODY = '#b5863f';
const BODY_DARK = '#94692c';
const BODY_LIGHT = '#cf9f58';
const CREAM = '#f1dfaa';
const CREAM_SHADE = '#ddc58a';
const BAND = '#6e4a20';

const art: TotemArt = {
  bg: '#e4dcf2',
  face: [72, 14, 96],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="124" cy="208" rx="88" ry="8" fill="#000" opacity="0.12" />
      {/* punta de la cola */}
      <path d="M182 196 C198 194 214 198 222 206 C210 209 194 208 182 205 Z" fill={BODY_DARK} />
      {/* anillo de abajo */}
      <ellipse cx="120" cy="188" rx="78" ry="21" fill={BODY} />
      <ellipse cx="120" cy="181" rx="58" ry="11" fill={BODY_DARK} />
      <path d="M42 188 C46 202 80 209 120 209 C160 209 194 202 198 188 C194 210 160 214 120 214 C80 214 46 208 42 188 Z" fill="#000" opacity="0.1" />
      {/* anillo de arriba */}
      <ellipse cx="120" cy="172" rx="58" ry="17" fill={BODY} />
      <ellipse cx="120" cy="166" rx="38" ry="8" fill={BODY_DARK} />
      <path d="M62 172 C66 183 90 189 120 189 C150 189 174 183 178 172 C176 186 152 192 120 192 C88 192 64 186 62 172 Z" fill="#000" opacity="0.1" />
      <ellipse cx="82" cy="164" rx="14" ry="4" fill="#fff" opacity="0.18" transform="rotate(-12 82 164)" />
      <ellipse cx="62" cy="180" rx="12" ry="4" fill="#fff" opacity="0.16" transform="rotate(-20 62 180)" />
      {/* cuello */}
      <path d="M104 184 C104 168 106 152 108 140 L132 140 C134 152 136 168 136 184 C126 188 114 188 104 184 Z" fill={BODY} />
      <path d="M111 185 C111 168 112 154 113 142 L127 142 C128 154 129 168 129 185 C123 187 117 187 111 185 Z" fill={CREAM} />
      <path d="M113 152 h14 M112 162 h16 M112 172 h16" stroke={CREAM_SHADE} strokeWidth="1.6" strokeLinecap="round" />
      {/* capucha abierta */}
      <path d="M120 52 C136 42 162 42 178 58 C194 74 196 100 186 120 C174 140 152 150 132 156 L108 156 C88 150 66 140 54 120 C44 100 46 74 62 58 C78 42 104 42 120 52 Z" fill={BODY} />
      <path d="M178 58 C194 74 196 100 186 120 C174 140 152 150 132 156 C154 138 176 110 178 58 Z" fill="#000" opacity="0.12" />
      <ellipse cx="70" cy="72" rx="13" ry="7" fill="#fff" opacity="0.16" transform="rotate(-40 70 72)" />
      {/* frente claro de la capucha */}
      <path d="M120 66 C134 62 150 70 154 90 C158 112 148 132 130 148 L110 148 C92 132 82 112 86 90 C90 70 106 62 120 66 Z" fill={CREAM} />
      <path d="M150 80 C158 100 154 124 136 142 L130 148 L124 148 C142 128 150 104 150 80 Z" fill={CREAM_SHADE} />
      <path d="M100 92 h40 M96 104 h48 M98 116 h44 M106 138 h28" stroke={CREAM_SHADE} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M93 122 C110 128 130 128 147 122 L144 131 C128 137 112 137 96 131 Z" fill={BAND} />
      {/* cabeza */}
      <path d="M120 26 C140 26 152 38 152 54 C152 70 138 82 120 82 C102 82 88 70 88 54 C88 38 100 26 120 26 Z" fill={BODY} />
      <path d="M92 64 C98 76 108 82 120 82 C132 82 142 76 148 64 C140 70 130 72 120 72 C110 72 100 70 92 64 Z" fill={CREAM} />
      <path d="M144 36 C152 46 154 60 148 70 C144 76 136 80 128 82 C142 72 148 54 144 36 Z" fill="#000" opacity="0.1" />
      <ellipse cx="110" cy="34" rx="12" ry="5" fill={BODY_LIGHT} transform="rotate(-10 110 34)" />
      {/* ojos, narinas y boca */}
      <circle cx="104" cy="54" r="6.6" fill={INK} />
      <circle cx="136" cy="54" r="6.6" fill={INK} />
      <circle cx="106.2" cy="51.6" r="2.2" fill="#fff" />
      <circle cx="138.2" cy="51.6" r="2.2" fill="#fff" />
      <circle cx="115" cy="63" r="1.4" fill={BAND} />
      <circle cx="125" cy="63" r="1.4" fill={BAND} />
      <path d="M108 71 C114 75 126 75 132 71" stroke={BAND} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
