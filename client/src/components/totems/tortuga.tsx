import { INK, type TotemArt } from './types';

/** Tortuga terrestre: de perfil, caminando. Caparazón alto con sus placas (fila del lomo, fila del costado y el borde), patas de columna con uñitas, cabeza asomada. */
const SHELL = '#a47c45';
const SHELL_LIGHT = '#c8a166';
const SEAM = '#6b4f2c';
const RIM = '#8b6838';
const SKIN = '#a39b68';
const SKIN_DARK = '#857e50';
const SKIN_LIGHT = '#cbc391';
const NAIL = '#f2ead2';

const art: TotemArt = {
  bg: '#dcefd8',
  face: [-2, 52, 104],
  art: (
    <>
      <circle cx="120" cy="122" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="128" cy="197" rx="88" ry="8" fill="#000" opacity="0.12" />
      {/* cola */}
      <path d="M198 152 C206 154 212 158 218 166 C210 168 202 166 196 162 Z" fill={SKIN_DARK} />
      {/* patas de atrás (lado lejano) */}
      <path d="M100 150 L120 150 C120 166 122 180 122 188 C122 194 116 196 110 196 C102 196 98 193 98 188 C98 176 100 164 100 150 Z" fill={SKIN_DARK} />
      <path d="M142 150 L162 150 C162 166 164 180 164 188 C164 194 158 196 152 196 C144 196 140 193 140 188 C140 176 142 164 142 150 Z" fill={SKIN_DARK} />
      {/* cuello, saliendo de abajo del caparazón */}
      <path d="M28 108 C30 124 36 140 48 150 L72 150 L72 122 C64 118 58 112 56 104 Z" fill={SKIN} />
      <path d="M56 104 C58 112 64 118 72 122 L72 150 L62 150 C62 136 60 120 56 104 Z" fill="#000" opacity="0.1" />
      <path d="M34 122 q7 3 14 0 M38 134 q7 3 14 0" stroke={SKIN_DARK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* cabeza */}
      <ellipse cx="36" cy="98" rx="24" ry="18" fill={SKIN} transform="rotate(-12 36 98)" />
      <path d="M14 104 C20 114 34 118 48 114 C54 112 58 108 58 104 C50 110 36 112 24 108 Z" fill={SKIN_LIGHT} />
      <ellipse cx="30" cy="88" rx="11" ry="5" fill="#fff" opacity="0.18" transform="rotate(-14 30 88)" />
      {/* patas de adelante y de atrás (lado cercano) */}
      <path d="M66 148 L94 148 C96 164 98 178 98 188 C98 194 92 197 82 197 C70 197 62 194 62 188 C62 176 64 162 66 148 Z" fill={SKIN} />
      <path d="M166 148 L194 148 C196 164 198 178 198 188 C198 194 192 197 182 197 C170 197 162 194 162 188 C162 176 164 162 166 148 Z" fill={SKIN} />
      <path d="M86 156 C92 166 96 178 96 190 C94 194 90 196 84 197 C92 186 92 170 86 156 Z M186 156 C192 166 196 178 196 190 C194 194 190 196 184 197 C192 186 192 170 186 156 Z" fill="#000" opacity="0.1" />
      <path d="M72 166 a2.4 2 0 1 1 4.8 0 a2.4 2 0 1 1 -4.8 0 Z M80 176 a2.2 1.8 0 1 1 4.4 0 a2.2 1.8 0 1 1 -4.4 0 Z M172 166 a2.4 2 0 1 1 4.8 0 a2.4 2 0 1 1 -4.8 0 Z M180 176 a2.2 1.8 0 1 1 4.4 0 a2.2 1.8 0 1 1 -4.4 0 Z" fill={SKIN_DARK} />
      {/* uñitas */}
      <ellipse cx="68" cy="194" rx="3.4" ry="2.6" fill={NAIL} />
      <ellipse cx="76" cy="195.5" rx="3.4" ry="2.6" fill={NAIL} />
      <ellipse cx="84" cy="195.5" rx="3.4" ry="2.6" fill={NAIL} />
      <ellipse cx="168" cy="194" rx="3.4" ry="2.6" fill={NAIL} />
      <ellipse cx="176" cy="195.5" rx="3.4" ry="2.6" fill={NAIL} />
      <ellipse cx="184" cy="195.5" rx="3.4" ry="2.6" fill={NAIL} />
      {/* caparazón */}
      <path d="M50 150 C50 98 88 66 128 66 C170 66 206 98 206 146 C206 154 200 158 192 158 L62 158 C54 158 50 156 50 150 Z" fill={SHELL} />
      {/* placas: brillo en el centro de cada una */}
      <ellipse cx="86" cy="88" rx="11" ry="6" fill={SHELL_LIGHT} transform="rotate(-30 86 88)" />
      <ellipse cx="128" cy="76" rx="12" ry="5.5" fill={SHELL_LIGHT} />
      <ellipse cx="170" cy="88" rx="11" ry="6" fill={SHELL_LIGHT} transform="rotate(30 170 88)" />
      <ellipse cx="70" cy="124" rx="9" ry="8" fill={SHELL_LIGHT} />
      <ellipse cx="108" cy="114" rx="12" ry="9" fill={SHELL_LIGHT} />
      <ellipse cx="148" cy="114" rx="12" ry="9" fill={SHELL_LIGHT} />
      <ellipse cx="186" cy="124" rx="9" ry="8" fill={SHELL_LIGHT} />
      {/* borde del caparazón */}
      <path d="M46 146 C64 138 96 136 128 136 C160 136 192 138 210 146 L210 152 C210 160 204 164 196 164 L60 164 C52 164 46 160 46 152 Z" fill={RIM} />
      {/* juntas de las placas */}
      <path d="M62 126 C74 96 100 86 128 86 C156 86 182 96 194 124 M110 87 L108 70 M146 87 L148 70 M90 95 L86 137 M128 86 L128 136 M166 95 L170 137 M66 142 L64 162 M84 139 L83 163 M102 137 L102 163 M120 136 L120 163 M138 136 L138 163 M156 137 L157 163 M174 139 L175 163 M192 142 L194 162" stroke={SEAM} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <ellipse cx="98" cy="84" rx="24" ry="7" fill="#fff" opacity="0.14" transform="rotate(-22 98 84)" />
      <path d="M170 74 C194 90 206 116 206 146 L196 146 C196 118 188 94 170 74 Z" fill="#000" opacity="0.1" />
      {/* cara */}
      <path d="M13 102 C20 108 30 110 40 106" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="93" r="1.4" fill={INK} />
      <circle cx="34" cy="92" r="4.8" fill={INK} />
      <circle cx="35.7" cy="90.3" r="1.7" fill="#fff" />
      <path d="M28 85 q6 -4 12 0" stroke={SKIN_DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
