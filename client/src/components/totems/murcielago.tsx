import { INK, type TotemArt } from './types';

/** Murciélago: de frente, en vuelo con las alas abiertas. Orejas grandes, hocico chato, membranas con los dedos marcados. */
const FUR = '#7d6455';
const FUR_LIGHT = '#a68a73';
const WING = '#5a4752';
const BONE = '#77636e';
const EAR_IN = '#e0a3a3';

const art: TotemArt = {
  bg: '#d5e4f4',
  face: [58, 34, 124],
  art: (
    <>
      <circle cx="120" cy="122" r="102" fill="#fff" opacity="0.35" />
      {/* alas */}
      <path d="M100 124 C88 98 74 68 58 52 C40 60 22 78 12 100 Q36 124 18 156 Q53 159 52 194 Q80 178 108 202 Z" fill={WING} />
      <path d="M140 124 C152 98 166 68 182 52 C200 60 218 78 228 100 Q204 124 222 156 Q187 159 188 194 Q160 178 132 202 Z" fill={WING} />
      <path d="M140 124 C152 98 166 68 182 52 C200 60 218 78 228 100 Q204 124 222 156 Q187 159 188 194 Q160 178 132 202 Z" fill="#000" opacity="0.1" />
      <path d="M58 52 C40 60 22 78 12 100 C30 84 46 72 60 66 C72 80 84 100 96 120 C86 96 74 70 58 52 Z" fill="#fff" opacity="0.12" />
      {/* huesos de los dedos */}
      <path d="M58 52 Q34 98 18 156 M58 52 Q52 126 52 194 M182 52 Q206 98 222 156 M182 52 Q188 126 188 194" stroke={BONE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M57 52 q-4 -7 1 -12 M183 52 q4 -7 -1 -12" stroke={FUR_LIGHT} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* cuerpo */}
      <ellipse cx="120" cy="156" rx="28" ry="38" fill={FUR} />
      <ellipse cx="119" cy="153" rx="17" ry="25" fill={FUR_LIGHT} />
      <path d="M142 132 C152 154 148 182 130 192 C124 194 116 194 110 192 C134 183 144 160 142 132 Z" fill="#000" opacity="0.1" />
      {/* patitas */}
      <ellipse cx="110" cy="199" rx="6" ry="3.5" fill={WING} />
      <ellipse cx="130" cy="199" rx="6" ry="3.5" fill={WING} />
      {/* orejas */}
      <path d="M94 92 C76 78 66 56 68 30 C90 32 112 48 120 74 Z" fill={FUR} />
      <path d="M146 92 C164 78 174 56 172 30 C150 32 128 48 120 74 Z" fill={FUR} />
      <path d="M96 84 C82 72 76 56 77 40 C92 43 106 54 112 72 Z" fill={EAR_IN} />
      <path d="M144 84 C158 72 164 56 163 40 C148 43 134 54 128 72 Z" fill={EAR_IN} />
      <path d="M150 88 C164 74 170 56 172 30 C176 54 168 76 150 92 Z" fill="#000" opacity="0.1" />
      {/* cabeza */}
      <circle cx="120" cy="104" r="34" fill={FUR} />
      <ellipse cx="106" cy="84" rx="15" ry="7" fill="#fff" opacity="0.15" />
      <path d="M146 82 C158 100 154 124 138 134 C130 138 120 139 112 138 C136 128 150 108 146 82 Z" fill="#000" opacity="0.08" />
      {/* hocico */}
      <ellipse cx="120" cy="119" rx="19" ry="13" fill={FUR_LIGHT} />
      <path d="M113.5 111 q6.5 -4 13 0 q-1.5 7 -6.5 7 q-5 0 -6.5 -7 Z" fill={INK} />
      <circle cx="117.5" cy="113" r="1.2" fill={FUR_LIGHT} />
      <circle cx="122.5" cy="113" r="1.2" fill={FUR_LIGHT} />
      <path d="M111 121 q9 6 18 0" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M114.6 124.4 l1.6 3.6 l1.6 -3 Z M125.4 124.4 l-1.6 3.6 l-1.6 -3 Z" fill="#fff" />
      {/* ojos */}
      <ellipse cx="97" cy="114" rx="6" ry="3.8" fill="#e98c86" opacity="0.5" />
      <ellipse cx="143" cy="114" rx="6" ry="3.8" fill="#e98c86" opacity="0.5" />
      <circle cx="105" cy="100" r="6.5" fill={INK} />
      <circle cx="135" cy="100" r="6.5" fill={INK} />
      <circle cx="107.3" cy="97.6" r="2.2" fill="#fff" />
      <circle cx="137.3" cy="97.6" r="2.2" fill="#fff" />
    </>
  ),
};
export default art;
