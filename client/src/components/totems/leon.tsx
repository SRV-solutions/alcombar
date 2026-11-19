import { INK, type TotemArt } from './types';

/** León: macho, sentado de frente. Pelaje dorado, melena grande y tupida que le rodea la cara y le baja al pecho, cola con borla oscura. */
const FUR = '#dcaa5e';
const FUR_DARK = '#c39147';
const FUR_LIGHT = '#e8bf7c';
const CREAM = '#f8e9cc';
const MANE = '#b0672e';
const MANE_DARK = '#8c4c22';
const MANE_LIGHT = '#c77f3e';

const art: TotemArt = {
  bg: '#cfe0ef',
  face: [50, 18, 140],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="122" cy="219" rx="74" ry="9" fill="#000" opacity="0.12" />
      {/* cola con borla */}
      <path d="M158 198 C196 204 218 178 206 148 C202 138 190 140 192 152 C198 172 184 186 158 182 Z" fill={FUR_DARK} />
      <path d="M201 128 C192 131 187 142 192 151 C197 159 209 157 212 148 C215 139 209 127 201 128 Z" fill={MANE_DARK} />
      {/* ancas */}
      <ellipse cx="76" cy="188" rx="26" ry="27" fill={FUR_DARK} />
      <ellipse cx="164" cy="188" rx="26" ry="27" fill={FUR_DARK} />
      {/* cuerpo y pecho */}
      <path d="M120 104 C84 104 64 136 65 172 C66 198 84 213 120 213 C156 213 174 198 175 172 C176 136 156 104 120 104 Z" fill={FUR} />
      <path d="M120 130 C104 130 95 150 95 170 C95 194 105 209 120 209 C135 209 145 194 145 170 C145 150 136 130 120 130 Z" fill={CREAM} />
      <path d="M152 116 C166 132 176 152 175 172 C174 198 156 213 120 213 C150 204 162 170 152 116 Z" fill="#000" opacity="0.08" />
      {/* patas traseras */}
      <ellipse cx="74" cy="210" rx="21" ry="8.5" fill={FUR_LIGHT} />
      <ellipse cx="166" cy="210" rx="21" ry="8.5" fill={FUR_LIGHT} />
      {/* patas delanteras, gruesas */}
      <path d="M95 146 C89 148 88 154 88 160 L91 205 C91 213 114 213 114 205 L115 160 C115 152 110 146 103 146 Z" fill={FUR} />
      <path d="M145 146 C151 148 152 154 152 160 L149 205 C149 213 126 213 126 205 L125 160 C125 152 130 146 137 146 Z" fill={FUR} />
      <path d="M145 148 C151 150 152 154 152 160 L149 205 C149 209 143 212 137 212 C142 194 146 172 145 148 Z" fill="#000" opacity="0.08" />
      <ellipse cx="102.5" cy="208" rx="13" ry="6.8" fill={CREAM} />
      <ellipse cx="137.5" cy="208" rx="13" ry="6.8" fill={CREAM} />
      <path d="M98 205 v5.5 M107 205 v5.5 M133 205 v5.5 M142 205 v5.5" stroke={FUR_DARK} strokeWidth="1.6" strokeLinecap="round" />
      {/* melena: capa de atrás, capa del medio y brillo */}
      <path d="M120 24Q135 17.5 146 29.4Q162.5 29.3 167.6 44.5Q182.6 51 180.9 66.8Q191.9 78.7 183.6 92.5Q188.8 107.6 175.4 117Q173.7 132.9 157.6 136.2Q149.4 150 133.3 146.6Q120 156.1 106.7 146.6Q90.6 150 82.4 136.2Q66.3 132.9 64.6 117Q51.2 107.6 56.4 92.5Q48.1 78.7 59.1 66.8Q57.4 51 72.4 44.5Q77.5 29.3 94 29.4Q105 17.5 120 24Z" fill={MANE_DARK} />
      <path d="M131.4 36.2Q147.3 33.6 155.1 47.2Q170.4 52.1 170.8 67.6Q182 78.8 174.8 92.7Q179.3 107.6 166.2 116.7Q163.1 131.9 147.1 134.1Q137 146.2 121.8 141Q107 147.1 96 135.7Q80 134.5 75.8 119.5Q62.1 111.2 65.6 96.1Q57.5 82.7 68 70.8Q67.3 55.3 82.2 49.5Q89.1 35.4 105.1 37Q118 27.6 131.4 36.2Z" fill={MANE} />
      <path d="M123.6 45.8Q138.6 48.3 142.8 61.3Q151.4 72.5 143.9 84.3Q141.1 97.5 126.4 101.2Q113.7 108.8 100.4 102.2Q85.4 99.7 81.2 86.7Q72.6 75.5 80.1 63.7Q82.9 50.5 97.6 46.8Q110.3 39.2 123.6 45.8Z" fill={MANE_LIGHT} opacity="0.75" />
      <path d="M168 50 C184 70 188 100 178 124 C170 142 154 150 136 152 C164 132 176 96 168 50 Z" fill="#000" opacity="0.1" />
      {/* orejas redondas, asomando en la melena */}
      <ellipse cx="88" cy="50" rx="13" ry="12" fill={FUR_DARK} />
      <ellipse cx="152" cy="50" rx="13" ry="12" fill={FUR_DARK} />
      <ellipse cx="89" cy="52" rx="7.5" ry="7" fill="#e6c49a" />
      <ellipse cx="151" cy="52" rx="7.5" ry="7" fill="#e6c49a" />
      {/* cara */}
      <path d="M120 52 C96 52 80 66 80 88 C80 108 90 124 104 130 C110 133 115 134 120 134 C125 134 130 133 136 130 C150 124 160 108 160 88 C160 66 144 52 120 52 Z" fill={FUR} />
      <ellipse cx="106" cy="64" rx="18" ry="7" fill="#fff" opacity="0.15" />
      <path d="M144 58 C156 68 162 84 158 100 C154 116 144 128 130 133 C148 116 154 88 144 58 Z" fill="#000" opacity="0.07" />
      {/* hocico ancho y mentón blanco */}
      <path d="M111 74 C112 84 112 92 108 98 L132 98 C128 92 128 84 129 74 C125 70 115 70 111 74 Z" fill={FUR_LIGHT} />
      <ellipse cx="120" cy="110" rx="25" ry="17" fill={CREAM} />
      <ellipse cx="120" cy="126" rx="11" ry="6" fill="#fff8ec" />
      <path d="M107 95 h26 q3 0 1 4 l-9 9 q-5 4 -10 0 l-9 -9 q-2 -4 1 -4 z" fill="#7a4636" />
      <ellipse cx="114" cy="98" rx="4" ry="1.5" fill="#fff" opacity="0.25" />
      <path d="M120 110 v5 M120 115 q-7 7 -14 2 M120 115 q7 7 14 2" stroke="#6a3a2c" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M102 108a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M99 112a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M103 115a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M136 108a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M139 112a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M135 115a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" fill={FUR_DARK} />
      <path d="M96 111 l-26 -5 M96 116 l-26 4 M144 111 l26 -5 M144 116 l26 4" stroke="#fff8ec" strokeWidth="1.4" strokeLinecap="round" />
      {/* ojos */}
      <ellipse cx="101" cy="83" rx="8.5" ry="7.2" fill="#e0a83e" />
      <ellipse cx="139" cy="83" rx="8.5" ry="7.2" fill="#e0a83e" />
      <circle cx="101" cy="83" r="4" fill={INK} />
      <circle cx="139" cy="83" r="4" fill={INK} />
      <circle cx="103.2" cy="80.6" r="1.8" fill="#fff" />
      <circle cx="141.2" cy="80.6" r="1.8" fill="#fff" />
      <path d="M91 78 q10 -10 20 -1" stroke={MANE_DARK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M149 78 q-10 -10 -20 -1" stroke={MANE_DARK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
