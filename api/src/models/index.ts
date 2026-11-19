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

const { UUID, UUIDV4, STRING, TEXT, BOOLEAN, INTEGER, DATE, DATEONLY, JSONB, BLOB } = DataTypes;
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
  declare kidsPerAdult: number | null;
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
    kidsPerAdult: { type: INTEGER, allowNull: true },
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
  declare experiences?: NonAttribute<AdultExperience[]>;
  declare habilitations?: NonAttribute<AdultHabilitation[]>;
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
  /** Insignia de Madera: número de registro SAAC, dónde se otorgó y rama. */
  declare registryNumber: CreationOptional<string | null>;
  declare place: CreationOptional<string | null>;
  declare branch: CreationOptional<string | null>;
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
    registryNumber: STRING(30),
    place: STRING(80),
    branch: STRING(20),
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'adult_courses', modelName: 'AdultCourse' },
);

/** Experiencia de formación de un adulto (como el historial de Mi Rincón), con su certificado en PDF. */
export class AdultExperience extends Model<InferAttributes<AdultExperience>, InferCreationAttributes<AdultExperience>> {
  declare id: CreationOptional<string>;
  declare adultId: ForeignKey<Adult['id']>;
  declare name: string;
  declare kind: CreationOptional<string>;
  /** Quién la dictó: zona, distrito o nivel nacional (por ejemplo «Z1»). */
  declare organism: string | null;
  declare branch: string | null;
  declare date: string | null;
  declare status: CreationOptional<string>;
  declare certificateName: CreationOptional<string | null>;
  declare certificateSize: CreationOptional<number | null>;
  /** El PDF. No viene en las consultas comunes: hay que pedirlo con unscoped(). */
  declare certificateData: CreationOptional<Buffer | null>;
  declare source: CreationOptional<string | null>;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
AdultExperience.init(
  {
    id,
    name: { type: STRING(200), allowNull: false },
    kind: { type: STRING(30), allowNull: false, defaultValue: 'formacion' },
    organism: STRING(60),
    branch: STRING(20),
    date: DATEONLY,
    status: { type: STRING(20), allowNull: false, defaultValue: 'acreditada' },
    certificateName: STRING(160),
    certificateSize: INTEGER,
    certificateData: BLOB,
    source: STRING(40),
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  {
    sequelize,
    tableName: 'adult_experiences',
    modelName: 'AdultExperience',
    defaultScope: { attributes: { exclude: ['certificateData'] } },
  },
);

/** Habilitación de un adulto por etapa y rama, con su acta. */
export class AdultHabilitation extends Model<InferAttributes<AdultHabilitation>, InferCreationAttributes<AdultHabilitation>> {
  declare id: CreationOptional<string>;
  declare adultId: ForeignKey<Adult['id']>;
  declare level: string;
  declare branch: string | null;
  declare actDate: string | null;
  declare book: string | null;
  declare folio: string | null;
  declare status: CreationOptional<string>;
  declare source: CreationOptional<string | null>;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
AdultHabilitation.init(
  {
    id,
    level: { type: STRING(20), allowNull: false },
    branch: STRING(20),
    actDate: DATEONLY,
    book: STRING(20),
    folio: STRING(20),
    status: { type: STRING(20), allowNull: false, defaultValue: 'autorizada' },
    source: STRING(40),
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'adult_habilitations', modelName: 'AdultHabilitation' },
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
  /** Rover en rotación: sigue siendo rover, en su último tiempo antes de la partida. */
  declare inRotation: CreationOptional<boolean>;
  declare rotationSince: CreationOptional<string | null>;
  /** Fecha de la partida (el estado pasa a 'partida'). */
  declare departedAt: CreationOptional<string | null>;
  /** El adulto que pasó a ser después de la partida. */
  declare adultId: CreationOptional<ForeignKey<Adult['id']> | null>;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare unit?: NonAttribute<Unit | null>;
  declare adultRecord?: NonAttribute<Adult | null>;
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
    inRotation: { type: BOOLEAN, allowNull: false, defaultValue: false },
    rotationSince: DATEONLY,
    departedAt: DATEONLY,
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
  /** Obligatorio para tener el legajo completo; los opcionales (p. ej. "retirarse solo") no cuentan como faltantes. */
  declare required: CreationOptional<boolean>;
  /** A quién se le pide: 'member' (protagonistas) o 'adult' (adultos). */
  declare appliesTo: CreationOptional<'member' | 'adult'>;
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
    required: { type: BOOLEAN, allowNull: false, defaultValue: true },
    appliesTo: { type: STRING(10), allowNull: false, defaultValue: 'member' },
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
  /** No corresponde para este protagonista (p. ej. no tiene obra social): no cuenta como faltante. */
  declare notApplicable: CreationOptional<boolean>;
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
    notApplicable: { type: BOOLEAN, allowNull: false, defaultValue: false },
    presentedAt: DATEONLY,
    expiresAt: DATEONLY,
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'member_documents', modelName: 'MemberDocument' },
);

/** Documentación de un adulto (mismo esquema que la de protagonistas). */
export class AdultDocument extends Model<InferAttributes<AdultDocument>, InferCreationAttributes<AdultDocument>> {
  declare id: CreationOptional<string>;
  declare adultId: ForeignKey<Adult['id']>;
  declare documentTypeId: ForeignKey<DocumentType['id']>;
  declare presented: boolean;
  declare notApplicable: CreationOptional<boolean>;
  declare presentedAt: string | null;
  declare expiresAt: string | null;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare documentType?: NonAttribute<DocumentType>;
}
AdultDocument.init(
  {
    id,
    presented: { type: BOOLEAN, allowNull: false, defaultValue: false },
    notApplicable: { type: BOOLEAN, allowNull: false, defaultValue: false },
    presentedAt: DATEONLY,
    expiresAt: DATEONLY,
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'adult_documents', modelName: 'AdultDocument' },
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

/** Asistencia de un adulto (educador) a una actividad del Grupo. */
export class AdultAttendance extends Model<InferAttributes<AdultAttendance>, InferCreationAttributes<AdultAttendance>> {
  declare id: CreationOptional<string>;
  declare adultId: ForeignKey<Adult['id']>;
  declare date: string;
  declare status: string;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
AdultAttendance.init(
  {
    id,
    date: { type: DATEONLY, allowNull: false },
    status: { type: STRING(20), allowNull: false },
    notes: STRING(200),
    createdAt: DATE,
    updatedAt: DATE,
  },
  { sequelize, tableName: 'adult_attendances', modelName: 'AdultAttendance', paranoid: false },
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
Adult.hasMany(AdultExperience, { as: 'experiences', foreignKey: 'adultId' });
AdultExperience.belongsTo(Adult, { as: 'adult', foreignKey: 'adultId' });
Adult.hasMany(AdultHabilitation, { as: 'habilitations', foreignKey: 'adultId' });
AdultHabilitation.belongsTo(Adult, { as: 'adult', foreignKey: 'adultId' });

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
// Después de la partida, el protagonista queda enlazado al adulto que pasó a ser
Member.belongsTo(Adult, { as: 'adultRecord', foreignKey: 'adultId' });
Adult.hasOne(Member, { as: 'memberRecord', foreignKey: 'adultId' });
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
Adult.hasMany(AdultDocument, { as: 'documents', foreignKey: 'adultId' });
AdultDocument.belongsTo(Adult, { as: 'adult', foreignKey: 'adultId' });
AdultDocument.belongsTo(DocumentType, { as: 'documentType', foreignKey: 'documentTypeId' });
MemberDocument.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
MemberDocument.belongsTo(DocumentType, { as: 'documentType', foreignKey: 'documentTypeId' });
Member.hasMany(Attendance, { as: 'attendances', foreignKey: 'memberId' });
Attendance.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
AdultAttendance.belongsTo(Adult, { as: 'adult', foreignKey: 'adultId' });
Adult.hasMany(AdultAttendance, { as: 'attendances', foreignKey: 'adultId' });
Attendance.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });

export type { Base };
export { sequelize };
