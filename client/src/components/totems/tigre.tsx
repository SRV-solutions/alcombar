import { INK, type TotemArt } from './types';

/** Tigre: sentado de frente. Naranja con rayas negras, mejillas con pelo blanco hacia los costados, cejas, hocico, pecho y manos blancos, cola anillada de punta negra. */
const FUR = '#ec8a3a';
const FUR_DARK = '#cf6f28';
const FUR_LIGHT = '#f4a35c';
const WHITE = '#fbf4e8';
const STRIPE = '#2e201a';

const art: TotemArt = {
  bg: '#cfe8e3',
  face: [58, 20, 124],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="120" cy="219" rx="74" ry="9" fill="#000" opacity="0.12" />
      {/* cola anillada */}
      <path d="M158 198 C196 204 218 178 206 148 C202 138 190 140 192 152 C198 172 184 186 158 182 Z" fill={FUR} />
      <path d="M206 148 C202 138 190 140 192 152 C195 161 204 158 206 148 Z" fill={STRIPE} />
      <path d="M193 160Q200.2 163.4 208 162Q200.8 158.6 193 160ZM191.5 171Q197 177.1 205 179Q199.5 172.9 191.5 171ZM183 180.5Q185 188.3 191 193.5Q189 185.7 183 180.5ZM170 183Q168.7 191 172 198.5Q173.3 190.5 170 183Z" fill={STRIPE} />
      {/* ancas */}
      <ellipse cx="76" cy="188" rx="26" ry="27" fill={FUR_DARK} />
      <ellipse cx="164" cy="188" rx="26" ry="27" fill={FUR_DARK} />
      <path d="M51 180Q58.9 184.7 68 183Q59.7 180.3 51 180ZM52 194Q58.9 196.5 66 195Q59.1 192.5 52 194ZM189 180Q180.3 180.3 172 183Q181.1 184.7 189 180ZM188 194Q180.9 192.5 174 195Q181.1 196.5 188 194Z" fill={STRIPE} />
      {/* cuerpo y pecho */}
      <path d="M120 98 C84 98 64 134 66 172 C67 198 84 213 120 213 C156 213 173 198 174 172 C176 134 156 98 120 98 Z" fill={FUR} />
      <path d="M120 118 C102 118 93 142 93 168 C93 194 104 209 120 209 C136 209 147 194 147 168 C147 142 138 118 120 118 Z" fill={WHITE} />
      <path d="M152 112 C166 130 176 152 174 172 C173 198 156 213 120 213 C150 204 162 170 152 112 Z" fill="#000" opacity="0.08" />
      {/* rayas del cuerpo */}
      <path d="M70 134Q78.3 142.3 90 142Q80.2 137.4 70 134ZM67 152Q76.6 158.5 88 157Q77.8 153.4 67 152ZM67 170Q76.1 174.4 86 172Q76.6 169.6 67 170ZM72 188Q79 190.2 86 188Q79 185.8 72 188ZM170 134Q159.8 137.4 150 142Q161.7 142.3 170 134ZM173 152Q162.2 153.4 152 157Q163.4 158.5 173 152ZM173 170Q163.4 169.6 154 172Q163.9 174.4 173 170ZM168 188Q161 185.8 154 188Q161 190.2 168 188Z" fill={STRIPE} />
      {/* patas traseras */}
      <ellipse cx="74" cy="210" rx="20" ry="8.5" fill={FUR_LIGHT} />
      <ellipse cx="166" cy="210" rx="20" ry="8.5" fill={FUR_LIGHT} />
      {/* patas delanteras */}
      <path d="M96 148 C91 150 90 156 90 162 L93 206 C93 213 113 213 113 206 L114 162 C114 154 110 148 104 148 Z" fill={FUR} />
      <path d="M144 148 C149 150 150 156 150 162 L147 206 C147 213 127 213 127 206 L126 162 C126 154 130 148 136 148 Z" fill={FUR} />
      <path d="M144 150 C149 152 150 156 150 162 L147 206 C147 210 142 212 137 212 C142 196 144 174 144 150 Z" fill="#000" opacity="0.08" />
      <path d="M90.5 166Q95.8 169.5 102 168Q96.5 165.5 90.5 166ZM91 180Q95.3 182.3 100 181Q95.7 178.7 91 180ZM113.5 172Q109 171.7 105 174Q109.8 175.2 113.5 172ZM113 186Q109.3 184.9 106 187Q109.7 188.1 113 186ZM149.5 166Q143.5 165.5 138 168Q144.2 169.5 149.5 166ZM149 180Q144.3 178.7 140 181Q144.7 182.3 149 180ZM126.5 172Q130.2 175.2 135 174Q131 171.7 126.5 172ZM127 186Q130.3 188.1 134 187Q130.7 184.9 127 186Z" fill={STRIPE} />
      <ellipse cx="103" cy="208" rx="12" ry="6.5" fill={WHITE} />
      <ellipse cx="137" cy="208" rx="12" ry="6.5" fill={WHITE} />
      <path d="M99 205 v5 M107 205 v5 M133 205 v5 M141 205 v5" stroke={FUR_DARK} strokeWidth="1.6" strokeLinecap="round" />
      {/* orejas redondas */}
      <ellipse cx="80" cy="46" rx="17" ry="16" fill={STRIPE} transform="rotate(-25 80 46)" />
      <ellipse cx="160" cy="46" rx="17" ry="16" fill={STRIPE} transform="rotate(25 160 46)" />
      <ellipse cx="80.5" cy="47" rx="14.5" ry="13.5" fill={FUR} transform="rotate(-25 80.5 47)" />
      <ellipse cx="159.5" cy="47" rx="14.5" ry="13.5" fill={FUR} transform="rotate(25 159.5 47)" />
      <ellipse cx="81.5" cy="49" rx="9" ry="8.5" fill={WHITE} transform="rotate(-25 81.5 49)" />
      <ellipse cx="158.5" cy="49" rx="9" ry="8.5" fill={WHITE} transform="rotate(25 158.5 49)" />
      {/* mejillas blancas hacia los costados */}
      <path d="M104 92 C90 92 74 98 62 108 L72 112 L60 120 L74 122 L66 132 C84 134 102 128 110 114 Z" fill={WHITE} />
      <path d="M136 92 C150 92 166 98 178 108 L168 112 L180 120 L166 122 L174 132 C156 134 138 128 130 114 Z" fill={WHITE} />
      {/* cabeza */}
      <path d="M120 38 C92 38 70 56 70 82 C70 104 84 118 104 124 L136 124 C156 118 170 104 170 82 C170 56 148 38 120 38 Z" fill={FUR} />
      <ellipse cx="102" cy="54" rx="24" ry="9" fill="#fff" opacity="0.16" />
      <path d="M150 50 C164 62 170 80 166 96 C162 110 150 120 136 124 C156 106 160 78 150 50 Z" fill="#000" opacity="0.07" />
      {/* cejas blancas, hocico y mentón */}
      <ellipse cx="99" cy="66" rx="10" ry="5.5" fill={WHITE} />
      <ellipse cx="141" cy="66" rx="10" ry="5.5" fill={WHITE} />
      <path d="M96 108 C96 96 106 90 120 90 C134 90 144 96 144 108 C144 120 134 128 120 128 C106 128 96 120 96 108 Z" fill={WHITE} />
      {/* rayas de la cara */}
      <path d="M120 40Q117.6 48.5 120 57Q122.4 48.5 120 40ZM110 42Q111.2 49.2 114 56Q114.7 48.2 110 42ZM130 42Q125.3 48.2 126 56Q128.8 49.2 130 42ZM95 51Q99.3 57.4 107 58Q101.2 54.2 95 51ZM145 51Q138.8 54.2 133 58Q140.7 57.4 145 51ZM70.5 74Q77.8 79.6 87 79Q79.1 75.4 70.5 74ZM71 88Q78.4 90.5 86 89Q78.6 86.5 71 88ZM169.5 74Q160.9 75.4 153 79Q162.2 79.6 169.5 74ZM169 88Q161.4 86.5 154 89Q161.6 90.5 169 88ZM62 111Q72.1 113.5 82 110Q72 109.5 62 111ZM67 124Q76.8 124.5 86 121Q76.2 120.5 67 124ZM178 111Q168 109.5 158 110Q167.9 113.5 178 111ZM173 124Q163.8 120.5 154 121Q163.2 124.5 173 124Z" fill={STRIPE} />
      <path d="M108 93 h24 q3 0 1 4 l-9 9 q-4 3 -8 0 l-9 -9 q-2 -4 1 -4 z" fill="#c9756a" />
      <ellipse cx="114" cy="95.5" rx="4" ry="1.5" fill="#fff" opacity="0.3" />
      <path d="M120 108 v5 M120 113 q-7 7 -14 2 M120 113 q7 7 14 2" stroke={STRIPE} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M103 106a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M100 110a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M104 113a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M135 106a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M138 110a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M134 113a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" fill="#c9b8a6" />
      <path d="M98 108 l-30 -6 M98 113 l-30 4 M142 108 l30 -6 M142 113 l30 4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      {/* ojos */}
      <ellipse cx="100" cy="78" rx="8.5" ry="7.5" fill="#e8b13e" />
      <ellipse cx="140" cy="78" rx="8.5" ry="7.5" fill="#e8b13e" />
      <circle cx="100" cy="78" r="4.2" fill={INK} />
      <circle cx="140" cy="78" r="4.2" fill={INK} />
      <circle cx="102.2" cy="75.5" r="1.8" fill="#fff" />
      <circle cx="142.2" cy="75.5" r="1.8" fill="#fff" />
      <path d="M90 74 q10 -9 20 -1" stroke={STRIPE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M150 74 q-10 -9 -20 -1" stroke={STRIPE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
