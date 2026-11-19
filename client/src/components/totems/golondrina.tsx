import { INK, type TotemArt } from './types';

/** Golondrina: en vuelo, con las alas hacia atrás. Lomo azul oscuro, frente y garganta rojizas, vientre claro, cola ahorquillada. */
const NAVY = '#2a3f6e';
const NAVY_DARK = '#1d2c50';
const NAVY_LIGHT = '#4766a0';
const RUFOUS = '#c9572f';
const CREAM = '#f6ead6';
const CREAM_SHADE = '#e5d4b8';

const art: TotemArt = {
  bg: '#d2e8f6',
  face: [30, 58, 88],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      {/* nubes */}
      <path d="M150 196 C150 188 158 184 164 188 C166 180 178 178 182 186 C190 184 196 190 192 196 Z" fill="#fff" opacity="0.8" />
      <path d="M22 178 C22 172 28 168 34 172 C36 166 46 166 48 172 C54 172 56 178 52 180 Z" fill="#fff" opacity="0.7" />
      <path d="M26 48 C26 43 31 40 36 43 C38 38 46 38 48 43 C53 43 55 48 51 50 Z" fill="#fff" opacity="0.7" />
      {/* ala de atrás, hacia arriba */}
      <path d="M98 100 C114 70 150 40 206 20 C182 42 156 70 132 106 Z" fill={NAVY_DARK} />
      <path d="M100 102 C114 80 134 62 158 50 C142 66 128 84 118 104 Z" fill={NAVY} />
      <path d="M106 94 C124 70 152 46 192 28" stroke={NAVY_LIGHT} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* cola ahorquillada */}
      <path d="M148 114 C174 110 200 104 226 96 C210 108 192 118 178 124 C194 130 210 140 222 154 C198 144 172 136 148 132 Z" fill={NAVY_DARK} />
      <path d="M148 124 L178 124 L148 132 Z" fill="#000" opacity="0.15" />
      <ellipse cx="190" cy="114" rx="3" ry="1.8" fill="#fff" transform="rotate(-18 190 114)" />
      <ellipse cx="190" cy="136" rx="3" ry="1.8" fill="#fff" transform="rotate(22 190 136)" />
      {/* cuerpo */}
      <path d="M56 104 C60 86 84 82 108 90 C130 96 150 106 164 120 C150 132 124 138 100 134 C76 130 56 122 56 104 Z" fill={NAVY} />
      <path d="M74 120 C90 128 112 132 134 132 C148 132 158 126 164 120 C152 136 126 142 102 138 C88 136 78 130 74 120 Z" fill={CREAM_SHADE} />
      <path d="M76 116 C92 124 114 128 134 127 C148 126 158 123 164 120 C150 132 124 136 102 133 C90 131 80 125 76 116 Z" fill={CREAM} />
      <path d="M84 88 C100 86 120 92 136 100 C120 96 100 94 86 96 Z" fill={NAVY_LIGHT} opacity="0.6" />
      <path d="M86 122 C80 120 76 116 74 112 L82 112 C84 116 88 120 92 122 Z" fill={NAVY_DARK} />
      {/* ala de adelante, hacia abajo */}
      <path d="M100 110 C116 140 146 176 192 204 C164 192 140 168 126 122 Z" fill={NAVY} />
      <path d="M102 112 C116 136 140 164 172 188 C150 168 132 146 120 118 Z" fill={NAVY_LIGHT} opacity="0.7" />
      <path d="M126 122 C136 160 160 186 192 204 C168 194 148 174 136 146 Z" fill="#000" opacity="0.14" />
      {/* cabeza */}
      <circle cx="72" cy="100" r="24" fill={NAVY} />
      <ellipse cx="66" cy="86" rx="11" ry="5" fill="#fff" opacity="0.15" />
      <path d="M50 92 C51 85 56 80 63 79 C61 85 57 90 53 95 Z" fill={RUFOUS} />
      <path d="M48 100 C50 112 58 121 72 125 C79 127 86 125 90 121 C78 118 68 113 63 104 C59 98 53 96 48 100 Z" fill={RUFOUS} />
      {/* pico */}
      <path d="M50 96 L38 100 L50 103 Z" fill={INK} />
      {/* ojo */}
      <circle cx="64" cy="95" r="6.4" fill={NAVY_LIGHT} />
      <circle cx="64" cy="95" r="4.4" fill={INK} />
      <circle cx="65.6" cy="93.4" r="1.6" fill="#fff" />
    </>
  ),
};
export default art;
