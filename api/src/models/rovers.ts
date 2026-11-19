/** Comunidad Rover: Plan Personal, proyectos y mingas, y Asamblea de Comunidad. */
import { DataTypes, Model, type CreationOptional, type ForeignKey, type InferAttributes, type InferCreationAttributes, type NonAttribute } from 'sequelize';
import { Adult, Member, sequelize, Unit, User } from './index';
import { BranchArea, Competency } from './program';
import type { RoverGoalAction } from '../shared';

const { UUID, UUIDV4, STRING, TEXT, DATE, DATEONLY, INTEGER, JSONB } = DataTypes;
const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
const opts = (tableName: string, modelName: string) => ({ sequelize, tableName, modelName, paranoid: false });

export class RoverPlan extends Model<InferAttributes<RoverPlan>, InferCreationAttributes<RoverPlan>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  /** Visión a futuro (3-4 años). */
  declare vision: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
RoverPlan.init({ id, vision: TEXT, createdAt: DATE, updatedAt: DATE }, opts('rover_plans', 'RoverPlan'));

export class RoverGoal extends Model<InferAttributes<RoverGoal>, InferCreationAttributes<RoverGoal>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare title: string;
  /** Ruta (área de crecimiento) y competencia terminal: opcionales, la meta puede ser propia. */
  declare areaId: ForeignKey<BranchArea['id']> | null;
  declare competencyId: ForeignKey<Competency['id']> | null;
  declare actions: CreationOptional<RoverGoalAction[]>;
  declare resources: string | null;
  declare dueDate: string | null;
  declare status: CreationOptional<string>;
  declare achievedAt: string | null;
  declare reflection: string | null;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
RoverGoal.init(
  {
    id,
    title: { type: STRING(300), allowNull: false },
    actions: { type: JSONB, allowNull: false, defaultValue: [] },
    resources: TEXT,
    dueDate: DATEONLY,
    status: { type: STRING(12), allowNull: false, defaultValue: 'en_curso' },
    achievedAt: DATEONLY,
    reflection: TEXT,
    sortOrder: { type: INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: DATE,
    updatedAt: DATE,
  },
  opts('rover_goals', 'RoverGoal'),
);

export class RoverProject extends Model<InferAttributes<RoverProject>, InferCreationAttributes<RoverProject>> {
  declare id: CreationOptional<string>;
  declare unitId: ForeignKey<Unit['id']>;
  declare kind: string;
  declare field: string | null;
  declare scope: string | null;
  declare title: string;
  /** Responsable: el rover que lo propone. */
  declare ownerMemberId: ForeignKey<Member['id']>;
  declare what: string | null;
  declare why: string | null;
  declare howWhere: string | null;
  declare forWhom: string | null;
  declare startDate: string | null;
  declare endDate: string | null;
  declare schedule: string | null;
  declare cost: string | null;
  declare funding: string | null;
  declare needs: string | null;
  declare celebration: string | null;
  declare status: CreationOptional<string>;
  declare finalReport: CreationOptional<string | null>;
  declare decidedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare owner?: NonAttribute<Member>;
  declare people?: NonAttribute<RoverProjectPerson[]>;
}
RoverProject.init(
  {
    id,
    kind: { type: STRING(10), allowNull: false },
    field: STRING(14),
    scope: STRING(12),
    title: { type: STRING(200), allowNull: false },
    what: TEXT,
    why: TEXT,
    howWhere: TEXT,
    forWhom: TEXT,
    startDate: DATEONLY,
    endDate: DATEONLY,
    schedule: TEXT,
    cost: TEXT,
    funding: TEXT,
    needs: TEXT,
    celebration: TEXT,
    status: { type: STRING(12), allowNull: false, defaultValue: 'borrador' },
    finalReport: TEXT,
    decidedAt: DATE,
    createdAt: DATE,
    updatedAt: DATE,
  },
  opts('rover_projects', 'RoverProject'),
);

export class RoverProjectPerson extends Model<InferAttributes<RoverProjectPerson>, InferCreationAttributes<RoverProjectPerson>> {
  declare id: CreationOptional<string>;
  declare projectId: ForeignKey<RoverProject['id']>;
  declare memberId: ForeignKey<Member['id']> | null;
  declare adultId: ForeignKey<Adult['id']> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare member?: NonAttribute<Member | null>;
  declare adult?: NonAttribute<Adult | null>;
}
RoverProjectPerson.init({ id, createdAt: DATE, updatedAt: DATE }, opts('rover_project_people', 'RoverProjectPerson'));

export class RoverAssembly extends Model<InferAttributes<RoverAssembly>, InferCreationAttributes<RoverAssembly>> {
  declare id: CreationOptional<string>;
  declare unitId: ForeignKey<Unit['id']>;
  declare status: CreationOptional<string>;
  declare openedAt: Date;
  declare closedAt: CreationOptional<Date | null>;
  declare openedByUserId: ForeignKey<User['id']> | null;
  /** Ids de los rovers presentes. */
  declare present: CreationOptional<string[]>;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare items?: NonAttribute<RoverAssemblyItem[]>;
}
RoverAssembly.init(
  {
    id,
    status: { type: STRING(8), allowNull: false, defaultValue: 'abierta' },
    openedAt: { type: DATE, allowNull: false },
    closedAt: DATE,
    present: { type: JSONB, allowNull: false, defaultValue: [] },
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
  },
  opts('rover_assemblies', 'RoverAssembly'),
);

export class RoverAssemblyItem extends Model<InferAttributes<RoverAssemblyItem>, InferCreationAttributes<RoverAssemblyItem>> {
  declare id: CreationOptional<string>;
  declare assemblyId: ForeignKey<RoverAssembly['id']>;
  declare projectId: ForeignKey<RoverProject['id']>;
  declare status: CreationOptional<string>;
  declare presentCount: CreationOptional<number | null>;
  declare yes: CreationOptional<number | null>;
  declare no: CreationOptional<number | null>;
  declare abstain: CreationOptional<number | null>;
  declare decidedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare project?: NonAttribute<RoverProject>;
  declare votes?: NonAttribute<RoverVote[]>;
  declare assembly?: NonAttribute<RoverAssembly>;
}
RoverAssemblyItem.init(
  {
    id,
    status: { type: STRING(12), allowNull: false, defaultValue: 'pendiente' },
    presentCount: INTEGER,
    yes: INTEGER,
    no: INTEGER,
    abstain: INTEGER,
    decidedAt: DATE,
    createdAt: DATE,
    updatedAt: DATE,
  },
  opts('rover_assembly_items', 'RoverAssemblyItem'),
);

export class RoverVote extends Model<InferAttributes<RoverVote>, InferCreationAttributes<RoverVote>> {
  declare id: CreationOptional<string>;
  declare itemId: ForeignKey<RoverAssemblyItem['id']>;
  declare memberId: ForeignKey<Member['id']>;
  declare vote: string;
  declare castByUserId: ForeignKey<User['id']> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare member?: NonAttribute<Member>;
}
RoverVote.init({ id, vote: { type: STRING(10), allowNull: false }, createdAt: DATE, updatedAt: DATE }, opts('rover_votes', 'RoverVote'));

RoverPlan.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
RoverGoal.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
RoverGoal.belongsTo(BranchArea, { as: 'area', foreignKey: 'areaId' });
RoverGoal.belongsTo(Competency, { as: 'competency', foreignKey: 'competencyId' });
RoverProject.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
RoverProject.belongsTo(Member, { as: 'owner', foreignKey: 'ownerMemberId' });
RoverProject.hasMany(RoverProjectPerson, { as: 'people', foreignKey: 'projectId' });
RoverProjectPerson.belongsTo(RoverProject, { as: 'project', foreignKey: 'projectId' });
RoverProjectPerson.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
RoverProjectPerson.belongsTo(Adult, { as: 'adult', foreignKey: 'adultId' });
RoverAssembly.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
RoverAssembly.belongsTo(User, { as: 'openedBy', foreignKey: 'openedByUserId' });
RoverAssembly.hasMany(RoverAssemblyItem, { as: 'items', foreignKey: 'assemblyId' });
RoverAssemblyItem.belongsTo(RoverAssembly, { as: 'assembly', foreignKey: 'assemblyId' });
RoverAssemblyItem.belongsTo(RoverProject, { as: 'project', foreignKey: 'projectId' });
RoverProject.hasMany(RoverAssemblyItem, { as: 'assemblyItems', foreignKey: 'projectId' });
RoverAssemblyItem.hasMany(RoverVote, { as: 'votes', foreignKey: 'itemId' });
RoverVote.belongsTo(RoverAssemblyItem, { as: 'item', foreignKey: 'itemId' });
RoverVote.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
