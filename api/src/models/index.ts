import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../db';

const { UUID, UUIDV4, STRING, TEXT, BOOLEAN, INTEGER, DATE, DATEONLY, JSONB } = DataTypes;
const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };

type Base = {
  id: CreationOptional<string>;
  createdAt: CreationOptional<Date>;
  updatedAt: CreationOptional<Date>;
};

// ======================= GRUPO =======================
export class Unit extends Model<InferAttributes<Unit>, InferCreationAttributes<Unit>> {
  declare id: CreationOptional<string>;
  declare code: string;
  declare name: string;
  declare branch: string;
  declare minAdults: number | null;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare smallGroups?: NonAttribute<SmallGroup[]>;
}
Unit.init(
  {
    id,
    code: { type: STRING(12), allowNull: false },
    name: { type: STRING(120), allowNull: false },
    branch: { type: STRING(20), allowNull: false },
    minAdults: { type: INTEGER, allowNull: true },
    active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'units', modelName: 'Unit' },
);

export class SmallGroup extends Model<InferAttributes<SmallGroup>, InferCreationAttributes<SmallGroup>> {
  declare id: CreationOptional<string>;
  declare unitId: ForeignKey<Unit['id']>;
  declare name: string;
  declare kind: string;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare unit?: NonAttribute<Unit>;
}
SmallGroup.init(
  {
    id,
    name: { type: STRING(80), allowNull: false },
    kind: { type: STRING(20), allowNull: false },
    active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'small_groups', modelName: 'SmallGroup' },
);

export class SupportTeam extends Model<InferAttributes<SupportTeam>, InferCreationAttributes<SupportTeam>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare description: string | null;
  declare leaderAdultId: ForeignKey<Adult['id']> | null;
  /** Recibe los avisos de altas y bajas para cargar en Cruz del Sur. */
  declare receivesRegistryAlerts: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare leader?: NonAttribute<Adult | null>;
}
SupportTeam.init(
  {
    id,
    name: { type: STRING(120), allowNull: false },
    description: TEXT,
    receivesRegistryAlerts: { type: BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'support_teams', modelName: 'SupportTeam' },
);

// ======================= ADULTOS =======================
export class Adult extends Model<InferAttributes<Adult>, InferCreationAttributes<Adult>> {
  declare id: CreationOptional<string>;
  declare firstName: string;
  declare lastName: string;
  declare totem: string | null;
  declare dni: string | null;
  declare birthDate: string | null;
  declare email: string | null;
  declare phone: string | null;
  declare address: string | null;
  declare joinedAt: string | null;
  declare status: CreationOptional<string>;
  declare advisorAdultId: ForeignKey<Adult['id']> | null;
  declare externalId: CreationOptional<string | null>;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare assignments?: NonAttribute<AdultAssignment[]>;
  declare courses?: NonAttribute<AdultCourse[]>;
  declare advisor?: NonAttribute<Adult | null>;
  declare user?: NonAttribute<User | null>;
}
Adult.init(
  {
    id,
    firstName: { type: STRING(80), allowNull: false },
    lastName: { type: STRING(80), allowNull: false },
    totem: STRING(80),
    dni: STRING(12),
    birthDate: DATEONLY,
    email: STRING(200),
    phone: STRING(40),
    address: STRING(200),
    joinedAt: DATEONLY,
    status: { type: STRING(20), allowNull: false, defaultValue: 'alta' },
    externalId: STRING(60),
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'adults', modelName: 'Adult' },
);

export class AdultAssignment extends Model<InferAttributes<AdultAssignment>, InferCreationAttributes<AdultAssignment>> {
  declare id: CreationOptional<string>;
  declare adultId: ForeignKey<Adult['id']>;
  declare year: number;
  declare position: string;
  declare unitId: ForeignKey<Unit['id']> | null;
  declare supportTeamId: ForeignKey<SupportTeam['id']> | null;
  declare branch: CreationOptional<string | null>;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare unit?: NonAttribute<Unit | null>;
  declare supportTeam?: NonAttribute<SupportTeam | null>;
  declare adult?: NonAttribute<Adult>;
}
AdultAssignment.init(
  {
    id,
    year: { type: INTEGER, allowNull: false },
    position: { type: STRING(120), allowNull: false },
    branch: STRING(20),
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'adult_assignments', modelName: 'AdultAssignment' },
);

export class Course extends Model<InferAttributes<Course>, InferCreationAttributes<Course>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare kind: string;
  /** Cantidad de módulos del curso (ej: Nivel 2 tiene 9). null = no se mide por módulos. */
  declare totalModules: CreationOptional<number | null>;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
Course.init(
  {
    id,
    name: { type: STRING(160), allowNull: false },
    kind: { type: STRING(30), allowNull: false },
    totalModules: { type: INTEGER, allowNull: true },
    active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'courses', modelName: 'Course' },
);

export class AdultCourse extends Model<InferAttributes<AdultCourse>, InferCreationAttributes<AdultCourse>> {
  declare id: CreationOptional<string>;
  declare adultId: ForeignKey<Adult['id']>;
  declare courseId: ForeignKey<Course['id']>;
  declare completedAt: string | null;
  /** Módulos completados (para cursos por módulos). */
  declare modulesDone: CreationOptional<number | null>;
  declare certificateUrl: string | null;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare course?: NonAttribute<Course>;
}
AdultCourse.init(
  {
    id,
    completedAt: DATEONLY,
    modulesDone: { type: INTEGER, allowNull: true },
    certificateUrl: STRING(500),
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'adult_courses', modelName: 'AdultCourse' },
);

// ======================= ACCESO =======================
export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare name: string;
  declare passwordHash: string | null;
  declare adultId: ForeignKey<Adult['id']> | null;
  declare active: CreationOptional<boolean>;
  declare lastLoginAt: Date | null;
  declare failedLogins: CreationOptional<number>;
  declare lockedUntil: Date | null;
  declare tutorials: CreationOptional<{ done: string[]; skipped: string[] }>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare adult?: NonAttribute<Adult | null>;
  declare userRoles?: NonAttribute<UserRole[]>;

  toJSON() {
    const { passwordHash, failedLogins, lockedUntil, ...rest } = this.get({ plain: true }) as Record<string, unknown>;
    return { ...rest, hasPassword: Boolean(passwordHash) } as never;
  }
}
User.init(
  {
    id,
    email: { type: STRING(200), allowNull: false },
    name: { type: STRING(120), allowNull: false },
    passwordHash: STRING(200),
    active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    lastLoginAt: DATE,
    failedLogins: { type: INTEGER, allowNull: false, defaultValue: 0 },
    lockedUntil: DATE,
    tutorials: { type: JSONB, allowNull: false, defaultValue: { done: [], skipped: [] } },
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'users', modelName: 'User' },
);

export class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
  declare id: CreationOptional<string>;
  declare key: string | null;
  declare name: string;
  declare description: string | null;
  declare scope: string;
  declare isSystem: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare rolePermissions?: NonAttribute<RolePermission[]>;
}
Role.init(
  {
    id,
    key: STRING(40),
    name: { type: STRING(80), allowNull: false },
    description: TEXT,
    scope: { type: STRING(10), allowNull: false, defaultValue: 'group' },
    isSystem: { type: BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'roles', modelName: 'Role' },
);

export class Permission extends Model<InferAttributes<Permission>, InferCreationAttributes<Permission>> {
  declare id: CreationOptional<string>;
  declare module: string;
  declare action: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
Permission.init(
  { id, module: { type: STRING(40), allowNull: false }, action: { type: STRING(20), allowNull: false }, createdAt: DATE, updatedAt: DATE },
  { sequelize, tableName: 'permissions', modelName: 'Permission', paranoid: false },
);

export class RolePermission extends Model<InferAttributes<RolePermission>, InferCreationAttributes<RolePermission>> {
  declare id: CreationOptional<string>;
  declare roleId: ForeignKey<Role['id']>;
  declare permissionId: ForeignKey<Permission['id']>;
  declare unitLimited: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare permission?: NonAttribute<Permission>;
}
RolePermission.init(
  { id, unitLimited: { type: BOOLEAN, allowNull: false, defaultValue: false }, createdAt: DATE, updatedAt: DATE },
  { sequelize, tableName: 'role_permissions', modelName: 'RolePermission', paranoid: false },
);

export class UserRole extends Model<InferAttributes<UserRole>, InferCreationAttributes<UserRole>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare roleId: ForeignKey<Role['id']>;
  declare unitId: ForeignKey<Unit['id']> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare role?: NonAttribute<Role>;
  declare unit?: NonAttribute<Unit | null>;
}
UserRole.init({ id, createdAt: DATE, updatedAt: DATE }, { sequelize, tableName: 'user_roles', modelName: 'UserRole', paranoid: false });

export class Session extends Model<InferAttributes<Session>, InferCreationAttributes<Session>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare revokedAt: Date | null;
  declare replacedById: string | null;
  declare userAgent: string | null;
  declare ip: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
Session.init(
  {
    id,
    tokenHash: { type: STRING(128), allowNull: false },
    expiresAt: { type: DATE, allowNull: false },
    revokedAt: DATE,
    replacedById: UUID,
    userAgent: STRING(300),
    ip: STRING(60),
    createdAt: DATE,
    updatedAt: DATE,
  },
  { sequelize, tableName: 'sessions', modelName: 'Session', paranoid: false },
);

export class PasswordToken extends Model<InferAttributes<PasswordToken>, InferCreationAttributes<PasswordToken>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare tokenHash: string;
  declare purpose: 'invite' | 'reset' | 'qr_login';
  declare expiresAt: Date;
  declare usedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
PasswordToken.init(
  {
    id,
    tokenHash: { type: STRING(128), allowNull: false },
    purpose: { type: STRING(10), allowNull: false },
    expiresAt: { type: DATE, allowNull: false },
    usedAt: DATE,
    createdAt: DATE,
    updatedAt: DATE,
  },
  { sequelize, tableName: 'password_tokens', modelName: 'PasswordToken', paranoid: false },
);

export class AuditLog extends Model<InferAttributes<AuditLog>, InferCreationAttributes<AuditLog>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']> | null;
  declare action: string;
  declare entity: string;
  declare entityId: string | null;
  declare summary: string | null;
  declare changes: unknown;
  declare ip: string | null;
  declare createdAt: CreationOptional<Date>;
  declare user?: NonAttribute<User | null>;
}
AuditLog.init(
  {
    id,
    action: { type: STRING(20), allowNull: false },
    entity: { type: STRING(60), allowNull: false },
    entityId: STRING(60),
    summary: STRING(300),
    changes: JSONB,
    ip: STRING(60),
    createdAt: DATE,
  },
  { sequelize, tableName: 'audit_logs', modelName: 'AuditLog', paranoid: false, updatedAt: false },
);

// ======================= PROTAGONISTAS =======================
export class Member extends Model<InferAttributes<Member>, InferCreationAttributes<Member>> {
  declare id: CreationOptional<string>;
  declare firstName: string;
  declare lastName: string;
  declare dni: string | null;
  declare birthDate: string | null;
  declare unitId: ForeignKey<Unit['id']> | null;
  declare branch: CreationOptional<string | null>;
  declare externalId: CreationOptional<string | null>;
  declare smallGroupId: ForeignKey<SmallGroup['id']> | null;
  declare joinedAt: string | null;
  declare promiseDate: string | null;
  declare address: string | null;
  declare phone: string | null;
  declare email: string | null;
  declare status: CreationOptional<string>;
  declare leftAt: string | null;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare unit?: NonAttribute<Unit | null>;
  declare smallGroup?: NonAttribute<SmallGroup | null>;
  declare guardianLinks?: NonAttribute<MemberGuardian[]>;
  declare documents?: NonAttribute<MemberDocument[]>;
}
Member.init(
  {
    id,
    firstName: { type: STRING(80), allowNull: false },
    lastName: { type: STRING(80), allowNull: false },
    dni: STRING(12),
    birthDate: DATEONLY,
    branch: STRING(20),
    externalId: STRING(60),
    joinedAt: DATEONLY,
    promiseDate: DATEONLY,
    address: STRING(200),
    phone: STRING(40),
    email: STRING(200),
    status: { type: STRING(20), allowNull: false, defaultValue: 'activo' },
    leftAt: DATEONLY,
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'members', modelName: 'Member' },
);

export class Guardian extends Model<InferAttributes<Guardian>, InferCreationAttributes<Guardian>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare dni: string | null;
  declare phone: string | null;
  declare email: string | null;
  declare address: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
Guardian.init(
  {
    id,
    name: { type: STRING(160), allowNull: false },
    dni: STRING(12),
    phone: STRING(40),
    email: STRING(200),
    address: STRING(200),
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'guardians', modelName: 'Guardian' },
);

export class MemberGuardian extends Model<InferAttributes<MemberGuardian>, InferCreationAttributes<MemberGuardian>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare guardianId: ForeignKey<Guardian['id']>;
  declare relationship: string | null;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare guardian?: NonAttribute<Guardian>;
  declare member?: NonAttribute<Member>;
}
MemberGuardian.init(
  { id, relationship: STRING(60), sortOrder: { type: INTEGER, allowNull: false, defaultValue: 0 }, createdAt: DATE, updatedAt: DATE },
  { sequelize, tableName: 'member_guardians', modelName: 'MemberGuardian', paranoid: false },
);

export class UnitTransfer extends Model<InferAttributes<UnitTransfer>, InferCreationAttributes<UnitTransfer>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare fromUnitId: ForeignKey<Unit['id']> | null;
  declare toUnitId: ForeignKey<Unit['id']> | null;
  declare date: string;
  /** edad | eleccion | otro */
  declare reason: CreationOptional<string | null>;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
UnitTransfer.init(
  { id, date: { type: DATEONLY, allowNull: false }, reason: STRING(20), notes: TEXT, createdAt: DATE, updatedAt: DATE, deletedAt: DATE },
  { sequelize, tableName: 'unit_transfers', modelName: 'UnitTransfer' },
);

export class Affiliation extends Model<InferAttributes<Affiliation>, InferCreationAttributes<Affiliation>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare year: number;
  declare status: string;
  declare date: string | null;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
Affiliation.init(
  {
    id,
    year: { type: INTEGER, allowNull: false },
    status: { type: STRING(20), allowNull: false },
    date: DATEONLY,
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'affiliations', modelName: 'Affiliation' },
);

export class DocumentType extends Model<InferAttributes<DocumentType>, InferCreationAttributes<DocumentType>> {
  declare id: CreationOptional<string>;
  declare code: string | null;
  declare name: string;
  declare hasExpiry: CreationOptional<boolean>;
  declare active: CreationOptional<boolean>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
DocumentType.init(
  {
    id,
    code: STRING(40),
    name: { type: STRING(120), allowNull: false },
    hasExpiry: { type: BOOLEAN, allowNull: false, defaultValue: false },
    active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'document_types', modelName: 'DocumentType' },
);

export class MemberDocument extends Model<InferAttributes<MemberDocument>, InferCreationAttributes<MemberDocument>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare documentTypeId: ForeignKey<DocumentType['id']>;
  declare presented: boolean;
  declare presentedAt: string | null;
  declare expiresAt: string | null;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare documentType?: NonAttribute<DocumentType>;
}
MemberDocument.init(
  {
    id,
    presented: { type: BOOLEAN, allowNull: false, defaultValue: false },
    presentedAt: DATEONLY,
    expiresAt: DATEONLY,
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'member_documents', modelName: 'MemberDocument' },
);

export class Attendance extends Model<InferAttributes<Attendance>, InferCreationAttributes<Attendance>> {
  declare id: CreationOptional<string>;
  declare memberId: ForeignKey<Member['id']>;
  declare unitId: ForeignKey<Unit['id']>;
  declare date: string;
  declare status: string;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
Attendance.init(
  {
    id,
    date: { type: DATEONLY, allowNull: false },
    status: { type: STRING(20), allowNull: false },
    notes: STRING(200),
    createdAt: DATE,
    updatedAt: DATE,
  },
  { sequelize, tableName: 'attendances', modelName: 'Attendance', paranoid: false },
);

// ======================= RELACIONES =======================
Unit.hasMany(SmallGroup, { as: 'smallGroups', foreignKey: 'unitId' });
SmallGroup.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });

SupportTeam.belongsTo(Adult, { as: 'leader', foreignKey: 'leaderAdultId' });

Adult.belongsTo(Adult, { as: 'advisor', foreignKey: 'advisorAdultId' });
Adult.hasMany(AdultAssignment, { as: 'assignments', foreignKey: 'adultId' });
AdultAssignment.belongsTo(Adult, { as: 'adult', foreignKey: 'adultId' });
AdultAssignment.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
AdultAssignment.belongsTo(SupportTeam, { as: 'supportTeam', foreignKey: 'supportTeamId' });
Adult.hasMany(AdultCourse, { as: 'courses', foreignKey: 'adultId' });
AdultCourse.belongsTo(Course, { as: 'course', foreignKey: 'courseId' });
AdultCourse.belongsTo(Adult, { as: 'adult', foreignKey: 'adultId' });

User.belongsTo(Adult, { as: 'adult', foreignKey: 'adultId' });
Adult.hasOne(User, { as: 'user', foreignKey: 'adultId' });
User.hasMany(UserRole, { as: 'userRoles', foreignKey: 'userId' });
UserRole.belongsTo(User, { as: 'user', foreignKey: 'userId' });
UserRole.belongsTo(Role, { as: 'role', foreignKey: 'roleId' });
UserRole.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
Role.hasMany(RolePermission, { as: 'rolePermissions', foreignKey: 'roleId' });
Role.hasMany(UserRole, { as: 'userRoles', foreignKey: 'roleId' });
RolePermission.belongsTo(Permission, { as: 'permission', foreignKey: 'permissionId' });
Session.belongsTo(User, { as: 'user', foreignKey: 'userId' });
PasswordToken.belongsTo(User, { as: 'user', foreignKey: 'userId' });
AuditLog.belongsTo(User, { as: 'user', foreignKey: 'userId' });

Member.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
Unit.hasMany(Member, { as: 'members', foreignKey: 'unitId' });
Member.belongsTo(SmallGroup, { as: 'smallGroup', foreignKey: 'smallGroupId' });
Member.hasMany(MemberGuardian, { as: 'guardianLinks', foreignKey: 'memberId' });
MemberGuardian.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
MemberGuardian.belongsTo(Guardian, { as: 'guardian', foreignKey: 'guardianId' });
Guardian.hasMany(MemberGuardian, { as: 'memberLinks', foreignKey: 'guardianId' });
Member.hasMany(UnitTransfer, { as: 'transfers', foreignKey: 'memberId' });
UnitTransfer.belongsTo(Unit, { as: 'fromUnit', foreignKey: 'fromUnitId' });
UnitTransfer.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
UnitTransfer.belongsTo(Unit, { as: 'toUnit', foreignKey: 'toUnitId' });
Member.hasMany(Affiliation, { as: 'affiliations', foreignKey: 'memberId' });
Member.hasMany(MemberDocument, { as: 'documents', foreignKey: 'memberId' });
MemberDocument.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
MemberDocument.belongsTo(DocumentType, { as: 'documentType', foreignKey: 'documentTypeId' });
Member.hasMany(Attendance, { as: 'attendances', foreignKey: 'memberId' });
Attendance.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
Attendance.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });

export type { Base };
export { sequelize };
