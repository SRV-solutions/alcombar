import { INK, type TotemArt } from './types';

/** Coatí: caminando de perfil, con la cola larga y anillada bien parada. Hocico largo y móvil de punta oscura, antifaz claro arriba y abajo del ojo, orejitas redondas de borde claro. */
const FUR = '#a46f45';
const FUR_DARK = '#7f5232';
const FUR_LIGHT = '#c4915f';
const PALE = '#efe0c6';
const LEG = '#5e402c';
const LEG_FAR = '#4a3222';
const TAIL = '#cf9f6e';
const RING = '#6a4429';

const art: TotemArt = {
  bg: '#f4efc4',
  face: [8, 50, 92],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="128" cy="210" rx="88" ry="8" fill="#000" opacity="0.12" />
      <g transform="translate(14 4)">
        {/* cola larga, parada y anillada */}
        <path d="M164 128 C170 96 172 60 176 30 C177 20 182 14 188 14 C194 14 198 20 197 30 C194 62 190 98 186 132 Z" fill={TAIL} />
        <path d="M167.3 110.5Q177.8 107.5 188.3 108.5L187.3 117.5Q177.8 116.5 166 119.5ZM169.8 90.5Q180.2 87.5 190.6 88.5L189.6 97.5Q180.2 96.5 168.8 99.5ZM171.9 70.5Q182.3 67.5 192.7 68.5L191.8 77.5Q182.3 76.5 171 79.5ZM174 50.5Q184.4 47.5 194.8 48.5L193.9 57.5Q184.4 56.5 173.1 59.5ZM176.1 32.5Q186.3 29.5 196.6 30.5L195.7 39.5Q186.3 38.5 175 41.5ZM177 23 C178.5 17 183 14 188 14 C193 14 197 17 197.6 23 Q187.5 21 177 23 Z" fill={RING} />
        <path d="M190 30 C189 60 187 96 184 128 L186 132 C190 98 194 62 197 30 C197 26 196 22 194 19 C192 22 190 26 190 30 Z" fill="#000" opacity="0.1" />
        {/* patas: las del otro lado más oscuras; el cuerpo tapa la parte de arriba */}
        <path d="M84 150 L86 197 C86 205 99 205 99 197 L102 150 Z" fill={LEG_FAR} />
        <path d="M136 150 L136 197 C136 205 149 205 149 197 L154 150 Z" fill={LEG_FAR} />
        <path d="M60 150 L62 197 C62 204 80 204 80 197 L84 150 Z" fill={LEG} />
        <path d="M156 150 L159 197 C159 204 176 204 176 197 L180 150 Z" fill={LEG} />
        <ellipse cx="70" cy="201" rx="12" ry="5.5" fill={LEG} />
        <ellipse cx="168" cy="201" rx="12" ry="5.5" fill={LEG} />
        <path d="M64 202 v3 M70 202 v3.5 M76 202 v3 M162 202 v3 M168 202 v3.5 M174 202 v3" stroke={FUR_DARK} strokeWidth="1.4" strokeLinecap="round" />
        {/* cuerpo */}
        <path d="M58 120 C76 100 120 94 150 102 C172 108 188 126 186 148 C184 166 170 176 152 176 L84 176 C66 176 52 166 52 150 C52 138 54 128 58 120 Z" fill={FUR} />
        <path d="M84 104 C110 96 146 98 168 112 C146 104 112 102 84 110 Z" fill="#fff" opacity="0.15" />
        <path d="M60 164 C84 174 130 176 170 168 C164 174 158 176 152 176 L84 176 C72 176 64 172 60 164 Z" fill={FUR_LIGHT} />
        <path d="M170 112 C184 126 188 146 182 160 C176 172 164 176 152 176 C172 164 178 136 170 112 Z" fill="#000" opacity="0.08" />
        {/* muslo de atrás */}
        <path d="M144 140 C144 122 168 116 180 130 C188 140 186 158 178 172 C172 178 162 178 158 172 C150 164 144 152 144 140 Z" fill={FUR} />
        <path d="M180 130 C188 140 186 158 178 172 C175 175 171 177 167 177 C178 164 182 146 180 130 Z" fill="#000" opacity="0.08" />
        {/* garganta clara */}
        <path d="M50 112 C50 126 56 136 66 140 C72 136 74 124 70 114 Z" fill={PALE} />
        {/* orejas redondas, de borde claro */}
        <ellipse cx="81" cy="71" rx="8" ry="9" fill={FUR_DARK} />
        <ellipse cx="70" cy="67" rx="9" ry="10" fill={PALE} />
        <ellipse cx="70.5" cy="68" rx="5.5" ry="6.5" fill={FUR_DARK} />
        {/* cabeza y hocico largo */}
        <path d="M88 92 C88 74 74 64 58 66 C46 68 38 76 34 86 C28 96 20 102 12 106 C6 109 6 117 13 119 C24 121 38 119 50 121 C70 124 88 112 88 92 Z" fill={FUR} />
        <ellipse cx="58" cy="76" rx="14" ry="6" fill="#fff" opacity="0.16" />
        <path d="M80 78 C88 90 88 106 78 114 C70 120 60 122 50 121 C68 114 80 100 80 78 Z" fill="#000" opacity="0.08" />
        {/* antifaz claro y punta del hocico */}
        <ellipse cx="48" cy="89" rx="8.5" ry="7" fill={FUR_DARK} />
        <path d="M39 83 C44 76 54 74 61 79 C54 79 46 81 40 87 Z" fill={PALE} />
        <path d="M36 97 C44 99 54 99 60 94 C56 102 46 105 38 103 Z" fill={PALE} />
        <path d="M14 119 C26 116 40 115 52 117 C42 121 26 122 14 121 Z" fill={PALE} />
        <path d="M19 104 C13 106 6 109 7 114 C8 118 13 119 19 119 C21 114 21 108 19 104 Z" fill="#4a3426" />
        <ellipse cx="9.5" cy="112" rx="3.6" ry="4.6" fill={INK} />
        <path d="M21 117 q8 2 15 0" stroke={FUR_DARK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {/* ojo */}
        <circle cx="48" cy="89" r="4.6" fill={INK} />
        <circle cx="49.8" cy="87.2" r="1.6" fill="#fff" />
      </g>
    </>
  ),
};
export default art;
