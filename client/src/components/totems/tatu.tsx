import { INK, type TotemArt } from './types';

/** Tatú carreta (armadillo gigante): de perfil, caminando. Caparazón alto con bandas y borde claro, hocico largo, uñas delanteras enormes. */
const SHELL = '#6a5444';
const SHELL_DARK = '#57443a';
const BAND = '#5b483b';
const LINE = '#8f7561';
const RIM = '#e2cfa6';
const SKIN = '#cfae97';
const SKIN_DARK = '#b8937c';
const LEG = '#6b5546';
const CLAW = '#efe2c6';

const art: TotemArt = {
  bg: '#e6eecb',
  face: [-4, 80, 112],
  art: (
    <>
      <circle cx="120" cy="122" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="122" cy="205" rx="100" ry="8" fill="#000" opacity="0.12" />
      {/* cola */}
      <path d="M198 146 C214 156 224 176 228 202 C222 202 216 198 212 190 C206 174 198 164 188 158 Z" fill={SHELL_DARK} />
      <path d="M206 166 l6 -4 M213 178 l6 -3 M218 190 l6 -2" stroke={LINE} strokeWidth="1.8" strokeLinecap="round" />
      {/* cabeza (sale de abajo del caparazón) */}
      <path d="M84 122 C72 108 50 108 38 122 C30 132 24 148 20 162 C19 169 25 172 30 168 C40 160 52 156 62 152 C74 148 84 140 84 130 Z" fill={SKIN} />
      <path d="M84 132 C82 142 72 150 62 154 C50 158 38 162 30 168 C40 156 58 148 84 132 Z" fill={SKIN_DARK} />
      <path d="M82 120 C70 108 52 108 42 118 C54 116 68 120 80 130 Z" fill={SHELL} />
      <path d="M50 116 C43 105 48 96 57 98 C61 104 59 112 50 116 Z" fill={SKIN_DARK} />
      <ellipse cx="22" cy="166" rx="3.6" ry="3.2" fill="#6a4a40" />
      <ellipse cx="58" cy="140" rx="5" ry="3.2" fill="#ef8f7e" opacity="0.45" />
      <circle cx="46" cy="129" r="4.6" fill={INK} />
      <circle cx="47.6" cy="127.4" r="1.6" fill="#fff" />
      <path d="M32 162 q5 2 9 -2" stroke="#8a6656" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* patas */}
      <path d="M68 160 C66 178 68 192 70 200 C74 206 92 206 94 200 C94 188 94 174 92 160 Z" fill={LEG} />
      <path d="M170 158 C168 178 170 194 172 201 C176 206 194 206 196 201 C196 188 196 172 194 158 Z" fill={LEG} />
      <path d="M86 172 C92 182 92 194 90 202 C94 202 95 196 94 186 C94 178 92 172 86 172 Z M188 170 C194 180 194 194 192 202 C196 202 197 196 196 186 Z" fill="#000" opacity="0.12" />
      {/* uñas delanteras enormes */}
      <path d="M74 186 C58 182 42 188 36 204 C34 208 38 209 40 205 C46 196 58 194 72 196 Z" fill={CLAW} />
      <path d="M78 193 C66 191 54 196 50 205 C49 208 52 208 54 206 C58 201 66 200 78 201 Z M84 198 C78 198 72 201 70 206 C70 208 72 208 74 207 C76 204 79 204 84 204 Z" fill={CLAW} />
      <path d="M40 205 C46 196 58 194 72 196 L72 199 C60 197 48 199 40 205 Z" fill="#000" opacity="0.12" />
      <path d="M176 199 C170 199 164 202 162 206 C168 205 172 205 178 205 Z M184 200 C180 200 175 203 174 206 C178 206 182 206 186 205 Z" fill={CLAW} />
      {/* caparazón */}
      <path d="M54 164 C50 104 90 50 138 50 C188 50 218 96 216 156 C176 170 96 174 54 164 Z" fill={SHELL} />
      <path d="M96 65.8 L107 59 Q104 107.1 107 160.7 L96 159.9 Q93 110.1 96 65.8 Z M118 54.5 L129 52.1 Q126 103.8 129 161 L118 161 Q115 105 118 54.5 Z M140 51.5 L151 52.5 Q154 103.4 151 159.7 L140 160.5 Q143 103.3 140 51.5 Z M162 55.2 L173 60.1 Q176 105.7 173 156.8 L162 158.5 Q165 104.1 162 55.2 Z" fill={BAND} />
      <path d="M96 67.3 Q93 110.1 96 154.9 M107 60.5 Q104 107.1 107 155.7 M118 56 Q115 105 118 156 M129 53.6 Q126 103.8 129 156 M140 53 Q143 103.3 140 155.5 M151 54 Q154 103.4 151 154.7 M162 56.7 Q165 104.1 162 153.5 M173 61.6 Q176 105.7 173 151.8 M184 69.2 Q187 108.4 184 149.5" stroke={LINE} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* escudos de adelante y de atrás, con escamitas */}
      <path d="M85 85 q3 3 6 0 M73 94 q3 3 6 0 M81 94 q3 3 6 0 M69 103 q3 3 6 0 M77 103 q3 3 6 0 M85 103 q3 3 6 0 M65 112 q3 3 6 0 M73 112 q3 3 6 0 M81 112 q3 3 6 0 M69 121 q3 3 6 0 M77 121 q3 3 6 0 M85 121 q3 3 6 0 M65 130 q3 3 6 0 M73 130 q3 3 6 0 M81 130 q3 3 6 0 M61 139 q3 3 6 0 M69 139 q3 3 6 0 M77 139 q3 3 6 0 M85 139 q3 3 6 0 M187 94 q3 3 6 0 M195 94 q3 3 6 0 M191 103 q3 3 6 0 M199 103 q3 3 6 0 M187 112 q3 3 6 0 M195 112 q3 3 6 0 M191 121 q3 3 6 0 M199 121 q3 3 6 0 M187 130 q3 3 6 0 M195 130 q3 3 6 0 M203 130 q3 3 6 0 M191 139 q3 3 6 0 M199 139 q3 3 6 0" stroke={LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* luz y sombra del caparazón */}
      <path d="M68 104 C78 76 102 60 130 57 C106 66 88 82 78 108 Z" fill="#fff" opacity="0.14" />
      <path d="M194 82 C204 96 211 116 212 136 C212 144 212 150 211 154 C200 158 188 159 178 159 C198 140 204 110 194 82 Z" fill="#000" opacity="0.12" />
      {/* borde claro de abajo */}
      <path d="M54 164 C53 158 53 152 54 148 C96 162 176 160 214 140 C215 146 216 151 216 156 C176 170 96 174 54 164 Z" fill={RIM} />
    </>
  ),
};
export default art;
