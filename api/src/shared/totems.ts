/**
 * Los animales de los tótems de la tribu. Quien tiene tótem puede elegir el dibujo de su animal como foto de perfil.
 * `words` son las palabras del tótem que lo identifican (sin tildes): «Puma Laborioso» → puma.
 */
export const TOTEM_ANIMALS = [
  { key: 'axolote', label: 'Axolote', words: ['axolote', 'ajolote'] },
  { key: 'babuino', label: 'Babuino', words: ['babuino', 'papion'] },
  { key: 'ballena', label: 'Ballena franca austral', words: ['ballena'] },
  { key: 'bufalo', label: 'Búfalo', words: ['bufalo'] },
  { key: 'castor', label: 'Castor', words: ['castor'] },
  { key: 'cobra', label: 'Cobra', words: ['cobra'] },
  { key: 'franciscana', label: 'Franciscana', words: ['franciscana', 'delfin'] },
  { key: 'gacela', label: 'Gacela', words: ['gacela'] },
  { key: 'hornero', label: 'Hornero', words: ['hornero'] },
  { key: 'huillin', label: 'Huillín', words: ['huillin', 'nutria'] },
  { key: 'leona', label: 'Leona', words: ['leona', 'leon'] },
  { key: 'lobo', label: 'Lobo', words: ['lobo', 'loba'] },
  { key: 'mangosta', label: 'Mangosta', words: ['mangosta'] },
  { key: 'mapache', label: 'Mapache', words: ['mapache'] },
  { key: 'osa', label: 'Osa', words: ['osa', 'oso'] },
  { key: 'pantera', label: 'Pantera', words: ['pantera'] },
  { key: 'perro', label: 'Perro', words: ['perro', 'perra'] },
  { key: 'puma', label: 'Puma', words: ['puma'] },
  { key: 'quetzal', label: 'Quetzal', words: ['quetzal'] },
  { key: 'yaguarete', label: 'Yaguareté', words: ['yaguarete', 'jaguar'] },
] as const;
export type TotemAnimal = (typeof TOTEM_ANIMALS)[number]['key'];
export const TOTEM_ANIMAL_KEYS = TOTEM_ANIMALS.map((a) => a.key) as [TotemAnimal, ...TotemAnimal[]];

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** El animal de un tótem, si es uno de los que ya están dibujados. */
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
