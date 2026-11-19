import { INK, type TotemArt } from './types';

/** Oso pardo: sentado de frente, con las patas traseras hacia adelante mostrando las plantas. Pelaje marrón, hocico claro, orejas redondas y garras claras. */
const FUR = '#8b5a3a';
const FUR_DARK = '#6f4429';
const FUR_LIGHT = '#a6714b';
const MUZZLE = '#cfa37a';
const PAD = '#4b3026';
const CLAW = '#eadfcb';

const art: TotemArt = {
  bg: '#d9e7f3',
  face: [56, 18, 128],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="120" cy="216" rx="90" ry="9" fill="#000" opacity="0.12" />
      {/* cuerpo y panza */}
      <path d="M120 92 C80 92 54 128 54 166 C54 198 82 214 120 214 C158 214 186 198 186 166 C186 128 160 92 120 92 Z" fill={FUR} />
      <path d="M120 122 C98 122 86 146 86 170 C86 194 100 206 120 206 C140 206 154 194 154 170 C154 146 142 122 120 122 Z" fill={FUR_LIGHT} />
      <path d="M160 112 C178 128 188 148 186 168 C184 198 158 214 120 214 C156 204 172 168 160 112 Z" fill="#000" opacity="0.08" />
      <path d="M60 172 C60 150 68 134 82 122 C75 138 70 152 68 172 Z" fill="#fff" opacity="0.12" />
      {/* brazos, con las manos apoyadas */}
      <path d="M84 116 C72 134 72 168 86 192 C92 202 108 202 110 192 C110 172 104 146 100 124 Z" fill={FUR} />
      <path d="M156 116 C168 134 168 168 154 192 C148 202 132 202 130 192 C130 172 136 146 140 124 Z" fill={FUR} />
      <path d="M156 116 C168 134 168 168 154 192 C150 198 144 200 138 199 C156 180 160 150 156 116 Z" fill="#000" opacity="0.1" />
      <ellipse cx="98" cy="196" rx="13" ry="9" fill={FUR_DARK} />
      <ellipse cx="142" cy="196" rx="13" ry="9" fill={FUR_DARK} />
      <path d="M91 201 v4 M97 202 v4 M103 201 v4 M137 201 v4 M143 202 v4 M149 201 v4" stroke={CLAW} strokeWidth="2" strokeLinecap="round" />
      {/* patas traseras hacia adelante, con las plantas */}
      <ellipse cx="70" cy="198" rx="25" ry="21" fill={FUR} transform="rotate(-14 70 198)" />
      <ellipse cx="170" cy="198" rx="25" ry="21" fill={FUR} transform="rotate(14 170 198)" />
      <path d="M190 186 C196 200 190 214 176 218 C166 220 156 216 150 210 C172 212 186 202 190 186 Z" fill="#000" opacity="0.1" />
      <ellipse cx="71" cy="204" rx="12.5" ry="10" fill={PAD} />
      <ellipse cx="169" cy="204" rx="12.5" ry="10" fill={PAD} />
      <circle cx="56" cy="194" r="4.2" fill={PAD} />
      <circle cx="62" cy="186.5" r="4.4" fill={PAD} />
      <circle cx="71.5" cy="184" r="4.4" fill={PAD} />
      <circle cx="80.5" cy="187" r="4.2" fill={PAD} />
      <circle cx="184" cy="194" r="4.2" fill={PAD} />
      <circle cx="178" cy="186.5" r="4.4" fill={PAD} />
      <circle cx="168.5" cy="184" r="4.4" fill={PAD} />
      <circle cx="159.5" cy="187" r="4.2" fill={PAD} />
      {/* orejas redondas */}
      <circle cx="78" cy="42" r="17" fill={FUR} />
      <circle cx="162" cy="42" r="17" fill={FUR} />
      <circle cx="79" cy="43.5" r="9" fill={FUR_DARK} />
      <circle cx="161" cy="43.5" r="9" fill={FUR_DARK} />
      {/* cabeza */}
      <ellipse cx="120" cy="78" rx="52" ry="44" fill={FUR} />
      <ellipse cx="100" cy="51" rx="22" ry="9" fill="#fff" opacity="0.14" />
      <path d="M152 44 C170 56 176 76 172 92 C166 110 152 120 134 122 C158 108 164 76 152 44 Z" fill="#000" opacity="0.08" />
      {/* hocico */}
      <ellipse cx="120" cy="99" rx="25" ry="19" fill={MUZZLE} />
      <path d="M108 87 h24 q4 0 2 4.5 l-8 8 q-4 4 -8 0 l-8 -8 q-2 -4.5 2 -4.5 z" fill={INK} />
      <ellipse cx="114" cy="90" rx="4" ry="1.6" fill="#fff" opacity="0.3" />
      <path d="M120 101 v5 M120 106 q-7 6 -13 1 M120 106 q7 6 13 1" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {/* ojos */}
      <circle cx="100" cy="74" r="5.4" fill={INK} />
      <circle cx="140" cy="74" r="5.4" fill={INK} />
      <circle cx="102" cy="72" r="1.9" fill="#fff" />
      <circle cx="142" cy="72" r="1.9" fill="#fff" />
      <path d="M92 64 q8 -5 16 -1 M132 63 q8 -4 16 1" stroke={FUR_DARK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
