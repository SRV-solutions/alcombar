import { INK, type TotemArt } from './types';

/** Abeja: en vuelo, de costado con la cara hacia nosotros. Abdomen con rayas amarillas y negras, tórax peludo, alas translúcidas. */
const YELLOW = '#f5c331';
const YELLOW_LIGHT = '#fbdc72';
const STRIPE = '#3b2a22';
const FUZZ = '#c98a2e';
const FUZZ_DARK = '#a96f20';
const WING = '#ffffff';
const VEIN = '#9cbfd8';

const art: TotemArt = {
  bg: '#e2dcf4',
  face: [10, 60, 112],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      {/* ala de atrás */}
      <ellipse cx="172" cy="98" rx="16" ry="32" fill={WING} opacity="0.55" transform="rotate(58 172 98)" />
      <path d="M150 112 q20 -6 44 -22" stroke={VEIN} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* abdomen con rayas */}
      <g transform="translate(156 156) rotate(20)">
        <path d="M50 -4 L63 2 L50 7 Z" fill={STRIPE} />
        <ellipse cx="0" cy="0" rx="52" ry="41" fill={YELLOW} />
        <path d="M-16 -39 Q-8 0 -16 39 A52 41 0 0 0 0 41 Q8 0 0 -41 A52 41 0 0 0 -16 -39 Z" fill={STRIPE} />
        <path d="M16 -39 Q24 0 16 39 A52 41 0 0 0 32 32.3 Q40 0 32 -32.3 A52 41 0 0 0 16 -39 Z" fill={STRIPE} />
        <path d="M42 -24.2 Q48 0 42 24.2 A52 41 0 0 0 42 -24.2 Z" fill={STRIPE} />
        <path d="M-44 22 A52 41 0 0 0 50 11 C40 26 0 36 -44 22 Z" fill="#000" opacity="0.12" />
        <ellipse cx="-12" cy="-25" rx="22" ry="8" fill="#fff" opacity="0.2" />
      </g>
      {/* patitas colgando */}
      <path d="M104 166 q-9 13 -4 26 l-4 3 M118 170 q-2 13 6 23 l-1 4 M134 168 q8 11 17 18 l3 3" stroke={STRIPE} strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* tórax peludo */}
      <path d="M143.9 146.8 Q144.9 153.7 139.9 158.6 Q137.8 165.3 131.2 167.5 Q126.4 172.7 119.5 171.8 Q113 174.3 107.1 170.5 Q100.1 170 96.4 164 Q90.4 160.5 89.7 153.6 Q85.7 147.8 88.1 141.2 Q87.1 134.3 92.1 129.4 Q94.2 122.7 100.8 120.5 Q105.6 115.3 112.5 116.2 Q119 113.7 124.9 117.5 Q131.9 118 135.6 124 Q141.6 127.5 142.3 134.4 Q146.3 140.2 143.9 146.8 Z" fill={FUZZ} />
      <path d="M140 132 C148 146 142 164 126 170 C112 174 100 168 94 160 C110 166 132 160 140 132 Z" fill={FUZZ_DARK} />
      <ellipse cx="108" cy="130" rx="12" ry="6" fill="#fff" opacity="0.18" />
      {/* ala de adelante */}
      <ellipse cx="142" cy="80" rx="21" ry="42" fill={WING} opacity="0.62" transform="rotate(28 142 80)" />
      <ellipse cx="136" cy="72" rx="7" ry="22" fill="#fff" opacity="0.5" transform="rotate(28 136 72)" />
      <path d="M124 114 q18 -30 36 -66 M134 108 q14 -20 32 -38" stroke={VEIN} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* antenas */}
      <path d="M54 92 C50 76 42 66 34 60 M74 90 C76 74 80 64 86 56" stroke={STRIPE} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="33" cy="58" r="5" fill={STRIPE} />
      <circle cx="87" cy="54" r="5" fill={STRIPE} />
      {/* cabeza */}
      <circle cx="64" cy="126" r="40" fill={YELLOW} />
      <path d="M96 102 C108 120 104 148 86 160 C74 167 58 168 46 162 C70 160 96 140 96 102 Z" fill="#000" opacity="0.08" />
      <ellipse cx="50" cy="104" rx="17" ry="8" fill={YELLOW_LIGHT} />
      {/* cara */}
      <ellipse cx="40" cy="140" rx="7.5" ry="4.5" fill="#ef8f7e" opacity="0.55" />
      <ellipse cx="90" cy="140" rx="7.5" ry="4.5" fill="#ef8f7e" opacity="0.55" />
      <ellipse cx="51" cy="123" rx="6.5" ry="8" fill={INK} />
      <ellipse cx="80" cy="123" rx="6.5" ry="8" fill={INK} />
      <circle cx="53.5" cy="119.5" r="2.4" fill="#fff" />
      <circle cx="82.5" cy="119.5" r="2.4" fill="#fff" />
      <path d="M58 140 q7.5 7 15 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
