/**
 * Avisos de la plataforma: quedan en la campanita de cada usuario y además salen por mail.
 * - Altas y bajas para Cruz del Sur → equipos de apoyo marcados con "recibe avisos de altas y bajas".
 * - Fichas y campamentos nuevos → referentes de Programa de la rama (cargos del equipo de Programa con rama).
 * Quien hizo la acción no recibe su propio aviso. Si algo falla, se registra y la operación sigue.
 */
import { Op } from 'sequelize';
import { BRANCH_INFO, type Branch } from '../shared';
import { config } from '../config';
import { Adult, AdultAssignment, Role, SupportTeam, User, UserRole } from '../models';
import { Notification } from '../models/notifications';
import { emailLayout, sendMailBatch, type OutgoingMail } from './mailer';

export interface Recipients {
  userIds: string[];
  /** Mails a los que se avisa (de los usuarios y, si el adulto no tiene usuario, el de su ficha). */
  emails: string[];
}

const currentYear = () => new Date().getFullYear();
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Usuarios activos y mails de un grupo de adultos (sin repetir y sin quien hizo la acción). */
export async function recipientsForAdults(adultIds: string[], excludeUserId?: string | null): Promise<Recipients> {
  const ids = [...new Set(adultIds)];
  if (!ids.length) return { userIds: [], emails: [] };
  const [adults, users] = await Promise.all([
    Adult.findAll({ where: { id: ids, status: { [Op.ne]: 'baja' } }, attributes: ['id', 'email'] }),
    User.findAll({ where: { adultId: ids }, attributes: ['id', 'email', 'active', 'adultId'] }),
  ]);
  const userIds = new Set<string>();
  const emails = new Set<string>();
  const excluded = excludeUserId ? users.find((u) => u.id === excludeUserId) : null;
  for (const a of adults) {
    const user = users.find((u) => u.adultId === a.id);
    if (user && user.id === excludeUserId) continue;
    if (user?.active) {
      userIds.add(user.id);
      if (user.email) emails.add(user.email.toLowerCase());
    } else if (!user && a.email) {
      emails.add(a.email.toLowerCase());
    }
  }
  if (excluded?.email) emails.delete(excluded.email.toLowerCase());
  return { userIds: [...userIds], emails: [...emails] };
}

/** Adultos que integran un equipo de apoyo este año (con cargo en el equipo) más su responsable. */
async function teamAdultIds(teams: SupportTeam[]): Promise<string[]> {
  if (!teams.length) return [];
  const assignments = await AdultAssignment.findAll({ where: { supportTeamId: teams.map((t) => t.id), year: currentYear() }, attributes: ['adultId'] });
  return [...teams.map((t) => t.leaderAdultId).filter((x): x is string => !!x), ...assignments.map((a) => a.adultId)];
}

/** Equipos que reciben los avisos de altas y bajas para Cruz del Sur. */
export const registryTeams = () => SupportTeam.findAll({ where: { receivesRegistryAlerts: true }, order: [['name', 'ASC']] });

export async function registryRecipients(excludeUserId?: string | null) {
  const teams = await registryTeams();
  return { teams, ...(await recipientsForAdults(await teamAdultIds(teams), excludeUserId)) };
}

/** ¿Este usuario integra (o lidera) un equipo que recibe los avisos de altas y bajas? */
export async function isRegistryTeamMember(user: User): Promise<boolean> {
  if (!user.adultId) return false;
  const teams = await registryTeams();
  return (await teamAdultIds(teams)).includes(user.adultId);
}

// ---------------- Jefatura, equipos de unidad y Consejo ----------------
/** ¿Es de la Jefatura de Grupo (rol "jefatura") o superadmin? */
export async function isJefaturaUser(userId: string, isSuperadmin: boolean): Promise<boolean> {
  if (isSuperadmin) return true;
  const role = await Role.findOne({ where: { key: 'jefatura' }, attributes: ['id'] });
  return !!role && (await UserRole.count({ where: { userId, roleId: role.id } })) > 0;
}

/** Los adultos con cargo este año en esas unidades (el "equipo" de cada unidad). */
export async function unitTeamRecipients(unitIds: string[], excludeUserId?: string | null) {
  if (!unitIds.length) return { userIds: [], emails: [] } as Recipients;
  const assignments = await AdultAssignment.findAll({ where: { unitId: unitIds, year: currentYear() }, attributes: ['adultId'] });
  return recipientsForAdults(
    assignments.map((a) => a.adultId),
    excludeUserId,
  );
}

export type CouncilAudience = 'educadores' | 'todos';
/**
 * Destinatarios del temario del Consejo de Grupo.
 * - educadores: Jefatura de Grupo y los adultos de las unidades (jefes, subjefes y ayudantes).
 * - todos: además, equipos de apoyo, acompañantes y padres representantes (todos los adultos con cargo este año).
 */
export async function councilRecipients(audience: CouncilAudience, excludeUserId?: string | null) {
  const assignments = await AdultAssignment.findAll({ where: { year: currentYear() }, attributes: ['adultId', 'unitId', 'supportTeamId', 'branch', 'position'] });
  const chosen =
    audience === 'todos'
      ? assignments
      : assignments.filter((a) => a.unitId || (!a.supportTeamId && (a.branch || /jef[ea]/i.test(a.position)) && !/acompa|padre|madre/i.test(a.position)));
  return recipientsForAdults(
    chosen.map((a) => a.adultId),
    excludeUserId,
  );
}

// ---------------- Referentes de Programa por rama ----------------
/** El equipo de Programa (el que se llama "Programa…"). */
export async function programTeam(): Promise<SupportTeam | null> {
  const teams = await SupportTeam.findAll();
  return teams.find((t) => normalize(t.name).startsWith('programa')) ?? null;
}

/** Cargos del año en el equipo de Programa que tienen rama: son los referentes de esa rama. */
export async function referentAssignments(branches?: string[]) {
  const team = await programTeam();
  if (!team) return { team: null, assignments: [] as AdultAssignment[] };
  const assignments = await AdultAssignment.findAll({
    where: { supportTeamId: team.id, year: currentYear(), branch: branches ? branches : { [Op.ne]: null } },
    include: [{ model: Adult, as: 'adult', required: true, where: { status: { [Op.ne]: 'baja' } } }],
  });
  return { team, assignments };
}

export const referentPosition = (branch: string) => `Referente de Programa · ${BRANCH_INFO[branch as Branch]?.label ?? branch}`;

// ---------------- Envío ----------------
export interface NotifyInput {
  recipients: Recipients;
  kind: 'cruz_del_sur' | 'ficha' | 'campamento' | 'servicio' | 'consejo';
  title: string;
  body: string;
  /** Ruta dentro de la app, ej. "/cruz-del-sur". */
  link: string;
  email: { subject: string; paragraphs: string[]; button: string; footnote?: string };
}

/** Crea los avisos de la campanita y manda los mails en segundo plano. Nunca lanza. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const { recipients } = input;
    if (recipients.userIds.length) {
      await Notification.bulkCreate(
        recipients.userIds.map((userId) => ({ userId, kind: input.kind, title: input.title.slice(0, 200), body: input.body, link: input.link, readAt: null })),
      );
    }
    if (!recipients.emails.length) return;
    const url = `${config.appUrl}${input.link}`;
    const html = emailLayout({ title: input.title, paragraphs: input.email.paragraphs, button: { label: input.email.button, url }, footnote: input.email.footnote });
    const text = `${input.email.paragraphs.join('\n\n')}\n\n${input.email.button}: ${url}${input.email.footnote ? `\n\n${input.email.footnote}` : ''}`;
    const mails: OutgoingMail[] = recipients.emails.map((to) => ({ to, subject: input.email.subject, text, html }));
    void sendMailBatch(mails).catch((e) => console.error('[avisos] mail:', (e as Error).message));
  } catch (e) {
    console.error('[avisos] no se pudo avisar:', (e as Error).message);
  }
}

/**
 * Avisa a los referentes de Programa de esas ramas ('all' = todas, ej. un campamento de Grupo sin unidades).
 * No lanza; quien hizo la carga no recibe el aviso.
 */
export async function notifyReferents(
  actor: { id: string; name: string } | null,
  branches: string[] | 'all',
  n: { kind: 'ficha' | 'campamento'; title: string; body: string; link: string; paragraphs: string[]; button: string },
) {
  try {
    const list = branches === 'all' ? undefined : [...new Set(branches)];
    if (list && !list.length) return;
    const { assignments } = await referentAssignments(list);
    if (!assignments.length) return;
    const recipients = await recipientsForAdults(
      assignments.map((a) => a.adultId),
      actor?.id,
    );
    const labels = [...new Set(assignments.map((a) => BRANCH_INFO[a.branch as Branch]?.label ?? a.branch))];
    await notify({
      recipients,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      email: {
        subject: n.title,
        paragraphs: n.paragraphs,
        button: n.button,
        footnote: `Te llega porque sos referente de Programa (${labels.join(', ')}).`,
      },
    });
  } catch (e) {
    console.error('[avisos] referentes:', (e as Error).message);
  }
}

/** Lista corta de nombres para títulos y cuerpos: "A, B, C y 4 más". */
export function shortList(names: string[], max = 4) {
  if (names.length <= max) return names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : (names[0] ?? '');
  return `${names.slice(0, max).join(', ')} y ${names.length - max} más`;
}
