import { INK, type TotemArt } from './types';

/** Quetzal: de perfil, posado en una rama. Verde brillante, cresta redonda, vientre rojo y cola larguísima que cuelga. */
const GREEN = '#2f9e5b';
const GREEN_DARK = '#1f7a45';
const GREEN_LIGHT = '#5cc27f';
const RED = '#d63a3f';
const RED_DARK = '#b02a31';
const YELLOW = '#f4c94a';
const BARK = '#7d5a3c';
const LEAF = '#8fae5a';

const art: TotemArt = {
  bg: '#f6dde6',
  face: [36, 8, 92],
  art: (
    <>
      <circle cx="120" cy="116" r="102" fill="#fff" opacity="0.35" />
      {/* plumas largas de la cola */}
      <path d="M110 140 C112 176 128 206 154 222 C164 228 176 230 188 230 C176 226 166 220 157 212 C135 196 123 172 118 142 Z" fill={GREEN_DARK} />
      <path d="M114 138 C120 172 140 204 172 220 C188 228 206 228 218 222 C206 221 190 218 176 211 C151 197 131 172 124 140 Z" fill={GREEN} />
      <path d="M118 150 C126 176 144 200 168 214" stroke={GREEN_LIGHT} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* cola corta blanca */}
      <path d="M106 136 L122 138 L124 166 C120 170 112 170 110 166 Z" fill="#f6f3ec" />
      <path d="M110 148 h13 M111 158 h12" stroke="#3a3a3a" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* rama */}
      <path d="M0 134 C50 130 120 132 168 138 C176 139 178 146 170 147 C120 145 50 144 0 146 Z" fill={BARK} />
      <path d="M0 141 C50 140 120 141 170 144 C176 145 176 147 170 147 C120 145 50 144 0 146 Z" fill="#000" opacity="0.15" />
      <path d="M150 140 C158 126 168 118 182 116 L184 120 C172 124 164 132 158 142 Z" fill={BARK} />
      <ellipse cx="190" cy="114" rx="11" ry="5" fill={LEAF} transform="rotate(-20 190 114)" />
      <ellipse cx="178" cy="108" rx="9" ry="4.5" fill="#a3c06e" transform="rotate(-60 178 108)" />
      <ellipse cx="22" cy="148" rx="10" ry="4.5" fill={LEAF} transform="rotate(30 22 148)" />
      {/* patas */}
      <path d="M98 128 L96 136 M96 136 q-5 1 -7 4 M96 136 q5 1 7 4 M112 130 L112 137 M112 137 q-5 1 -7 4 M112 137 q5 1 7 4" stroke="#7a7066" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      {/* cuerpo */}
      <ellipse cx="104" cy="96" rx="34" ry="40" fill={GREEN} transform="rotate(-14 104 96)" />
      <path d="M76 98 C74 118 84 134 102 138 C112 140 122 136 126 128 C114 126 102 118 96 106 C92 100 84 96 76 98 Z" fill={RED} />
      <path d="M126 128 C122 136 112 140 102 138 C110 134 118 130 122 120 Z" fill={RED_DARK} />
      <ellipse cx="88" cy="108" rx="5" ry="8" fill="#fff" opacity="0.14" />
      {/* ala con plumas cobertoras largas */}
      <path d="M100 66 C122 66 138 86 136 112 C134 128 128 140 118 148 C110 134 102 116 98 96 C96 84 96 72 100 66 Z" fill={GREEN_DARK} />
      <path d="M102 70 C116 76 126 90 128 110 C120 102 110 98 100 96 Z" fill={GREEN_LIGHT} opacity="0.6" />
      <path d="M106 96 C116 104 124 118 126 136 M104 86 C116 94 126 106 132 122" stroke={GREEN} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* cabeza */}
      <circle cx="80" cy="50" r="26" fill={GREEN} />
      <path d="M98 34 C108 46 108 64 98 74 C92 80 84 82 78 82 C92 72 100 56 98 34 Z" fill={GREEN_DARK} opacity="0.7" />
      {/* cresta redonda */}
      <path d="M54 50 C52 32 64 18 82 16 C98 15 108 24 108 34 C100 32 90 32 82 34 C72 36 62 42 54 50 Z" fill={GREEN_LIGHT} />
      <path d="M62 36 q10 -8 22 -10 M74 30 q12 -4 24 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.35" />
      {/* pico amarillo, medio tapado por la cresta */}
      <path d="M58 52 C52 52 46 55 44 59 C48 62 54 63 60 62 Z" fill={YELLOW} />
      <path d="M44 59 C48 62 54 63 60 62 L60 59 C54 60 48 60 44 59 Z" fill="#d9a826" />
      <path d="M50 50 C52 44 58 42 64 44 C66 46 66 48 64 50 C60 50 56 52 52 55 C50 54 49 52 50 50 Z" fill={GREEN_LIGHT} />
      <path d="M53 50 l-3 4 M58 48 l-3 5 M63 47 l-2 5" stroke={GREEN} strokeWidth="1.6" strokeLinecap="round" />
      {/* ojo */}
      <circle cx="74" cy="50" r="6.2" fill={GREEN_DARK} />
      <circle cx="74" cy="50" r="4.6" fill={INK} />
      <circle cx="75.6" cy="48.4" r="1.6" fill="#fff" />
    </>
  ),
};
export default art;
