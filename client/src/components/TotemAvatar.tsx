import type { ReactNode } from 'react';
import { totemAnimalLabel, type TotemAnimal } from '@shared';

/**
 * Los animales de los tótems de la tribu, dibujados para la app: un mismo estilo (formas planas, de frente o de perfil)
 * sobre un fondo de color. Son la foto de perfil de quien tiene tótem. Lienzo de 96 × 96.
 */
const INK = '#2a1a16';

const Eyes = ({ y = 46, dx = 11, r = 3.2, fill = INK }: { y?: number; dx?: number; r?: number; fill?: string }) => (
  <>
    <circle cx={48 - dx} cy={y} r={r} fill={fill} />
    <circle cx={48 + dx} cy={y} r={r} fill={fill} />
    <circle cx={48 - dx + r * 0.35} cy={y - r * 0.35} r={r * 0.3} fill="#fff" />
    <circle cx={48 + dx + r * 0.35} cy={y - r * 0.35} r={r * 0.3} fill="#fff" />
  </>
);
const Mouth = ({ y = 62, color = INK, w = 8 }: { y?: number; color?: string; w?: number }) => (
  <path d={`M48 ${y} v4 M48 ${y + 4} q-${w / 2} 4 -${w} 1 M48 ${y + 4} q${w / 2} 4 ${w} 1`} stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none" />
);

/** Felinos: misma cara, cambia el pelaje y lo que lleva encima (manchas, marcas). */
function Cat({ fur, ear, muzzle, nose = '#7a4a3a', whisker = '#fff7ea', eyes, over, children }: { fur: string; ear: string; muzzle: string; nose?: string; whisker?: string; eyes?: ReactNode; over?: ReactNode; children?: ReactNode }) {
  return (
    <>
      <path d="M17 44 C13 30 17 17 24 13 C33 16 41 24 44 32 Z" fill={fur} />
      <path d="M79 44 C83 30 79 17 72 13 C63 16 55 24 52 32 Z" fill={fur} />
      <path d="M22 36 C20 28 22 22 25.5 19.5 C30 22 34 26 36 30 Z" fill={ear} />
      <path d="M74 36 C76 28 74 22 70.5 19.5 C66 22 62 26 60 30 Z" fill={ear} />
      <ellipse cx="48" cy="54" rx="28" ry="24" fill={fur} />
      {children}
      <ellipse cx="48" cy="65" rx="13" ry="9.5" fill={muzzle} />
      {over}
      <path d="M43 58.5 h10 l-5 5.5 z" fill={nose} />
      <Mouth y={64} color={nose} />
      <path d="M34 64 l-13 -2.5 M34 67.5 l-13 2 M62 64 l13 -2.5 M62 67.5 l13 2" stroke={whisker} strokeWidth="1.1" strokeLinecap="round" />
      {eyes ?? <Eyes y={48} dx={12} />}
    </>
  );
}

const ART: Record<TotemAnimal, { bg: string; art: ReactNode }> = {
  puma: {
    bg: '#f3dcb4',
    art: (
      <Cat
        fur="#c48d55"
        ear="#5d3b29"
        muzzle="#f7ecdd"
        over={
          <>
            <ellipse cx="38.5" cy="61.5" rx="3.2" ry="4.4" fill="#5d3b29" transform="rotate(24 38.5 61.5)" />
            <ellipse cx="57.5" cy="61.5" rx="3.2" ry="4.4" fill="#5d3b29" transform="rotate(-24 57.5 61.5)" />
          </>
        }
      />
    ),
  },
  leona: {
    bg: '#f9e7a8',
    art: (
      <Cat fur="#e0ad5c" ear="#b47f3c" muzzle="#fdf3e1" nose="#8a4f3c">
        <path d="M48 32 v8" stroke="#c9924a" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="48" cy="74" rx="7" ry="3.5" fill="#fdf3e1" />
      </Cat>
    ),
  },
  pantera: {
    bg: '#c9b8e6',
    art: (
      <Cat
        fur="#2c2832"
        ear="#4b4455"
        muzzle="#3b3644"
        nose="#15121a"
        whisker="#8d8798"
        eyes={
          <>
            <ellipse cx="36" cy="48" rx="5" ry="3.6" fill="#f2c230" />
            <ellipse cx="60" cy="48" rx="5" ry="3.6" fill="#f2c230" />
            <ellipse cx="36" cy="48" rx="1.5" ry="3.2" fill="#15121a" />
            <ellipse cx="60" cy="48" rx="1.5" ry="3.2" fill="#15121a" />
          </>
        }
      />
    ),
  },
  yaguarete: {
    bg: '#cfe8c4',
    art: (
      <Cat fur="#e4a53a" ear="#7a4b1e" muzzle="#fcf1dd">
        <g fill="none" stroke="#3a2412" strokeWidth="1.7">
          <circle cx="48" cy="37" r="2.7" />
          <circle cx="38" cy="38" r="2.4" />
          <circle cx="58" cy="38" r="2.4" />
          <circle cx="27" cy="50" r="2.6" />
          <circle cx="69" cy="50" r="2.6" />
          <circle cx="30" cy="61" r="2.4" />
          <circle cx="66" cy="61" r="2.4" />
        </g>
        <g fill="#3a2412">
          <circle cx="43" cy="33" r="1.3" />
          <circle cx="53" cy="33" r="1.3" />
          <circle cx="24" cy="57" r="1.3" />
          <circle cx="72" cy="57" r="1.3" />
          <circle cx="36" cy="70" r="1.3" />
          <circle cx="60" cy="70" r="1.3" />
        </g>
      </Cat>
    ),
  },
  lobo: {
    bg: '#c8d6e8',
    art: (
      <>
        <path d="M20 42 L23 11 L44 29 Z" fill="#76828f" />
        <path d="M76 42 L73 11 L52 29 Z" fill="#76828f" />
        <path d="M25 34 L26.5 19 L37 28.5 Z" fill="#dcc6c0" />
        <path d="M71 34 L69.5 19 L59 28.5 Z" fill="#dcc6c0" />
        <path d="M48 85 C30 81 18 63 22 45 C26 31 38 27 48 27 C58 27 70 31 74 45 C78 63 66 81 48 85 Z" fill="#8e99a6" />
        <path d="M48 85 C36 81 26 69 26 57 C34 59 40 51 44 43 L48 39 L52 43 C56 51 62 59 70 57 C70 69 60 81 48 85 Z" fill="#f4f2ed" />
        <ellipse cx="48" cy="67" rx="5.2" ry="3.8" fill={INK} />
        <Mouth y={70} />
        <Eyes y={48} dx={11.5} fill="#3b2a12" />
      </>
    ),
  },
  perro: {
    bg: '#bfe3d0',
    art: (
      <>
        <ellipse cx="20" cy="50" rx="9.5" ry="19" fill="#8b5a2b" transform="rotate(12 20 50)" />
        <ellipse cx="76" cy="50" rx="9.5" ry="19" fill="#8b5a2b" transform="rotate(-12 76 50)" />
        <ellipse cx="48" cy="51" rx="25" ry="26" fill="#c98a4b" />
        <path d="M48 26 C43 34 43 44 40 52 C36 62 42 73 48 73 C54 73 60 62 56 52 C53 44 53 34 48 26 Z" fill="#fcf4e7" />
        <ellipse cx="48" cy="60" rx="5.6" ry="4.1" fill={INK} />
        <path d="M43.5 69.5 q4.5 10 9 0 z" fill="#e86a7c" />
        <Mouth y={64} />
        <Eyes y={46} dx={12} />
      </>
    ),
  },
  osa: {
    bg: '#f6cdb0',
    art: (
      <>
        <circle cx="25" cy="28" r="9.5" fill="#8b5a3a" />
        <circle cx="71" cy="28" r="9.5" fill="#8b5a3a" />
        <circle cx="25" cy="28" r="4.8" fill="#5e3b25" />
        <circle cx="71" cy="28" r="4.8" fill="#5e3b25" />
        <circle cx="48" cy="52" r="28" fill="#8b5a3a" />
        <ellipse cx="48" cy="62" rx="14" ry="11" fill="#debc96" />
        <ellipse cx="48" cy="57" rx="6" ry="4.3" fill={INK} />
        <Mouth y={61} />
        <Eyes y={45} dx={12} r={3} />
      </>
    ),
  },
  mapache: {
    bg: '#f4d9a0',
    art: (
      <>
        <path d="M21 40 L23 14 L42 29 Z" fill="#6f7780" />
        <path d="M75 40 L73 14 L54 29 Z" fill="#6f7780" />
        <path d="M26 33 L27.5 21 L36 28.5 Z" fill="#f1f1ee" />
        <path d="M70 33 L68.5 21 L60 28.5 Z" fill="#f1f1ee" />
        <ellipse cx="48" cy="54" rx="29" ry="24" fill="#a9afb7" />
        <path d="M22 43 C28 35 40 37 46 43" stroke="#f6f6f3" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M74 43 C68 35 56 37 50 43" stroke="#f6f6f3" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M20 51 C24 41 38 41 46 49 C44 59 30 63 20 51 Z" fill="#373c44" />
        <path d="M76 51 C72 41 58 41 50 49 C52 59 66 63 76 51 Z" fill="#373c44" />
        <ellipse cx="48" cy="67" rx="12" ry="9" fill="#f6f6f3" />
        <ellipse cx="48" cy="62" rx="4.6" ry="3.5" fill={INK} />
        <Mouth y={65} />
        <circle cx="35" cy="51" r="3.7" fill="#fff" />
        <circle cx="61" cy="51" r="3.7" fill="#fff" />
        <circle cx="35.4" cy="51" r="2.2" fill={INK} />
        <circle cx="60.6" cy="51" r="2.2" fill={INK} />
      </>
    ),
  },
  mangosta: {
    bg: '#e6d3ef',
    art: (
      <>
        <circle cx="24" cy="37" r="6.5" fill="#a5835a" />
        <circle cx="72" cy="37" r="6.5" fill="#a5835a" />
        <circle cx="24.5" cy="37.5" r="3.2" fill="#7c5f3e" />
        <circle cx="71.5" cy="37.5" r="3.2" fill="#7c5f3e" />
        <path d="M48 87 C36 87 28 75 24 61 C20 47 28 29 48 29 C68 29 76 47 72 61 C68 75 60 87 48 87 Z" fill="#b79466" />
        <path d="M48 87 C40 87 34 79 34 69 C34 61 42 57 48 57 C54 57 62 61 62 69 C62 79 56 87 48 87 Z" fill="#ead7b8" />
        <g stroke="#8f7149" strokeWidth="1.6" strokeLinecap="round">
          <path d="M40 34 v4 M48 32 v4 M56 34 v4 M30 44 l1.5 3.5 M66 44 l-1.5 3.5" />
        </g>
        <ellipse cx="48" cy="72" rx="4.4" ry="3.2" fill="#6b3f3a" />
        <Mouth y={75} color="#6b3f3a" w={6} />
        <Eyes y={51} dx={11} r={3.4} />
      </>
    ),
  },
  huillin: {
    bg: '#b9e3ee',
    art: (
      <>
        <circle cx="23" cy="41" r="5.5" fill="#57392a" />
        <circle cx="73" cy="41" r="5.5" fill="#57392a" />
        <ellipse cx="48" cy="52" rx="29" ry="25" fill="#6a4a36" />
        <ellipse cx="48" cy="63" rx="18" ry="13" fill="#d6bda4" />
        <path d="M41.5 54 h13 q2.5 0 1 2.8 l-5 5 q-2.5 2.2 -5 0 l-5 -5 q-1.5 -2.8 1 -2.8 z" fill={INK} />
        <Mouth y={64} />
        <path d="M33 63 l-13 -3 M33 67 l-13 2 M63 63 l13 -3 M63 67 l13 2" stroke="#f5eadd" strokeWidth="1.2" strokeLinecap="round" />
        <Eyes y={44} dx={12} r={3} />
      </>
    ),
  },
  castor: {
    bg: '#cfe6b4',
    art: (
      <>
        <circle cx="24" cy="34" r="6.5" fill="#6f4222" />
        <circle cx="72" cy="34" r="6.5" fill="#6f4222" />
        <circle cx="48" cy="52" r="27" fill="#9b6236" />
        <ellipse cx="48" cy="60" rx="15.5" ry="11.5" fill="#cb9c6d" />
        <ellipse cx="48" cy="54" rx="6" ry="4.1" fill={INK} />
        <path d="M40 62 q8 4 16 0" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <rect x="43" y="63" width="4.6" height="9" rx="1.2" fill="#f6cf7a" />
        <rect x="48.4" y="63" width="4.6" height="9" rx="1.2" fill="#f6cf7a" />
        <Eyes y={44} dx={11} r={3} />
      </>
    ),
  },
  bufalo: {
    bg: '#e9d9b8',
    art: (
      <>
        <path d="M27 39 C10 37 5 22 13 11 C14 24 22 28 33 30 Z" fill="#f1e7cf" />
        <path d="M69 39 C86 37 91 22 83 11 C82 24 74 28 63 30 Z" fill="#f1e7cf" />
        <ellipse cx="18" cy="47" rx="8.5" ry="4.6" fill="#3a2c25" transform="rotate(-15 18 47)" />
        <ellipse cx="78" cy="47" rx="8.5" ry="4.6" fill="#3a2c25" transform="rotate(15 78 47)" />
        <path d="M48 87 C36 87 30 77 30 67 C24 61 22 51 24 43 C28 31 38 27 48 27 C58 27 68 31 72 43 C74 51 72 61 66 67 C66 77 60 87 48 87 Z" fill="#4b3a31" />
        <path d="M38 31 C42 27 54 27 58 31 C54 35 42 35 38 31 Z" fill="#5d493e" />
        <ellipse cx="48" cy="73" rx="15" ry="11" fill="#7d685c" />
        <ellipse cx="42.5" cy="73" rx="2.4" ry="3.3" fill={INK} />
        <ellipse cx="53.5" cy="73" rx="2.4" ry="3.3" fill={INK} />
        <Eyes y={51} dx={14} r={3} />
      </>
    ),
  },
  gacela: {
    bg: '#fbd3c0',
    art: (
      <>
        <path d="M40 31 C37 19 38 10 43 4" stroke="#3b2a22" strokeWidth="4.2" fill="none" strokeLinecap="round" />
        <path d="M56 31 C59 19 58 10 53 4" stroke="#3b2a22" strokeWidth="4.2" fill="none" strokeLinecap="round" />
        <path d="M31 41 C17 39 10 31 8 24 C19 22 29 28 35 37 Z" fill="#d49f63" />
        <path d="M65 41 C79 39 86 31 88 24 C77 22 67 28 61 37 Z" fill="#d49f63" />
        <path d="M28 37 C21 35 16 31 13 27 C20 27 26 31 31 36 Z" fill="#f6dcc2" />
        <path d="M68 37 C75 35 80 31 83 27 C76 27 70 31 65 36 Z" fill="#f6dcc2" />
        <path d="M48 89 C40 89 36 81 35 73 C30 65 28 55 30 45 C32 35 40 29 48 29 C56 29 64 35 66 45 C68 55 66 65 61 73 C60 81 56 89 48 89 Z" fill="#ddaa6e" />
        <path d="M48 89 C42 89 39 83 38.5 76 C38 69 42 63 43 55 L48 51 L53 55 C54 63 58 69 57.5 76 C57 83 54 89 48 89 Z" fill="#fcf4e5" />
        <path d="M38 54 C38 63 37 69 38.5 75" stroke="#6b4424" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M58 54 C58 63 59 69 57.5 75" stroke="#6b4424" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M44.3 79 h7.4 l-3.7 4.2 z" fill={INK} />
        <Eyes y={50} dx={11.5} r={3.3} />
      </>
    ),
  },
  babuino: {
    bg: '#f2c9a0',
    art: (
      <>
        <circle cx="48" cy="52" r="37" fill="#c5c9d0" />
        <path d="M14 50 C14 30 30 16 48 16 C66 16 82 30 82 50 C76 36 64 28 48 28 C32 28 20 36 14 50 Z" fill="#dfe2e7" />
        <g stroke="#a4a9b2" strokeWidth="1.8" strokeLinecap="round">
          <path d="M20 58 l5 3 M19 68 l6 1 M24 78 l5 -2 M76 58 l-5 3 M77 68 l-6 1 M72 78 l-5 -2" />
        </g>
        <path d="M48 85 C40 85 36 77 36 69 L34 51 C33 41 40 35 48 35 C56 35 63 41 62 51 L60 69 C60 77 56 85 48 85 Z" fill="#d68d8a" />
        <path d="M34 47 C40 41 56 41 62 47 C56 44.5 40 44.5 34 47 Z" fill="#a85f5e" />
        <path d="M48 55 v13" stroke="#b9706e" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="45" cy="72.5" rx="1.6" ry="2.3" fill="#7a3f3f" />
        <ellipse cx="51" cy="72.5" rx="1.6" ry="2.3" fill="#7a3f3f" />
        <path d="M42.5 79 q5.5 3 11 0" stroke="#7a3f3f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <Eyes y={51} dx={7} r={2.7} />
      </>
    ),
  },
  cobra: {
    bg: '#f6dfa0',
    art: (
      <>
        <path d="M22 86 C30 77 66 77 74 86 C66 93 30 93 22 86 Z" fill="#5f7233" />
        <path d="M48 13 C66 13 78 29 76 47 C74 61 62 69 56 81 L40 81 C34 69 22 61 20 47 C18 29 30 13 48 13 Z" fill="#6f8440" />
        <path d="M48 31 C56 31 60 41 58 53 C57 63 54 73 54 81 L42 81 C42 73 39 63 38 53 C36 41 40 31 48 31 Z" fill="#ecdca4" />
        <path d="M39 47 h18 M38.5 55 h19 M40 63 h16 M41.5 71 h13" stroke="#c9b46d" strokeWidth="1.6" />
        <circle cx="30" cy="45" r="4.2" fill="none" stroke="#3f4e1f" strokeWidth="2.2" />
        <circle cx="66" cy="45" r="4.2" fill="none" stroke="#3f4e1f" strokeWidth="2.2" />
        <ellipse cx="48" cy="25" rx="11.5" ry="10" fill="#819748" />
        <circle cx="43.3" cy="23.5" r="3" fill="#f2c230" />
        <circle cx="52.7" cy="23.5" r="3" fill="#f2c230" />
        <ellipse cx="43.3" cy="23.5" rx="1" ry="2.5" fill={INK} />
        <ellipse cx="52.7" cy="23.5" rx="1" ry="2.5" fill={INK} />
        <path d="M48 34 v6 l-3 4 M48 40 l3 4" stroke="#d43d3d" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  axolote: {
    bg: '#c4e7f1',
    art: (
      <>
        <g stroke="#e0648f" strokeWidth="5.5" strokeLinecap="round" fill="none">
          <path d="M25 45 C13 41 9 33 9 27" />
          <path d="M23 53 C11 53 7 49 5 45" />
          <path d="M25 61 C15 65 11 71 9 75" />
          <path d="M71 45 C83 41 87 33 87 27" />
          <path d="M73 53 C85 53 89 49 91 45" />
          <path d="M71 61 C81 65 85 71 87 75" />
        </g>
        <ellipse cx="48" cy="53" rx="27" ry="22" fill="#f7b5c9" />
        <circle cx="31" cy="60" r="4.2" fill="#f190b0" opacity="0.75" />
        <circle cx="65" cy="60" r="4.2" fill="#f190b0" opacity="0.75" />
        <Eyes y={49} dx={13} r={2.9} />
        <path d="M38 61 q10 8 20 0" stroke="#b4476d" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  ballena: {
    bg: '#bfe3f2',
    art: (
      <>
        <path d="M31 31 C27 23 21 19 15 19 M31 31 C35 23 41 19 47 19" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        <path d="M70 53 C77 50 81 45 82 38 C86 41 90 41 94 37 C93 48 89 55 82 58 C78 60 74 60 70 60 Z" fill="#2f3a45" />
        <path d="M11 56 C11 42 27 34 45 36 C60 37 71 44 76 55 C71 67 55 73 38 72 C23 71 11 66 11 56 Z" fill="#2f3a45" />
        <path d="M17 63 C26 69 44 71 57 67 C47 74 26 74 17 63 Z" fill="#e8eef2" />
        <path d="M12 58 C19 50 29 52 35 60" stroke="#1b232b" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <circle cx="17" cy="50" r="2.3" fill="#f2f2ec" />
        <circle cx="22" cy="45.5" r="2" fill="#f2f2ec" />
        <circle cx="27.5" cy="42.5" r="1.8" fill="#f2f2ec" />
        <circle cx="14.5" cy="55" r="1.5" fill="#f2f2ec" />
        <circle cx="30" cy="53" r="2.3" fill="#e8eef2" />
        <circle cx="30" cy="53" r="1.2" fill={INK} />
        <path d="M37 65 C39 73 45 77 51 77 C49 71 45 67 41 63 Z" fill="#222b34" />
        <path d="M0 84 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 V96 H0 Z" fill="#7cc3e0" />
      </>
    ),
  },
  franciscana: {
    bg: '#bdeee4',
    art: (
      <>
        <path d="M78 57 C84 51 90 51 94 53 C90 57 88 61 88 67 C84 65 80 63 78 57 Z" fill="#8c8070" />
        <path d="M22 47 C30 33 50 29 64 37 C74 43 80 53 82 63 C76 59 70 59 66 61 C56 67 40 65 30 57 C26 55 24 51 22 47 Z" fill="#a39684" />
        <path d="M24.5 46.5 L3 53 L25 52 Z" fill="#8c8070" />
        <path d="M27 53 C37 63 55 65 66 61 C56 59 40 59 29 51 Z" fill="#ece3d2" />
        <path d="M49 32.5 C53 25 59 23 63 25 C59 29 59 33 59.5 36 Z" fill="#8c8070" />
        <path d="M38 59 C38 67 42 73 48 75 C48 69 46 63 44 59 Z" fill="#8c8070" />
        <circle cx="30.5" cy="45" r="1.9" fill={INK} />
        <path d="M0 84 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 V96 H0 Z" fill="#66c9b9" />
        <circle cx="16" cy="70" r="1.6" fill="#fff" opacity="0.9" />
        <circle cx="23" cy="76" r="1.1" fill="#fff" opacity="0.9" />
        <circle cx="72" cy="74" r="1.4" fill="#fff" opacity="0.9" />
      </>
    ),
  },
  hornero: {
    bg: '#f7e6c2',
    art: (
      <>
        <path d="M22 83 h54" stroke="#c9a36b" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M46 66 v15 M55 65 v16 M41 82 h9 M50 82 h9" stroke="#5b4636" strokeWidth="2.3" strokeLinecap="round" />
        <path d="M67 49 L90 39 L88 51 L70 59 Z" fill="#9a5530" />
        <ellipse cx="50" cy="52" rx="23" ry="17" fill="#b5673a" transform="rotate(-12 50 52)" />
        <circle cx="32" cy="38" r="12.5" fill="#b5673a" />
        <path d="M22.5 43 C25 53 36 65 52 67 C44 59 36 51 34 43 Z" fill="#f1dfc0" />
        <path d="M44 46 C54 42 66 46 72 54 C62 59 50 59 44 53 Z" fill="#8c4a26" />
        <path d="M20.5 35.5 L6 40 L20.5 42.5 Z" fill="#5b4636" />
        <path d="M24 31.5 q6 -3.5 12 -0.5" stroke="#eccfa6" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <circle cx="29" cy="36" r="2.1" fill={INK} />
        <circle cx="29.6" cy="35.4" r="0.6" fill="#fff" />
      </>
    ),
  },
  quetzal: {
    bg: '#e3f3cf',
    art: (
      <>
        <path d="M58 56 C62 72 58 88 50 98 L57 98 C67 88 71 72 67 56 Z" fill="#128a5a" />
        <path d="M63 56 C71 70 73 86 69 98 L75 98 C80 84 78 68 71 56 Z" fill="#17a56c" />
        <path d="M16 70 H80" stroke="#8b5e3c" strokeWidth="4.5" strokeLinecap="round" />
        <ellipse cx="52" cy="47" rx="16" ry="21" fill="#17a56c" transform="rotate(18 52 47)" />
        <path d="M39 46 C39 58 45 67 56 67 C50 61 46 53 46 44 Z" fill="#d8413f" />
        <path d="M50 35 C60 37 66 47 64 59 C56 55 50 47 48 39 Z" fill="#0f7a4f" />
        <path d="M33 19 l-2 -8 l5.5 4.5 l1 -8 l4.5 6.5 l4.5 -5.5 l1 9 Z" fill="#1db877" />
        <circle cx="40" cy="27" r="11.5" fill="#1db877" />
        <path d="M29.5 25.5 L18 28.5 L29.5 32 Z" fill="#f2c230" />
        <circle cx="36" cy="25.5" r="2.2" fill={INK} />
        <circle cx="36.6" cy="24.9" r="0.6" fill="#fff" />
        <path d="M44 68 v4 M50 68 v4" stroke="#5b4636" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
};

/** El dibujo del animal, en un círculo. Si la clave no existe (un tótem que todavía no se dibujó), no muestra nada. */
export function TotemAvatar({ animal, size = 40, className }: { animal: string | null | undefined; size?: number; className?: string }) {
  const a = animal ? ART[animal as TotemAnimal] : undefined;
  if (!a) return null;
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      role="img"
      aria-label={totemAnimalLabel(animal) ?? undefined}
      className={`totem-avatar ${className ?? ''}`}
      style={{ borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'block' }}
    >
      <rect width="96" height="96" fill={a.bg} />
      {a.art}
    </svg>
  );
}
