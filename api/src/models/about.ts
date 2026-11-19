/** «Sobre el Grupo»: páginas de texto que lee cualquiera que entra a la app. */
import { DataTypes, Model, type CreationOptional, type ForeignKey, type InferAttributes, type InferCreationAttributes, type NonAttribute } from 'sequelize';
import { sequelize, User } from './index';

const { UUID, UUIDV4, STRING, TEXT, DATE, INTEGER } = DataTypes;

export class GroupPage extends Model<InferAttributes<GroupPage>, InferCreationAttributes<GroupPage>> {
  declare id: CreationOptional<string>;
  declare title: string;
  declare body: string | null;
  declare sortOrder: CreationOptional<number>;
  declare updatedByUserId: ForeignKey<User['id']> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare updatedBy?: NonAttribute<User | null>;
  declare notes?: NonAttribute<GroupPageNote[]>;
}
GroupPage.init(
  {
    id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
    title: { type: STRING(160), allowNull: false },
    body: TEXT,
    sortOrder: { type: INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: DATE,
    updatedAt: DATE,
  },
  { sequelize, tableName: 'group_pages', modelName: 'GroupPage', paranoid: false },
);
GroupPage.belongsTo(User, { as: 'updatedBy', foreignKey: 'updatedByUserId' });

/** Un aporte de texto a una sección: lo deja cualquiera que entra a la app. Guarda el nombre de quien lo escribió. */
export class GroupPageNote extends Model<InferAttributes<GroupPageNote>, InferCreationAttributes<GroupPageNote>> {
  declare id: CreationOptional<string>;
  declare pageId: ForeignKey<GroupPage['id']>;
  declare userId: ForeignKey<User['id']> | null;
  declare authorName: string;
  declare body: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
GroupPageNote.init(
  { id: { type: UUID, defaultValue: UUIDV4, primaryKey: true }, authorName: { type: STRING(160), allowNull: false }, body: { type: TEXT, allowNull: false }, createdAt: DATE, updatedAt: DATE },
  { sequelize, tableName: 'group_page_notes', modelName: 'GroupPageNote', paranoid: false },
);
GroupPage.hasMany(GroupPageNote, { as: 'notes', foreignKey: 'pageId' });
GroupPageNote.belongsTo(GroupPage, { as: 'page', foreignKey: 'pageId' });
GroupPageNote.belongsTo(User, { as: 'user', foreignKey: 'userId' });
