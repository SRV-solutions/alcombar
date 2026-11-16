import { MEMBER_IMPORT_COLUMNS, type MemberImportKey } from './catalogs';

/** minúsculas, sin acentos, sin signos: "Fecha de Nacimiento" → "fecha_de_nacimiento" */
export function normalizeKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Para comparar nombres: minúsculas, sin acentos, espacios simples. */
export function normalizeName(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

/** "juan PEREZ" → "Juan Perez" (solo si viene todo en mayúsculas o minúsculas). */
export function titleCase(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t !== t.toUpperCase() && t !== t.toLowerCase()) return t;
  return t.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

const EXTRA_ALIASES: Record<string, MemberImportKey> = {
  apellidos: 'apellido',
  nombres: 'nombre',
  documento: 'dni',
  nro_documento: 'dni',
  numero_de_documento: 'dni',
  nacimiento: 'fecha_nacimiento',
  fecha_de_nacimiento: 'fecha_nacimiento',
  f_nacimiento: 'fecha_nacimiento',
  fecha_nac: 'fecha_nacimiento',
  rama: 'unidad',
  unidad_scout: 'unidad',
  patrulla: 'pequeno_grupo',
  seisena: 'pequeno_grupo',
  equipo: 'pequeno_grupo',
  pequeno_grupo: 'pequeno_grupo',
  ingreso: 'fecha_ingreso',
  fecha_de_ingreso: 'fecha_ingreso',
  promesa: 'fecha_promesa',
  fecha_de_promesa: 'fecha_promesa',
  domicilio: 'direccion',
  celular: 'telefono',
  tel: 'telefono',
  mail: 'email',
  correo: 'email',
};

/** Reconoce el encabezado de una columna de la planilla. Devuelve null si no corresponde a ninguna. */
export function matchImportHeader(header: string): MemberImportKey | null {
  const n = normalizeKey(header);
  if (!n) return null;
  for (const col of MEMBER_IMPORT_COLUMNS) {
    if (n === col.key || n === normalizeKey(col.label)) return col.key;
  }
  if (EXTRA_ALIASES[n]) return EXTRA_ALIASES[n];
  // Responsables: "responsable_1_telefono", "resp_1_nombre", "tutor1_email", "madre_padre_1_..."
  const m = n.match(/^(?:resp|responsable|tutor|adulto)_?([12])_(.+)$/);
  if (m) {
    const field = m[2]
      .replace(/^(nombre_y_apellido|nombre_completo|apellido_y_nombre)$/, 'nombre')
      .replace(/^(parentesco|relacion)$/, 'vinculo')
      .replace(/^(celular|tel)$/, 'telefono')
      .replace(/^(mail|correo)$/, 'email')
      .replace(/^documento$/, 'dni');
    const key = `resp${m[1]}_${field}`;
    if (MEMBER_IMPORT_COLUMNS.some((c) => c.key === key)) return key as MemberImportKey;
  }
  return null;
}
