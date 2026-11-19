import { INK, type TotemArt } from './types';

/** Serpiente de cascabel: enroscada, de perfil, con la cabeza alzada. Arena con rombos oscuros de borde claro en el lomo, franja oscura detrás del ojo y el cascabel en la punta de la cola. */
const BODY = '#cda970';
const BODY_DARK = '#ad8a52';
const BELLY = '#ecdcb0';
const DIAMOND = '#6f4c2c';
const EDGE = '#f3e5c0';
const RATTLE = '#e6d4a6';
const RATTLE_DARK = '#b49a64';
const IRIS = '#e8c55c';
const TONGUE = '#d4506a';

const art: TotemArt = {
  bg: '#d6e8f2',
  face: [40, 26, 92],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="122" cy="200" rx="90" ry="8" fill="#000" opacity="0.12" />
      {/* cola con el cascabel */}
      <path d="M186 166 C196 152 202 138 204 124 L213 126 C213 142 208 158 198 172 Z" fill={BODY} />
      <path d="M203 133 l10 2 M200 145 l10 3" stroke={DIAMOND} strokeWidth="3.4" strokeLinecap="round" />
      <ellipse cx="209" cy="120" rx="7.6" ry="5.2" fill={RATTLE_DARK} />
      <ellipse cx="209" cy="118.6" rx="7" ry="4.2" fill={RATTLE} />
      <ellipse cx="209.6" cy="112" rx="7" ry="5" fill={RATTLE_DARK} />
      <ellipse cx="209.6" cy="110.6" rx="6.4" ry="4" fill={RATTLE} />
      <ellipse cx="210.2" cy="104.6" rx="6.2" ry="4.6" fill={RATTLE_DARK} />
      <ellipse cx="210.2" cy="103.2" rx="5.6" ry="3.7" fill={RATTLE} />
      <ellipse cx="210.8" cy="98" rx="5.2" ry="4.2" fill={RATTLE_DARK} />
      <ellipse cx="210.8" cy="96.8" rx="4.6" ry="3.4" fill={RATTLE} />
      {/* anillo de abajo */}
      <ellipse cx="120" cy="176" rx="82" ry="24" fill={BODY} />
      <ellipse cx="120" cy="170" rx="60" ry="13" fill="#000" opacity="0.14" />
      <path d="M44.5 176 L52 168 L59.5 176 L52 184 Z M70 186 L80 178.5 L90 186 L80 193.5 Z M100 190 L110 182.5 L120 190 L110 197.5 Z M130 190 L140 182.5 L150 190 L140 197.5 Z M158 186 L168 178.5 L178 186 L168 193.5 Z M184.5 177 L192 169 L199.5 177 L192 185 Z" fill={EDGE} />
      <path d="M47 176 L52 170 L57 176 L52 182 Z M72.5 186 L80 180.5 L87.5 186 L80 191.5 Z M102 190 L110 184.5 L118 190 L110 195.5 Z M132 190 L140 184.5 L148 190 L140 195.5 Z M160.5 186 L168 180.5 L175.5 186 L168 191.5 Z M187 177 L192 171 L197 177 L192 183 Z" fill={DIAMOND} />
      <path d="M40 180 C48 194 82 200 120 200 C158 200 194 194 202 178 C198 198 162 202 120 202 C80 202 44 196 40 180 Z" fill="#000" opacity="0.1" />
      {/* anillo del medio */}
      <ellipse cx="118" cy="158" rx="62" ry="20" fill={BODY} />
      <ellipse cx="118" cy="153" rx="42" ry="10" fill="#000" opacity="0.14" />
      <path d="M58.5 158 L66 150.5 L73.5 158 L66 165.5 Z M82.5 169 L92 162 L101.5 169 L92 176 Z M110 172 L120 165 L130 172 L120 179 Z M138.5 169 L148 162 L157.5 169 L148 176 Z M162.5 160 L170 152.5 L177.5 160 L170 167.5 Z" fill={EDGE} />
      <path d="M61 158 L66 152.5 L71 158 L66 163.5 Z M85 169 L92 164 L99 169 L92 174 Z M112.5 172 L120 167 L127.5 172 L120 177 Z M141 169 L148 164 L155 169 L148 174 Z M165 160 L170 154.5 L175 160 L170 165.5 Z" fill={DIAMOND} />
      <path d="M58 162 C66 174 90 178 118 178 C146 178 170 174 178 162 C174 178 148 180 118 180 C88 180 62 176 58 162 Z" fill="#000" opacity="0.1" />
      {/* anillo de arriba */}
      <ellipse cx="116" cy="142" rx="44" ry="16" fill={BODY} />
      <ellipse cx="116" cy="138" rx="26" ry="7" fill="#000" opacity="0.14" />
      <path d="M76.5 144 L84 137.5 L91.5 144 L84 150.5 Z M129 150 L138 144 L147 150 L138 156 Z M148.5 140 L155 133.5 L161.5 140 L155 146.5 Z" fill={EDGE} />
      <path d="M79 144 L84 139.5 L89 144 L84 148.5 Z M131.5 150 L138 146 L144.5 150 L138 154 Z M151 140 L155 135.5 L159 140 L155 144.5 Z" fill={DIAMOND} />
      <ellipse cx="86" cy="134" rx="12" ry="3.6" fill="#fff" opacity="0.2" transform="rotate(-14 86 134)" />
      {/* cuello alzado */}
      <path d="M98 150 C86 130 84 108 94 94 L100 82 L120 86 C110 96 104 108 106 122 C107 134 112 142 120 148 Z" fill={BODY} />
      <path d="M98 150 C86 130 84 108 94 94 L99 86 C94 100 92 124 104 148 Z" fill={BELLY} />
      <path d="M97.5 136 L104 130.5 L110.5 136 L104 141.5 Z M95 116 L101 110.5 L107 116 L101 121.5 Z" fill={EDGE} />
      <path d="M100 136 L104 132.5 L108 136 L104 139.5 Z M97.5 116 L101 112.5 L104.5 116 L101 119.5 Z" fill={DIAMOND} />
      {/* cabeza */}
      <path d="M56 70 C56 62 64 56 76 54 C92 50 112 52 120 62 C126 70 122 82 110 86 C96 90 74 86 62 80 C58 78 56 74 56 70 Z" fill={BODY} />
      <path d="M57 74 C68 78 86 80 102 78 C110 77 117 75 122 71 C122 80 116 85 110 86 C96 90 74 86 62 80 C59 78 57 76 57 74 Z" fill={BELLY} />
      <path d="M90 66 C98 70 108 74 118 76 L116 81 C106 79 96 74 88 70 Z" fill={DIAMOND} />
      <path d="M92 63 C100 66 110 70 120 71" stroke={EDGE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="84" cy="57" rx="14" ry="4" fill="#fff" opacity="0.2" transform="rotate(-8 84 57)" />
      <path d="M112 56 C122 62 126 72 120 80 C116 84 112 86 106 87 C116 78 118 66 112 56 Z" fill="#000" opacity="0.1" />
      {/* cara */}
      <circle cx="61" cy="66" r="1.5" fill={DIAMOND} />
      <circle cx="70" cy="70" r="1.3" fill={DIAMOND} />
      <path d="M57 73 C68 77 84 79 98 77 C101 77 104 75 105 72" stroke={DIAMOND} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M57 74 L46 75 M46 75 l-5 -3.4 M46 75 l-4.6 3.8" stroke={TONGUE} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="84" cy="64" r="6.6" fill={IRIS} />
      <ellipse cx="84.2" cy="64.4" rx="2.8" ry="5.4" fill={INK} />
      <circle cx="86.2" cy="61.6" r="1.7" fill="#fff" />
      <path d="M76.5 60 C80 55 88 55 91.5 60" stroke={BODY_DARK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
