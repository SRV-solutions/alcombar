/** Reportes de problemas de la plataforma. */
import { DataTypes, Model, type CreationOptional, type ForeignKey, type InferAttributes, type InferCreationAttributes, type NonAttribute } from 'sequelize';
import { sequelize, User } from './index';

export class SupportReport extends Model<InferAttributes<SupportReport>, InferCreationAttributes<SupportReport>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']> | null;
  declare category: string;
  declare description: string;
  declare pageUrl: string | null;
  declare appVersion: string | null;
  declare userAgent: string | null;
  declare clientErrors: unknown;
  declare status: CreationOptional<string>;
  declare response: string | null;
  declare respondedBy: ForeignKey<User['id']> | null;
  declare resolvedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare user?: NonAttribute<User | null>;
  declare responder?: NonAttribute<User | null>;
}
SupportReport.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    category: { type: DataTypes.STRING(20), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    pageUrl: DataTypes.STRING(300),
    appVersion: DataTypes.STRING(40),
    userAgent: DataTypes.STRING(300),
    clientErrors: DataTypes.JSONB,
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ABIERTO' },
    response: DataTypes.TEXT,
    resolvedAt: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'support_reports', modelName: 'SupportReport' },
);

SupportReport.belongsTo(User, { as: 'user', foreignKey: 'userId' });
SupportReport.belongsTo(User, { as: 'responder', foreignKey: 'respondedBy' });
