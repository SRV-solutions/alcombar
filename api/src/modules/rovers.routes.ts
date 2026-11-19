import { Router, type Request } from 'express';
import { Op } from 'sequelize';
import {
  assemblyCloseSchema,
  assemblyInfoSchema,
  assemblyItemSchema,
  assemblyOpenSchema,
  assemblyPresentSchema,
  assemblyVoteSchema,
  can,
  projectIsEditable,
  roverGoalSchema,
  roverPlanReviewSchema,
  roverPlanSchema,
  roverProjectPersonSchema,
  roverProjectProgressSchema,
  roverProjectSchema,
  todayIso,
  votePasses,
} from '../shared';
import { sequelize } from '../db';
import { Adult, AdultAssignment, Member, Unit, User } from '../models';
import { BranchArea, Competency } from '../models/program';
import { RoverAssembly, RoverAssemblyItem, RoverGoal, RoverPlan, RoverPlanReview, RoverProject, RoverProjectPerson, RoverVote } from '../models/rovers';
import { writeAudit } from '../lib/audit';
import { ah, badRequest, forbidden, notFound, parse } from '../lib/errors';

/**
 * Comunidad Rover. Dos miradas sobre lo mismo:
 *  - el rover (cuenta enlazada a su ficha): su Plan Personal, sus proyectos y mingas, y su voto en la Asamblea;
 *  - sus educadores (quienes editan la progresión de esa unidad): ven todo y conducen la Asamblea.
 */
export const roversRouter = Router();

const personName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;
const isEducator = (req: Request, unitId: string | null | undefined) => req.auth!.isSuperadmin || (!!unitId && can(req.auth, 'progression', 'edit', unitId));

/** El rover dueño de esta cuenta (activo y en una unidad de la rama), o null. */
async function selfRover(req: Request) {
  if (!req.user!.memberId) return null;
  const m = await Member.findByPk(req.user!.memberId, { include: [{ model: Unit, as: 'unit', attributes: ['id', 'name', 'code', 'branch'] }] });
  if (!m || m.status !== 'activo' || !m.unitId || (m.unit?.branch ?? m.branch) !== 'rovers') return null;
  return m;
}
/** Comunidades que esta cuenta puede abrir. */
async function myUnits(req: Request, self: Member | null) {
  const units = await Unit.findAll({ where: { branch: 'rovers', active: true }, attributes: ['id', 'name', 'code'], order: [['name', 'ASC']] });
  return units.filter((u) => self?.unitId === u.id || isEducator(req, u.id));
}
/** Resuelve la Comunidad pedida (o la única que tiene) y verifica que pueda abrirla. */
async function resolveUnit(req: Request, self: Member | null) {
  const units = await myUnits(req, self);
  const wanted = typeof req.query.unitId === 'string' && req.query.unitId ? req.query.unitId : (self?.unitId ?? units[0]?.id);
  const unit = units.find((u) => u.id === wanted);
  if (!unit) throw forbidden();
  return { unit, units };
}
const activeRovers = (unitId: string) =>
  Member.findAll({ where: { unitId, status: 'activo' }, attributes: ['id', 'firstName', 'lastName', 'youthRep'], order: [['lastName', 'ASC'], ['firstName', 'ASC']] });

// ---------------- Inicio ----------------
roversRouter.get(
  '/home',
  ah(async (req, res) => {
    const self = await selfRover(req);
    const units = await myUnits(req, self);
    // Colaborador adulto de algún proyecto: también entra, solo a esos proyectos
    const collab = req.user!.adultId ? await RoverProjectPerson.count({ where: { adultId: req.user!.adultId } }) : 0;
    if (!units.length) return res.json({ units: [], rover: null, collaborator: collab > 0 });
    const unit = units.find((u) => u.id === self?.unitId) ?? units[0];
    const assembly = await RoverAssembly.findOne({ where: { unitId: unit.id, status: 'abierta' }, attributes: ['id', 'openedAt'] });
    let rover = null;
    if (self) {
      const [plan, goals, mine] = await Promise.all([
        RoverPlan.findOne({ where: { memberId: self.id }, attributes: ['vision'] }),
        RoverGoal.findAll({ where: { memberId: self.id }, attributes: ['title', 'status', 'dueDate'] }),
        RoverProject.findAll({ where: { ownerMemberId: self.id }, attributes: ['id', 'title', 'kind', 'status'], order: [['updatedAt', 'DESC']] }),
      ]);
      const open = goals.filter((g) => g.status === 'en_curso');
      const next = open.filter((g) => g.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0];
      rover = {
        memberId: self.id,
        firstName: self.firstName,
        youthRep: self.youthRep,
        hasVision: Boolean(plan?.vision),
        goals: { total: goals.length, open: open.length, achieved: goals.filter((g) => g.status === 'lograda').length },
        nextGoal: next ? { title: next.title, dueDate: next.dueDate } : null,
        projects: mine.map((p) => ({ id: p.id, title: p.title, kind: p.kind, status: p.status })),
      };
    }
    res.json({ units, unitId: unit.id, educator: isEducator(req, unit.id), rover, assembly: assembly ? { id: assembly.id, openedAt: assembly.openedAt } : null, collaborator: collab > 0 });
  }),
);

/** Quiénes forman la Comunidad (para invitar a un proyecto y, para los educadores, cómo viene cada Plan). */
roversRouter.get(
  '/community',
  ah(async (req, res) => {
    const self = await selfRover(req);
    const { unit, units } = await resolveUnit(req, self);
    const edu = isEducator(req, unit.id);
    const rovers = await activeRovers(unit.id);
    const ids = rovers.map((r) => r.id);
    const [accounts, goals, plans, assignments] = await Promise.all([
      User.findAll({ where: { memberId: ids }, attributes: ['memberId', 'active', 'lastLoginAt'] }),
      edu ? RoverGoal.findAll({ where: { memberId: ids }, attributes: ['memberId', 'status', 'updatedAt'] }) : Promise.resolve([] as RoverGoal[]),
      edu ? RoverPlan.findAll({ where: { memberId: ids }, attributes: ['memberId', 'vision', 'updatedAt'] }) : Promise.resolve([] as RoverPlan[]),
      AdultAssignment.findAll({
        where: { year: new Date().getFullYear() },
        include: [{ model: Adult, as: 'adult', attributes: ['id', 'firstName', 'lastName', 'totem', 'status'], required: true }],
        attributes: ['adultId', 'unitId'],
      }),
    ]);
    const adults = new Map<string, { id: string; name: string; educator: boolean }>();
    for (const a of assignments) {
      if (!a.adult || a.adult.status === 'baja') continue;
      const prev = adults.get(a.adultId);
      adults.set(a.adultId, { id: a.adultId, name: personName(a.adult), educator: Boolean(prev?.educator) || a.unitId === unit.id });
    }
    res.json({
      units,
      unit,
      educator: edu,
      rovers: rovers.map((r) => {
        const acc = accounts.find((a) => a.memberId === r.id);
        const mine = goals.filter((g) => g.memberId === r.id);
        const plan = plans.find((p) => p.memberId === r.id);
        const updated = [plan?.updatedAt, ...mine.map((g) => g.updatedAt)].filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];
        return {
          id: r.id,
          name: personName(r),
          youthRep: r.youthRep,
          hasAccount: Boolean(acc?.active),
          ...(edu
            ? { entered: Boolean(acc?.lastLoginAt), plan: { hasVision: Boolean(plan?.vision), goals: mine.length, open: mine.filter((g) => g.status === 'en_curso').length, achieved: mine.filter((g) => g.status === 'lograda').length, updatedAt: updated ?? null } }
            : {}),
        };
      }),
      adults: [...adults.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    });
  }),
);

// ---------------- Plan Personal ----------------
/** Quién abre el Plan de un rover: él mismo (y lo edita) o sus educadores (solo lo leen). */
async function planAccess(req: Request, memberId: string) {
  const member = await Member.findByPk(memberId, { attributes: ['id', 'firstName', 'lastName', 'unitId', 'branch', 'status'] });
  if (!member) throw notFound();
  const own = req.user!.memberId === member.id;
  if (!own && !isEducator(req, member.unitId)) throw forbidden();
  return { member, own };
}
const goalJson = (g: RoverGoal) => ({
  id: g.id,
  title: g.title,
  areaId: g.areaId,
  competencyId: g.competencyId,
  actions: g.actions ?? [],
  resources: g.resources,
  dueDate: g.dueDate,
  status: g.status,
  achievedAt: g.achievedAt,
  reflection: g.reflection,
  updatedAt: g.updatedAt,
});

const reviewJson = (r: RoverPlanReview) => ({ id: r.id, date: r.reviewDate, answers: r.answers ?? {}, updatedAt: r.updatedAt });

roversRouter.get(
  '/plans/:memberId',
  ah(async (req, res) => {
    const { member, own } = await planAccess(req, req.params.memberId);
    const [plan, goals, areas, competencies, reviews] = await Promise.all([
      RoverPlan.findOne({ where: { memberId: member.id } }),
      RoverGoal.findAll({ where: { memberId: member.id }, order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']] }),
      BranchArea.findAll({ where: { branch: 'rovers' }, attributes: ['id', 'name'], order: [['sortOrder', 'ASC']] }),
      Competency.findAll({ where: { branch: 'rovers', active: true }, attributes: ['id', 'areaId', 'number', 'name'], order: [['number', 'ASC']] }),
      RoverPlanReview.findAll({ where: { memberId: member.id }, order: [['reviewDate', 'DESC'], ['createdAt', 'DESC']] }),
    ]);
    res.json({
      member: { id: member.id, name: personName(member) },
      canEdit: own,
      vision: plan?.vision ?? null,
      updatedAt: plan?.updatedAt ?? null,
      goals: goals.map(goalJson),
      reviews: reviews.map(reviewJson),
      areas,
      competencies,
    });
  }),
);

/** El Plan lo escribe solo su dueño. */
async function ownPlan(req: Request, memberId: string) {
  const { member, own } = await planAccess(req, memberId);
  if (!own) throw forbidden('El Plan Personal lo escribe cada rover');
  return member;
}

roversRouter.put(
  '/plans/:memberId',
  ah(async (req, res) => {
    const member = await ownPlan(req, req.params.memberId);
    const { vision } = parse(roverPlanSchema, req.body);
    const [plan] = await RoverPlan.findOrCreate({ where: { memberId: member.id }, defaults: { memberId: member.id, vision } });
    await plan.update({ vision });
    res.json({ ok: true, vision: plan.vision });
  }),
);

/** Ruta y competencia tienen que ser de la rama; si la competencia tiene ruta, la meta la hereda. */
async function goalData(body: unknown) {
  const data = parse(roverGoalSchema, body);
  let areaId = data.areaId;
  if (data.competencyId) {
    const c = await Competency.findOne({ where: { id: data.competencyId, branch: 'rovers' }, attributes: ['id', 'areaId'] });
    if (!c) throw badRequest('Revisá los datos', { competencyId: 'Esa competencia no es de la Rama Rovers' });
    areaId = c.areaId ?? areaId;
  }
  if (areaId && !(await BranchArea.findOne({ where: { id: areaId, branch: 'rovers' }, attributes: ['id'] }))) throw badRequest('Revisá los datos', { areaId: 'Esa ruta no es de la Rama Rovers' });
  return { ...data, areaId, achievedAt: data.status === 'lograda' ? todayIso() : null };
}

roversRouter.post(
  '/plans/:memberId/goals',
  ah(async (req, res) => {
    const member = await ownPlan(req, req.params.memberId);
    const data = await goalData(req.body);
    const last = ((await RoverGoal.max('sortOrder', { where: { memberId: member.id } })) as number | null) ?? 0;
    const goal = await RoverGoal.create({ ...data, memberId: member.id, sortOrder: last + 1 });
    res.status(201).json(goalJson(goal));
  }),
);

roversRouter.put(
  '/goals/:id',
  ah(async (req, res) => {
    const goal = await RoverGoal.findByPk(req.params.id);
    if (!goal) throw notFound();
    await ownPlan(req, goal.memberId);
    const data = await goalData(req.body);
    // La fecha de logro se conserva si ya estaba lograda
    await goal.update({ ...data, achievedAt: data.status === 'lograda' ? (goal.achievedAt ?? data.achievedAt) : null });
    res.json(goalJson(goal));
  }),
);

roversRouter.delete(
  '/goals/:id',
  ah(async (req, res) => {
    const goal = await RoverGoal.findByPk(req.params.id);
    if (!goal) throw notFound();
    await ownPlan(req, goal.memberId);
    await goal.destroy();
    res.json({ ok: true });
  }),
);

/** «Alto en el camino»: la evaluación periódica del Plan. La escribe el rover; sus educadores la leen. */
roversRouter.post(
  '/plans/:memberId/reviews',
  ah(async (req, res) => {
    const member = await ownPlan(req, req.params.memberId);
    const data = parse(roverPlanReviewSchema, req.body);
    const review = await RoverPlanReview.create({ memberId: member.id, reviewDate: data.date, answers: data.answers });
    res.status(201).json(reviewJson(review));
  }),
);

roversRouter.put(
  '/reviews/:id',
  ah(async (req, res) => {
    const review = await RoverPlanReview.findByPk(req.params.id);
    if (!review) throw notFound();
    await ownPlan(req, review.memberId);
    const data = parse(roverPlanReviewSchema, req.body);
    await review.update({ reviewDate: data.date, answers: data.answers });
    res.json(reviewJson(review));
  }),
);

roversRouter.delete(
  '/reviews/:id',
  ah(async (req, res) => {
    const review = await RoverPlanReview.findByPk(req.params.id);
    if (!review) throw notFound();
    await ownPlan(req, review.memberId);
    await review.destroy();
    res.json({ ok: true });
  }),
);

// ---------------- Proyectos y mingas ----------------
const projectInclude = [
  { model: Member, as: 'owner', attributes: ['id', 'firstName', 'lastName'] },
  {
    model: RoverProjectPerson,
    as: 'people',
    include: [
      { model: Member, as: 'member', attributes: ['id', 'firstName', 'lastName'] },
      { model: Adult, as: 'adult', attributes: ['id', 'firstName', 'lastName'] },
    ],
  },
];

/**
 * Lo ven: su responsable, a quienes invitó (rovers o adultos), los educadores de la Comunidad y,
 * desde que pasó por la Asamblea, toda la Comunidad (lo tuvieron que votar).
 */
function seesProject(req: Request, self: Member | null, p: RoverProject) {
  if (isEducator(req, p.unitId)) return true;
  if (self && p.ownerMemberId === self.id) return true;
  const people = p.people ?? [];
  if (self && people.some((x) => x.memberId === self.id)) return true;
  if (req.user!.adultId && people.some((x) => x.adultId === req.user!.adultId)) return true;
  return Boolean(self && self.unitId === p.unitId && p.status !== 'borrador');
}
const projectSummary = (p: RoverProject, self: Member | null) => ({
  id: p.id,
  unitId: p.unitId,
  kind: p.kind,
  field: p.field,
  scope: p.scope,
  title: p.title,
  status: p.status,
  startDate: p.startDate,
  endDate: p.endDate,
  owner: p.owner ? { id: p.owner.id, name: personName(p.owner) } : null,
  mine: Boolean(self && p.ownerMemberId === self.id),
  people: (p.people ?? []).length,
  parentProjectId: p.parentProjectId,
  updatedAt: p.updatedAt,
});

/** Los datos de la ficha. Una minga puede ser parte de un proyecto de su Comunidad que su autor ya ve. */
async function projectData(req: Request, self: Member, body: unknown, currentId?: string) {
  const data = parse(roverProjectSchema, body);
  if (data.kind !== 'minga' || !data.parentProjectId) return { ...data, parentProjectId: null };
  const parent = data.parentProjectId === currentId ? null : await RoverProject.findOne({ where: { id: data.parentProjectId, unitId: self.unitId!, kind: 'proyecto' }, include: projectInclude });
  if (!parent || !seesProject(req, self, parent)) throw badRequest('Revisá los datos', { parentProjectId: 'Ese proyecto no es de tu Comunidad' });
  return data;
}

roversRouter.get(
  '/projects',
  ah(async (req, res) => {
    const self = await selfRover(req);
    const units = await myUnits(req, self);
    const collab = req.user!.adultId ? (await RoverProjectPerson.findAll({ where: { adultId: req.user!.adultId }, attributes: ['projectId'] })).map((x) => x.projectId) : [];
    if (!units.length && !collab.length) throw forbidden();
    const projects = await RoverProject.findAll({
      where: { [Op.or]: [{ unitId: units.map((u) => u.id) }, { id: collab }] },
      include: projectInclude,
      order: [['updatedAt', 'DESC']],
    });
    res.json({
      canCreate: Boolean(self),
      educator: units.some((u) => isEducator(req, u.id)),
      projects: projects.filter((p) => seesProject(req, self, p)).map((p) => projectSummary(p, self)),
    });
  }),
);

roversRouter.post(
  '/projects',
  ah(async (req, res) => {
    const self = await selfRover(req);
    if (!self) throw forbidden('Los proyectos y mingas los proponen los rovers');
    const data = await projectData(req, self, req.body);
    const p = await RoverProject.create({ ...data, unitId: self.unitId!, ownerMemberId: self.id });
    res.status(201).json({ id: p.id });
  }),
);

async function loadProject(req: Request, id: string) {
  const self = await selfRover(req);
  const p = await RoverProject.findByPk(id, { include: projectInclude });
  if (!p) throw notFound();
  if (!seesProject(req, self, p)) throw forbidden();
  return { p, self, owner: Boolean(self && p.ownerMemberId === self.id) };
}

roversRouter.get(
  '/projects/:id',
  ah(async (req, res) => {
    const { p, self, owner } = await loadProject(req, req.params.id);
    const items = await RoverAssemblyItem.findAll({
      where: { projectId: p.id, status: ['aprobado', 'no_aprobado'] },
      include: [{ model: RoverAssembly, as: 'assembly', attributes: ['id', 'openedAt'] }],
      order: [['decidedAt', 'DESC']],
    });
    const openAssembly = await RoverAssembly.findOne({ where: { unitId: p.unitId, status: 'abierta' }, attributes: ['id'] });
    // El proyecto del que es parte y las mingas que tiene adentro: solo los que esta cuenta puede abrir
    const [parent, mingas] = await Promise.all([
      p.parentProjectId ? RoverProject.findByPk(p.parentProjectId, { include: projectInclude }) : null,
      p.kind === 'proyecto' ? RoverProject.findAll({ where: { parentProjectId: p.id }, include: projectInclude, order: [['startDate', 'ASC'], ['createdAt', 'ASC']] }) : [],
    ]);
    res.json({
      ...projectSummary(p, self),
      what: p.what,
      why: p.why,
      howWhere: p.howWhere,
      forWhom: p.forWhom,
      schedule: p.schedule,
      cost: p.cost,
      funding: p.funding,
      needs: p.needs,
      celebration: p.celebration,
      supportTeam: p.supportTeam,
      expectedResult: p.expectedResult,
      roversEstimate: p.roversEstimate,
      allies: p.allies,
      roles: p.roles,
      activities: p.activities ?? [],
      tools: p.tools,
      outreach: p.outreach,
      media: p.media,
      slogan: p.slogan,
      learnings: p.learnings,
      impact: p.impact,
      nextSteps: p.nextSteps,
      recordLink: p.recordLink,
      parent: parent && seesProject(req, self, parent) ? { id: parent.id, title: parent.title } : null,
      mingas: mingas.filter((m) => seesProject(req, self, m)).map((m) => ({ id: m.id, title: m.title, status: m.status, startDate: m.startDate })),
      finalReport: p.finalReport,
      decidedAt: p.decidedAt,
      canEdit: owner && projectIsEditable(p.status),
      canInvite: owner,
      canProgress: owner && ['aprobado', 'en_curso', 'terminado'].includes(p.status),
      canPostulate: owner && projectIsEditable(p.status) && Boolean(openAssembly),
      assemblyOpen: Boolean(openAssembly),
      people: (p.people ?? [])
        .map((x) => ({ id: x.id, memberId: x.memberId, adultId: x.adultId, name: x.member ? personName(x.member) : x.adult ? personName(x.adult) : '', kind: x.memberId ? 'rover' : 'adulto' }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
      decisions: items.map((i) => ({ id: i.id, date: i.decidedAt ?? i.assembly?.openedAt, status: i.status, yes: i.yes, no: i.no, abstain: i.abstain, present: i.presentCount })),
    });
  }),
);

roversRouter.put(
  '/projects/:id',
  ah(async (req, res) => {
    const { p, owner, self } = await loadProject(req, req.params.id);
    if (!owner || !self) throw forbidden('La ficha la edita quien la propuso');
    if (!projectIsEditable(p.status)) throw badRequest('La ficha ya pasó por la Asamblea: no se puede cambiar');
    await p.update(await projectData(req, self, req.body, p.id));
    res.json({ ok: true });
  }),
);

roversRouter.delete(
  '/projects/:id',
  ah(async (req, res) => {
    const { p, owner } = await loadProject(req, req.params.id);
    if (!owner) throw forbidden();
    if (!projectIsEditable(p.status)) throw badRequest('Solo se puede borrar un borrador');
    await p.destroy();
    res.json({ ok: true });
  }),
);

/** Avance después de la aprobación: en marcha, terminado y el informe final. */
roversRouter.post(
  '/projects/:id/progress',
  ah(async (req, res) => {
    const { p, owner } = await loadProject(req, req.params.id);
    if (!owner) throw forbidden();
    if (!['aprobado', 'en_curso', 'terminado'].includes(p.status)) throw badRequest('Primero lo tiene que aprobar la Asamblea');
    const data = parse(roverProjectProgressSchema, req.body);
    await p.update({ status: data.status, finalReport: data.finalReport, learnings: data.learnings, impact: data.impact, nextSteps: data.nextSteps, recordLink: data.recordLink });
    res.json({ ok: true });
  }),
);

roversRouter.post(
  '/projects/:id/people',
  ah(async (req, res) => {
    const { p, owner } = await loadProject(req, req.params.id);
    if (!owner) throw forbidden('Invita quien propuso el proyecto');
    const data = parse(roverProjectPersonSchema, req.body);
    if (data.memberId) {
      if (data.memberId === p.ownerMemberId) throw badRequest('Ya sos responsable del proyecto');
      const m = await Member.findOne({ where: { id: data.memberId, unitId: p.unitId, status: 'activo' }, attributes: ['id'] });
      if (!m) throw badRequest('Solo se puede sumar a rovers de la Comunidad');
    } else if (!(await Adult.findOne({ where: { id: data.adultId!, status: { [Op.ne]: 'baja' } }, attributes: ['id'] }))) {
      throw badRequest('Ese adulto no está en el Grupo');
    }
    const where = { projectId: p.id, memberId: data.memberId, adultId: data.adultId };
    if (!(await RoverProjectPerson.findOne({ where }))) await RoverProjectPerson.create(where);
    res.status(201).json({ ok: true });
  }),
);

roversRouter.delete(
  '/projects/:id/people/:personId',
  ah(async (req, res) => {
    const { p, owner, self } = await loadProject(req, req.params.id);
    const person = await RoverProjectPerson.findOne({ where: { id: req.params.personId, projectId: p.id } });
    if (!person) throw notFound();
    // Lo quita el responsable, o se baja uno mismo
    const myself = (self && person.memberId === self.id) || (req.user!.adultId && person.adultId === req.user!.adultId);
    if (!owner && !myself) throw forbidden();
    await person.destroy();
    res.json({ ok: true });
  }),
);

// ---------------- Asamblea de Comunidad ----------------
const itemInclude = [
  { model: RoverProject, as: 'project', attributes: ['id', 'title', 'kind', 'field', 'ownerMemberId', 'what'], include: [{ model: Member, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }] },
  { model: RoverVote, as: 'votes', include: [{ model: Member, as: 'member', attributes: ['id', 'firstName', 'lastName'] }] },
];
const chairInclude = { model: Member, as: 'chair', attributes: ['id', 'firstName', 'lastName'] };
/** Preside un rover de la Comunidad (la Guía propone que se elija y vaya rotando). */
async function checkChair(unitId: string, chairMemberId: string | null) {
  if (chairMemberId && !(await Member.findOne({ where: { id: chairMemberId, unitId, status: 'activo' }, attributes: ['id'] }))) {
    throw badRequest('Revisá los datos', { chairMemberId: 'Preside un rover de la Comunidad' });
  }
}
const tally = (votes: RoverVote[], present: string[]) => {
  const valid = votes.filter((v) => present.includes(v.memberId));
  return { yes: valid.filter((v) => v.vote === 'si').length, no: valid.filter((v) => v.vote === 'no').length, abstain: valid.filter((v) => v.vote === 'abstencion').length };
};

roversRouter.get(
  '/assembly',
  ah(async (req, res) => {
    const self = await selfRover(req);
    const { unit, units } = await resolveUnit(req, self);
    const manage = isEducator(req, unit.id);
    const [assembly, rovers, past] = await Promise.all([
      RoverAssembly.findOne({ where: { unitId: unit.id, status: 'abierta' }, include: [{ model: RoverAssemblyItem, as: 'items', include: itemInclude }, chairInclude] }),
      activeRovers(unit.id),
      RoverAssembly.findAll({
        where: { unitId: unit.id, status: 'cerrada' },
        include: [{ model: RoverAssemblyItem, as: 'items', include: [{ model: RoverProject, as: 'project', attributes: ['id', 'title', 'kind'] }] }, chairInclude],
        order: [['openedAt', 'DESC']],
        limit: 12,
      }),
    ]);
    const accounts = await User.findAll({ where: { memberId: rovers.map((r) => r.id), active: true }, attributes: ['memberId'] });
    const inAssembly = new Set((assembly?.items ?? []).map((i) => i.projectId));
    const postulable =
      self && self.unitId === unit.id && assembly
        ? (await RoverProject.findAll({ where: { ownerMemberId: self.id, status: ['borrador', 'reformular'] }, attributes: ['id', 'title', 'kind'], order: [['updatedAt', 'DESC']] })).filter((p) => !inAssembly.has(p.id))
        : [];
    res.json({
      units,
      unit,
      canManage: manage,
      me: self && self.unitId === unit.id ? { memberId: self.id, present: Boolean(assembly?.present.includes(self.id)) } : null,
      rovers: rovers.map((r) => ({ id: r.id, name: personName(r), hasAccount: accounts.some((a) => a.memberId === r.id) })),
      postulable,
      assembly: assembly
        ? {
            id: assembly.id,
            openedAt: assembly.openedAt,
            purpose: assembly.purpose,
            agenda: assembly.agenda,
            chair: assembly.chair ? { id: assembly.chair.id, name: personName(assembly.chair) } : null,
            present: assembly.present.filter((id) => rovers.some((r) => r.id === id)),
            items: (assembly.items ?? [])
              .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
              .map((i) => {
                const live = tally(i.votes ?? [], assembly.present);
                const decided = i.status === 'aprobado' || i.status === 'no_aprobado';
                return {
                  id: i.id,
                  status: i.status,
                  project: { id: i.projectId, title: i.project!.title, kind: i.project!.kind, field: i.project!.field, what: i.project!.what, owner: i.project!.owner ? personName(i.project!.owner) : '' },
                  mine: Boolean(self && i.project!.ownerMemberId === self.id),
                  yes: decided ? i.yes : live.yes,
                  no: decided ? i.no : live.no,
                  abstain: decided ? i.abstain : live.abstain,
                  present: decided ? i.presentCount : assembly.present.length,
                  // El voto es a la vista: se ve quién votó qué
                  votes: (i.votes ?? []).map((v) => ({ memberId: v.memberId, name: v.member ? personName(v.member) : '', vote: v.vote })).sort((a, b) => a.name.localeCompare(b.name, 'es')),
                  myVote: self ? ((i.votes ?? []).find((v) => v.memberId === self.id)?.vote ?? null) : null,
                };
              }),
          }
        : null,
      past: past.map((a) => ({
        id: a.id,
        openedAt: a.openedAt,
        closedAt: a.closedAt,
        notes: a.notes,
        purpose: a.purpose,
        agenda: a.agenda,
        chair: a.chair ? personName(a.chair) : null,
        present: a.present.length,
        items: (a.items ?? []).map((i) => ({ id: i.id, projectId: i.projectId, title: i.project?.title ?? '', kind: i.project?.kind ?? 'proyecto', status: i.status, yes: i.yes, no: i.no, abstain: i.abstain, present: i.presentCount })),
      })),
    });
  }),
);

/** La Asamblea abierta, para quien la conduce (educador) o participa (rover de esa Comunidad). */
async function openAssembly(req: Request, id: string) {
  const assembly = await RoverAssembly.findByPk(id);
  if (!assembly) throw notFound();
  if (assembly.status !== 'abierta') throw badRequest('Esa Asamblea ya se cerró');
  const self = await selfRover(req);
  const manage = isEducator(req, assembly.unitId);
  if (!manage && self?.unitId !== assembly.unitId) throw forbidden();
  return { assembly, self, manage };
}
async function assemblyItem(req: Request, itemId: string) {
  const item = await RoverAssemblyItem.findByPk(itemId, { include: [{ model: RoverProject, as: 'project' }] });
  if (!item) throw notFound();
  return { item, ...(await openAssembly(req, item.assemblyId)) };
}

/** Modo Asamblea: lo activa el educador de la Comunidad. */
roversRouter.post(
  '/assembly',
  ah(async (req, res) => {
    const { unitId, purpose, agenda, chairMemberId } = parse(assemblyOpenSchema, req.body);
    const unit = await Unit.findOne({ where: { id: unitId, branch: 'rovers', active: true } });
    if (!unit) throw notFound();
    if (!isEducator(req, unit.id)) throw forbidden('La Asamblea la abre el equipo de educadores de la Comunidad');
    if (await RoverAssembly.findOne({ where: { unitId, status: 'abierta' } })) throw badRequest('Ya hay una Asamblea abierta');
    await checkChair(unitId, chairMemberId);
    const a = await RoverAssembly.create({ unitId, openedAt: new Date(), openedByUserId: req.user!.id, present: [], purpose, agenda, chairMemberId });
    await writeAudit({ action: 'create', entity: 'RoverAssembly', entityId: a.id, summary: `Asamblea de ${unit.name} abierta` });
    res.status(201).json({ id: a.id });
  }),
);

/** Objetivo, orden del día y quién preside: se pueden completar o corregir con la Asamblea en marcha. */
roversRouter.put(
  '/assembly/:id',
  ah(async (req, res) => {
    const { assembly, manage } = await openAssembly(req, req.params.id);
    if (!manage) throw forbidden();
    const data = parse(assemblyInfoSchema, req.body);
    await checkChair(assembly.unitId, data.chairMemberId);
    await assembly.update(data);
    res.json({ ok: true });
  }),
);

/** Presentes: cada rover da el suyo desde su celular; el educador puede marcar a cualquiera. */
roversRouter.post(
  '/assembly/:id/present',
  ah(async (req, res) => {
    const { assembly, self, manage } = await openAssembly(req, req.params.id);
    const { memberId, present } = parse(assemblyPresentSchema, req.body);
    if (!manage && self?.id !== memberId) throw forbidden();
    if (!(await Member.findOne({ where: { id: memberId, unitId: assembly.unitId, status: 'activo' }, attributes: ['id'] }))) throw badRequest('No es un rover de esta Comunidad');
    await sequelize.transaction(async (transaction) => {
      const a = (await RoverAssembly.findByPk(assembly.id, { transaction, lock: true }))!;
      const set = new Set(a.present);
      if (present) set.add(memberId);
      else set.delete(memberId);
      await a.update({ present: [...set] }, { transaction });
    });
    res.json({ ok: true });
  }),
);

/** Postular una minga o un proyecto: lo hace su responsable mientras la Asamblea está abierta. */
roversRouter.post(
  '/assembly/:id/items',
  ah(async (req, res) => {
    const { assembly, self } = await openAssembly(req, req.params.id);
    const { projectId } = parse(assemblyItemSchema, req.body);
    const project = await RoverProject.findOne({ where: { id: projectId, unitId: assembly.unitId } });
    if (!project) throw notFound();
    if (!self || project.ownerMemberId !== self.id) throw forbidden('Lo postula quien lo propone');
    if (!projectIsEditable(project.status)) throw badRequest('Ese proyecto ya pasó por la Asamblea');
    if (!project.what?.trim()) throw badRequest('Antes de postularlo, contá de qué se trata (el «Qué» de la ficha)');
    await sequelize.transaction(async (transaction) => {
      // Si ya se votó en esta misma Asamblea y volvió para reformular, la nueva postulación es otro renglón
      const waiting = await RoverAssemblyItem.findOne({ where: { assemblyId: assembly.id, projectId, status: ['pendiente', 'votando'] }, transaction });
      if (!waiting) await RoverAssemblyItem.create({ assemblyId: assembly.id, projectId }, { transaction });
      await project.update({ status: 'postulado' }, { transaction });
    });
    res.status(201).json({ ok: true });
  }),
);

/** Retirar una postulación que todavía no se votó. */
roversRouter.delete(
  '/assembly/items/:itemId',
  ah(async (req, res) => {
    const { item, self, manage } = await assemblyItem(req, req.params.itemId);
    if (!manage && item.project!.ownerMemberId !== self?.id) throw forbidden();
    if (item.status !== 'pendiente') throw badRequest('Ya se está votando o ya se decidió');
    await sequelize.transaction(async (transaction) => {
      await item.project!.update({ status: 'borrador' }, { transaction });
      await item.destroy({ transaction });
    });
    res.json({ ok: true });
  }),
);

roversRouter.post(
  '/assembly/items/:itemId/open-vote',
  ah(async (req, res) => {
    const { item, assembly, manage } = await assemblyItem(req, req.params.itemId);
    if (!manage) throw forbidden('La votación la abre quien conduce la Asamblea');
    if (item.status !== 'pendiente') throw badRequest('Esa postulación ya se votó');
    if (!assembly.present.length) throw badRequest('Primero marcá quiénes están presentes');
    if (await RoverAssemblyItem.findOne({ where: { assemblyId: assembly.id, status: 'votando' } })) throw badRequest('Cerrá primero la votación que está abierta');
    await item.update({ status: 'votando' });
    res.json({ ok: true });
  }),
);

/** Votan solo los rovers presentes. Cada uno desde su cuenta; a quien no tiene celular le carga el voto el educador. */
roversRouter.post(
  '/assembly/items/:itemId/vote',
  ah(async (req, res) => {
    const { item, assembly, self, manage } = await assemblyItem(req, req.params.itemId);
    const { vote, memberId } = parse(assemblyVoteSchema, req.body);
    if (item.status !== 'votando') throw badRequest('La votación no está abierta');
    const voter = memberId ?? self?.id;
    if (!voter) throw badRequest('Indicá de quién es el voto');
    if (voter !== self?.id && !manage) throw forbidden('Cada rover vota por sí mismo');
    if (!assembly.present.includes(voter)) throw badRequest(voter === self?.id ? 'Primero dá el presente' : 'No figura entre los presentes');
    const [row, created] = await RoverVote.findOrCreate({ where: { itemId: item.id, memberId: voter }, defaults: { itemId: item.id, memberId: voter, vote, castByUserId: req.user!.id } });
    if (!created) await row.update({ vote, castByUserId: req.user!.id });
    res.json({ ok: true });
  }),
);

/** Cierra la votación: se aprueba con más de la mitad de los presentes a favor. */
roversRouter.post(
  '/assembly/items/:itemId/close-vote',
  ah(async (req, res) => {
    const { item, assembly, manage } = await assemblyItem(req, req.params.itemId);
    if (!manage) throw forbidden();
    if (item.status !== 'votando') throw badRequest('La votación no está abierta');
    const votes = await RoverVote.findAll({ where: { itemId: item.id } });
    const t = tally(votes, assembly.present);
    const approved = votePasses(t.yes, assembly.present.length);
    await sequelize.transaction(async (transaction) => {
      await item.update({ ...t, presentCount: assembly.present.length, status: approved ? 'aprobado' : 'no_aprobado', decidedAt: new Date() }, { transaction });
      await item.project!.update({ status: approved ? 'aprobado' : 'reformular', decidedAt: new Date() }, { transaction });
      await writeAudit(
        { action: 'update', entity: 'RoverProject', entityId: item.projectId, summary: `Asamblea: «${item.project!.title}» ${approved ? 'aprobado' : 'vuelve para reformular'} (${t.yes} a favor, ${t.no} en contra, ${t.abstain} abstenciones, ${assembly.present.length} presentes)` },
        transaction,
      );
    });
    res.json({ ok: true, approved, ...t, present: assembly.present.length });
  }),
);

/** Cierra la Asamblea. Lo que no se llegó a votar vuelve a borrador para una próxima. */
roversRouter.post(
  '/assembly/:id/close',
  ah(async (req, res) => {
    const { assembly, manage } = await openAssembly(req, req.params.id);
    if (!manage) throw forbidden();
    const { notes } = parse(assemblyCloseSchema, req.body);
    await sequelize.transaction(async (transaction) => {
      const pending = await RoverAssemblyItem.findAll({ where: { assemblyId: assembly.id, status: ['pendiente', 'votando'] }, transaction });
      if (pending.length) {
        await RoverProject.update({ status: 'borrador' }, { where: { id: pending.map((i) => i.projectId) }, transaction });
        await RoverAssemblyItem.destroy({ where: { id: pending.map((i) => i.id) }, transaction });
      }
      await assembly.update({ status: 'cerrada', closedAt: new Date(), notes }, { transaction });
      await writeAudit({ action: 'update', entity: 'RoverAssembly', entityId: assembly.id, summary: 'Asamblea cerrada' }, transaction);
    });
    res.json({ ok: true });
  }),
);
