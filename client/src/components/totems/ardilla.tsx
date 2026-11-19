import { INK, type TotemArt } from './types';

/** Ardilla: sentada en tres cuartos, con una bellota entre las manos. Cola grande y esponjosa en alto, orejas con pincel. */
const FUR = '#c7672d';
const FUR_DARK = '#a65222';
const FUR_LIGHT = '#dc8a4f';
const CREAM = '#f6e3c6';
const NUT = '#c99556';
const CAP = '#7a5432';

const art: TotemArt = {
  bg: '#dde3f5',
  face: [18, 26, 112],
  art: (
    <>
      <circle cx="120" cy="122" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="128" cy="212" rx="78" ry="8" fill="#000" opacity="0.12" />
      {/* cola esponjosa */}
      <path d="M140.3 213.8 Q146.1 218.3 152.5 214.5 Q162.8 217.7 172.2 212.5 Q183.4 212 191 203.9 Q201.2 200.6 205.9 191 Q215.3 184.6 217.7 173.6 Q224.9 164.4 224 152.8 Q229.5 143.2 226.8 132.5 Q230.5 122.2 225.8 112.2 Q228 102.1 222 93.7 Q223.2 84.1 216.4 77.2 Q216.2 67.7 208.6 62.2 Q207.7 53.6 200 49.7 Q198.3 41.5 190.4 38.9 Q187.9 31.2 179.9 30 Q176.1 23 168.2 23.4 Q163.4 17.6 156.3 19.9 Q150.6 15.3 144.5 19.2 Q137.7 17 133.5 22.8 C114.5 30.4 122.5 52.4 141 44.3 C141.9 44.6 143.8 44.4 146.2 45.7 C148.7 47 152.7 49.1 155.7 52 C158.7 55 161.5 58.7 164.3 63.4 C167.1 68.2 170.2 74.2 172.5 80.5 C174.8 86.9 176.7 94 178.2 101.4 C179.6 108.9 181 117 181.1 125.1 C181.2 133.2 180.2 143 178.7 150.1 C177.2 157.2 175.1 162.5 172.1 167.6 C169.2 172.6 166.6 176.8 160.8 180.4 C155.1 184.1 141.7 187.7 137.5 189.4 C133.3 191 136 190.1 135.7 190.2 Z" fill={FUR_LIGHT} />
      <path d="M139 207.3 Q148.8 208.8 158.2 205.9 Q170.7 203.8 181.7 197.7 Q191.9 191.1 199.1 181.3 Q206.6 170.7 210.1 158.1 Q214.3 145.3 214.2 131.8 Q215.5 119.1 212.4 106.6 Q211.5 94.8 206.4 84.1 Q203.8 73.5 197.2 64.7 Q193.6 55.6 186.4 49.1 Q181.7 41.4 174 36.9 Q168.1 31.1 160.1 29.1 Q153.8 25.5 146.6 26.2 Q140 25.6 134.5 29.4 C126.2 33 130.2 42.3 138.6 38.7 C140.3 38.7 145 37.5 149.1 38.9 C153.2 40.3 158.6 43 163 46.9 C167.4 50.9 171.8 56.3 175.7 62.7 C179.5 69.1 183.4 76.8 186.2 85.2 C189.1 93.6 191.8 103.3 192.8 113.1 C193.9 122.8 194 134.1 192.4 143.7 C190.9 153.3 188 163.1 183.6 170.5 C179.2 177.9 173.7 183.9 166.2 188.1 C158.7 192.4 143.6 194.7 138.7 196.1 C133.8 197.6 137.3 196.6 137 196.7 Z" fill={FUR} />
      <path d="M212 96 C222 122 220 156 204 182 C192 200 172 210 152 212 C182 196 206 160 212 96 Z" fill="#000" opacity="0.1" />
      <path d="M140 32 C156 24 178 30 194 44 C176 36 158 34 140 38 Z" fill="#fff" opacity="0.2" />
      {/* cuerpo y panza */}
      <path d="M100 104 C74 106 60 138 62 170 C64 196 82 210 108 210 C134 210 150 194 148 166 C146 132 128 102 100 104 Z" fill={FUR} />
      <path d="M84 120 C70 134 68 166 76 190 C82 204 98 210 112 204 C96 190 90 160 96 130 C94 122 90 118 84 120 Z" fill={CREAM} />
      {/* anca y patas traseras */}
      <ellipse cx="128" cy="182" rx="24" ry="26" fill={FUR_DARK} />
      <path d="M146 166 C152 186 144 204 126 208 C138 198 144 184 146 166 Z" fill="#000" opacity="0.1" />
      <ellipse cx="72" cy="207" rx="16" ry="6" fill={FUR_DARK} />
      <ellipse cx="100" cy="207" rx="26" ry="7" fill={FUR} />
      <path d="M78 206 v4 M84 207 v4" stroke={FUR_DARK} strokeWidth="1.6" strokeLinecap="round" />
      {/* bracito y bellota */}
      <path d="M104 118 C94 124 88 136 88 148 C88 156 80 156 66 151 L64 135 C72 139 77 139 79 134 C82 126 88 118 96 114 Z" fill={FUR_DARK} />
      <ellipse cx="54" cy="141" rx="10" ry="11.5" fill={NUT} />
      <path d="M58 133 C62 138 63 146 58 151 C56 152 54 152.5 52 152.5 C60 147 60 140 58 133 Z" fill="#000" opacity="0.12" />
      <ellipse cx="50" cy="141" rx="2.6" ry="5" fill="#fff" opacity="0.25" />
      <path d="M42.5 133 C42.5 125 47.5 120.5 54 120.5 C60.5 120.5 65.5 125 65.5 133 C60 135.5 48 135.5 42.5 133 Z" fill={CAP} />
      <path d="M46 128 l4 4 M52 124 l7 8 M58 124 l4 4 M48 131 l6 -7 M55 132 l6 -7" stroke="#93693f" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M54 121 q1 -4 4 -6" stroke={CAP} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="44" cy="142" rx="5" ry="6.5" fill={FUR_DARK} />
      <ellipse cx="64" cy="141" rx="5" ry="6.5" fill={FUR} />
      {/* orejas con pincel */}
      <path d="M100 60 C100 48 104 38 112 30 C118 40 118 52 114 62 Z" fill={FUR_DARK} />
      <path d="M58 62 C56 50 60 38 68 30 C76 38 80 50 76 62 Z" fill={FUR} />
      <path d="M63 58 C62 50 64 42 68 37 C72 43 74 50 72 58 Z" fill="#e9a58a" />
      <path d="M68 34 C63 28 63 21 65 16 C70 20 73 27 71 35 Z M112 34 C110 28 111 21 115 16 C118 22 118 28 115 35 Z" fill={FUR_DARK} />
      {/* cabeza y hocico */}
      <ellipse cx="82" cy="82" rx="38" ry="34" fill={FUR} />
      <ellipse cx="52" cy="94" rx="22" ry="17" fill={FUR} />
      <ellipse cx="70" cy="58" rx="18" ry="8" fill="#fff" opacity="0.15" />
      <path d="M112 62 C122 78 120 100 104 112 C96 116 88 117 80 116 C102 106 114 88 112 62 Z" fill="#000" opacity="0.08" />
      <ellipse cx="46" cy="98" rx="15" ry="9.5" fill={CREAM} />
      <ellipse cx="76" cy="98" rx="6" ry="4" fill="#ef8f7e" opacity="0.45" />
      {/* ojos con anillo claro */}
      <ellipse cx="62" cy="78" rx="9.5" ry="10" fill={CREAM} />
      <ellipse cx="98" cy="76" rx="7.5" ry="9" fill={CREAM} />
      <ellipse cx="62" cy="78" rx="6.5" ry="7.5" fill={INK} />
      <ellipse cx="98.5" cy="76" rx="5" ry="6.6" fill={INK} />
      <circle cx="64.5" cy="74.8" r="2.3" fill="#fff" />
      <circle cx="100.3" cy="73.2" r="1.8" fill="#fff" />
      {/* nariz, boca y bigotes */}
      <path d="M30 88 q4 -4 9 -1 q-1 5 -5 6 q-4 -1 -4 -5 Z" fill={INK} />
      <path d="M36 97 q3 4 8 3" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M42 93 l-22 -4 M42 97 l-20 4" stroke="#5a3a28" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </>
  ),
};
export default art;
