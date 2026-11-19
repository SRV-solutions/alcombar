import { INK, type TotemArt } from './types';

/** Puma: sentado, de frente. Pelaje leonado, hocico claro con las dos marcas oscuras, cola larga de punta negra. */
const FUR = '#c58e56';
const FUR_DARK = '#b07a46';
const CREAM = '#f6e9d6';
const MARK = '#5a3a28';

const art: TotemArt = {
  bg: '#f2ddb6',
  face: [58, 6, 124],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="120" cy="219" rx="70" ry="9" fill="#000" opacity="0.12" />
      {/* cola */}
      <path d="M158 198 C196 204 218 178 206 148 C202 138 190 140 192 152 C198 172 184 186 158 182 Z" fill={FUR_DARK} />
      <path d="M206 148 C202 138 190 140 192 152 C195 161 204 158 206 148 Z" fill={MARK} />
      {/* ancas */}
      <ellipse cx="78" cy="188" rx="25" ry="27" fill={FUR_DARK} />
      <ellipse cx="162" cy="188" rx="25" ry="27" fill={FUR_DARK} />
      {/* cuerpo y pecho */}
      <path d="M120 98 C84 98 64 134 66 172 C67 198 84 213 120 213 C156 213 173 198 174 172 C176 134 156 98 120 98 Z" fill={FUR} />
      <path d="M120 116 C102 116 93 142 93 168 C93 194 104 209 120 209 C136 209 147 194 147 168 C147 142 138 116 120 116 Z" fill={CREAM} />
      <path d="M152 112 C166 130 176 152 174 172 C173 198 156 213 120 213 C150 204 162 170 152 112 Z" fill="#000" opacity="0.08" />
      {/* patas traseras */}
      <ellipse cx="76" cy="210" rx="20" ry="8.5" fill="#d6a06a" />
      <ellipse cx="164" cy="210" rx="20" ry="8.5" fill="#d6a06a" />
      {/* patas delanteras */}
      <path d="M96 150 C91 152 90 158 90 164 L93 206 C93 213 113 213 113 206 L114 164 C114 156 110 150 104 150 Z" fill={FUR} />
      <path d="M144 150 C149 152 150 158 150 164 L147 206 C147 213 127 213 127 206 L126 164 C126 156 130 150 136 150 Z" fill={FUR} />
      <ellipse cx="103" cy="208" rx="12" ry="6.5" fill={CREAM} />
      <ellipse cx="137" cy="208" rx="12" ry="6.5" fill={CREAM} />
      <path d="M99 205 v5 M107 205 v5 M133 205 v5 M141 205 v5" stroke={FUR_DARK} strokeWidth="1.6" strokeLinecap="round" />
      {/* orejas */}
      <path d="M68 66 C60 38 68 18 82 12 C98 18 110 34 112 48 Z" fill={FUR} />
      <path d="M172 66 C180 38 172 18 158 12 C142 18 130 34 128 48 Z" fill={FUR} />
      <path d="M77 54 C73 39 77 28 84 23 C93 28 100 37 102 46 Z" fill={MARK} />
      <path d="M163 54 C167 39 163 28 156 23 C147 28 140 37 138 46 Z" fill={MARK} />
      {/* cabeza */}
      <ellipse cx="120" cy="80" rx="54" ry="46" fill={FUR} />
      <ellipse cx="102" cy="56" rx="28" ry="13" fill="#fff" opacity="0.14" />
      <path d="M150 44 C168 56 176 76 172 92 C166 110 150 122 132 125 C156 110 164 78 150 44 Z" fill="#000" opacity="0.07" />
      {/* hocico */}
      <ellipse cx="120" cy="101" rx="27" ry="19" fill={CREAM} />
      <path d="M100 98 C97 87 103 80 111 82 C109 88 107 95 105 102 Z" fill={MARK} />
      <path d="M140 98 C143 87 137 80 129 82 C131 88 133 95 135 102 Z" fill={MARK} />
      <path d="M110 87 h20 q3 0 1 3.5 l-8 9 q-3 3 -6 0 l-8 -9 q-2 -3.5 1 -3.5 z" fill="#7a4a3a" />
      <path d="M120 101 v6 M120 107 q-6 7 -14 2 M120 107 q6 7 14 2" stroke="#7a4a3a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M95 101 l-30 -7 M95 106 l-30 4 M145 101 l30 -7 M145 106 l30 4" stroke="#fff8ec" strokeWidth="1.5" strokeLinecap="round" />
      {/* ojos */}
      <ellipse cx="97" cy="72" rx="9" ry="7.5" fill="#e9c46a" />
      <ellipse cx="143" cy="72" rx="9" ry="7.5" fill="#e9c46a" />
      <ellipse cx="97" cy="72" rx="3.6" ry="6.4" fill={INK} />
      <ellipse cx="143" cy="72" rx="3.6" ry="6.4" fill={INK} />
      <circle cx="99.5" cy="69" r="1.9" fill="#fff" />
      <circle cx="145.5" cy="69" r="1.9" fill="#fff" />
      <path d="M86 70 q11 -10 22 0" stroke={MARK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M132 70 q11 -10 22 0" stroke={MARK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
