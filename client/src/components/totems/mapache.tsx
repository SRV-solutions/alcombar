import { INK, type TotemArt } from './types';

/** Mapache: sentado de frente, con las manitos juntas. Pelaje gris, antifaz negro con cejas y hocico blancos, orejas de borde blanco y la cola tupida con anillos negros. */
const FUR = '#8f8a84';
const FUR_DARK = '#6e6963';
const FUR_LIGHT = '#b4afa8';
const WHITE = '#f5f2ec';
const MASK = '#35302e';
const PAW = '#55504b';

const art: TotemArt = {
  bg: '#f6dcc6',
  face: [62, 20, 116],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="128" cy="217" rx="80" ry="9" fill="#000" opacity="0.12" />
      {/* cola tupida y anillada */}
      <path d="M150 208 C188 216 222 196 220 158 C219 144 198 140 196 154 C198 176 186 190 150 190 Z" fill={FUR_LIGHT} />
      <path d="M193.4 204 C197 202.5 199.5 201 201.5 199.2 L188.1 179.5 C186.5 180.8 185 182 183.4 183 Z M208.4 193 C210.6 190.8 212.4 188.3 213.9 185.5 L194.2 170.5 C193.6 172.2 192.7 173.8 191.7 175.3 Z M217.1 178.6 C218.1 176.2 218.8 173.6 219.2 170.9 L196.1 161.6 C196 163.2 195.8 164.7 195.4 166.2 Z M220 164 L220 158 C219 144 198 140 196 154 L196.2 160 Z M168 207.5 C172 208 176 208 180 207.5 L174 189.4 C171 189.8 168 190 165 190 Z" fill={MASK} />
      <path d="M150 190 C186 190 198 176 196 154 C200 172 194 196 160 199 C156 199 152 196 150 190 Z" fill="#fff" opacity="0.14" />
      {/* ancas */}
      <ellipse cx="80" cy="190" rx="26" ry="25" fill={FUR_DARK} />
      <ellipse cx="160" cy="190" rx="26" ry="25" fill={FUR_DARK} />
      {/* cuerpo y panza */}
      <path d="M120 100 C86 100 66 134 66 170 C66 198 86 213 120 213 C154 213 174 198 174 170 C174 134 154 100 120 100 Z" fill={FUR} />
      <path d="M120 128 C102 128 94 150 94 172 C94 196 104 209 120 209 C136 209 146 196 146 172 C146 150 138 128 120 128 Z" fill={FUR_LIGHT} />
      <path d="M152 114 C166 132 174 152 174 172 C173 198 154 213 120 213 C150 204 162 170 152 114 Z" fill="#000" opacity="0.1" />
      {/* patas de atrás */}
      <ellipse cx="80" cy="210" rx="19" ry="7.5" fill={PAW} />
      <ellipse cx="160" cy="210" rx="19" ry="7.5" fill={PAW} />
      <path d="M72 207 v4 M80 206.5 v5 M88 207 v4 M152 207 v4 M160 206.5 v5 M168 207 v4" stroke={FUR_LIGHT} strokeWidth="1.4" strokeLinecap="round" />
      {/* brazos y manitos juntas */}
      <path d="M90 124 C80 136 82 156 98 164 L112 162 C114 152 106 138 100 126 Z" fill={FUR} />
      <path d="M150 124 C160 136 158 156 142 164 L128 162 C126 152 134 138 140 126 Z" fill={FUR} />
      <path d="M150 124 C160 136 158 156 142 164 L136 164 C148 154 152 140 150 124 Z" fill="#000" opacity="0.1" />
      <ellipse cx="109" cy="163" rx="11" ry="7.5" fill={PAW} />
      <ellipse cx="131" cy="163" rx="11" ry="7.5" fill={PAW} />
      <path d="M103 166 v3.5 M109 167 v3.5 M115 166 v3.5 M125 166 v3.5 M131 167 v3.5 M137 166 v3.5" stroke={FUR_LIGHT} strokeWidth="1.3" strokeLinecap="round" />
      {/* orejas de borde blanco */}
      <path d="M72 70 C64 50 70 32 86 28 C98 30 106 42 106 54 Z" fill={WHITE} />
      <path d="M168 70 C176 50 170 32 154 28 C142 30 134 42 134 54 Z" fill={WHITE} />
      <path d="M78 62 C73 48 77 37 87 34 C95 36 100 44 100 52 Z" fill={FUR_DARK} />
      <path d="M162 62 C167 48 163 37 153 34 C145 36 140 44 140 52 Z" fill={FUR_DARK} />
      {/* cabeza ancha, con las mejillas peludas */}
      <path d="M120 42 C92 42 72 58 66 80 L56 92 L68 96 L62 106 C76 116 98 122 120 128 C142 122 164 116 178 106 L172 96 L184 92 L174 80 C168 58 148 42 120 42 Z" fill={FUR} />
      <ellipse cx="104" cy="54" rx="22" ry="8" fill="#fff" opacity="0.16" />
      <path d="M154 54 C168 66 174 80 174 80 L184 92 L172 96 L178 106 C168 114 152 120 136 124 C164 108 168 80 154 54 Z" fill="#000" opacity="0.08" />
      {/* cejas blancas, antifaz negro y la raya de la frente */}
      <path d="M78 78 C84 64 100 60 112 68 C102 68 92 72 84 82 Z M162 78 C156 64 140 60 128 68 C138 68 148 72 156 82 Z" fill={WHITE} />
      <path d="M114 50 C116 60 116 72 120 84 C124 72 124 60 126 50 C122 48 118 48 114 50 Z" fill={FUR_DARK} />
      <path d="M70 88 C76 76 94 72 108 78 C114 81 117 84 120 84 C123 84 126 81 132 78 C146 72 164 76 170 88 C168 100 156 106 142 104 C132 102 126 98 120 98 C114 98 108 102 98 104 C84 106 72 100 70 88 Z" fill={MASK} />
      {/* hocico blanco */}
      <path d="M96 104 C104 99 112 99 120 101 C128 99 136 99 144 104 C144 116 134 125 120 127 C106 125 96 116 96 104 Z" fill={WHITE} />
      <path d="M111 101 h18 q3 0 1 3 l-7 7 q-3 3 -6 0 l-7 -7 q-2 -3 1 -3 z" fill={INK} />
      <ellipse cx="116" cy="103" rx="3.5" ry="1.3" fill="#fff" opacity="0.3" />
      <path d="M120 112 v4 M120 116 q-5 5 -10 1.5 M120 116 q5 5 10 1.5" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M100 110 l-24 -3 M100 114 l-24 4 M140 110 l24 -3 M140 114 l24 4" stroke={WHITE} strokeWidth="1.3" strokeLinecap="round" />
      {/* ojos dentro del antifaz */}
      <circle cx="98" cy="88" r="6.2" fill="#7a5238" />
      <circle cx="142" cy="88" r="6.2" fill="#7a5238" />
      <circle cx="98" cy="88" r="4" fill={INK} />
      <circle cx="142" cy="88" r="4" fill={INK} />
      <circle cx="100.3" cy="85.6" r="2" fill="#fff" />
      <circle cx="144.3" cy="85.6" r="2" fill="#fff" />
    </>
  ),
};
export default art;
