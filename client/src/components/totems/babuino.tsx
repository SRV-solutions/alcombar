import { INK, type TotemArt } from './types';

/** Babuino hamadryas (macho): sentado, de frente. Melena plateada en capa sobre los hombros, cara rosada y alargada de hocico largo. */
const MANE = '#c9c5bd';
const MANE_DARK = '#a7a29a';
const MANE_LIGHT = '#e6e3dd';
const BODY = '#9d958a';
const BODY_DARK = '#857d72';
const FACE = '#e79b95';
const FACE_DARK = '#cf7f7a';
const FACE_LIGHT = '#f2b4ad';
const HAND = '#6f5f57';
const CAPE =
  'M120 30 C140 30 158 36 168 52 C176 64 182 74 188 88 C196 104 204 122 206 142 C207 154 205 164 200 174 C196 166 192 162 188 160 C188 168 186 174 182 180 C178 172 174 166 170 162 C168 168 164 174 160 178 C156 170 152 164 148 160 C142 154 132 148 120 146 C108 148 98 154 92 160 C88 164 84 170 80 178 C76 174 72 168 70 162 C66 166 62 172 58 180 C54 174 52 168 52 160 C48 162 44 166 40 174 C35 164 33 154 34 142 C36 122 44 104 52 88 C58 74 64 64 72 52 C82 36 100 30 120 30 Z';

const art: TotemArt = {
  bg: '#f0cba3',
  face: [58, 44, 124],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="124" cy="214" rx="80" ry="9" fill="#000" opacity="0.12" />
      {/* cola */}
      <path d="M156 202 C190 210 216 196 216 166 C216 156 206 154 205 164 C204 184 188 192 156 190 Z" fill={BODY_DARK} />
      <ellipse cx="210" cy="158" rx="7.5" ry="10" fill={MANE_DARK} />
      {/* ancas */}
      <ellipse cx="80" cy="190" rx="26" ry="23" fill={BODY_DARK} />
      <ellipse cx="160" cy="190" rx="26" ry="23" fill={BODY_DARK} />
      {/* cuerpo */}
      <path d="M120 110 C88 110 70 140 70 174 C70 198 86 212 120 212 C154 212 170 198 170 174 C170 140 152 110 120 110 Z" fill={BODY} />
      <path d="M120 150 C108 150 102 166 102 182 C102 200 109 209 120 209 C131 209 138 200 138 182 C138 166 132 150 120 150 Z" fill="#b7aea2" />
      {/* pies */}
      <ellipse cx="76" cy="210" rx="20" ry="7.5" fill={HAND} />
      <ellipse cx="164" cy="210" rx="20" ry="7.5" fill={HAND} />
      {/* brazos y manos */}
      <path d="M86 150 C82 170 84 188 88 204 C90 212 108 212 108 204 L110 156 Z" fill={BODY} />
      <path d="M154 150 C158 170 156 188 152 204 C150 212 132 212 132 204 L130 156 Z" fill={BODY} />
      <path d="M154 150 C158 170 156 188 152 204 C150 210 142 212 138 210 C146 196 150 172 154 150 Z" fill="#000" opacity="0.1" />
      <ellipse cx="99" cy="208" rx="12" ry="6.5" fill={HAND} />
      <ellipse cx="141" cy="208" rx="12" ry="6.5" fill={HAND} />
      <path d="M94 206 v4 M99 206 v5 M104 206 v4 M136 206 v4 M141 206 v5 M146 206 v4" stroke="#57483f" strokeWidth="1.5" strokeLinecap="round" />
      {/* capa de melena plateada */}
      <path d={CAPE} fill={MANE_DARK} transform="translate(0 6)" />
      <path d={CAPE} fill={MANE} />
      <path d="M180 74 C196 100 206 124 206 142 C207 154 205 164 200 174 C196 166 192 162 188 160 C188 168 186 174 182 180 C180 176 178 172 176 170 C192 150 196 112 180 74 Z" fill="#000" opacity="0.08" />
      <path d="M72 56 C58 76 44 106 40 140 C48 112 60 86 80 62 Z" fill="#fff" opacity="0.22" />
      <path d="M88 54 C76 68 66 88 60 112 M152 54 C164 68 174 88 180 112 M84 112 C76 132 70 150 70 162 M156 112 C164 132 170 150 170 162 M60 128 C54 144 52 156 52 160 M180 128 C186 144 188 156 188 160" stroke={MANE_DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* patillas que enmarcan la cara */}
      <path d="M100 62 C88 64 76 72 68 84 L78 84 C70 94 64 106 62 118 L74 112 C70 124 70 136 74 146 L84 132 C88 142 94 150 103 154 L103 102 C99 96 94 90 94 80 C94 72 96 66 100 62 Z" fill={MANE_LIGHT} />
      <path d="M140 62 C152 64 164 72 172 84 L162 84 C170 94 176 106 178 118 L166 112 C170 124 170 136 166 146 L156 132 C152 142 146 150 137 154 L137 102 C141 96 146 90 146 80 C146 72 144 66 140 62 Z" fill={MANE_LIGHT} />
      {/* cara rosada, larga */}
      <path d="M120 60 C136 60 146 68 146 80 C146 90 141 96 137 102 L137 136 C137 146 130 152 120 152 C110 152 103 146 103 136 L103 102 C99 96 94 90 94 80 C94 68 104 60 120 60 Z" fill={FACE} />
      <path d="M140 70 C147 80 146 92 137 102 L137 136 C137 146 130 152 122 152 C130 144 132 132 132 120 C132 104 140 94 140 70 Z" fill="#000" opacity="0.08" />
      {/* hocico largo */}
      <path d="M120 92 C127 92 131 98 131 106 L131 134 C131 142 126 146 120 146 C114 146 109 142 109 134 L109 106 C109 98 113 92 120 92 Z" fill={FACE_LIGHT} />
      <ellipse cx="116" cy="112" rx="3" ry="10" fill="#fff" opacity="0.2" />
      <ellipse cx="115" cy="139" rx="3.4" ry="2.4" fill={INK} transform="rotate(20 115 139)" />
      <ellipse cx="125" cy="139" rx="3.4" ry="2.4" fill={INK} transform="rotate(-20 125 139)" />
      <path d="M114 148 q6 3 12 0" stroke={FACE_DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* cejas suaves y ojos */}
      <path d="M98 78 C102 71 112 70 119 75 M121 75 C128 70 138 71 142 78" stroke={FACE_DARK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <ellipse cx="109" cy="86" rx="6" ry="5.6" fill="#a8742e" />
      <ellipse cx="131" cy="86" rx="6" ry="5.6" fill="#a8742e" />
      <circle cx="109" cy="86.4" r="3.7" fill={INK} />
      <circle cx="131" cy="86.4" r="3.7" fill={INK} />
      <circle cx="110.8" cy="84" r="1.7" fill="#fff" />
      <circle cx="132.8" cy="84" r="1.7" fill="#fff" />
    </>
  ),
};
export default art;
