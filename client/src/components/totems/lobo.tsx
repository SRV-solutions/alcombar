import { INK, type TotemArt } from './types';

/** Lobo gris: sentado, de frente. Robusto, orejas en punta, máscara clara con el puente del hocico gris, golilla en el pecho y cola tupida de punta oscura. */
const FUR = '#8a929b';
const FUR_DARK = '#6a727c';
const FUR_DEEP = '#4a515a';
const FUR_LIGHT = '#b9bfc6';
const MASK = '#e9e5dc';
const CREAM = '#f8f5ee';

const art: TotemArt = {
  bg: '#cddbf0',
  face: [50, 6, 140],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="124" cy="219" rx="80" ry="9" fill="#000" opacity="0.12" />
      {/* cola tupida, de punta oscura */}
      <path d="M150 208 C186 216 224 200 226 168 C227 152 222 138 212 130 C206 128 202 134 204 140 C206 152 200 166 188 174 C176 182 164 184 154 180 Z" fill={FUR_DARK} />
      <path d="M226 162 C226 150 221 137 212 130 C206 128 202 134 204 140 C205 144 205 147 205 150 C212 152 220 156 226 162 Z" fill={FUR_DEEP} />
      <path d="M162 196 C186 200 208 190 216 172 C210 194 188 206 162 202 Z" fill="#fff" opacity="0.14" />
      {/* ancas */}
      <ellipse cx="76" cy="188" rx="26" ry="27" fill={FUR_DARK} />
      <ellipse cx="164" cy="188" rx="26" ry="27" fill={FUR_DARK} />
      {/* cuerpo */}
      <path d="M120 96 C82 96 62 134 64 172 C65 198 84 213 120 213 C156 213 175 198 176 172 C178 134 158 96 120 96 Z" fill={FUR} />
      <path d="M120 120 C102 120 93 144 93 170 C93 195 104 209 120 209 C136 209 147 195 147 170 C147 144 138 120 120 120 Z" fill={FUR_LIGHT} />
      <path d="M154 112 C168 130 178 152 176 172 C175 198 156 213 120 213 C150 204 164 170 154 112 Z" fill="#000" opacity="0.1" />
      <path d="M70 160 C70 136 82 114 100 104 C88 120 80 138 78 162 Z" fill="#fff" opacity="0.12" />
      {/* golilla del pecho */}
      <path d="M88 118 C88 140 94 158 102 168 Q106 160 110 174 Q115 164 120 178 Q125 164 130 174 Q134 160 138 168 C146 158 152 140 152 118 C140 130 100 130 88 118 Z" fill={CREAM} />
      {/* patas traseras */}
      <ellipse cx="74" cy="210" rx="20" ry="8.5" fill={FUR} />
      <ellipse cx="166" cy="210" rx="20" ry="8.5" fill={FUR} />
      {/* patas delanteras */}
      <path d="M95 160 C91 162 90 166 90 172 L92 206 C92 213 113 213 113 206 L114 172 C114 164 110 160 104 160 Z" fill={FUR} />
      <path d="M145 160 C149 162 150 166 150 172 L148 206 C148 213 127 213 127 206 L126 172 C126 164 130 160 136 160 Z" fill={FUR} />
      <path d="M145 162 C149 164 150 168 150 172 L148 206 C148 210 142 212 137 212 C142 196 144 178 145 162 Z" fill="#000" opacity="0.1" />
      <path d="M95 162 C98 174 98 192 97 206 C94 204 92 200 92 196 L90 172 C90 166 92 163 95 162 Z" fill="#fff" opacity="0.12" />
      <ellipse cx="102.5" cy="208" rx="12.5" ry="6.5" fill={CREAM} />
      <ellipse cx="137.5" cy="208" rx="12.5" ry="6.5" fill={CREAM} />
      <path d="M98.5 205 v5 M106.5 205 v5 M133.5 205 v5 M141.5 205 v5" stroke={FUR_DARK} strokeWidth="1.6" strokeLinecap="round" />
      {/* orejas */}
      <path d="M68 70 C60 44 66 22 78 8 C94 18 108 36 113 52 Z" fill={FUR_DARK} />
      <path d="M172 70 C180 44 174 22 162 8 C146 18 132 36 127 52 Z" fill={FUR_DARK} />
      <path d="M77 58 C72 42 75 30 81 22 C91 30 99 40 103 50 Z" fill="#e2d3cc" />
      <path d="M163 58 C168 42 165 30 159 22 C149 30 141 40 137 50 Z" fill="#e2d3cc" />
      {/* cabeza, con los mechones de las mejillas */}
      <path d="M120 36 C96 36 78 48 72 66 C68 78 62 88 54 98 C63 98 69 101 73 106 C69 109 66 113 64 118 C82 125 100 128 120 128 C140 128 158 125 176 118 C174 113 171 109 167 106 C171 101 177 98 186 98 C178 88 172 78 168 66 C162 48 144 36 120 36 Z" fill={FUR} />
      <ellipse cx="103" cy="51" rx="26" ry="10" fill="#fff" opacity="0.14" />
      {/* máscara clara */}
      <path d="M120 84 C114 68 102 62 92 64 C80 68 76 82 72 96 C78 98 82 102 84 106 C80 108 78 112 78 116 C92 121 106 123 120 123 C134 123 148 121 162 116 C162 112 160 108 156 106 C158 102 162 98 168 96 C164 82 160 68 148 64 C138 62 126 68 120 84 Z" fill={MASK} />
      <path d="M148 64 C160 68 164 82 168 96 C162 98 158 102 156 106 C160 108 162 112 162 116 C152 120 142 122 132 123 C152 110 158 86 148 64 Z" fill="#000" opacity="0.07" />
      <path d="M168 66 C172 78 178 88 186 98 C177 98 171 101 167 106 C171 109 174 113 176 118 C170 120 166 121 162 122 C166 104 170 86 168 66 Z" fill="#000" opacity="0.08" />
      {/* puente del hocico y hocico */}
      <path d="M109 62 C113 76 113 88 110 96 L130 96 C127 88 127 76 131 62 C124 58 116 58 109 62 Z" fill={FUR} />
      <ellipse cx="120" cy="104" rx="24" ry="18" fill={CREAM} />
      <path d="M108 90 h24 q3 0 1 4 l-8 9 q-5 4 -10 0 l-8 -9 q-2 -4 1 -4 z" fill={INK} />
      <ellipse cx="115" cy="93" rx="4" ry="1.6" fill="#fff" opacity="0.3" />
      <path d="M120 105 v5 M120 110 q-7 8 -15 2 M120 110 q7 8 15 2" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="103" cy="103" r="1" fill={FUR_DARK} />
      <circle cx="100" cy="107" r="1" fill={FUR_DARK} />
      <circle cx="137" cy="103" r="1" fill={FUR_DARK} />
      <circle cx="140" cy="107" r="1" fill={FUR_DARK} />
      {/* ojos */}
      <ellipse cx="96" cy="77" rx="8.5" ry="7.5" fill="#e3b54b" />
      <ellipse cx="144" cy="77" rx="8.5" ry="7.5" fill="#e3b54b" />
      <circle cx="96" cy="77" r="4.3" fill={INK} />
      <circle cx="144" cy="77" r="4.3" fill={INK} />
      <circle cx="98" cy="74.5" r="1.8" fill="#fff" />
      <circle cx="146" cy="74.5" r="1.8" fill="#fff" />
      <path d="M85 76 q9 -11 22 -2" stroke={FUR_DEEP} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M155 76 q-9 -11 -22 -2" stroke={FUR_DEEP} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
