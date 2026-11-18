/**
 * Modelos de las etapas 3 (programa) y 4 (progresión). Se registran al importar este archivo
 * (lo importan program.routes.ts y progression.routes.ts).
 */
import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { Adult, Member, sequelize, Unit, User } from './index';

const { UUID, UUIDV4, STRING, TEXT, BOOLEAN, INTEGER, DATE, DATEONLY, JSONB } = DataTypes;
const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
const stamps = { createdAt: DATE, updatedAt: DATE, deletedAt: DATE };
const stampsHard = { createdAt: DATE, updatedAt: DATE };

type Stamps = { createdAt: CreationOptional<Date>; updatedAt: CreationOptional<Date> };
type SoftStamps = Stamps & { deletedAt: CreationOptional<Date | null> };

// ======================= CATÁLOGOS DE RAMA =======================
export class BranchArea extends Model<InferAttributes<BranchArea>, InferCreationAttributes<BranchArea>> {
  declare id: CreationOptional<string>;
  declare branch: string;
  declare name: string;
  /** Cómo se llama en la rama (sendero, ruta…) y a qué refiere. */
  declare description: CreationOptional<string | null>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
BranchArea.init(
  { id, branch: { type: STRING(20), allowNull: false }, name: { type: STRING(80), allowNull: false }, description: TEXT, sortOrder: { type: INTEGER, allowNull: false, defaultValue: 0 }, ...stamps },
  { sequelize, tableName: 'branch_areas', modelName: 'BranchArea' },
);

export class Competency extends Model<InferAttributes<Competency>, InferCreationAttributes<Competency>> {
  declare id: CreationOptional<string>;
  declare branch: string;
  declare areaId: ForeignKey<BranchArea['id']> | null;
  declare number: number | null;
  declare name: string;
  declare description: string | null;
  declare requiredChallenges: CreationOptional<string[]>;
  declare optionalChallenges: CreationOptional<string[]>;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare area?: NonAttribute<BranchArea | null>;
}
Competency.init(
  {
    id,
    branch: { type: STRING(20), allowNull: false },
    number: INTEGER,
    name: { type: STRING(200), allowNull: false },
    description: TEXT,
    requiredChallenges: { type: JSONB, allowNull: false, defaultValue: [] },
    optionalChallenges: { type: JSONB, allowNull: false, defaultValue: [] },
    active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    ...stamps,
  },
  { sequelize, tableName: 'competencies', modelName: 'Competency' },
);

// ======================= CICLOS Y FICHAS =======================
export class ProgramCycle extends Model<InferAttributes<ProgramCycle>, InferCreationAttributes<ProgramCycle>> {
  declare id: CreationOptional<string>;
  declare unitId: ForeignKey<Unit['id']>;
  declare name: string;
  declare startDate: string | null;
  declare endDate: string | null;
  declare phase: CreationOptional<string>;
  declare diagnosis: string | null;
  declare purposes: string | null;
  declare evaluation: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare unit?: NonAttribute<Unit>;
}
ProgramCycle.init(
  {
    id,
    name: { type: STRING(120), allowNull: false },
    startDate: DATEONLY,
    endDate: DATEONLY,
    phase: { type: STRING(20), allowNull: false, defaultValue: 'revisar' },
    diagnosis: TEXT,
    purposes: TEXT,
    evaluation: TEXT,
    ...stamps,
  },
  { sequelize, tableName: 'program_cycles', modelName: 'ProgramCycle' },
);

export class ActivitySheet extends Model<InferAttributes<ActivitySheet>, InferCreationAttributes<ActivitySheet>> {
  declare id: CreationOptional<string>;
  declare code: string;
  declare unitId: ForeignKey<Unit['id']>;
  declare cycleId: ForeignKey<ProgramCycle['id']> | null;
  declare name: string;
  declare ageMin: number | null;
  declare ageMax: number | null;
  declare areaId: ForeignKey<BranchArea['id']> | null;
  declare participants: number | null;
  declare objectives: CreationOptional<string[]>;
  declare exploration: string | null;
  declare description: string | null;
  declare closing: string | null;
  declare otherEducators: string | null;
  declare materials: CreationOptional<string[]>;
  declare responsibleAdultId: ForeignKey<Adult['id']> | null;
  declare date: string | null;
  declare place: string | null;
  declare durationMin: number | null;
  declare opportunityType: CreationOptional<string>;
  declare scope: CreationOptional<string>;
  declare outside: CreationOptional<boolean>;
  declare safety: string | null;
  declare nights: number | null;
  declare status: CreationOptional<string>;
  declare reviewNotes: CreationOptional<string | null>;
  declare approvedByUserId: ForeignKey<User['id']> | null;
  declare approvedAt: CreationOptional<Date | null>;
  declare evalWorked: CreationOptional<string | null>;
  declare evalChange: CreationOptional<string | null>;
  declare evalAttendance: CreationOptional<number | null>;
  declare evaluatedAt: CreationOptional<Date | null>;
  declare sourceSheetId: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare unit?: NonAttribute<Unit>;
  declare cycle?: NonAttribute<ProgramCycle | null>;
  declare area?: NonAttribute<BranchArea | null>;
  declare responsible?: NonAttribute<Adult | null>;
  declare approvedBy?: NonAttribute<User | null>;
  declare competencies?: NonAttribute<Competency[]>;
}
ActivitySheet.init(
  {
    id,
    code: { type: STRING(30), allowNull: false },
    name: { type: STRING(160), allowNull: false },
    ageMin: INTEGER,
    ageMax: INTEGER,
    participants: INTEGER,
    objectives: { type: JSONB, allowNull: false, defaultValue: [] },
    exploration: TEXT,
    description: TEXT,
    closing: TEXT,
    otherEducators: TEXT,
    materials: { type: JSONB, allowNull: false, defaultValue: [] },
    date: DATEONLY,
    place: STRING(200),
    durationMin: INTEGER,
    opportunityType: { type: STRING(20), allowNull: false, defaultValue: 'variable' },
    scope: { type: STRING(20), allowNull: false, defaultValue: 'unidad' },
    outside: { type: BOOLEAN, allowNull: false, defaultValue: false },
    safety: TEXT,
    nights: INTEGER,
    status: { type: STRING(20), allowNull: false, defaultValue: 'borrador' },
    reviewNotes: TEXT,
    approvedAt: DATE,
    evalWorked: TEXT,
    evalChange: TEXT,
    evalAttendance: INTEGER,
    evaluatedAt: DATE,
    sourceSheetId: UUID,
    ...stamps,
  },
  { sequelize, tableName: 'activity_sheets', modelName: 'ActivitySheet' },
);

export class ActivityCompetency extends Model<InferAttributes<ActivityCompetency>, InferCreationAttributes<ActivityCompetency>> {
  declare id: CreationOptional<string>;
  declare activitySheetId: ForeignKey<ActivitySheet['id']>;
  declare competencyId: ForeignKey<Competency['id']>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
ActivityCompetency.init({ id, ...stampsHard }, { sequelize, tableName: 'activity_competencies', modelName: 'ActivityCompetency', paranoid: false });

// ======================= PROGRAMA DEL SÁBADO =======================
export class MeetingProgram extends Model<InferAttributes<MeetingProgram>, InferCreationAttributes<MeetingProgram>> {
  declare id: CreationOptional<string>;
  declare unitId: ForeignKey<Unit['id']>;
  declare date: string;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare items?: NonAttribute<MeetingItem[]>;
}
MeetingProgram.init({ id, date: { type: DATEONLY, allowNull: false }, notes: TEXT, ...stamps }, { sequelize, tableName: 'meeting_programs', modelName: 'MeetingProgram' });

export class MeetingItem extends Model<InferAttributes<MeetingItem>, InferCreationAttributes<MeetingItem>> {
  declare id: CreationOptional<string>;
  declare meetingProgramId: ForeignKey<MeetingProgram['id']>;
  declare sortOrder: number;
  declare time: string | null;
  declare activitySheetId: ForeignKey<ActivitySheet['id']> | null;
  declare title: string | null;
  declare responsibleAdultId: ForeignKey<Adult['id']> | null;
  /** Responsable que no es un adulto cargado: «Párroco», «Jefatura de Grupo», «Todos», dos personas… */
  declare responsibleText: CreationOptional<string | null>;
  declare durationMin: number | null;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare sheet?: NonAttribute<ActivitySheet | null>;
  declare responsible?: NonAttribute<Adult | null>;
}
MeetingItem.init(
  { id, sortOrder: { type: INTEGER, allowNull: false, defaultValue: 0 }, time: STRING(5), title: STRING(200), responsibleText: STRING(120), durationMin: INTEGER, notes: STRING(500), ...stampsHard },
  { sequelize, tableName: 'meeting_items', modelName: 'MeetingItem', paranoid: false },
);

// ======================= PROGRESIÓN =======================
export class ProgressionScheme extends Model<InferAttributes<ProgressionScheme>, InferCreationAttributes<ProgressionScheme>> {
  declare id: CreationOptional<string>;
  declare branch: string;
  declare name: string;
  declare version: CreationOptional<number>;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare stages?: NonAttribute<ProgressionStage[]>;
}
ProgressionScheme.init(
  {
    id,
    branch: { type: STRING(20), allowNull: false },
    name: { type: STRING(80), allowNull: false },
    version: { type: INTEGER, allowNull: false, defaultValue: 1 },
    active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    ...stamps,
  },
  { sequelize, tableName: 'progression_schemes', modelName: 'ProgressionScheme' },
);

export class ProgressionStage extends Model<InferAttributes<ProgressionStage>, InferCreationAttributes<ProgressionStage>> {
  declare id: CreationOptional<string>;
  declare schemeId: ForeignKey<ProgressionScheme['id']>;
  declare name: string;
  declare description: string | null;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare scheme?: NonAttribute<ProgressionScheme>;
}
ProgressionStage.init(
  { id, name: { type: STRING(80), allowNull: false }, description: TEXT, sortOrder: { type: INTEGER, allowNull: false, defaultValue: 0 }, ...stamps },
  { sequelize, tableName: 'progression_stages', modelName: 'ProgressionStage' },
);

export class MemberStage extends Model<InferAttributes<MemberStage>, InferCreationAttributes<MemberStage>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare stageId: ForeignKey<ProgressionStage['id']>;
  declare startedAt: string | null;
  declare insigniaAt: string | null;
  declare endedAt: string | null;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare stage?: NonAttribute<ProgressionStage>;
}
MemberStage.init(
  { id, startedAt: DATEONLY, insigniaAt: DATEONLY, endedAt: DATEONLY, notes: TEXT, ...stamps },
  { sequelize, tableName: 'member_stages', modelName: 'MemberStage' },
);

export class MemberCompetency extends Model<InferAttributes<MemberCompetency>, InferCreationAttributes<MemberCompetency>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare competencyId: ForeignKey<Competency['id']>;
  declare memberStageId: ForeignKey<MemberStage['id']> | null;
  declare status: CreationOptional<string>;
  declare achievedAt: string | null;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare competency?: NonAttribute<Competency>;
}
MemberCompetency.init(
  { id, status: { type: STRING(20), allowNull: false, defaultValue: 'elegida' }, achievedAt: DATEONLY, notes: TEXT, ...stamps },
  { sequelize, tableName: 'member_competencies', modelName: 'MemberCompetency' },
);

export class MemberProgress extends Model<InferAttributes<MemberProgress>, InferCreationAttributes<MemberProgress>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare ambientacionSince: string | null;
  declare transition: CreationOptional<boolean>;
  declare transitionNotes: string | null;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
MemberProgress.init(
  { id, ambientacionSince: DATEONLY, transition: { type: BOOLEAN, allowNull: false, defaultValue: false }, transitionNotes: TEXT, notes: TEXT, ...stamps },
  { sequelize, tableName: 'member_progress', modelName: 'MemberProgress' },
);

export class MemberRole extends Model<InferAttributes<MemberRole>, InferCreationAttributes<MemberRole>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare cycleId: ForeignKey<ProgramCycle['id']> | null;
  declare role: string;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare cycle?: NonAttribute<ProgramCycle | null>;
}
MemberRole.init({ id, role: { type: STRING(80), allowNull: false }, notes: TEXT, ...stamps }, { sequelize, tableName: 'member_roles', modelName: 'MemberRole' });

export class CycleReview extends Model<InferAttributes<CycleReview>, InferCreationAttributes<CycleReview>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare cycleId: ForeignKey<ProgramCycle['id']> | null;
  declare date: string | null;
  declare selfReview: string | null;
  declare peersReview: string | null;
  declare educatorReview: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare cycle?: NonAttribute<ProgramCycle | null>;
  declare member?: NonAttribute<Member>;
}
CycleReview.init(
  { id, date: DATEONLY, selfReview: TEXT, peersReview: TEXT, educatorReview: TEXT, ...stamps },
  { sequelize, tableName: 'cycle_reviews', modelName: 'CycleReview' },
);

export class Specialty extends Model<InferAttributes<Specialty>, InferCreationAttributes<Specialty>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare description: string | null;
  /** Rama a la que pertenece (null = para todas) y área de desarrollo. */
  declare branch: CreationOptional<string | null>;
  declare areaId: CreationOptional<string | null>;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
Specialty.init(
  {
    id,
    name: { type: STRING(120), allowNull: false },
    description: TEXT,
    branch: STRING(20),
    areaId: UUID,
    active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    ...stamps,
  },
  { sequelize, tableName: 'specialties', modelName: 'Specialty' },
);

export class MemberSpecialty extends Model<InferAttributes<MemberSpecialty>, InferCreationAttributes<MemberSpecialty>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare specialtyId: ForeignKey<Specialty['id']>;
  declare achievedAt: string | null;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare specialty?: NonAttribute<Specialty>;
}
MemberSpecialty.init({ id, achievedAt: DATEONLY, notes: TEXT, ...stamps }, { sequelize, tableName: 'member_specialties', modelName: 'MemberSpecialty' });

/** Nota de seguimiento de un adulto sobre la progresión de un protagonista. */
export class ProgressionNote extends Model<InferAttributes<ProgressionNote>, InferCreationAttributes<ProgressionNote>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare authorUserId: ForeignKey<User['id']> | null;
  declare date: string;
  declare note: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare author?: NonAttribute<User | null>;
}
ProgressionNote.init(
  { id, date: { type: DATEONLY, allowNull: false }, note: { type: TEXT, allowNull: false }, ...stamps },
  { sequelize, tableName: 'progression_notes', modelName: 'ProgressionNote' },
);

// ======================= RELACIONES =======================
BranchArea.hasMany(Competency, { as: 'competencies', foreignKey: 'areaId' });
Competency.belongsTo(BranchArea, { as: 'area', foreignKey: 'areaId' });

ProgramCycle.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
ProgramCycle.hasMany(ActivitySheet, { as: 'sheets', foreignKey: 'cycleId' });

ActivitySheet.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
ActivitySheet.belongsTo(ProgramCycle, { as: 'cycle', foreignKey: 'cycleId' });
ActivitySheet.belongsTo(BranchArea, { as: 'area', foreignKey: 'areaId' });
ActivitySheet.belongsTo(Adult, { as: 'responsible', foreignKey: 'responsibleAdultId' });
ActivitySheet.belongsTo(User, { as: 'approvedBy', foreignKey: 'approvedByUserId' });
ActivitySheet.belongsToMany(Competency, { through: ActivityCompetency, as: 'competencies', foreignKey: 'activitySheetId', otherKey: 'competencyId' });
ActivityCompetency.belongsTo(ActivitySheet, { as: 'sheet', foreignKey: 'activitySheetId' });
ActivityCompetency.belongsTo(Competency, { as: 'competency', foreignKey: 'competencyId' });

MeetingProgram.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
MeetingProgram.hasMany(MeetingItem, { as: 'items', foreignKey: 'meetingProgramId' });
MeetingItem.belongsTo(MeetingProgram, { as: 'program', foreignKey: 'meetingProgramId' });
MeetingItem.belongsTo(ActivitySheet, { as: 'sheet', foreignKey: 'activitySheetId' });
MeetingItem.belongsTo(Adult, { as: 'responsible', foreignKey: 'responsibleAdultId' });

ProgressionScheme.hasMany(ProgressionStage, { as: 'stages', foreignKey: 'schemeId' });
ProgressionStage.belongsTo(ProgressionScheme, { as: 'scheme', foreignKey: 'schemeId' });
MemberStage.belongsTo(ProgressionStage, { as: 'stage', foreignKey: 'stageId' });
MemberStage.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
MemberCompetency.belongsTo(Competency, { as: 'competency', foreignKey: 'competencyId' });
MemberCompetency.belongsTo(MemberStage, { as: 'memberStage', foreignKey: 'memberStageId' });
MemberCompetency.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
MemberProgress.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
MemberRole.belongsTo(ProgramCycle, { as: 'cycle', foreignKey: 'cycleId' });
MemberRole.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
CycleReview.belongsTo(ProgramCycle, { as: 'cycle', foreignKey: 'cycleId' });
CycleReview.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
MemberSpecialty.belongsTo(Specialty, { as: 'specialty', foreignKey: 'specialtyId' });
MemberSpecialty.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
ProgressionNote.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
ProgressionNote.belongsTo(User, { as: 'author', foreignKey: 'authorUserId' });

export type { Stamps, SoftStamps };
