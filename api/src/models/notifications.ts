/** Avisos: la campanita de cada usuario y las altas/bajas pendientes de cargar en Cruz del Sur. */
import { DataTypes, Model, type CreationOptional, type ForeignKey, type InferAttributes, type InferCreationAttributes, type NonAttribute } from 'sequelize';
import { Adult, Member, sequelize, Unit, User } from './index';

const { UUID, UUIDV4, STRING, TEXT, DATE } = DataTypes;
const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };

export class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare kind: string;
  declare title: string;
  declare body: string | null;
  declare link: string | null;
  declare readAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
Notification.init(
  {
    id,
    kind: { type: STRING(30), allowNull: false },
    title: { type: STRING(200), allowNull: false },
    body: TEXT,
    link: STRING(300),
    readAt: DATE,
    createdAt: DATE,
    updatedAt: DATE,
  },
  { sequelize, tableName: 'notifications', modelName: 'Notification', paranoid: false },
);

export class RegistryTask extends Model<InferAttributes<RegistryTask>, InferCreationAttributes<RegistryTask>> {
  declare id: CreationOptional<string>;
  declare kind: 'alta' | 'baja';
  declare personType: 'member' | 'adult';
  declare memberId: ForeignKey<Member['id']> | null;
  declare adultId: ForeignKey<Adult['id']> | null;
  declare personName: string;
  declare unitId: ForeignKey<Unit['id']> | null;
  declare detail: string | null;
  declare status: CreationOptional<'pendiente' | 'hecha' | 'anulada'>;
  declare createdByUserId: ForeignKey<User['id']> | null;
  declare resolvedAt: Date | null;
  declare resolvedByUserId: ForeignKey<User['id']> | null;
  declare resolutionNote: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare unit?: NonAttribute<Unit | null>;
  declare createdBy?: NonAttribute<User | null>;
  declare resolvedBy?: NonAttribute<User | null>;
}
RegistryTask.init(
  {
    id,
    kind: { type: STRING(10), allowNull: false },
    personType: { type: STRING(10), allowNull: false },
    personName: { type: STRING(200), allowNull: false },
    detail: STRING(300),
    status: { type: STRING(15), allowNull: false, defaultValue: 'pendiente' },
    resolvedAt: DATE,
    resolutionNote: STRING(300),
    createdAt: DATE,
    updatedAt: DATE,
  },
  { sequelize, tableName: 'registry_tasks', modelName: 'RegistryTask', paranoid: false },
);

Notification.belongsTo(User, { as: 'user', foreignKey: 'userId' });
RegistryTask.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
RegistryTask.belongsTo(Adult, { as: 'adult', foreignKey: 'adultId' });
RegistryTask.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
RegistryTask.belongsTo(User, { as: 'createdBy', foreignKey: 'createdByUserId' });
RegistryTask.belongsTo(User, { as: 'resolvedBy', foreignKey: 'resolvedByUserId' });
