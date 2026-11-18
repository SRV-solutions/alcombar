/**
 * Autorizaciones de madres, padres y tutores firmadas en pantalla. Se registra al importarse
 * (lo importa authorizations.routes.ts). Una autorización firmada no se edita: se anula y se firma otra.
 */
import { DataTypes, Model, type CreationOptional, type ForeignKey, type InferAttributes, type InferCreationAttributes, type NonAttribute } from 'sequelize';
import type { AuthKind, AuthorizationContent, AuthStatus, SignatureData } from '../shared';
import { Member, sequelize, User } from './index';
import { Camp } from './treasury';

const { UUID, UUIDV4, STRING, INTEGER, DATE, JSONB } = DataTypes;

/** Quién firmó como testigo o dio el aval: datos tal como estaban en ese momento, con su trazo. */
export interface AdultSignature {
  userId: string | null;
  adultId: string | null;
  name: string;
  dni: string | null;
  /** Función en el Grupo Scout (aval). */
  function?: string | null;
  signature: SignatureData;
  signedAt: string;
  /** Testigo que firmó en el dispositivo de otro educador (no con su propio usuario). */
  onDeviceOf?: string | null;
}

export class SignedAuthorization extends Model<InferAttributes<SignedAuthorization>, InferCreationAttributes<SignedAuthorization>> {
  declare id: CreationOptional<string>;
  declare kind: AuthKind;
  declare memberId: ForeignKey<Member['id']>;
  declare campId: ForeignKey<Camp['id']> | null;
  declare year: number;
  declare templateVersion: string;
  declare content: AuthorizationContent;
  declare signature: SignatureData;
  declare custodySignature: SignatureData | null;
  declare witnesses: CreationOptional<AdultSignature[]>;
  declare aval: AdultSignature | null;
  /** Educador en cuyo dispositivo (y ante quien) se firmó. */
  declare attendedBy: { userId: string; name: string; adultId: string | null; dni: string | null };
  declare status: CreationOptional<AuthStatus>;
  declare hash: string;
  declare signedAt: Date;
  declare userAgent: string | null;
  declare ip: string | null;
  declare voidedAt: Date | null;
  declare voidedByUserId: ForeignKey<User['id']> | null;
  declare voidReason: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare member?: NonAttribute<Member>;
  declare camp?: NonAttribute<Camp | null>;
}
SignedAuthorization.init(
  {
    id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
    kind: { type: STRING(20), allowNull: false },
    year: { type: INTEGER, allowNull: false },
    templateVersion: { type: STRING(10), allowNull: false },
    content: { type: JSONB, allowNull: false },
    signature: { type: JSONB, allowNull: false },
    custodySignature: JSONB,
    witnesses: { type: JSONB, allowNull: false, defaultValue: [] },
    aval: JSONB,
    attendedBy: { type: JSONB, allowNull: false },
    status: { type: STRING(10), allowNull: false, defaultValue: 'firmada' },
    hash: { type: STRING(64), allowNull: false },
    signedAt: { type: DATE, allowNull: false },
    userAgent: STRING(300),
    ip: STRING(60),
    voidedAt: DATE,
    voidReason: STRING(300),
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'signed_authorizations', modelName: 'SignedAuthorization' },
);

SignedAuthorization.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
SignedAuthorization.belongsTo(Camp, { as: 'camp', foreignKey: 'campId' });
SignedAuthorization.belongsTo(User, { as: 'voidedBy', foreignKey: 'voidedByUserId' });
