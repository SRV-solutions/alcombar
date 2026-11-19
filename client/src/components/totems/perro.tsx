import { INK, type TotemArt } from './types';

/** Perro: mestizo sentado, de frente. Marrón con hocico, lista y pechera blancos, orejas caídas, lengua afuera y collar. */
const FUR = '#9a6440';
const FUR_DARK = '#7d4d30';
const FUR_LIGHT = '#b47b52';
const EAR = '#6e4229';
const WHITE = '#f8f2e8';
const TONGUE = '#ee8e93';

const art: TotemArt = {
  bg: '#fbe7c6',
  face: [52, 16, 136],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="122" cy="219" rx="76" ry="9" fill="#000" opacity="0.12" />
      {/* cola, moviéndose */}
      <path d="M158 198 C190 200 210 180 214 150 C215 140 204 136 200 146 C196 168 184 180 158 182 Z" fill={FUR} />
      <path d="M214 150 C215 140 204 136 200 146 C199 152 210 157 214 150 Z" fill={WHITE} />
      <path d="M219 132 q6 5 5 13 M209 126 q8 -1 13 5" stroke={FUR_DARK} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* ancas */}
      <ellipse cx="78" cy="188" rx="25" ry="27" fill={FUR_DARK} />
      <ellipse cx="162" cy="188" rx="25" ry="27" fill={FUR_DARK} />
      {/* cuerpo y pechera */}
      <path d="M120 98 C84 98 64 134 66 172 C67 198 84 213 120 213 C156 213 173 198 174 172 C176 134 156 98 120 98 Z" fill={FUR} />
      <path d="M120 122 C103 122 94 146 94 170 C94 195 105 209 120 209 C135 209 146 195 146 170 C146 146 137 122 120 122 Z" fill={WHITE} />
      <path d="M152 112 C166 130 176 152 174 172 C173 198 156 213 120 213 C150 204 162 170 152 112 Z" fill="#000" opacity="0.08" />
      {/* patas traseras */}
      <ellipse cx="76" cy="210" rx="20" ry="8.5" fill={FUR_LIGHT} />
      <ellipse cx="164" cy="210" rx="20" ry="8.5" fill={WHITE} />
      {/* patas delanteras, con medias blancas */}
      <path d="M96 150 C91 152 90 158 90 164 L93 206 C93 213 113 213 113 206 L114 164 C114 156 110 150 104 150 Z" fill={FUR} />
      <path d="M144 150 C149 152 150 158 150 164 L147 206 C147 213 127 213 127 206 L126 164 C126 156 130 150 136 150 Z" fill={FUR} />
      <path d="M92 188 L93 206 C93 213 113 213 113 206 L113.6 188 C106 192 99 192 92 188 Z" fill={WHITE} />
      <path d="M148 188 L147 206 C147 213 127 213 127 206 L126.4 188 C134 192 141 192 148 188 Z" fill={WHITE} />
      <path d="M99 205 v5 M107 205 v5 M133 205 v5 M141 205 v5" stroke="#cdbba8" strokeWidth="1.6" strokeLinecap="round" />
      {/* collar con chapita */}
      <path d="M84 118 C100 132 140 132 156 118 L158 127 C140 142 100 142 82 127 Z" fill="#d4473d" />
      <path d="M84 118 C100 132 140 132 156 118 L156.6 121 C140 136 100 136 83.4 121 Z" fill="#fff" opacity="0.18" />
      <circle cx="120" cy="146" r="7" fill="#ecc45a" />
      <circle cx="117.6" cy="143.6" r="2" fill="#fff" opacity="0.5" />
      {/* cabeza */}
      <ellipse cx="120" cy="78" rx="50" ry="44" fill={FUR} />
      <ellipse cx="98" cy="52" rx="16" ry="8" fill="#fff" opacity="0.14" />
      <path d="M150 44 C168 56 174 76 170 92 C164 110 150 120 132 122 C156 108 162 76 150 44 Z" fill="#000" opacity="0.08" />
      {/* lista blanca y hocico */}
      <path d="M114 42 C116 37 124 37 126 42 C128 56 132 72 140 86 L100 86 C108 72 112 56 114 42 Z" fill={WHITE} />
      <ellipse cx="120" cy="101" rx="27" ry="20" fill={WHITE} />
      {/* orejas caídas */}
      <path d="M98 38 C82 34 64 42 58 58 C52 74 53 94 61 106 C67 114 78 111 82 100 C86 88 88 70 98 54 Z" fill={EAR} />
      <path d="M142 38 C158 34 176 42 182 58 C188 74 187 94 179 106 C173 114 162 111 158 100 C154 88 152 70 142 54 Z" fill={EAR} />
      <path d="M70 52 C64 62 62 78 64 92 C60 78 60 62 70 52 Z" fill="#fff" opacity="0.15" />
      <path d="M182 58 C188 74 187 94 179 106 C173 114 166 112 162 104 C172 102 180 86 182 58 Z" fill="#000" opacity="0.12" />
      {/* cejas */}
      <ellipse cx="99" cy="64" rx="5.5" ry="3.6" fill="#d6a273" />
      <ellipse cx="141" cy="64" rx="5.5" ry="3.6" fill="#d6a273" />
      {/* ojos */}
      <circle cx="100" cy="77" r="6.6" fill={INK} />
      <circle cx="140" cy="77" r="6.6" fill={INK} />
      <circle cx="102.4" cy="74.4" r="2.3" fill="#fff" />
      <circle cx="142.4" cy="74.4" r="2.3" fill="#fff" />
      <circle cx="98" cy="79.6" r="1" fill="#fff" opacity="0.7" />
      <circle cx="138" cy="79.6" r="1" fill="#fff" opacity="0.7" />
      {/* boca abierta y lengua */}
      <path d="M104 106 Q112 113 120 106 Q128 113 136 106 C134 118 128 122 120 122 C112 122 106 118 104 106 Z" fill="#6a2c2c" />
      <path d="M110 112 C109 124 114 133 120 133 C126 133 131 124 130 112 C126 116 114 116 110 112 Z" fill={TONGUE} />
      <path d="M120 116 v9" stroke="#d26b72" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M108 89 h24 q4 0 2 4.5 l-7 8 q-5 4.5 -10 0 l-7 -8 q-2 -4.5 2 -4.5 z" fill={INK} />
      <ellipse cx="114" cy="92" rx="4" ry="1.6" fill="#fff" opacity="0.3" />
      <path d="M120 101 v5 M120 106 q-8 7 -16 0 M120 106 q8 7 16 0" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </>
  ),
};
export default art;
