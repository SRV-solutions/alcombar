import { INK, type TotemArt } from './types';

/** Hormiga: de costado, caminando con una hojita entre las mandíbulas. Cabeza, tórax y abdomen; seis patas; antenas acodadas. */
const ANT = '#b4472c';
const ANT_DARK = '#8d3420';
const ANT_LIGHT = '#d2694a';
const LEG = '#7a2c1b';
const LEG_FAR = '#5a2015';
const LEAF = '#6cab4f';
const LEAF_DARK = '#558f3c';
const VEIN = '#c9e6a6';

const art: TotemArt = {
  bg: '#f5ebc4',
  face: [6, 60, 116],
  art: (
    <>
      <circle cx="120" cy="122" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="130" cy="205" rx="86" ry="7" fill="#000" opacity="0.12" />
      {/* hojita */}
      <path d="M32 144 C22 102 68 52 128 40 C122 86 90 134 32 144 Z" fill={LEAF} />
      <path d="M128 40 C122 86 90 134 32 144 C78 122 106 92 128 40 Z" fill={LEAF_DARK} />
      <path d="M36 140 C62 114 96 76 124 44 M68 106 l-14 -10 M86 86 l-12 -13 M103 66 l-8 -12 M78 96 l14 2 M96 76 l14 0" stroke={VEIN} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* patas del lado lejano */}
      <path d="M102 148 L94 170 L90 201 l-6 1 M118 151 L136 172 L138 201 l-6 1 M134 150 L172 168 L188 201 l-6 1" stroke={LEG_FAR} strokeWidth="4.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* abdomen */}
      <ellipse cx="184" cy="148" rx="42" ry="33" fill={ANT} transform="rotate(14 184 148)" />
      <path d="M222 140 C224 166 206 183 180 181 C166 179 154 173 149 162 C174 175 208 168 222 140 Z" fill="#000" opacity="0.12" />
      <path d="M166 120 q-9 27 2 55 M187 117 q-7 31 3 62" stroke={ANT_DARK} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.55" />
      <ellipse cx="176" cy="128" rx="18" ry="7.5" fill="#fff" opacity="0.18" transform="rotate(-8 176 128)" />
      {/* cintura */}
      <ellipse cx="143" cy="146" rx="8" ry="10" fill={ANT_DARK} />
      {/* tórax */}
      <path d="M90 144 C90 128 104 120 117 125 C128 121 140 130 140 141 C140 153 126 157 113 155 C100 155 90 153 90 144 Z" fill={ANT} />
      <path d="M138 136 C142 150 130 158 114 156 C102 156 94 152 92 146 C106 152 128 152 138 136 Z" fill="#000" opacity="0.12" />
      <ellipse cx="110" cy="130" rx="10" ry="4" fill="#fff" opacity="0.2" />
      {/* patas del lado cercano */}
      <path d="M98 152 L84 173 L76 202 l-6 1 M112 155 L121 179 L113 203 l-6 1 M128 153 L157 173 L163 203 l-6 1" stroke={LEG} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* antenas acodadas */}
      <path d="M64 92 L60 66 L38 58 M50 96 L36 74 L16 86" stroke={ANT_DARK} strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="37" cy="58" rx="4.5" ry="3.5" fill={ANT_DARK} />
      <ellipse cx="16" cy="87" rx="4.5" ry="3.5" fill={ANT_DARK} />
      {/* cabeza */}
      <circle cx="64" cy="122" r="35" fill={ANT} />
      <path d="M92 101 C103 120 97 145 78 153 C68 157 55 157 46 152 C70 148 92 132 92 101 Z" fill="#000" opacity="0.1" />
      <ellipse cx="52" cy="101" rx="15" ry="7" fill={ANT_LIGHT} />
      {/* mandíbulas que agarran la hoja */}
      <path d="M46 144 C38 140 30 142 28 150 C34 148 38 150 42 153 Z" fill={ANT_DARK} />
      <path d="M50 148 C44 148 38 152 38 158 C42 155 46 155 50 157 Z" fill={ANT_DARK} />
      {/* cara */}
      <ellipse cx="42" cy="131" rx="5.5" ry="3.6" fill="#ef8f7e" opacity="0.5" />
      <ellipse cx="84" cy="128" rx="5.5" ry="3.6" fill="#ef8f7e" opacity="0.5" />
      <ellipse cx="50" cy="116" rx="6" ry="7.5" fill={INK} />
      <ellipse cx="74" cy="114" rx="6" ry="7.5" fill={INK} />
      <circle cx="52.3" cy="112.8" r="2.2" fill="#fff" />
      <circle cx="76.3" cy="110.8" r="2.2" fill="#fff" />
      <path d="M56 131 q6 5 12 0" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
