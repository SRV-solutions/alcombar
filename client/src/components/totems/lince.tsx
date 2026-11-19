import { INK, type TotemArt } from './types';

/** Lince: sentado, de frente. Orejas en punta con borde negro y pinceles negros, patillas claras rayadas en las mejillas, patas grandes y la cola cortita de punta negra. */
const FUR = '#c3a27f';
const FUR_DARK = '#a6845f';
const FUR_LIGHT = '#d9c1a0';
const CREAM = '#f6eee2';
const MARK = '#33251e';
const SPOT = '#8a6a4c';

const art: TotemArt = {
  bg: '#dcdff3',
  face: [62, 20, 116],
  art: (
    <>
      <circle cx="120" cy="124" r="102" fill="#fff" opacity="0.35" />
      <ellipse cx="124" cy="219" rx="76" ry="9" fill="#000" opacity="0.12" />
      {/* cola cortita, de punta negra */}
      <path d="M168 206 C180 208 194 204 198 196 C201 189 194 184 189 189 C186 194 180 197 168 196 Z" fill={FUR_DARK} />
      <path d="M198 196 C201 189 194 184 189 189 C191 193 195 196 198 196 Z" fill={MARK} />
      {/* ancas */}
      <ellipse cx="78" cy="188" rx="25" ry="27" fill={FUR_DARK} />
      <ellipse cx="162" cy="188" rx="25" ry="27" fill={FUR_DARK} />
      {/* cuerpo y pecho */}
      <path d="M120 104 C86 104 66 136 67 172 C68 198 85 213 120 213 C155 213 172 198 173 172 C174 136 154 104 120 104 Z" fill={FUR} />
      <path d="M120 122 C103 122 94 146 94 170 C94 195 105 209 120 209 C135 209 146 195 146 170 C146 146 137 122 120 122 Z" fill={CREAM} />
      <path d="M152 116 C166 132 174 152 173 172 C172 198 155 213 120 213 C150 204 162 170 152 116 Z" fill="#000" opacity="0.08" />
      <path d="M76.2 150a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M84.2 162a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M74.1 170a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0M82.2 182a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M64.2 190a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M74.2 198a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M160.2 150a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M152.2 162a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M162.1 170a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0M154.2 182a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M172.2 190a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M162.2 198a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0" fill={SPOT} />
      {/* patas traseras */}
      <ellipse cx="74" cy="210" rx="21" ry="9" fill={FUR_LIGHT} />
      <ellipse cx="166" cy="210" rx="21" ry="9" fill={FUR_LIGHT} />
      {/* patas delanteras, con las manos grandes */}
      <path d="M94 148 C88 150 87 156 87 162 L89 203 C89 212 115 212 115 203 L116 162 C116 154 111 148 104 148 Z" fill={FUR} />
      <path d="M146 148 C152 150 153 156 153 162 L151 203 C151 212 125 212 125 203 L124 162 C124 154 129 148 136 148 Z" fill={FUR} />
      <path d="M146 150 C152 152 153 156 153 162 L151 203 C151 208 146 211 140 211 C145 194 147 172 146 150 Z" fill="#000" opacity="0.08" />
      <path d="M97.3 166a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0 -3.4 0M106.3 176a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0 -3.4 0M95.4 186a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M139.3 166a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0 -3.4 0M130.3 176a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0 -3.4 0M141.4 186a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0" fill={SPOT} />
      <ellipse cx="101.5" cy="206.5" rx="15" ry="8" fill={CREAM} />
      <ellipse cx="138.5" cy="206.5" rx="15" ry="8" fill={CREAM} />
      <path d="M95 203.5 v6 M101.5 203 v7 M108 203.5 v6 M132 203.5 v6 M138.5 203 v7 M145 203.5 v6" stroke={FUR_DARK} strokeWidth="1.6" strokeLinecap="round" />
      {/* orejas en punta, de borde negro, con pinceles */}
      <path d="M84.5 26 C83 19 83 12 84.5 5 C88 11 89.5 18 88.5 26 Z" fill={MARK} />
      <path d="M155.5 26 C157 19 157 12 155.5 5 C152 11 150.5 18 151.5 26 Z" fill={MARK} />
      <path d="M72 70 C68 50 74 32 86 22 C98 32 108 46 112 58 Z" fill={MARK} />
      <path d="M168 70 C172 50 166 32 154 22 C142 32 132 46 128 58 Z" fill={MARK} />
      <path d="M77 64 C75 50 79 37 87 29 C96 37 103 47 106 56 Z" fill={FUR} />
      <path d="M163 64 C165 50 161 37 153 29 C144 37 137 47 134 56 Z" fill={FUR} />
      <path d="M83 58 C82 48 84 40 88 35 C93 41 98 48 100 55 Z" fill={CREAM} />
      <path d="M157 58 C158 48 156 40 152 35 C147 41 142 48 140 55 Z" fill={CREAM} />
      {/* patillas: el pelo largo de las mejillas, rayado */}
      <path d="M86 92 C76 104 66 118 58 134 L70 129 L67 141 L80 133 L83 143 L94 131 L100 136 C104 122 104 108 100 98 Z" fill={CREAM} />
      <path d="M154 92 C164 104 174 118 182 134 L170 129 L173 141 L160 133 L157 143 L146 131 L140 136 C136 122 136 108 140 98 Z" fill={CREAM} />
      {/* cabeza */}
      <ellipse cx="120" cy="86" rx="44" ry="38" fill={FUR} />
      <ellipse cx="104" cy="64" rx="20" ry="8" fill="#fff" opacity="0.15" />
      <path d="M146 58 C160 68 166 86 162 100 C158 114 146 122 132 124 C152 110 158 84 146 58 Z" fill="#000" opacity="0.07" />
      <path d="M113 52Q112.2 59.1 114 66Q114.8 58.9 113 52ZM127 52Q125.2 58.9 126 66Q127.8 59.1 127 52ZM120 50Q118.7 56 120 62Q121.3 56 120 50ZM66 124Q75.6 124.7 84 120Q74.8 121.2 66 124ZM70 135Q78.9 134.4 86 129Q77.8 131.4 70 135ZM174 124Q165.2 121.2 156 120Q164.4 124.7 174 124ZM170 135Q162.2 131.4 154 129Q161.1 134.4 170 135ZM78 92Q84.6 95.3 92 96Q85.4 92.7 78 92ZM162 92Q154.6 92.7 148 96Q155.4 95.3 162 92Z" fill={MARK} />
      {/* blanco alrededor de los ojos y hocico */}
      <ellipse cx="101" cy="85" rx="12.5" ry="10" fill={CREAM} />
      <ellipse cx="139" cy="85" rx="12.5" ry="10" fill={CREAM} />
      <ellipse cx="120" cy="106" rx="22" ry="15" fill={CREAM} />
      <path d="M110 95 h20 q3 0 1 3.5 l-8 8 q-3 3 -6 0 l-8 -8 q-2 -3.5 1 -3.5 z" fill="#a86c5c" />
      <ellipse cx="116" cy="97.5" rx="3.5" ry="1.3" fill="#fff" opacity="0.3" />
      <path d="M120 107 v4 M120 111 q-6 6 -12 2 M120 111 q6 6 12 2" stroke={MARK} strokeWidth="2.3" strokeLinecap="round" fill="none" />
      <path d="M104.1 106a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M101.1 110a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M105.1 113a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M134.1 106a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M137.1 110a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M133.1 113a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0" fill={SPOT} />
      <path d="M99 108 l-30 -6 M99 113 l-30 4 M141 108 l30 -6 M141 113 l30 4" stroke="#fffaf2" strokeWidth="1.4" strokeLinecap="round" />
      {/* ojos */}
      <ellipse cx="102" cy="83" rx="8.5" ry="7.5" fill="#cfb24a" />
      <ellipse cx="138" cy="83" rx="8.5" ry="7.5" fill="#cfb24a" />
      <circle cx="102" cy="83" r="4" fill={INK} />
      <circle cx="138" cy="83" r="4" fill={INK} />
      <circle cx="104.2" cy="80.5" r="1.8" fill="#fff" />
      <circle cx="140.2" cy="80.5" r="1.8" fill="#fff" />
      <path d="M92 78 q10 -10 20 -1" stroke={MARK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M148 78 q-10 -10 -20 -1" stroke={MARK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
};
export default art;
