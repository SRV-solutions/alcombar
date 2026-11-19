import { INK, type TotemArt } from './types';

/** Leona: echada de costado, con la cabeza girada hacia nosotros. Sin melena, pelaje arena liso, orejas redondeadas de borde oscuro, mentón blanco y la cola con borla. */
const FUR = '#d9b27c';
const FUR_DARK = '#c29763';
const FUR_LIGHT = '#e8c899';
const CREAM = '#f8eedc';
const MARK = '#6b4a34';

const art: TotemArt = {
  bg: '#e3dcf0',
  face: [32, 16, 104],
  art: (
    <>
      <circle cx="120" cy="120" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="126" cy="211" rx="104" ry="9" fill="#000" opacity="0.12" />
      {/* cola levantada atrás, con borla */}
      <path d="M198 198 C218 202 228 190 226 172 C225 164 218 163 216 170 C218 184 210 190 198 188 Z" fill={FUR_DARK} />
      <path d="M222 154 C215 155 211 162 214 169 C217 175 226 174 229 168 C232 161 228 153 222 154 Z" fill={MARK} />
      {/* pata delantera de atrás */}
      <path d="M100 162 C84 166 62 174 44 180 C30 185 30 201 44 201 L62 200 C78 196 94 190 106 186 Z" fill={FUR_DARK} />
      <ellipse cx="42" cy="194" rx="12.5" ry="7" fill={FUR} />
      {/* cuerpo echado */}
      <path d="M78 120 C96 106 136 104 170 108 C198 112 214 134 214 164 C214 192 202 208 182 208 L78 208 C60 208 52 194 52 174 C52 150 62 132 78 120 Z" fill={FUR} />
      <path d="M108 112 C136 104 176 108 198 124 C176 116 138 112 108 118 Z" fill="#fff" opacity="0.15" />
      <path d="M64 198 C90 190 124 190 146 196 L146 208 L76 208 Z" fill={FUR_LIGHT} />
      {/* cuello y pecho */}
      <path d="M50 84 C48 110 52 132 60 148 C80 152 100 146 116 136 C120 120 122 100 118 84 Z" fill={FUR} />
      <ellipse cx="84" cy="117" rx="17" ry="9" fill={FUR_LIGHT} />
      {/* muslo de atrás */}
      <path d="M146 186 C142 156 160 138 184 140 C204 142 216 160 212 182 C209 198 198 207 184 208 L152 208 C147 202 146 194 146 186 Z" fill={FUR} />
      <path d="M146 186 C142 156 160 138 184 140 C166 146 154 162 154 186 C154 196 156 203 160 208 L152 208 C147 202 146 194 146 186 Z" fill="#000" opacity="0.08" />
      <path d="M198 126 C210 140 216 160 212 182 C209 198 198 207 184 208 C204 194 208 158 198 126 Z" fill="#000" opacity="0.08" />
      <ellipse cx="152" cy="205" rx="24" ry="7" fill={FUR_LIGHT} />
      {/* pata delantera de adelante */}
      <path d="M124 174 C106 180 86 188 64 193 C46 197 44 212 62 212 L112 212 C126 210 132 194 124 174 Z" fill={FUR} />
      <path d="M124 174 C106 180 86 188 64 193 C56 195 51 198 50 203 C62 198 92 193 126 185 C126 181 125 177 124 174 Z" fill="#000" opacity="0.09" />
      <ellipse cx="60" cy="205" rx="14" ry="7.5" fill={CREAM} />
      <path d="M53 202 v6 M60 201.5 v7 M67 202 v6" stroke={FUR_DARK} strokeWidth="1.5" strokeLinecap="round" />
      {/* orejas redondeadas, de borde oscuro */}
      <ellipse cx="55" cy="35" rx="14" ry="14.5" fill={MARK} transform="rotate(-20 55 35)" />
      <ellipse cx="113" cy="35" rx="14" ry="14.5" fill={MARK} transform="rotate(20 113 35)" />
      <ellipse cx="56" cy="37" rx="9" ry="9.5" fill="#efd5bc" transform="rotate(-20 56 37)" />
      <ellipse cx="112" cy="37" rx="9" ry="9.5" fill="#efd5bc" transform="rotate(20 112 37)" />
      {/* cabeza */}
      <path d="M84 28 C58 28 40 46 40 70 C40 90 50 104 66 110 C72 112 78 113 84 113 C90 113 96 112 102 110 C118 104 128 90 128 70 C128 46 110 28 84 28 Z" fill={FUR} />
      <ellipse cx="70" cy="42" rx="18" ry="7" fill="#fff" opacity="0.16" />
      <path d="M110 38 C124 50 130 68 126 84 C122 98 112 108 98 112 C118 96 122 66 110 38 Z" fill="#000" opacity="0.07" />
      {/* hocico y mentón */}
      <path d="M77 56 C79 66 78 74 74 80 L94 80 C90 74 89 66 91 56 C87 52 81 52 77 56 Z" fill={FUR_LIGHT} />
      <ellipse cx="84" cy="91" rx="22" ry="15" fill={CREAM} />
      <ellipse cx="84" cy="106" rx="10" ry="5" fill="#fff8ec" />
      <path d="M74 78 h20 q3 0 1 3.5 l-8 8 q-3 3 -6 0 l-8 -8 q-2 -3.5 1 -3.5 z" fill="#a8685a" />
      <ellipse cx="80" cy="80.5" rx="3.5" ry="1.3" fill="#fff" opacity="0.3" />
      <path d="M84 91 v5 M84 96 q-6 6 -12 2 M84 96 q6 6 12 2" stroke="#5a3a2c" strokeWidth="2.3" strokeLinecap="round" fill="none" />
      <path d="M68.1 89a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M65.1 93a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M69.1 96a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M98.1 89a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M101.1 93a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M97.1 96a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0" fill={FUR_DARK} />
      <path d="M62 92 l-24 -5 M62 97 l-24 4 M106 92 l24 -5 M106 97 l24 4" stroke="#fff8ec" strokeWidth="1.3" strokeLinecap="round" />
      {/* ojos, con el blanco de abajo */}
      <ellipse cx="67" cy="69" rx="9" ry="5" fill={CREAM} />
      <ellipse cx="101" cy="69" rx="9" ry="5" fill={CREAM} />
      <ellipse cx="67" cy="65" rx="8" ry="6.8" fill="#d9a043" />
      <ellipse cx="101" cy="65" rx="8" ry="6.8" fill="#d9a043" />
      <circle cx="67" cy="65" r="3.8" fill={INK} />
      <circle cx="101" cy="65" r="3.8" fill={INK} />
      <circle cx="69" cy="62.6" r="1.7" fill="#fff" />
      <circle cx="103" cy="62.6" r="1.7" fill="#fff" />
      <path d="M58 61 q9 -9 18 0" stroke={MARK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M92 61 q9 -9 18 0" stroke={MARK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
