/**
 * La contraseña recién escrita en el ingreso, guardada solo en memoria (nunca en el navegador) y por única vez:
 * sirve para que quien entra con una provisoria no tenga que tipearla de nuevo al elegir la suya.
 */
let last: string | null = null;

export function rememberLoginPassword(password: string) {
  last = password;
}

export function takeLoginPassword(): string | null {
  const p = last;
  last = null;
  return p;
}
