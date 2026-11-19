import { INK, type TotemArt } from './types';

/** Pantera negra: sentada de frente, con la cola rodeándole las patas. Todo el cuerpo negro con brillos azulados, rosetas apenas visibles y ojos amarillos. */
const BODY = '#34303b';
const BODY_DARK = '#25222b';
const BODY_LIGHT = '#4b4656';
const NOSE = '#1b181f';
const EYE = '#e6d046';

const art: TotemArt = {
  bg: '#f0e3c4',
  face: [60, 8, 120],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="120" cy="219" rx="74" ry="9" fill="#000" opacity="0.12" />
      {/* ancas */}
      <ellipse cx="80" cy="188" rx="25" ry="27" fill={BODY_DARK} />
      <ellipse cx="160" cy="188" rx="25" ry="27" fill={BODY_DARK} />
      {/* cuerpo y pecho */}
      <path d="M120 98 C88 98 70 132 71 170 C72 197 88 213 120 213 C152 213 168 197 169 170 C170 132 152 98 120 98 Z" fill={BODY} />
      <path d="M120 118 C104 118 96 142 96 166 C96 192 106 207 120 207 C134 207 144 192 144 166 C144 142 136 118 120 118 Z" fill={BODY_LIGHT} />
      <path d="M96 112 C84 128 78 150 79 170 C80 186 86 198 94 204 C88 182 88 140 96 112 Z" fill="#fff" opacity="0.1" />
      <path d="M150 112 C164 130 170 152 169 170 C168 197 152 213 120 213 C148 204 160 170 150 112 Z" fill="#000" opacity="0.14" />
      {/* rosetas que apenas se ven */}
      <path d="M90.4 143.3Q89.3 148 85.2 145.4Q87.5 143.6 90.4 143.3ZM82.7 144.4Q78 143.3 80.6 139.2Q82.4 141.5 82.7 144.4ZM81.6 136.7Q82.7 132 86.8 134.6Q84.5 136.4 81.6 136.7ZM89.3 135.6Q94 136.7 91.4 140.8Q89.6 138.5 89.3 135.6ZM82.7 165.5Q78.5 167.9 77.5 163.2Q80.4 163.5 82.7 165.5ZM76.5 160.7Q74.1 156.5 78.8 155.5Q78.5 158.4 76.5 160.7ZM81.3 154.5Q85.5 152.1 86.5 156.8Q83.6 156.5 81.3 154.5ZM87.5 159.3Q89.9 163.5 85.2 164.5Q85.5 161.6 87.5 159.3ZM92.5 182.3Q89.9 185.9 87.4 182.3Q89.9 181.5 92.5 182.3ZM85.7 180.5Q82.1 177.9 85.7 175.4Q86.5 177.9 85.7 180.5ZM87.5 173.7Q90.1 170.1 92.6 173.7Q90.1 174.5 87.5 173.7ZM94.3 175.5Q97.9 178.1 94.3 180.6Q93.5 178.1 94.3 175.5ZM153 145.4Q148.3 146.5 148.8 141.7Q151.5 142.9 153 145.4ZM148.6 139Q147.5 134.3 152.3 134.8Q151.1 137.5 148.6 139ZM155 134.6Q159.7 133.5 159.2 138.3Q156.5 137.1 155 134.6ZM159.4 141Q160.5 145.7 155.7 145.2Q156.9 142.5 159.4 141ZM163 162.4Q162.8 167.2 158.3 165.5Q160.1 163.2 163 162.4ZM155.6 165Q150.8 164.8 152.5 160.3Q154.8 162.1 155.6 165ZM153 157.6Q153.2 152.8 157.7 154.5Q155.9 156.8 153 157.6ZM160.4 155Q165.2 155.2 163.5 159.7Q161.2 157.9 160.4 155ZM151.6 182.7Q148.3 185.7 146.6 181.7Q149.3 181.4 151.6 182.7ZM145.3 179.6Q142.3 176.3 146.3 174.6Q146.6 177.3 145.3 179.6ZM148.4 173.3Q151.7 170.3 153.4 174.3Q150.7 174.6 148.4 173.3ZM154.7 176.4Q157.7 179.7 153.7 181.4Q153.4 178.7 154.7 176.4ZM71.3 199.8Q69.5 203.8 66.3 200.7Q68.6 199.4 71.3 199.8ZM64.2 199.3Q60.2 197.5 63.3 194.3Q64.6 196.6 64.2 199.3ZM64.7 192.2Q66.5 188.2 69.7 191.3Q67.4 192.6 64.7 192.2ZM71.8 192.7Q75.8 194.5 72.7 197.7Q71.4 195.4 71.8 192.7ZM171.6 201Q167.4 202.5 167.4 198Q170 198.9 171.6 201ZM167 195.6Q165.5 191.4 170 191.4Q169.1 194 167 195.6ZM172.4 191Q176.6 189.5 176.6 194Q174 193.1 172.4 191ZM177 196.4Q178.5 200.6 174 200.6Q174.9 198 177 196.4Z" fill="#000" opacity="0.22" />
      {/* patas traseras */}
      <ellipse cx="78" cy="210" rx="20" ry="8.5" fill={BODY_LIGHT} />
      <ellipse cx="162" cy="210" rx="20" ry="8.5" fill={BODY_LIGHT} />
      {/* patas delanteras */}
      <path d="M98 148 C93 150 92 156 92 162 L94 205 C94 212 114 212 114 205 L115 162 C115 154 111 148 105 148 Z" fill={BODY} />
      <path d="M142 148 C147 150 148 156 148 162 L146 205 C146 212 126 212 126 205 L125 162 C125 154 129 148 135 148 Z" fill={BODY} />
      <path d="M97 152 C95 160 95 180 97 204 C99 208 101 209 102 209 C99 190 99 166 102 150 Z" fill="#fff" opacity="0.1" />
      <path d="M142 150 C147 152 148 156 148 162 L146 205 C146 209 141 211 136 211 C141 194 143 172 142 150 Z" fill="#000" opacity="0.14" />
      <ellipse cx="104" cy="208" rx="12" ry="6.5" fill={BODY_LIGHT} />
      <ellipse cx="136" cy="208" rx="12" ry="6.5" fill={BODY_LIGHT} />
      <path d="M100 205 v5 M108 205 v5 M132 205 v5 M140 205 v5" stroke={BODY_DARK} strokeWidth="1.6" strokeLinecap="round" />
      {/* cola rodeando las patas */}
      <path d="M180 194 C180 213 150 220 116 220 C98 220 84 218 80 213 C78 208 84 206 88 208 C98 212 112 213 128 213 C152 212 168 206 170 192 Z" fill={BODY} />
      <path d="M90 211 C104 215 126 216 148 212.5 C128 218.5 104 218.5 92 215 Z" fill="#fff" opacity="0.14" />
      {/* orejas */}
      <path d="M70 68 C62 42 70 22 84 16 C100 22 110 36 112 50 Z" fill={BODY} />
      <path d="M170 68 C178 42 170 22 156 16 C140 22 130 36 128 50 Z" fill={BODY} />
      <path d="M79 56 C75 42 79 31 86 26 C95 31 102 40 104 48 Z" fill="#6e5b69" />
      <path d="M161 56 C165 42 161 31 154 26 C145 31 138 40 136 48 Z" fill="#6e5b69" />
      {/* cabeza */}
      <ellipse cx="120" cy="80" rx="50" ry="43" fill={BODY} />
      <ellipse cx="102" cy="56" rx="26" ry="11" fill="#fff" opacity="0.13" />
      <path d="M148 46 C164 58 172 76 168 92 C162 110 148 120 130 123 C154 108 160 78 148 46 Z" fill="#000" opacity="0.16" />
      {/* hocico */}
      <ellipse cx="120" cy="101" rx="25" ry="18" fill={BODY_LIGHT} />
      <path d="M110 88 h20 q3 0 1 3.5 l-8 9 q-3 3 -6 0 l-8 -9 q-2 -3.5 1 -3.5 z" fill={NOSE} />
      <ellipse cx="115.5" cy="90.5" rx="3.6" ry="1.4" fill="#fff" opacity="0.25" />
      <path d="M120 101 v6 M120 107 q-6 7 -14 2 M120 107 q6 7 14 2" stroke={NOSE} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M96 101 l-30 -7 M96 106 l-30 4 M144 101 l30 -7 M144 106 l30 4" stroke="#d9d3df" strokeWidth="1.4" strokeLinecap="round" />
      {/* ojos amarillos */}
      <ellipse cx="99" cy="76" rx="10" ry="8" fill={EYE} />
      <ellipse cx="141" cy="76" rx="10" ry="8" fill={EYE} />
      <ellipse cx="99" cy="76" rx="3.6" ry="6.8" fill={INK} />
      <ellipse cx="141" cy="76" rx="3.6" ry="6.8" fill={INK} />
      <circle cx="101.8" cy="72.8" r="2" fill="#fff" />
      <circle cx="143.8" cy="72.8" r="2" fill="#fff" />
      <path d="M88 70 q11 -10 22 0" stroke={NOSE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M130 70 q11 -10 22 0" stroke={NOSE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
