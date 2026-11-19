import { INK, type TotemArt } from './types';

/** Ballena franca austral: de perfil, flotando en la superficie con la cola en alto. Negra, sin aleta dorsal, callosidades blancas en la cabeza y soplido en V. */
const BODY = '#363e4a';
const BODY_DARK = '#2c333d';
const LINE = '#181c22';
const CALLUS = '#efe9da';
const CALLUS_SHADE = '#cfc6b0';
const SEA = '#6aa6d6';
const SEA_DARK = '#4f8fc4';
const FOAM = '#eef6fc';

const art: TotemArt = {
  bg: '#dedaf2',
  face: [18, 70, 104],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      {/* soplido en V */}
      <path d="M82 84 C78 70 70 56 60 46 C56 42 62 36 67 40 C76 50 84 66 88 82 Z" fill="#fff" opacity="0.92" />
      <path d="M86 82 C90 66 98 50 108 40 C113 36 119 42 115 46 C106 56 96 70 91 84 Z" fill="#fff" opacity="0.92" />
      <circle cx="58" cy="38" r="10" fill="#fff" />
      <circle cx="47" cy="46" r="7" fill="#fff" />
      <circle cx="68" cy="29" r="7" fill="#fff" />
      <circle cx="115" cy="36" r="10" fill="#fff" />
      <circle cx="126" cy="44" r="7" fill="#fff" />
      <circle cx="105" cy="27" r="7" fill="#fff" />
      <path d="M50 52 C58 52 66 46 68 38 C70 44 64 52 56 54 Z M118 50 C126 50 132 46 133 40 C136 46 130 52 122 53 Z" fill="#000" opacity="0.08" />
      <circle cx="40" cy="60" r="2.4" fill="#fff" />
      <circle cx="134" cy="58" r="2.4" fill="#fff" />
      {/* pedúnculo y cola */}
      <path d="M150 108 C168 106 182 94 190 74 L206 78 C204 104 190 130 162 146 Z" fill={BODY} />
      <path d="M198 80 C186 78 176 68 170 54 C182 54 192 60 198 68 C204 60 214 54 226 54 C220 68 210 78 198 80 Z" fill={BODY} />
      <path d="M198 80 C204 70 214 62 226 54 C220 68 210 78 198 80 Z M206 78 C204 104 190 130 162 146 L170 132 C186 116 196 98 198 80 Z" fill="#000" opacity="0.14" />
      {/* cuerpo */}
      <path d="M24 120 C24 94 48 78 82 78 C122 78 158 94 176 116 C186 130 178 148 156 158 C130 170 92 172 64 164 C38 156 24 142 24 120 Z" fill={BODY} />
      {/* mandíbula enorme, arqueada */}
      <path d="M26 121 C34 104 62 96 82 108 C92 116 96 128 94 140 C93 150 92 158 90 167 C80 168 72 167 64 164 C38 156 24 142 26 121 Z" fill={BODY_DARK} />
      <ellipse cx="84" cy="88" rx="32" ry="7" fill="#fff" opacity="0.12" transform="rotate(-4 84 88)" />
      <path d="M168 104 C184 120 184 142 158 156 C132 168 104 170 84 168 C120 162 162 146 168 104 Z" fill="#000" opacity="0.12" />
      {/* aleta pectoral, ancha */}
      <path d="M116 146 C130 146 144 156 148 170 C148 178 136 178 128 170 C122 164 116 156 116 146 Z" fill={BODY_DARK} />
      {/* callosidades: el "bonete" sobre el hocico, la fila del labio, el mentón y la ceja */}
      <ellipse cx="44" cy="94" rx="7.5" ry="5.5" fill={CALLUS} transform="rotate(-30 44 94)" />
      <ellipse cx="54" cy="87.5" rx="6" ry="4.6" fill={CALLUS} transform="rotate(-18 54 87.5)" />
      <ellipse cx="37" cy="102" rx="5" ry="4" fill={CALLUS} transform="rotate(-45 37 102)" />
      <circle cx="63" cy="84" r="3.2" fill={CALLUS} />
      <circle cx="71" cy="81.5" r="2.6" fill={CALLUS} />
      <path d="M38 99 C42 98 48 96 50 92 C52 96 48 100 42 102 Z M50 90 C54 90 58 88 59 85 C61 88 58 91 54 92 Z" fill={CALLUS_SHADE} />
      <circle cx="35" cy="121" r="3.6" fill={CALLUS} />
      <circle cx="43" cy="113.5" r="3.2" fill={CALLUS} />
      <circle cx="52" cy="109" r="2.7" fill={CALLUS} />
      <ellipse cx="33" cy="140" rx="5" ry="4.2" fill={CALLUS} />
      <ellipse cx="42" cy="151" rx="4.4" ry="3.6" fill={CALLUS} />
      <ellipse cx="97" cy="117" rx="4.2" ry="3.2" fill={CALLUS} transform="rotate(-20 97 117)" />
      <circle cx="105" cy="115.5" r="2.6" fill={CALLUS} />
      {/* boca */}
      <path d="M26 121 C34 104 62 96 82 108 C92 116 96 128 94 140 C93 146 97 149 103 147" stroke={LINE} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* ojo */}
      <ellipse cx="104" cy="130" rx="6.4" ry="6" fill="#e3e8ef" />
      <circle cx="104.4" cy="130.4" r="4.4" fill={INK} />
      <circle cx="106" cy="128.6" r="1.6" fill="#fff" />
      {/* olas */}
      <path d="M0 166 C14 160 28 160 42 166 C56 172 70 172 84 166 C98 160 112 160 126 166 C140 172 154 172 168 166 C182 160 196 160 210 166 C224 172 234 170 240 166 L240 240 L0 240 Z" fill={SEA} />
      <path d="M0 198 C20 192 40 192 60 198 C80 204 100 204 120 198 C140 192 160 192 180 198 C200 204 220 204 240 198 L240 240 L0 240 Z" fill={SEA_DARK} />
      <path d="M10 163 q12 -4 24 0 M94 162 q12 -4 24 0 M178 162 q12 -4 24 0" stroke={FOAM} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="56" cy="184" r="4" fill="#fff" opacity="0.55" />
      <circle cx="66" cy="192" r="2.6" fill="#fff" opacity="0.55" />
      <circle cx="160" cy="186" r="3.4" fill="#fff" opacity="0.55" />
      <circle cx="150" cy="214" r="2.6" fill="#fff" opacity="0.45" />
    </>
  ),
};
export default art;
