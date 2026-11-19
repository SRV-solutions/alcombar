import { INK, type TotemArt } from './types';

/** Chita (guepardo): sentada bien erguida, de frente. Esbelta y de patas largas, cabeza chica de orejas redondas, manchas negras chicas y macizas, y las dos «lágrimas» negras del ojo a la boca. */
const FUR = '#e2b062';
const FUR_DARK = '#c99447';
const FUR_LIGHT = '#eec584';
const CREAM = '#f9eedb';
const SPOT = '#33241d';

const art: TotemArt = {
  bg: '#d2e6d4',
  face: [72, 6, 96],
  art: (
    <>
      <circle cx="120" cy="122" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="126" cy="218" rx="66" ry="8" fill="#000" opacity="0.12" />
      {/* cola larga: manchas, anillos negros y la punta blanca */}
      <path d="M146 206 C180 214 212 202 212 168 C212 160 201 159 201 167 C202 186 188 196 146 194 Z" fill={FUR} />
      <path d="M212 168 C212 160 201 159 201 167 C204 170 209 170 212 168 Z" fill={CREAM} />
      <path d="M200.9 172.4 C204 174.5 208 174.5 211.6 173 L211 178.4 C207.5 180.5 203 180 199.6 177.6 Z M197.4 181.5 C201 184 205 185.5 208.6 185.4 L205.8 190.6 C201.5 190 197.5 188 194.1 185.3 Z" fill={SPOT} />
      <path d="M157.8 201a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M169.8 203.5a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M181.8 201a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M190 195.5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" fill={SPOT} />
      {/* ancas */}
      <ellipse cx="88" cy="190" rx="21" ry="24" fill={FUR_DARK} />
      <ellipse cx="152" cy="190" rx="21" ry="24" fill={FUR_DARK} />
      {/* cuerpo esbelto y pecho */}
      <path d="M120 80 C98 80 82 116 81 164 C82 196 96 213 120 213 C144 213 158 196 159 164 C158 116 142 80 120 80 Z" fill={FUR} />
      <path d="M120 104 C107 104 101 132 101 162 C101 192 109 209 120 209 C131 209 139 192 139 162 C139 132 133 104 120 104 Z" fill={CREAM} />
      <path d="M146 106 C156 124 161 146 159 166 C158 196 144 213 120 213 C144 202 152 168 146 106 Z" fill="#000" opacity="0.08" />
      {/* manchas del cuerpo */}
      <path d="M101.8 97a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M94.6 109a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0M89.5 123a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0M85.5 137a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0M89.7 151a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0 -4.6 0M84.5 165a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0M89.8 178a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M73.6 186a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0M69.8 198a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M81.8 200a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M133.8 97a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M140.6 109a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0M145.5 123a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0M149.5 137a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0M145.7 151a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0 -4.6 0M150.5 165a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0M145.8 178a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M161.6 186a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0M165.8 198a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M153.8 200a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M112.5 114a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M124.5 114a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M118.5 122a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0" fill={SPOT} />
      {/* patas traseras */}
      <ellipse cx="84" cy="211" rx="17" ry="7" fill={FUR_LIGHT} />
      <ellipse cx="156" cy="211" rx="17" ry="7" fill={FUR_LIGHT} />
      {/* patas delanteras, largas */}
      <path d="M102 128 C98 130 97 136 97 142 L99 205 C99 212 115 212 115 205 L116 142 C116 134 113 128 108 128 Z" fill={FUR} />
      <path d="M138 128 C142 130 143 136 143 142 L141 205 C141 212 125 212 125 205 L124 142 C124 134 127 128 132 128 Z" fill={FUR} />
      <path d="M138 130 C142 132 143 136 143 142 L141 205 C141 209 137 211 133 211 C137 190 139 160 138 130 Z" fill="#000" opacity="0.08" />
      <path d="M101.2 140a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M108.2 151a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M102.2 163a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M109.3 175a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0 -3.4 0M103.4 187a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M108.5 197a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M135.2 140a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M128.2 151a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M134.2 163a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M127.3 175a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0 -3.4 0M133.4 187a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M128.5 197a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0" fill={SPOT} />
      <ellipse cx="107" cy="208" rx="10.5" ry="5.5" fill={CREAM} />
      <ellipse cx="133" cy="208" rx="10.5" ry="5.5" fill={CREAM} />
      <path d="M104 205.5 v4.5 M110 205.5 v4.5 M130 205.5 v4.5 M136 205.5 v4.5" stroke={FUR_DARK} strokeWidth="1.5" strokeLinecap="round" />
      {/* orejas chicas y redondas */}
      <path d="M80 46 C74 30 80 16 92 16 C102 16 108 24 106 32 Z" fill={FUR_DARK} />
      <path d="M160 46 C166 30 160 16 148 16 C138 16 132 24 134 32 Z" fill={FUR_DARK} />
      <path d="M85 40 C82 30 86 22 93 22 C99 22 102 27 101 32 Z" fill={CREAM} />
      <path d="M155 40 C158 30 154 22 147 22 C141 22 138 27 139 32 Z" fill={CREAM} />
      {/* cabeza chica */}
      <ellipse cx="120" cy="56" rx="43" ry="36" fill={FUR} />
      <ellipse cx="104" cy="36" rx="20" ry="8" fill="#fff" opacity="0.15" />
      <path d="M146 30 C160 40 166 58 161 72 C156 86 144 92 130 91 C150 80 156 56 146 30 Z" fill="#000" opacity="0.07" />
      <path d="M106.4 31a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M118.2 27a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M130.4 31a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M112.6 39a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M124.6 39a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M95.5 42a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M141.5 42a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M84.4 58a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M152.4 58a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M87.6 69a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M149.6 69a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0" fill={SPOT} />
      {/* blanco bajo los ojos y hocico */}
      <ellipse cx="103" cy="63" rx="11" ry="8" fill={CREAM} />
      <ellipse cx="137" cy="63" rx="11" ry="8" fill={CREAM} />
      <ellipse cx="120" cy="76" rx="19" ry="13" fill={CREAM} />
      {/* las lágrimas negras */}
      <path d="M111.5 60 C109.5 68 105 75 106.5 83" stroke={SPOT} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M128.5 60 C130.5 68 135 75 133.5 83" stroke={SPOT} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      {/* nariz, boca y bigotes */}
      <path d="M112 69 h16 q3 0 1 3 l-6 7 q-3 3 -6 0 l-6 -7 q-2 -3 1 -3 z" fill={INK} />
      <path d="M120 80 v4 M120 84 q-5 6 -10 2 M120 84 q5 6 10 2" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M102 78 l-25 -5 M102 82 l-25 3 M138 78 l25 -5 M138 82 l25 3" stroke="#fff8ec" strokeWidth="1.3" strokeLinecap="round" />
      {/* ojos */}
      <ellipse cx="104" cy="56" rx="8" ry="6.8" fill="#d9a441" />
      <ellipse cx="136" cy="56" rx="8" ry="6.8" fill="#d9a441" />
      <circle cx="104" cy="56" r="3.8" fill={INK} />
      <circle cx="136" cy="56" r="3.8" fill={INK} />
      <circle cx="106" cy="53.6" r="1.7" fill="#fff" />
      <circle cx="138" cy="53.6" r="1.7" fill="#fff" />
      <path d="M95 52 q9 -9 18 0" stroke={SPOT} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M127 52 q9 -9 18 0" stroke={SPOT} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
