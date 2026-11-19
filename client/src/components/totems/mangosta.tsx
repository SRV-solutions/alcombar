import { INK, type TotemArt } from './types';

/** Mangosta: de perfil, en cuatro patas y alerta. Cuerpo largo y bajo, pelaje pardo jaspeado, hocico en punta, orejas chicas y cola larga que se afina. */
const FUR = '#9c8262';
const FUR_DARK = '#7b634a';
const FUR_LIGHT = '#bba383';
const FLECK = '#e0d0b2';
const FLECK_DARK = '#5d4836';
const LEG = '#5f4a38';

const art: TotemArt = {
  bg: '#e0e8f5',
  face: [3, 56, 88],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      <g transform="translate(0 -8)">
        <ellipse cx="122" cy="198" rx="96" ry="8" fill="#000" opacity="0.12" />
        {/* cola larga, que se afina y oscurece en la punta */}
        <path d="M182 166 C202 162 220 150 228 128 C234 110 232 88 224 72 C218 86 216 106 210 120 C204 132 194 138 182 140 Z" fill={FUR} />
        <path d="M231 104 C232 92 229 81 224 72 C219 84 217 98 214 110 C220 108 226 106 231 104 Z" fill={FUR_DARK} />
        <path d="M224 72 C228 79 230 86 231 92 C226 90 222 88 219 86 C220 81 222 76 224 72 Z" fill={FLECK_DARK} />
        <path d="M182 166 C202 162 220 150 228 128 C230 120 231 112 231 104 C224 132 206 152 182 158 Z" fill="#000" opacity="0.1" />
        {/* patas del otro lado */}
        <path d="M80 160 L78 192 C78 197 88 197 89 192 L92 162 Z" fill="#4c3b2d" />
        <path d="M154 160 L156 192 C156 197 166 197 166 192 L168 160 Z" fill="#4c3b2d" />
        {/* cuerpo largo y bajo */}
        <path d="M50 146 C54 130 78 124 106 124 C136 124 164 126 182 136 C196 144 196 162 182 168 C164 176 132 174 106 174 C78 174 58 168 52 158 Z" fill={FUR} />
        <path d="M64 166 C84 174 140 176 176 168 C158 178 96 180 64 166 Z" fill={FUR_LIGHT} />
        <ellipse cx="124" cy="130" rx="48" ry="4" fill="#fff" opacity="0.14" />
        {/* patas de este lado */}
        <path d="M60 156 C58 170 60 182 60 192 C60 197 72 197 72 192 L76 160 Z" fill={LEG} />
        <path d="M164 138 C182 136 194 150 190 164 C188 170 186 174 184 178 L170 178 C162 170 156 148 164 138 Z" fill={FUR_DARK} />
        <path d="M170 172 L170 192 C170 197 182 197 182 192 L185 172 Z" fill={LEG} />
        <ellipse cx="62" cy="195" rx="8" ry="3.6" fill={LEG} />
        <ellipse cx="172" cy="195" rx="8" ry="3.6" fill={LEG} />
        {/* pelaje jaspeado */}
        <path d="M100 132 l2.8 -1.1 M129 141 l2.7 -0.6 M114 159 l2.7 -1.1 M73 135 l2.7 -0.8 M173 138 l3.4 -0.9 M81 149 l3.7 -0.5 M143 141 l2.6 -0.9 M99 149 l2.3 -1.3 M164 154 l2.6 -1.8 M89 149 l2.8 -0.9 M155 138 l3 -0.7 M120 153 l3 -2.2 M64 157 l2.3 -1.8 M175 158 l2.2 -1.6 M84 132 l2.8 -0.5 M90 140 l2.9 -2 M76 159 l2.3 -1.7 M73 144 l3 -1.8 M134 154 l3.6 -0.6 M85 164 l2.8 -1 M122 127 l2.7 -0.7 M143 154 l3.1 -2.1 M163 163 l2.6 -1.4 M176 148 l2.8 -0.3 M160 130 l2.9 -0.5 M92 129 l2.5 -1.3 M105 163 l3.2 -0.6 M164 138 l2.7 -2.2 M197 146 l3 -0.3 M214 127 l2.6 -1.6 M221 120 l2.7 -1.4 M206 141 l3 -1" stroke={FLECK} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M145 129 l3.1 -0.8 M64 146 l2.4 -1.9 M141 164 l2.8 -1.5 M98 159 l2.8 -1.4 M130 129 l3.1 -1.4 M118 138 l3.7 -0.4 M127 161 l2.8 -2.1 M151 150 l2.5 -1.8 M186 154 l2.7 -0.6 M109 142 l2.7 -1.8 M186 144 l2.7 -1.3 M151 161 l2.7 -0.3 M64 137 l3.4 -1.5 M168 146 l3.2 -1.4 M99 140 l2.9 -2.1 M109 127 l2.7 -1.6 M107 153 l2.9 -2 M158 146 l3.2 -1.5 M189 151 l3.5 -1.2 M210 134 l3.5 -0.6 M218 112 l2.4 -1.2" stroke={FLECK_DARK} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        {/* cuello */}
        <path d="M58 106 C72 100 90 106 100 122 L98 152 C84 160 62 160 50 152 C44 140 46 120 58 106 Z" fill={FUR} />
        <path d="M60 130 l2.6 -1 M74 122 l2.6 -1 M80 138 l2.6 -1 M66 146 l2.6 -1" stroke={FLECK} strokeWidth="1.8" strokeLinecap="round" />
        {/* oreja */}
        <path d="M66 86 C64 76 76 72 80 80 C79 86 72 88 66 86 Z" fill={FUR_DARK} />
        <path d="M69 84 C68 79 74 77 76 81 C75 84 72 85 69 84 Z" fill="#caa98a" />
        {/* cabeza con el hocico en punta */}
        <path d="M88 108 C88 90 74 80 58 80 C45 80 35 87 27 96 C21 103 15 107 10 110 C7 112 8 117 12 118 C22 121 32 123 42 127 C55 133 72 133 81 125 C86 120 88 114 88 108 Z" fill={FUR} />
        <path d="M12 118 C22 121 32 123 42 127 C55 133 68 133 77 127 C62 127 47 125 36 121 C28 119 20 118 12 118 Z" fill={FUR_LIGHT} />
        <ellipse cx="60" cy="87" rx="13" ry="4.5" fill="#fff" opacity="0.16" />
        <path d="M84 96 C90 108 86 122 76 128 C70 131 62 132 56 131 C72 124 82 112 84 96 Z" fill="#000" opacity="0.08" />
        <path d="M72 94 l2.6 -1 M66 110 l2.6 -1 M78 108 l2.6 -1 M58 120 l2.6 -1 M36 104 l2.4 -1" stroke={FLECK} strokeWidth="1.6" strokeLinecap="round" />
        {/* ojo, nariz y bigotes */}
        <ellipse cx="47" cy="102" rx="7" ry="6.4" fill={FUR_LIGHT} />
        <ellipse cx="47" cy="102" rx="4.5" ry="4.7" fill={INK} />
        <circle cx="48.6" cy="100.2" r="1.6" fill="#fff" />
        <ellipse cx="11.5" cy="113.5" rx="4.4" ry="3.8" fill={INK} />
        <path d="M14 119 q8 3 17 2" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M22 112 l-12 -6 M22 115 l-13 1" stroke={FLECK_DARK} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      </g>
    </>
  ),
};
export default art;
