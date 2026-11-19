import { INK, type TotemArt } from './types';

/** Cocodrilo (yacaré): de perfil, echado, con la cola levantada en curva. Verde oliva, hocico largo con la narina en la punta, ojos sobre la cabeza, lomo con escamas y cresta; sonrisa tranquila. */
const SKIN = '#6f8040';
const SKIN_DARK = '#56652e';
const SKIN_DEEP = '#45521f';
const BELLY = '#d9d49c';
const IRIS = '#e3c75a';
const TOOTH = '#f8f3e3';

const art: TotemArt = {
  bg: '#f6dcd2',
  face: [0, 72, 106],
  art: (
    <>
      <circle cx="120" cy="122" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="116" cy="200" rx="94" ry="8" fill="#000" opacity="0.12" />
      {/* cola levantada */}
      <path d="M164 186 C204 184 226 160 224 124 C222 88 206 60 180 52 C175 51 173 55 177 57 C196 68 206 92 204 122 C202 146 188 158 160 152 Z" fill={SKIN} />
      <path d="M224 124 C222 88 206 60 180 52 C200 66 212 92 212 124 C212 150 196 170 172 182 C204 180 226 158 224 124 Z" fill="#000" opacity="0.12" />
      <path d="M183.4 59.5 Q182.2 62.4 181.6 64.6 Q183.7 63.7 186.4 62.1 Z M190.8 66.7 Q188.8 69.8 187.7 72.1 Q190.2 71.7 193.7 70.6 Z M196.9 75.7 Q194 78.7 192.4 81 Q195.2 81.2 199.4 80.7 Z M201.5 86.1 Q197.7 88.9 195.5 91.2 Q198.6 92 203.3 92.3 Z M204.5 98 Q199.9 100.4 197.2 102.6 Q200.4 104 205.4 105.1 Z M205.8 111 Q200.5 113 197.3 115 Q200.4 117 205.7 119 Z M205.3 125.6 Q199.6 126.6 196 128.1 Q198.7 131 203.4 134.4 Z M201.7 139 Q196 138 192.1 138.2 Q193.5 141.8 196.8 146.6 Z" fill={SKIN_DARK} />
      {/* patas del lado lejano */}
      <path d="M118 170 C120 180 120 188 118 196 L136 196 C138 188 136 178 132 170 Z" fill={SKIN_DARK} />
      <path d="M182 168 C186 178 188 188 186 196 L204 196 C206 186 202 176 196 166 Z" fill={SKIN_DARK} />
      {/* cuerpo */}
      <path d="M64 150 C66 126 92 112 122 112 C150 112 172 124 180 146 C186 166 176 186 150 188 L84 188 C70 188 62 172 64 150 Z" fill={SKIN} />
      <path d="M70 176 C84 186 120 188 150 188 C168 188 178 180 182 166 C166 176 130 180 100 180 C88 180 78 178 70 176 Z" fill={BELLY} />
      <path d="M160 120 C176 132 184 150 180 166 C176 182 164 188 150 188 C170 176 174 146 160 120 Z" fill="#000" opacity="0.1" />
      {/* escamas del lomo */}
      <path d="M91.5 118.9 Q92 113.2 93.1 109.4 Q96.3 111.8 100.1 116.1 Z M101.3 115.8 Q102.6 110.2 104.2 106.6 Q107 109.3 110.2 114.1 Z M112 113.9 Q113.9 108.5 115.9 105.2 Q118.4 108.2 120.9 113.4 Z M124.3 113.4 Q126.9 108.3 129.4 105.3 Q131.4 108.6 133.2 114.1 Z M137 114.6 Q140.4 110 143.4 107.4 Q144.8 111 145.8 116.7 Z M148.6 117.6 Q152.8 113.7 156.2 111.7 Q156.9 115.6 156.8 121.3 Z" fill={SKIN_DARK} />
      <path d="M110 127 a5.4 3.8 0 1 1 10.8 0 a5.4 3.8 0 1 1 -10.8 0 Z M127 127 a5.4 3.8 0 1 1 10.8 0 a5.4 3.8 0 1 1 -10.8 0 Z M144 130 a5.4 3.8 0 1 1 10.8 0 a5.4 3.8 0 1 1 -10.8 0 Z M159 136 a5 3.6 0 1 1 10 0 a5 3.6 0 1 1 -10 0 Z M118 143 a5.4 3.8 0 1 1 10.8 0 a5.4 3.8 0 1 1 -10.8 0 Z M136 144 a5.4 3.8 0 1 1 10.8 0 a5.4 3.8 0 1 1 -10.8 0 Z M154 148 a5 3.6 0 1 1 10 0 a5 3.6 0 1 1 -10 0 Z" fill={SKIN_DARK} />
      <ellipse cx="126" cy="118" rx="22" ry="5" fill="#fff" opacity="0.14" />
      {/* patas del lado cercano */}
      <path d="M94 160 C92 172 90 182 86 190 L76 192 C70 193 70 199 76 199 L102 199 C108 199 108 193 104 190 C108 180 110 170 112 162 Z" fill={SKIN} />
      <path d="M150 162 C150 174 148 184 144 190 L134 192 C128 193 128 199 134 199 L162 199 C168 199 168 193 164 190 C168 180 172 170 172 160 Z" fill={SKIN} />
      <path d="M78 199 v-4 M86 199 v-4 M94 199 v-4 M136 199 v-4 M144 199 v-4 M152 199 v-4" stroke={SKIN_DEEP} strokeWidth="1.6" strokeLinecap="round" />
      {/* cabeza */}
      <path d="M106 134 C104 118 92 106 76 104 C64 104 56 110 50 116 C40 122 28 126 20 130 C12 134 10 146 18 150 C34 156 64 164 86 166 C100 166 108 152 106 134 Z" fill={SKIN} />
      <path d="M18 150 C34 156 64 164 86 166 C98 166 104 158 106 148 C90 152 64 154 40 152 C30 151 22 150 18 150 Z" fill={BELLY} />
      <ellipse cx="44" cy="122" rx="18" ry="4.4" fill="#fff" opacity="0.16" transform="rotate(-18 44 122)" />
      <path d="M96 116 C104 124 108 140 104 154 C100 160 94 164 88 165 C100 152 102 132 96 116 Z" fill="#000" opacity="0.1" />
      {/* narina */}
      <circle cx="22" cy="129" r="6" fill={SKIN} />
      <ellipse cx="21" cy="127" rx="1.8" ry="1.3" fill={SKIN_DEEP} />
      {/* boca con sonrisa y dientitos */}
      <path d="M27 146.5 l2.2 4.2 l2.2 -4.2 Z M39 148 l2.2 4.2 l2.2 -4.2 Z M55 149.6 l-2.2 -4 l-2.2 4 Z" fill={TOOTH} />
      <path d="M16 146 C40 150 66 152 86 146 C92 144 96 140 98 136" stroke={SKIN_DEEP} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* ojo sobre la cabeza */}
      <circle cx="78" cy="104" r="13" fill={SKIN} />
      <ellipse cx="74" cy="98" rx="6" ry="3" fill="#fff" opacity="0.16" />
      <circle cx="78" cy="106" r="7.4" fill={IRIS} />
      <ellipse cx="78" cy="106.4" rx="3.2" ry="6" fill={INK} />
      <circle cx="80.2" cy="103.4" r="1.8" fill="#fff" />
      <path d="M69 103 C72 96 84 96 87 103" stroke={SKIN_DEEP} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
