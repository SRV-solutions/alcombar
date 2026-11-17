/**
 * Referentes de Programa por rama: integrantes del equipo de Programa a los que se consulta por las cuestiones de
 * cada rama (no por unidad: por ejemplo, un referente para las dos Unidades Scouts). Se guardan como cargo del año
 * en el equipo de Programa con la rama elegida, así aparecen en el organigrama y en la ficha del adulto.
 * Cuando se carga una ficha o un campamento de su rama, les llega un aviso.
 */
import { Router, type Request } from 'express';
import { Op } from 'sequelize';
import { z } from 'zod';
import { BRANCH_INFO, BRANCHES, can, isComingSoon, type Branch } from '../shared';
import { Adult, AdultAssignment, Unit, User } from '../models';
import { loadSubject } from '../lib/access';
import { ah, badRequest, conflict, forbidden, notFound, parse } from '../lib/errors';
import { programTeam, referentAssignments, referentPosition } from '../lib/notify';

export const referentsRouter = Router();

const currentYear = () => new Date().getFullYear();

/** Los cargan: superadmins, quien edita el Grupo o los adultos, y el/la responsable del equipo de Programa. */
async function canManage(req: Request) {
  const a = req.auth!;
  if (a.isSuperadmin || can(a, 'group', 'edit') || can(a, 'adults', 'edit')) return true;
  const team = await programTeam();
  return !!team?.leaderAdultId && team.leaderAdultId === req.user!.adultId;
}

referentsRouter.get(
  '/',
  ah(async (req, res) => {
    const { team, assignments } = await referentAssignments();
    const [leader, units] = await Promise.all([
      team?.leaderAdultId ? Adult.findByPk(team.leaderAdultId, { attributes: ['id', 'firstName', 'lastName', 'totem', 'email', 'phone'] }) : null,
      Unit.findAll({ where: { active: true }, attributes: ['id', 'branch'] }),
    ]);
    const users = assignments.length ? await User.findAll({ where: { adultId: assignments.map((a) => a.adultId) }, attributes: ['id', 'email', 'active', 'adultId'] }) : [];
    const manage = await canManage(req);
    // Para quien los administra: avisa si el referente no va a poder abrir las fichas de su rama
    const warnings = new Map<string, string | null>();
    if (manage) {
      for (const a of assignments) {
        const user = users.find((u) => u.adultId === a.adultId);
        let warning: string | null = null;
        if (!user || !user.active) warning = a.adult?.email ? 'No tiene usuario: los avisos le llegan solo por mail.' : 'No tiene usuario ni mail: no le llegan los avisos.';
        else {
          const subject = await loadSubject(user.id);
          const branchUnits = units.filter((u) => u.branch === a.branch);
          if (branchUnits.length && !branchUnits.every((u) => can(subject, 'activities', 'view', u.id))) {
            warning = 'Su usuario no puede ver todas las fichas de esta rama: dale el rol "Programa / APF".';
          }
        }
        warnings.set(a.id, warning);
      }
    }
    const branches = BRANCHES.map((b) => ({
      branch: b,
      label: BRANCH_INFO[b].label,
      comingSoon: isComingSoon(b),
      referents: assignments
        .filter((a) => a.branch === b)
        .map((a) => {
          const user = users.find((u) => u.adultId === a.adultId);
          return {
            assignmentId: a.id,
            adultId: a.adultId,
            firstName: a.adult!.firstName,
            lastName: a.adult!.lastName,
            totem: a.adult!.totem,
            email: user?.email ?? a.adult!.email,
            phone: a.adult!.phone,
            warning: warnings.get(a.id) ?? null,
          };
        })
        .sort((x, y) => x.lastName.localeCompare(y.lastName, 'es')),
    }));
    // Para elegir a quién sumar (no depende de poder ver el padrón de adultos)
    const candidates = manage
      ? await Adult.findAll({
          where: { status: { [Op.ne]: 'baja' } },
          attributes: ['id', 'firstName', 'lastName', 'totem'],
          order: [['lastName', 'ASC'], ['firstName', 'ASC']],
        })
      : [];
    res.json({
      year: currentYear(),
      team: team ? { id: team.id, name: team.name, leader } : null,
      canManage: manage,
      branches,
      candidates,
    });
  }),
);

const addSchema = z.object({
  branch: z.enum(BRANCHES, { errorMap: () => ({ message: 'Elegí la rama' }) }),
  adultId: z.string({ required_error: 'Elegí el adulto' }).uuid('Elegí el adulto'),
});

referentsRouter.post(
  '/',
  ah(async (req, res) => {
    if (!(await canManage(req))) throw forbidden();
    const d = parse(addSchema, req.body);
    const team = await programTeam();
    if (!team) throw badRequest('Falta crear el equipo de Programa en Equipos de apoyo');
    const adult = await Adult.findByPk(d.adultId);
    if (!adult || adult.status === 'baja') throw badRequest('Revisá los datos', { adultId: 'Adulto inexistente o de baja' });
    const year = currentYear();
    const dup = await AdultAssignment.findOne({ where: { adultId: adult.id, supportTeamId: team.id, branch: d.branch, year } });
    if (dup) throw conflict(`Ya es referente de ${BRANCH_INFO[d.branch as Branch].label}`);
    const created = await AdultAssignment.create({
      adultId: adult.id,
      year,
      position: referentPosition(d.branch),
      unitId: null,
      supportTeamId: team.id,
      branch: d.branch,
      notes: null,
    });
    res.status(201).json(created);
  }),
);

referentsRouter.delete(
  '/:assignmentId',
  ah(async (req, res) => {
    if (!(await canManage(req))) throw forbidden();
    const id = parse(z.string().uuid(), req.params.assignmentId);
    const team = await programTeam();
    const a = await AdultAssignment.findByPk(id);
    if (!a || !team || a.supportTeamId !== team.id || !a.branch) throw notFound();
    await a.destroy();
    res.json({ ok: true });
  }),
);
