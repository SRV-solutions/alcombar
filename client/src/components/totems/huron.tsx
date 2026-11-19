import { INK, type TotemArt } from './types';

/** Hurón: cuerpo largo de perfil con el lomo arqueado y la cara hacia nosotros. Cara clara con antifaz oscuro, orejas chicas de borde blanco, patas y cola oscuras. */
const BODY = '#dcc29c';
const BACK = '#a57e5c';
const SABLE = '#7a5844';
const SABLE_DARK = '#5e4232';
const FACE = '#f8f2e6';
const MASK = '#6e4b3a';
const NOSE = '#e9a3a3';

const art: TotemArt = {
  bg: '#efdcec',
  face: [22, 52, 80],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      <g transform="translate(0 -10)">
        <ellipse cx="128" cy="200" rx="94" ry="8" fill="#000" opacity="0.12" />
        {/* cola */}
        <path d="M192 144 C206 140 218 130 224 116 C226 110 232 110 232 118 C230 136 216 154 196 162 Z" fill={SABLE} />
        <path d="M232 118 C230 136 216 154 196 162 L195 156 C212 150 224 136 232 118 Z" fill="#000" opacity="0.12" />
        {/* patas del otro lado */}
        <path d="M86 156 L84 194 C84 199 94 199 95 194 L98 158 Z" fill={SABLE_DARK} />
        <path d="M168 156 L170 194 C170 199 180 199 180 194 L182 158 Z" fill={SABLE_DARK} />
        {/* cuerpo largo, con el lomo arqueado */}
        <path d="M64 144 C66 120 88 104 116 100 C144 96 172 104 190 122 C202 134 204 156 192 166 C180 174 164 170 156 162 C140 150 116 150 100 160 C90 166 66 168 64 144 Z" fill={BODY} />
        <path d="M70 128 C80 108 104 100 124 98 C150 96 176 104 192 122 C198 130 200 138 200 146 C186 132 170 120 148 116 C122 112 94 116 70 128 Z" fill={BACK} />
        <ellipse cx="128" cy="103" rx="30" ry="3.5" fill="#fff" opacity="0.16" />
        {/* patas de este lado */}
        <path d="M70 150 C68 166 70 182 70 194 C70 199 82 199 82 194 L86 156 Z" fill={SABLE} />
        <path d="M172 132 C190 130 202 146 196 160 C194 166 190 170 188 176 L188 194 C188 199 176 199 176 194 L176 176 C168 168 162 142 172 132 Z" fill={SABLE} />
        <path d="M196 158 C194 166 190 170 188 176 L188 194 C188 197 185 198 182 198 C184 184 188 170 196 158 Z" fill="#000" opacity="0.12" />
        <ellipse cx="74" cy="196" rx="8" ry="3.6" fill={SABLE_DARK} />
        <ellipse cx="180" cy="196" rx="8" ry="3.6" fill={SABLE_DARK} />
        {/* cuello y babero claro */}
        <path d="M42 112 C44 134 56 150 76 156 C86 148 92 134 92 116 Z" fill={BODY} />
        <path d="M50 122 C54 138 62 148 72 152 C78 144 80 132 78 122 Z" fill={FACE} />
        {/* orejas chicas de borde blanco */}
        <circle cx="37" cy="80" r="10" fill={FACE} />
        <circle cx="87" cy="80" r="10" fill={FACE} />
        <circle cx="37.5" cy="81" r="6" fill={SABLE} />
        <circle cx="86.5" cy="81" r="6" fill={SABLE} />
        {/* cabeza clara */}
        <path d="M62 74 C82 74 94 86 94 100 C94 110 86 118 78 124 C72 129 67 134 62 134 C57 134 52 129 46 124 C38 118 30 110 30 100 C30 86 42 74 62 74 Z" fill={FACE} />
        <path d="M48 77 C56 74 68 74 76 77 C72 85 66 91 62 93 C58 91 52 85 48 77 Z" fill="#d8bf9e" />
        <path d="M84 82 C94 92 96 108 88 118 C84 124 78 128 70 131 C84 118 90 100 84 82 Z" fill="#000" opacity="0.06" />
        {/* antifaz oscuro */}
        <path d="M31 100 C34 88 46 84 56 90 C59 92 61 94 62 96 C63 94 65 92 68 90 C78 84 90 88 93 100 C92 108 84 112 76 110 C70 108 66 104 62 102 C58 104 54 108 48 110 C40 112 32 108 31 100 Z" fill={MASK} />
        {/* ojos */}
        <ellipse cx="47" cy="98" rx="4.6" ry="4.8" fill={INK} />
        <ellipse cx="77" cy="98" rx="4.6" ry="4.8" fill={INK} />
        <circle cx="48.7" cy="96.2" r="1.7" fill="#fff" />
        <circle cx="78.7" cy="96.2" r="1.7" fill="#fff" />
        {/* nariz, boca y bigotes */}
        <path d="M57 112 h10 q2.5 0 1.2 2.6 l-3.4 3.6 q-2.6 2.4 -5.2 0 l-3.4 -3.6 q-1.3 -2.6 1.2 -2.6 z" fill={NOSE} />
        <path d="M62 119 v2 M62 121 q-4 4 -8 1 M62 121 q4 4 8 1" stroke="#8a6a5a" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M50 116 l-16 -2 M50 120 l-15 4 M74 116 l16 -2 M74 120 l15 4" stroke="#a08878" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </>
  ),
};
export default art;
