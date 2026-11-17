# ALCOMBAR Gestión

Plataforma de gestión del **Grupo Scout 155 Divina Providencia**. La especificación completa está en
`ALCOMBAR Gestión - Informe de definición.pdf`.

**Estado: MVP — Etapas 0, 1 y 2 del informe**

| Etapa | Qué incluye | Estado |
|---|---|---|
| 0. Cimientos | Login, usuarios por invitación, roles y permisos por módulo/acción/unidad, auditoría, diseño base | ✅ |
| 1. Grupo y adultos | Unidades, pequeños grupos, equipos de apoyo, adultos, cargos por año, formación, APF, organigrama | ✅ |
| 2. Protagonistas | Padrón, responsables (hermanos comparten responsable), documentación con semáforo, pases de unidad, afiliación anual, asistencia, importación y exportación CSV | ✅ |
| 3 a 8 | Fichas y ciclo de programa, progresión, contabilidad, eventos y campamentos, inventario, calendario | Próximas etapas |

---

## Estructura

```
api/      Express + TypeScript + Sequelize + PostgreSQL  →  http://localhost:3000/api/v1
client/   React + Vite + TypeScript                       →  http://localhost:5173
```

## Cómo levantarla

En dos terminales:

```bash
cd api
npm install      # la primera vez
npm run dev
```

```bash
cd client
npm install      # la primera vez
npm run dev
```

Abrí <http://localhost:5173>. El client redirige `/api` a la API, así que la API tiene que estar corriendo.

`npm run dev` de la API, antes de arrancar:
1. Prende la base de datos local si está apagada. Es una base propia del proyecto, guardada en `api/.data/pg` y en el
   puerto **5433**: no toca otras bases de la PC. Usa los programas de PostgreSQL instalados.
2. Aplica las migraciones pendientes.
3. Carga los datos iniciales que falten: permisos, roles, unidades y el primer superadmin.

**Superadmins**
- El de `SUPERADMIN_EMAIL` en `api/.env`: se crea al instalar. Para sumar otro, `npm run superadmin -- persona@mail.com`.
- `admin@alcombar.local`: cuenta de respaldo; la contraseña está en `api/.env` (`SUPERADMIN_PASSWORD`).

Cada uno edita sus datos (nombre, email, teléfono, etc.) y su contraseña desde **Mi perfil**. Para cambiar el email se
pide la contraseña actual.

### Otros comandos de la API
| Comando | Qué hace |
|---|---|
| `npm run db:stop` | Apaga la base local (se vuelve a prender sola con `npm run dev`) |
| `npm run migrate` | Aplica migraciones pendientes |
| `npm run db:reset` | **Borra todos los datos** y deja la base como recién instalada (el superadmin sale de `SUPERADMIN_EMAIL`) |
| `npm run import:personas -- "ruta\personas.json"` | Importa (o actualiza) a los integrantes desde el JSON de Mi Rincón. Se puede repetir sin duplicar |
| `npm run adultos:unidades -- lista.tsv [--aplicar]` | Corrige cargos, unidades, tótems y roles desde la lista de adultos (copiada de la planilla). Sin `--aplicar` solo muestra qué haría |
| `npm run adultos:formacion -- planilla.tsv [--aplicar]` | Carga la formación desde la planilla del Grupo: IM Programa/Gestión, Miembro Activo, módulos de los Niveles 1, 2 y 3, y el APF |
| `npm run superadmin -- persona@mail.com [--link]` | Da el rol Superadmin (sin quitar los otros). Con `--link` imprime el enlace para elegir contraseña |
| `npm run mail:test [-- persona@mail.com]` | Verifica la cuenta de email; con una dirección, manda un mail de prueba |
| `npm run typecheck` / `build` | Chequeo de tipos / build de producción |

### Emails

Salen por **Resend** (`RESEND_API_KEY`), a nombre de **ALCOMBAR Gestión** (`MAIL_FROM_NAME`).
- Resend usa la API por HTTPS, que funciona en Railway (Railway bloquea el SMTP).
- El remitente (`MAIL_FROM`) tiene que ser de un dominio verificado en Resend; hoy es `info@wearesrv.com`.
- Las respuestas van a `MAIL_REPLY_TO`.
- **Alternativa:** si no hay clave de Resend, se usa SMTP (`SMTP_USER`/`SMTP_PASS`, por ejemplo Gmail con una
  *contraseña de aplicación*).
- Se usan para las invitaciones («Nuevo usuario» y «Generar enlace») y para «Olvidé mi contraseña».
- Si el envío falla, la app igual muestra el enlace para mandarlo a mano.

Con Docker en lugar de la base automática: `docker compose up -d` dentro de `api/`. Usa el mismo puerto y las mismas
credenciales.

---

## Cargar a los chicos

1. **Protagonistas → Importar planilla.** La plantilla se descarga desde esa pantalla.
2. Subí el CSV, o copiá las filas desde Excel o Google Sheets y pegalas.
3. Mirá la vista previa. Las filas se marcan **Nuevo**, **Actualiza** (ya existe por DNI, o por nombre y fecha de
   nacimiento) o **Error**. Las filas con error no se importan.
4. Confirmá. Podés volver a subir la misma planilla corregida: no se duplica nada.

Qué acepta el importador:
- **Obligatorias:** `unidad`, `apellido`, `nombre`, `fecha_nacimiento`.
- **Opcionales:** DNI, pequeño grupo (si no existe, se crea), fechas de ingreso y Promesa, contacto, y hasta dos
  responsables (`resp1_*`, `resp2_*`).
- **Encabezados:** reconoce variantes como «Fecha de nacimiento», «Apellido y nombre», «Patrulla», «Celular».
- **Unidad:** se puede escribir el nombre completo, una parte única («Luis Conde») o el código (`USLC`). Si la planilla
  no tiene columna de unidad, pregunta de qué unidad son todos.
- **Responsables:** los hermanos comparten el mismo registro (se detecta por DNI, email o nombre + teléfono).
- **Datos de salud:** no se cargan (informe §8).
- **Chicos por asignar:** si la planilla trae a alguien que estaba «por asignar» (mismo DNI), lo deja en la unidad de la
  planilla. Así, importar la nómina de cada unidad termina de ubicar a todos.

### Desde Mi Rincón (SAAC)

`npm run import:personas -- "C:\Users\...\personas\personas.json"`, con el archivo que genera `obtener_personas.py`.

**Protagonistas**
- Quedan con su rama.
- Castores y Rovers van directo a su unidad, porque hay una sola.
- Lobatos, Scouts y Caminantes quedan **por asignar**, porque Mi Rincón no dice en cuál de las dos unidades están.
- Se reparten desde **Protagonistas → Por asignar unidad**: se tildan varios y se toca **Asignar unidad**. Cada Jefe/a de
  Unidad puede tomar a los suyos.

**Adultos**
- Se carga su cargo del año (la función de Mi Rincón) y su nivel de formación.
- Si tienen email, se les crea un **usuario sin contraseña**. Para que entren, generá su enlace en **Usuarios → Generar
  enlace**.
- El rol sale de la función:
  - Jefe/a y Sub-Jefe de Grupo → Jefatura.
  - Jefe/a de unidad → Jefe/a de Unidad.
  - Ayudante → Educador/a.
  - APF → Programa.
  - El resto → Consulta.
- Los cargos de unidad de Manada, Unidad Scout y Comunidad Caminante quedan **por asignar** y se ven en el Organigrama.
  Al elegir la unidad del cargo en la ficha del adulto, su usuario recibe el rol de esa unidad.

---

## Pases de unidad

En **Protagonistas → Pases de unidad** (`/pases`) hay tres pestañas:
- **Sugeridos por edad:** los que tienen la edad máxima de su rama o más, a fin de año o a hoy. La edad máxima es
  Castores 7, Lobatos 11, Scouts 14, Caminantes 17 y Rovers 21. Se tildan y se pasan juntos a una unidad de la rama
  siguiente.
- **Elegir chicos:** se tildan chicos de una unidad y se pasan a cualquier otra. Sirve para cambios dentro de la misma
  rama, por ejemplo de la Unidad Scout Pedro Bártolo a la Luis Conde.
- **Historial:** todos los pases del año.

Cada pase guarda fecha, motivo (**por edad**, **por elección** u otro) y notas en el historial del protagonista. La
asistencia y la documentación anteriores se conservan. Para uno solo también está el botón **Pase de unidad** en su
ficha. Lo puede hacer quien edita protagonistas de la unidad de origen (Jefe/a de Unidad, Educador/a de esa unidad,
Secretaría, Jefatura).

---

## Ayuda, tutoriales y tema

- **Buscador:** está arriba en todas las pantallas (Ctrl+K). Encuentra «qué quiero hacer» (por ejemplo «ficha médica» o
  «pasar a la manada»), protagonistas y adultos. El índice completo está en **Ayuda**.
- **Tutoriales con Luisito:** muestran paso a paso dónde tocar. «Primeros pasos» arranca solo la primera vez. Todos se
  pueden omitir y volver a ver desde **Mi perfil → Tutoriales**. El avance se guarda en la cuenta, así que sirve en
  cualquier dispositivo.
- **Modo oscuro:** desde la barra lateral o desde **Mi perfil → Apariencia** (Claro, Oscuro o Como el sistema).
- **Luisito:** es el logo, el favicon y el guía de los tutoriales. Es un SVG en `client/src/components/Luisito.tsx` y
  `client/public/luisito.svg`.
- Estos patrones son los mismos de sentryx (buscador con índice de ayuda, tutoriales con guía, tema con `data-theme`).

---

## Roles y reglas de visibilidad

Los roles se editan desde **Administración → Roles y permisos**. Superadmin es fijo.

- **Alcance:** un rol de **Unidad** se asigna con una unidad. Cada permiso puede valer «solo su unidad» o para todo el
  Grupo. Por ejemplo, el Educador/a ve a los protagonistas de todas las unidades pero edita solo los de la suya.
- **Contactos de familias:** los ven solo la unidad del chico/a, Secretaría, Tesorería y Jefatura.
- **Auditoría:** toda alta, modificación, baja, ingreso, importación y exportación queda registrada en
  **Administración → Auditoría**.
- **Usuarios:** no hay registro público. El superadmin crea el usuario y la app genera un enlace de invitación (vence en
  72 h). Mientras no esté configurado el envío de emails, el enlace aparece en pantalla para mandarlo por WhatsApp.
- **Seguridad:** contraseñas de mínimo 10 caracteres con hash bcrypt. Tras 5 intentos fallidos, el usuario queda
  bloqueado 15 minutos. Los tokens de sesión van en cookies httpOnly con renovación rotativa.

---

## Notas técnicas

**Dónde está cada cosa**

```
api/src/
  shared/      Permisos, validaciones Zod, catálogos, ramas: lo usan la API y el client
  models/      Modelos Sequelize          modules/      Rutas por módulo (<módulo>.routes.ts)
  middlewares/ authenticate + authorize   lib/          sesión, auditoría, CSV, email
  seed.ts      Datos iniciales
api/migrations/  Migraciones (sequelize-cli)
client/src/
  features/<módulo>/   Pantallas          components/   UI y layout
  lib/                 API, sesión, permisos, consultas
```

**Código compartido**
- Vive en `api/src/shared`. El client lo importa como `@shared` (alias en `client/vite.config.ts` y
  `client/tsconfig.json`).
- No hay copias: si cambiás una validación o un permiso, vale para los dos.

**Base de datos**
- Las migraciones están en `api/migrations`. Nunca se usa `sync` (informe §7).
- Para cambiar el modelo, se agrega una migración nueva.
- Todas las entidades tienen borrado lógico (`deleted_at`). Los usuarios no se borran: se desactivan.

**Permisos**
- Un único middleware: `authorize(módulo, acción, unidadDelRecurso)`, en `api/src/middlewares/auth.ts`.
- La función `can()` es la misma en la API y en el client.

## Despliegue (automático desde `main`, igual que sentryx)

**API → Railway**
- El servicio usa la raíz del repositorio. El `Procfile` instala, compila, aplica migraciones, corre el seed y arranca
  la API. El seed es idempotente: en el primer despliegue crea permisos, roles, unidades y el superadmin.
- Agregar una base **PostgreSQL** en Railway y estas variables:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La de la base de Railway (referencia `${{Postgres.DATABASE_URL}}`) |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Una cadena larga y aleatoria (mínimo 32 caracteres) |
| `APP_URL` | La URL pública del front en Netlify (se usa en los enlaces de los mails) |
| `TRUST_PROXY` | `2` (Netlify + Railway delante de la API) |
| `SUPERADMIN_EMAIL`, `SUPERADMIN_NAME`, `SUPERADMIN_PASSWORD` | El primer superadmin (solo se usa si la base está vacía) |
| `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_FROM_NAME`, `MAIL_REPLY_TO` | Los mismos de `api/.env` |

**Client → Netlify**
- En Netlify, *Base directory* = `client`. `client/netlify.toml` tiene el build, las cabeceras y el proxy
  `/api/*` → `https://alcombar-production.up.railway.app`: mismo dominio para el navegador, cookies sin CORS.
- Si la API cambia de URL, se puede definir `API_URL` en Netlify (el build genera `_redirects`, que tiene prioridad) o
  editar la URL en `client/netlify.toml`.
- El build lee `api/src/shared` del mismo repositorio, así que las dos carpetas tienen que estar juntas.

**Pendiente**
- **Archivos adjuntos** (certificados, comprobantes): por ahora se guarda un enlace al Drive. Más adelante se puede sumar
  Cloudflare R2, como en sentryx.
