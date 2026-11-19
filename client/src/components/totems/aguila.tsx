import { INK, type TotemArt } from './types';

/** Águila: de perfil, posada en una rama. Cuerpo pardo oscuro, cabeza y cola blancas, pico ganchudo amarillo. */
const BROWN = '#5f3d28';
const BROWN_DARK = '#4a2f1f';
const BROWN_MID = '#6f4a31';
const WHITE = '#fbf8f1';
const WHITE_SHADE = '#e4ddcf';
const BEAK = '#f4b731';
const BEAK_DARK = '#d18d1d';
const BARK = '#8a6240';
const BARK_LIGHT = '#b58a5e';

const art: TotemArt = {
  bg: '#e2ebcf',
  face: [34, 28, 104],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      {/* cola blanca, colgando detrás de la rama */}
      <path d="M128 176 L152 172 C162 190 172 208 178 224 C170 230 156 232 148 228 C142 212 134 194 128 176 Z" fill={WHITE} />
      <path d="M150 174 C160 192 170 210 178 224 C174 227 170 228 166 229 C160 210 152 192 144 176 Z" fill={WHITE_SHADE} />
      <path d="M140 190 l10 34 M150 184 l14 40" stroke="#000" strokeWidth="1.6" strokeLinecap="round" opacity="0.12" />
      {/* rama */}
      <path d="M18 194 C18 188 24 186 30 186 C90 186 170 190 240 194 L240 208 C170 204 90 202 30 202 C24 202 18 200 18 194 Z" fill={BARK} />
      <path d="M30 198 C90 198 170 202 240 204 L240 208 C170 204 90 202 30 202 C24 202 20 200 19 198 Z" fill="#000" opacity="0.14" />
      <ellipse cx="24" cy="194" rx="4.5" ry="7" fill={BARK_LIGHT} />
      <path d="M192 192 C198 180 206 172 218 166 L221 170 C210 176 204 184 200 194 Z" fill={BARK} />
      <ellipse cx="222" cy="164" rx="9" ry="4.5" fill="#7fa35c" transform="rotate(-35 222 164)" />
      <ellipse cx="206" cy="176" rx="8" ry="4" fill="#94b56e" transform="rotate(-70 206 176)" />
      <path d="M60 190 q14 -3 26 0 M160 194 q12 -2 22 1" stroke="#000" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.15" />
      {/* cuerpo */}
      <path d="M84 100 C66 122 66 160 86 178 C102 192 136 192 154 178 C170 162 168 124 152 104 C138 90 106 88 84 100 Z" fill={BROWN} />
      <path d="M84 110 C74 126 74 150 84 166 C82 146 84 128 94 114 Z" fill="#fff" opacity="0.1" />
      {/* calzones de plumas */}
      <ellipse cx="112" cy="182" rx="22" ry="10" fill={BROWN_MID} />
      <path d="M96 178 q6 4 12 2 M112 180 q6 4 12 2" stroke="#000" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.18" />
      {/* garras amarillas agarrando la rama */}
      <path d="M102 186 L101 193 M101 193 q-7 0 -10 5 M101 193 q2 4 1 8 M101 193 q7 0 10 5 M122 186 L122 193 M122 193 q-7 0 -10 5 M122 193 q2 4 1 8 M122 193 q7 0 10 5" stroke={BEAK} strokeWidth="4.4" strokeLinecap="round" fill="none" />
      <path d="M91 198 l-1 3 M102 201 l-1 3 M111 198 l1 3 M112 198 l-1 3 M123 201 l-1 3 M132 198 l1 3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* ala plegada */}
      <path d="M114 102 C142 94 166 114 170 146 C174 172 172 196 164 214 C150 200 126 178 112 152 C104 134 104 114 114 102 Z" fill={BROWN_DARK} />
      <path d="M116 106 C136 100 156 112 162 132 C146 126 128 124 110 128 C108 120 110 112 116 106 Z" fill="#fff" opacity="0.08" />
      <path d="M124 146 q18 16 32 44 M132 138 q18 18 30 50 M144 134 q14 16 22 44" stroke="#000" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.22" />
      <path d="M150 104 C168 124 170 162 154 178 C146 186 136 190 126 191 C150 176 160 144 150 104 Z" fill="#000" opacity="0.1" />
      {/* cabeza blanca */}
      <path d="M66 88 C66 102 74 110 80 114 L86 108 L92 115 L99 108 L106 115 L112 107 L119 111 C123 99 124 88 120 80 Z" fill={WHITE} />
      <circle cx="92" cy="74" r="31" fill={WHITE} />
      <path d="M110 50 C124 60 126 82 118 96 C112 104 104 108 96 110 C110 98 118 78 110 50 Z" fill={WHITE_SHADE} />
      <path d="M82 104 C90 108 100 108 110 104 C104 110 96 112 88 111 Z" fill={WHITE_SHADE} />
      {/* pico ganchudo */}
      <path d="M72 64 C58 62 46 66 40 76 C36 84 38 92 44 94 C44 88 48 84 54 84 L74 86 Z" fill={BEAK} />
      <path d="M55 86 L73 87 C71 91 65 92 58 90 Z" fill={BEAK_DARK} />
      <path d="M40 76 C36 84 38 92 44 94 C44 89 46 86 49 84 C44 83 41 80 40 76 Z" fill={BEAK_DARK} />
      <path d="M50 70 q-6 4 -8 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35" />
      <ellipse cx="64" cy="73" rx="2.4" ry="1.6" fill={BEAK_DARK} />
      {/* ojo */}
      <path d="M74 63 q10 -6 21 -1" stroke={WHITE_SHADE} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <circle cx="84" cy="71" r="6.6" fill="#f3c64a" />
      <circle cx="84" cy="71" r="4.4" fill={INK} />
      <circle cx="85.7" cy="69.3" r="1.6" fill="#fff" />
    </>
  ),
};
export default art;
