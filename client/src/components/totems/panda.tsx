import { INK, type TotemArt } from './types';

/** Oso panda: sentado de frente con una caña de bambú. Blanco con orejas, manchas de los ojos, patas y faja de los hombros negras. */
const WHITE = '#f7f5f0';
const BLACK = '#363030';
const BLACK_LIGHT = '#4d4545';
const PAD = '#6b5f5d';
const BAMBOO = '#86b553';
const BAMBOO_DARK = '#62913a';
const LEAF = '#9ccc66';
const LEAF_DARK = '#6fa043';

const art: TotemArt = {
  bg: '#f8dfe0',
  face: [56, 16, 128],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="120" cy="216" rx="90" ry="9" fill="#000" opacity="0.12" />
      {/* cuerpo blanco y faja negra de los hombros */}
      <path d="M120 92 C80 92 54 128 54 166 C54 198 82 214 120 214 C158 214 186 198 186 166 C186 128 160 92 120 92 Z" fill={WHITE} />
      <path d="M56 152 C58 118 84 98 120 98 C156 98 182 118 184 152 C172 140 150 132 120 132 C90 132 68 140 56 152 Z" fill={BLACK} />
      <path d="M170 140 C184 154 188 170 184 184 C178 204 156 214 120 214 C160 200 176 176 170 140 Z" fill="#000" opacity="0.07" />
      {/* brazo derecho, apoyado */}
      <path d="M156 116 C168 134 168 168 154 192 C148 202 132 202 130 192 C130 172 136 146 140 124 Z" fill={BLACK} />
      <ellipse cx="142" cy="196" rx="13" ry="9" fill={BLACK_LIGHT} />
      {/* caña de bambú */}
      <g transform="rotate(36.4 142 138)">
        <rect x="136" y="44" width="12" height="188" rx="6" fill={BAMBOO} />
        <rect x="138.5" y="50" width="3" height="176" rx="1.5" fill="#fff" opacity="0.25" />
        <path d="M134 82 h16 M134 122 h16 M134 162 h16 M134 202 h16" stroke={BAMBOO_DARK} strokeWidth="3.4" strokeLinecap="round" />
      </g>
      {/* hojas de bambú */}
      <path d="M184 82 C196 72 212 70 226 74 C214 84 198 88 184 82 Z" fill={LEAF} />
      <path d="M184 84 C198 86 212 94 220 106 C206 104 192 96 184 84 Z" fill={LEAF_DARK} />
      <path d="M198 62 C200 48 208 36 220 30 C220 44 210 56 198 62 Z" fill={LEAF} />
      <path d="M186 82 C198 78 210 76 222 75 M186 85 C198 90 208 96 216 103 M199 60 C204 50 210 41 218 33" stroke={BAMBOO_DARK} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.6" />
      {/* brazo izquierdo, sosteniendo la caña */}
      <path d="M82 116 C70 134 70 162 86 178 C94 186 108 186 116 180 C122 174 120 166 112 164 C104 160 100 146 100 124 Z" fill={BLACK} />
      <ellipse cx="114" cy="175" rx="11" ry="9" fill={BLACK} transform="rotate(-30 114 175)" />
      <ellipse cx="110" cy="171" rx="5" ry="2.4" fill="#fff" opacity="0.14" transform="rotate(-30 110 171)" />
      {/* patas traseras negras, con las plantas */}
      <ellipse cx="70" cy="198" rx="25" ry="21" fill={BLACK} transform="rotate(-14 70 198)" />
      <ellipse cx="170" cy="198" rx="25" ry="21" fill={BLACK} transform="rotate(14 170 198)" />
      <ellipse cx="71" cy="204" rx="12.5" ry="10" fill={PAD} />
      <ellipse cx="169" cy="204" rx="12.5" ry="10" fill={PAD} />
      <circle cx="57" cy="193" r="4" fill={PAD} />
      <circle cx="63" cy="186" r="4.2" fill={PAD} />
      <circle cx="72" cy="183.5" r="4.2" fill={PAD} />
      <circle cx="81" cy="186.5" r="4" fill={PAD} />
      <circle cx="183" cy="193" r="4" fill={PAD} />
      <circle cx="177" cy="186" r="4.2" fill={PAD} />
      <circle cx="168" cy="183.5" r="4.2" fill={PAD} />
      <circle cx="159" cy="186.5" r="4" fill={PAD} />
      {/* orejas negras */}
      <circle cx="78" cy="41" r="18" fill={BLACK} />
      <circle cx="162" cy="41" r="18" fill={BLACK} />
      <circle cx="74" cy="36" r="6" fill="#fff" opacity="0.12" />
      {/* cabeza */}
      <ellipse cx="120" cy="78" rx="52" ry="44" fill={WHITE} />
      <path d="M152 44 C170 56 176 76 172 92 C170 100 166 106 160 112 C166 90 164 64 152 44 Z" fill="#000" opacity="0.04" />
      <path d="M152 44 C170 56 176 76 172 92 C166 110 152 120 134 122 C158 108 164 76 152 44 Z" fill="#000" opacity="0.06" />
      {/* manchas de los ojos */}
      <ellipse cx="98" cy="80" rx="12" ry="15" fill={BLACK} transform="rotate(34 98 80)" />
      <ellipse cx="142" cy="80" rx="12" ry="15" fill={BLACK} transform="rotate(-34 142 80)" />
      <circle cx="100" cy="77" r="5" fill="#fff" />
      <circle cx="140" cy="77" r="5" fill="#fff" />
      <circle cx="100.6" cy="77.6" r="3.4" fill={INK} />
      <circle cx="139.4" cy="77.6" r="3.4" fill={INK} />
      <circle cx="101.8" cy="76" r="1.3" fill="#fff" />
      <circle cx="140.6" cy="76" r="1.3" fill="#fff" />
      {/* hocico y cachetes */}
      <ellipse cx="120" cy="101" rx="21" ry="14" fill="#fff" />
      <ellipse cx="84" cy="102" rx="6.5" ry="3.6" fill="#f2a9ad" opacity="0.5" />
      <ellipse cx="156" cy="102" rx="6.5" ry="3.6" fill="#f2a9ad" opacity="0.5" />
      <path d="M111 92 h18 q3 0 1.5 3.5 l-6.5 6 q-4 3.5 -8 0 l-6.5 -6 q-1.5 -3.5 1.5 -3.5 z" fill={INK} />
      <path d="M120 102 v4 M120 106 q-6 6 -12 1 M120 106 q6 6 12 1" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </>
  ),
};
export default art;
