import { INK, type TotemArt } from './types';

/** Sapo: sentado, de frente. Rechoncho y verrugoso, pardo oliva con la panza clara, ojos saltones dorados de pupila horizontal, glándulas detrás de los ojos y boca ancha. */
const SKIN = '#9c8b52';
const SKIN_DARK = '#7d6d3d';
const SKIN_LIGHT = '#bba96d';
const BELLY = '#efe3bd';
const IRIS = '#e3b440';
const MOUTH = '#5a4826';

const art: TotemArt = {
  bg: '#dfe3f6',
  face: [54, 36, 132],
  art: (
    <>
      <circle cx="120" cy="122" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="120" cy="207" rx="92" ry="9" fill="#000" opacity="0.12" />
      {/* patas de atrás: pies palmeados */}
      <path d="M74 196 C60 192 42 194 30 200 C26 203 28 208 34 208 L78 208 C82 204 80 198 74 196 Z" fill={SKIN_DARK} />
      <path d="M166 196 C180 192 198 194 210 200 C214 203 212 208 206 208 L162 208 C158 204 160 198 166 196 Z" fill={SKIN_DARK} />
      <path d="M32 204 l-4 2 M44 199 l-4 -2 M200 199 l4 -2 M208 204 l4 2" stroke={SKIN_DARK} strokeWidth="3.4" strokeLinecap="round" />
      {/* ancas */}
      <ellipse cx="64" cy="174" rx="30" ry="27" fill={SKIN} />
      <ellipse cx="176" cy="174" rx="30" ry="27" fill={SKIN} />
      <path d="M196 156 C208 170 206 190 190 200 C182 204 172 204 164 200 C188 194 200 178 196 156 Z" fill="#000" opacity="0.1" />
      {/* cuerpo */}
      <path d="M120 64 C168 64 194 102 192 144 C190 184 162 204 120 204 C78 204 50 184 48 144 C46 102 72 64 120 64 Z" fill={SKIN} />
      <ellipse cx="120" cy="168" rx="40" ry="32" fill={BELLY} />
      <path d="M172 92 C188 112 194 140 188 166 C182 190 160 204 128 204 C164 190 182 150 172 92 Z" fill="#000" opacity="0.1" />
      <ellipse cx="74" cy="126" rx="10" ry="18" fill="#fff" opacity="0.12" transform="rotate(20 74 126)" />
      {/* verrugas */}
      <path d="M103.4 88 a2.6 2.6 0 1 1 5.2 0 a2.6 2.6 0 1 1 -5.2 0 Z M131.4 88 a2.6 2.6 0 1 1 5.2 0 a2.6 2.6 0 1 1 -5.2 0 Z M117.8 80 a2.2 2.2 0 1 1 4.4 0 a2.2 2.2 0 1 1 -4.4 0 Z M58.8 140 a3.2 3.2 0 1 1 6.4 0 a3.2 3.2 0 1 1 -6.4 0 Z M71.4 156 a2.6 2.6 0 1 1 5.2 0 a2.6 2.6 0 1 1 -5.2 0 Z M55.6 160 a2.4 2.4 0 1 1 4.8 0 a2.4 2.4 0 1 1 -4.8 0 Z M174.8 140 a3.2 3.2 0 1 1 6.4 0 a3.2 3.2 0 1 1 -6.4 0 Z M163.4 156 a2.6 2.6 0 1 1 5.2 0 a2.6 2.6 0 1 1 -5.2 0 Z M179.6 160 a2.4 2.4 0 1 1 4.8 0 a2.4 2.4 0 1 1 -4.8 0 Z M47.2 170 a2.8 2.8 0 1 1 5.6 0 a2.8 2.8 0 1 1 -5.6 0 Z M61.6 184 a2.4 2.4 0 1 1 4.8 0 a2.4 2.4 0 1 1 -4.8 0 Z M187.2 170 a2.8 2.8 0 1 1 5.6 0 a2.8 2.8 0 1 1 -5.6 0 Z M173.6 184 a2.4 2.4 0 1 1 4.8 0 a2.4 2.4 0 1 1 -4.8 0 Z M96 150 a2 2 0 1 1 4 0 a2 2 0 1 1 -4 0 Z M140 150 a2 2 0 1 1 4 0 a2 2 0 1 1 -4 0 Z" fill={SKIN_DARK} />
      <path d="M98.2 84 a1.8 1.8 0 1 1 3.6 0 a1.8 1.8 0 1 1 -3.6 0 Z M138.2 84 a1.8 1.8 0 1 1 3.6 0 a1.8 1.8 0 1 1 -3.6 0 Z M66 132 a2 2 0 1 1 4 0 a2 2 0 1 1 -4 0 Z M170 132 a2 2 0 1 1 4 0 a2 2 0 1 1 -4 0 Z M54 178 a2 2 0 1 1 4 0 a2 2 0 1 1 -4 0 Z M182 178 a2 2 0 1 1 4 0 a2 2 0 1 1 -4 0 Z M80.4 150 a1.6 1.6 0 1 1 3.2 0 a1.6 1.6 0 1 1 -3.2 0 Z M156.4 150 a1.6 1.6 0 1 1 3.2 0 a1.6 1.6 0 1 1 -3.2 0 Z" fill={SKIN_LIGHT} />
      {/* glándulas detrás de los ojos */}
      <ellipse cx="66" cy="102" rx="13" ry="8" fill={SKIN_DARK} transform="rotate(-38 66 102)" />
      <ellipse cx="174" cy="102" rx="13" ry="8" fill={SKIN_DARK} transform="rotate(38 174 102)" />
      <ellipse cx="64" cy="99" rx="5" ry="2.6" fill="#fff" opacity="0.16" transform="rotate(-38 64 99)" />
      <ellipse cx="172" cy="99" rx="5" ry="2.6" fill="#fff" opacity="0.16" transform="rotate(38 172 99)" />
      {/* patas de adelante */}
      <path d="M88 142 C82 160 80 180 82 198 L98 198 C98 182 100 162 104 148 Z" fill={SKIN} />
      <path d="M152 142 C158 160 160 180 158 198 L142 198 C142 182 140 162 136 148 Z" fill={SKIN} />
      <path d="M152 142 C158 160 160 180 158 198 L152 198 C154 178 154 160 148 146 Z" fill="#000" opacity="0.1" />
      <path d="M84 200 l-6 6 M88 201 l-2 7 M93 201 l2 7 M97 200 l5 6 M156 200 l6 6 M152 201 l2 7 M147 201 l-2 7 M143 200 l-5 6" stroke={SKIN} strokeWidth="4.6" strokeLinecap="round" />
      {/* ojos saltones */}
      <circle cx="86" cy="78" r="20" fill={SKIN} />
      <circle cx="154" cy="78" r="20" fill={SKIN} />
      <ellipse cx="80" cy="66" rx="8" ry="4" fill="#fff" opacity="0.18" transform="rotate(-20 80 66)" />
      <circle cx="86" cy="80" r="13.5" fill={IRIS} />
      <circle cx="154" cy="80" r="13.5" fill={IRIS} />
      <ellipse cx="86" cy="81" rx="7.5" ry="4.4" fill={INK} />
      <ellipse cx="154" cy="81" rx="7.5" ry="4.4" fill={INK} />
      <circle cx="89" cy="77" r="2.4" fill="#fff" />
      <circle cx="157" cy="77" r="2.4" fill="#fff" />
      <path d="M72 76 C74 64 98 64 100 76 C92 71 80 71 72 76 Z M140 76 C142 64 166 64 168 76 C160 71 148 71 140 76 Z" fill={SKIN} />
      <path d="M72 76 C80 71 92 71 100 76 M140 76 C148 71 160 71 168 76" stroke={SKIN_DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* narinas y boca ancha */}
      <circle cx="112" cy="106" r="1.8" fill={MOUTH} />
      <circle cx="128" cy="106" r="1.8" fill={MOUTH} />
      <path d="M62 118 C90 136 150 136 178 118" stroke={MOUTH} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
