/**
 * Los animales de los tótems de la Tribu. Quien tiene tótem puede elegir el dibujo de su animal como foto de perfil.
 * `words` son las palabras del tótem que lo identifican (sin tildes): «Puma Laborioso» → puma.
 * La lista sale del listado de totemizados de la Tribu; el dibujo de cada uno vive en el cliente.
 */
export const TOTEM_ANIMALS = [
  { key: 'abeja', label: 'Abeja', words: ['abeja'] },
  { key: 'aguila', label: 'Águila', words: ['aguila'] },
  { key: 'albatros', label: 'Albatros', words: ['albatros'] },
  { key: 'alondra', label: 'Alondra', words: ['alondra'] },
  { key: 'ardilla', label: 'Ardilla', words: ['ardilla'] },
  { key: 'axolote', label: 'Axolote', words: ['axolote', 'ajolote'] },
  { key: 'babuino', label: 'Babuino', words: ['babuino', 'papion'] },
  { key: 'ballena', label: 'Ballena franca austral', words: ['ballena'] },
  { key: 'bufalo', label: 'Búfalo', words: ['bufalo'] },
  { key: 'caballo', label: 'Caballo', words: ['caballo', 'yegua'] },
  { key: 'cascabel', label: 'Serpiente de cascabel', words: ['cascabel', 'serpiente', 'vibora'] },
  { key: 'castor', label: 'Castor', words: ['castor'] },
  { key: 'cebra', label: 'Cebra', words: ['cebra'] },
  { key: 'chacal', label: 'Chacal', words: ['chacal'] },
  { key: 'chita', label: 'Chita', words: ['chita', 'guepardo'] },
  { key: 'ciervo', label: 'Ciervo', words: ['ciervo', 'cierva'] },
  { key: 'coati', label: 'Coatí', words: ['coati'] },
  { key: 'cobra', label: 'Cobra', words: ['cobra'] },
  { key: 'cocodrilo', label: 'Cocodrilo', words: ['cocodrilo', 'yacare'] },
  { key: 'condor', label: 'Cóndor', words: ['condor'] },
  { key: 'coyote', label: 'Coyote', words: ['coyote'] },
  { key: 'delfin', label: 'Delfín', words: ['delfin'] },
  { key: 'elefante', label: 'Elefante', words: ['elefante', 'elefanta'] },
  { key: 'franciscana', label: 'Franciscana', words: ['franciscana'] },
  { key: 'gacela', label: 'Gacela', words: ['gacela'] },
  { key: 'gaviota', label: 'Gaviota', words: ['gaviota'] },
  { key: 'golondrina', label: 'Golondrina', words: ['golondrina'] },
  { key: 'grulla', label: 'Grulla', words: ['grulla'] },
  { key: 'halcon', label: 'Halcón', words: ['halcon'] },
  { key: 'hormiga', label: 'Hormiga', words: ['hormiga'] },
  { key: 'hornero', label: 'Hornero', words: ['hornero'] },
  { key: 'huillin', label: 'Huillín', words: ['huillin', 'nutria'] },
  { key: 'huron', label: 'Hurón', words: ['huron'] },
  { key: 'koala', label: 'Koala', words: ['koala'] },
  { key: 'leon', label: 'León', words: ['leon'] },
  { key: 'leona', label: 'Leona', words: ['leona'] },
  { key: 'leopardo', label: 'Leopardo', words: ['leopardo'] },
  { key: 'liebre', label: 'Liebre', words: ['liebre'] },
  { key: 'lince', label: 'Lince', words: ['lince'] },
  { key: 'lobo', label: 'Lobo', words: ['lobo', 'loba'] },
  { key: 'mamut', label: 'Mamut', words: ['mamut'] },
  { key: 'mangosta', label: 'Mangosta', words: ['mangosta'] },
  { key: 'mapache', label: 'Mapache', words: ['mapache'] },
  { key: 'murcielago', label: 'Murciélago', words: ['murcielago'] },
  { key: 'orca', label: 'Orca', words: ['orca'] },
  { key: 'oso', label: 'Oso', words: ['oso', 'osa'] },
  { key: 'panda', label: 'Panda', words: ['panda'] },
  { key: 'pantera', label: 'Pantera', words: ['pantera'] },
  { key: 'pato', label: 'Pato', words: ['pato', 'pata'] },
  { key: 'perro', label: 'Perro', words: ['perro', 'perra'] },
  { key: 'petrel', label: 'Petrel', words: ['petrel'] },
  { key: 'pinguino', label: 'Pingüino', words: ['pinguino'] },
  { key: 'pudu', label: 'Pudú', words: ['pudu'] },
  { key: 'puma', label: 'Puma', words: ['puma'] },
  { key: 'quetzal', label: 'Quetzal', words: ['quetzal'] },
  { key: 'rata', label: 'Rata', words: ['rata', 'raton'] },
  { key: 'sambar', label: 'Sambar', words: ['sambar', 'sambur'] },
  { key: 'sapo', label: 'Sapo', words: ['sapo', 'rana'] },
  { key: 'suricata', label: 'Suricata', words: ['suricata'] },
  { key: 'tatu', label: 'Tatú carreta', words: ['tatu'] },
  { key: 'tiburon', label: 'Tiburón', words: ['tiburon'] },
  { key: 'tigre', label: 'Tigre', words: ['tigre'] },
  { key: 'tortuga', label: 'Tortuga', words: ['tortuga'] },
  { key: 'yaguarete', label: 'Yaguareté', words: ['yaguarete', 'jaguar'] },
  { key: 'zorro', label: 'Zorro', words: ['zorro', 'zorra'] },
] as const;
export type TotemAnimal = (typeof TOTEM_ANIMALS)[number]['key'];
export const TOTEM_ANIMAL_KEYS = TOTEM_ANIMALS.map((a) => a.key) as [TotemAnimal, ...TotemAnimal[]];

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** El animal de un tótem, si está en la lista de la Tribu. */
export function animalFromTotem(totem: string | null | undefined): TotemAnimal | null {
  if (!totem) return null;
  const words = fold(totem).split(/[^a-z]+/).filter(Boolean);
  for (const w of words) {
    const hit = TOTEM_ANIMALS.find((a) => (a.words as readonly string[]).includes(w));
    if (hit) return hit.key;
  }
  return null;
}
export const totemAnimalLabel = (key: string | null | undefined) => TOTEM_ANIMALS.find((a) => a.key === key)?.label ?? null;
