import { INK, type TotemArt } from './types';

/** Axolote: de frente, sentado en el fondo del agua. Rosado, cabeza ancha con tres branquias plumosas a cada lado, ojitos separados y la sonrisa de oreja a oreja; cola con aleta. */
const PINK = '#f5b5c2';
const PINK_DARK = '#e597a8';
const PINK_LIGHT = '#fbd6dd';
const GILL = '#e2607f';
const GILL_DARK = '#c64767';
const CHEEK = '#f292a8';
const MOUTH = '#8c3b4c';

const art: TotemArt = {
  bg: '#cfeaf2',
  face: [48, 30, 144],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="124" cy="206" rx="74" ry="8" fill="#000" opacity="0.12" />
      {/* burbujas */}
      <circle cx="198" cy="160" r="5" fill="#fff" opacity="0.8" />
      <circle cx="208" cy="146" r="3" fill="#fff" opacity="0.8" />
      <circle cx="122" cy="34" r="4" fill="#fff" opacity="0.8" />
      <circle cx="132" cy="24" r="2.6" fill="#fff" opacity="0.8" />
      <circle cx="34" cy="166" r="3.4" fill="#fff" opacity="0.8" />
      {/* cola con aleta */}
      <path d="M140 200 C176 210 214 198 220 166 C224 146 212 134 200 138 C206 160 190 182 150 182 Z" fill={PINK_LIGHT} />
      <path d="M146 196 C174 202 202 192 208 168 C210 158 206 150 200 150 C198 166 184 180 150 180 Z" fill={PINK} />
      <path d="M150 196 C176 200 200 190 206 170 C200 186 180 194 152 192 Z" fill="#000" opacity="0.08" />
      {/* patas de atrás */}
      <path d="M78 186 C70 192 66 200 70 204 C76 206 90 204 96 198 Z" fill={PINK_DARK} />
      <path d="M162 186 C170 192 174 200 170 204 C164 206 150 204 144 198 Z" fill={PINK_DARK} />
      {/* cuerpo */}
      <ellipse cx="120" cy="164" rx="44" ry="38" fill={PINK} />
      <ellipse cx="120" cy="172" rx="26" ry="24" fill={PINK_LIGHT} />
      <path d="M150 136 C164 150 166 176 152 192 C142 200 130 202 120 202 C146 190 156 164 150 136 Z" fill="#000" opacity="0.08" />
      {/* patas de adelante con sus deditos */}
      <path d="M82 144 C74 152 70 162 70 172 C70 178 76 180 80 176 C84 166 88 158 94 152 Z" fill={PINK_DARK} />
      <path d="M158 144 C166 152 170 162 170 172 C170 178 164 180 160 176 C156 166 152 158 146 152 Z" fill={PINK_DARK} />
      <path d="M70 176 l-4 4 M74 178 l-1 5 M78 177 l2 4 M170 176 l4 4 M166 178 l1 5 M162 177 l-2 4 M70 203 l-4 2 M76 205 l-1 4 M82 205 l2 3 M170 203 l4 2 M164 205 l1 4 M158 205 l-2 3" stroke={PINK_DARK} strokeWidth="2.6" strokeLinecap="round" />
      {/* branquias plumosas */}
      <path d="M57.4 67.6 l2.9 -5.6 M52.9 61.5 l2.9 -5.9 M48.6 55.9 l3 -6.2 M44.3 50.5 l3 -6.5 M40.2 45.4 l3.1 -6.9 M36.1 40.5 l3.1 -7.2 M57.4 67.6 l-6.2 1 M52.9 61.5 l-6.5 1.2 M48.6 55.9 l-6.7 1.4 M44.3 50.5 l-7 1.5 M40.2 45.4 l-7.3 1.7 M36.1 40.5 l-7.6 1.8 M49.6 91.2 l-0.1 -6.3 M43.9 88.4 l0 -6.6 M38.4 85.5 l0.1 -6.9 M32.9 82.7 l0.1 -7.2 M27.6 79.9 l0.1 -7.5 M22.5 77.3 l0.1 -7.8 M49.6 91.2 l-5 3.8 M43.9 88.4 l-5.3 3.9 M38.4 85.5 l-5.6 4 M32.9 82.7 l-5.8 4.2 M27.6 79.9 l-6.1 4.4 M22.5 77.3 l-6.3 4.6 M51.6 113.9 l-3.9 -4.9 M45.9 115.2 l-4.3 -5 M40.4 116.8 l-4.7 -5 M34.9 118.6 l-5.2 -5 M29.6 120.6 l-5.6 -5 M24.5 122.8 l-6.1 -4.9 M51.6 113.9 l-1.6 6.1 M45.9 115.2 l-1.4 6.4 M40.4 116.8 l-1.2 6.8 M34.9 118.6 l-0.9 7.1 M29.6 120.6 l-0.6 7.5 M24.5 122.8 l-0.2 7.8" stroke={GILL} strokeWidth="3" strokeLinecap="round" />
      <path d="M182.6 67.6 l6.2 1 M187.1 61.5 l6.5 1.2 M191.4 55.9 l6.7 1.4 M195.7 50.5 l7 1.5 M199.8 45.4 l7.3 1.7 M203.9 40.5 l7.6 1.8 M182.6 67.6 l-2.9 -5.6 M187.1 61.5 l-2.9 -5.9 M191.4 55.9 l-3 -6.2 M195.7 50.5 l-3 -6.5 M199.8 45.4 l-3.1 -6.9 M203.9 40.5 l-3.1 -7.2 M190.4 91.2 l5 3.8 M196.1 88.4 l5.3 3.9 M201.6 85.5 l5.6 4 M207.1 82.7 l5.8 4.2 M212.4 79.9 l6.1 4.4 M217.5 77.3 l6.3 4.6 M190.4 91.2 l0.1 -6.3 M196.1 88.4 l0 -6.6 M201.6 85.5 l-0.1 -6.9 M207.1 82.7 l-0.1 -7.2 M212.4 79.9 l-0.1 -7.5 M217.5 77.3 l-0.1 -7.8 M188.4 113.9 l1.6 6.1 M194.1 115.2 l1.4 6.4 M199.6 116.8 l1.2 6.8 M205.1 118.6 l0.9 7.1 M210.4 120.6 l0.6 7.5 M215.5 122.8 l0.2 7.8 M188.4 113.9 l3.9 -4.9 M194.1 115.2 l4.3 -5 M199.6 116.8 l4.7 -5 M205.1 118.6 l5.2 -5 M210.4 120.6 l5.6 -5 M215.5 122.8 l6.1 -4.9" stroke={GILL} strokeWidth="3" strokeLinecap="round" />
      <path d="M66 80 C54 62 44 50 34 38 M60 96 C46 90 32 82 20 76 M62 112 C48 114 34 118 22 124 M174 80 C186 62 196 50 206 38 M180 96 C194 90 208 82 220 76 M178 112 C192 114 206 118 218 124" stroke={GILL_DARK} strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* cabeza ancha */}
      <ellipse cx="120" cy="100" rx="64" ry="46" fill={PINK} />
      <ellipse cx="96" cy="72" rx="26" ry="10" fill="#fff" opacity="0.2" transform="rotate(-12 96 72)" />
      <path d="M170 74 C184 92 186 116 170 132 C156 144 136 146 120 146 C150 136 172 112 170 74 Z" fill="#000" opacity="0.08" />
      {/* cachetes */}
      <ellipse cx="80" cy="116" rx="10" ry="6" fill={CHEEK} />
      <ellipse cx="160" cy="116" rx="10" ry="6" fill={CHEEK} />
      {/* ojos */}
      <circle cx="90" cy="96" r="6.4" fill={INK} />
      <circle cx="150" cy="96" r="6.4" fill={INK} />
      <circle cx="92.2" cy="93.6" r="2.2" fill="#fff" />
      <circle cx="152.2" cy="93.6" r="2.2" fill="#fff" />
      {/* sonrisa */}
      <path d="M90 114 C104 128 136 128 150 114" stroke={MOUTH} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M112 102 h1 M127 102 h1" stroke={MOUTH} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
};
export default art;
