/** Etapas 7 y 8: inventario, préstamos, calendario, actas y documentos. Se registran al importar este archivo. */
import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { Adult, sequelize, Unit, User } from './index';

const { UUID, UUIDV4, STRING, TEXT, BOOLEAN, INTEGER, DATE, DATEONLY, DECIMAL } = DataTypes;
const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };

// ======================= Inventario =======================
export class ItemCategory extends Model<InferAttributes<ItemCategory>, InferCreationAttributes<ItemCategory>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare sortOrder: CreationOptional<number>;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
ItemCategory.init(
  {
    id,
    name: { type: STRING(80), allowNull: false },
    sortOrder: { type: INTEGER, allowNull: false, defaultValue: 0 },
    active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'item_categories', modelName: 'ItemCategory' },
);

export class ItemLocation extends Model<InferAttributes<ItemLocation>, InferCreationAttributes<ItemLocation>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare description: string | null;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
ItemLocation.init(
  {
    id,
    name: { type: STRING(80), allowNull: false },
    description: STRING(300),
    active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'item_locations', modelName: 'ItemLocation' },
);

export class Item extends Model<InferAttributes<Item>, InferCreationAttributes<Item>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare categoryId: ForeignKey<ItemCategory['id']>;
  declare quantity: number;
  declare condition: CreationOptional<string>;
  declare locationId: ForeignKey<ItemLocation['id']> | null;
  declare unitId: ForeignKey<Unit['id']> | null;
  declare photoUrl: string | null;
  declare purchaseDate: string | null;
  declare purchaseValue: string | number | null;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare category?: NonAttribute<ItemCategory>;
  declare location?: NonAttribute<ItemLocation | null>;
  declare unit?: NonAttribute<Unit | null>;
}
Item.init(
  {
    id,
    name: { type: STRING(160), allowNull: false },
    quantity: { type: INTEGER, allowNull: false, defaultValue: 1 },
    condition: { type: STRING(20), allowNull: false, defaultValue: 'bueno' },
    photoUrl: STRING(500),
    purchaseDate: DATEONLY,
    purchaseValue: DECIMAL(12, 2),
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'items', modelName: 'Item' },
);

export class Loan extends Model<InferAttributes<Loan>, InferCreationAttributes<Loan>> {
  declare id: CreationOptional<string>;
  declare borrowerAdultId: ForeignKey<Adult['id']> | null;
  declare borrowerName: string | null;
  declare purpose: string;
  declare unitId: ForeignKey<Unit['id']> | null;
  /** Ficha de actividad (etapa 3), sin clave foránea. */
  declare activitySheetId: string | null;
  /** Campamento (etapa 6), sin clave foránea. */
  declare campId: string | null;
  declare outDate: string;
  declare dueDate: string;
  declare returnedAt: string | null;
  declare status: CreationOptional<string>;
  declare approvedByUserId: ForeignKey<User['id']> | null;
  declare approvedAt: Date | null;
  declare deliveredAt: Date | null;
  declare returnNotes: string | null;
  declare notes: string | null;
  declare createdByUserId: ForeignKey<User['id']> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare borrower?: NonAttribute<Adult | null>;
  declare unit?: NonAttribute<Unit | null>;
  declare approvedBy?: NonAttribute<User | null>;
  declare createdBy?: NonAttribute<User | null>;
  declare loanItems?: NonAttribute<LoanItem[]>;
}
Loan.init(
  {
    id,
    borrowerName: STRING(160),
    purpose: { type: STRING(300), allowNull: false },
    activitySheetId: UUID,
    campId: UUID,
    outDate: { type: DATEONLY, allowNull: false },
    dueDate: { type: DATEONLY, allowNull: false },
    returnedAt: DATEONLY,
    status: { type: STRING(20), allowNull: false, defaultValue: 'pedido' },
    approvedAt: DATE,
    deliveredAt: DATE,
    returnNotes: TEXT,
    notes: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'loans', modelName: 'Loan' },
);

export class LoanItem extends Model<InferAttributes<LoanItem>, InferCreationAttributes<LoanItem>> {
  declare id: CreationOptional<string>;
  declare loanId: ForeignKey<Loan['id']>;
  declare itemId: ForeignKey<Item['id']>;
  declare quantity: number;
  declare returnCondition: string | null;
  declare returnNotes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare item?: NonAttribute<Item>;
  declare loan?: NonAttribute<Loan>;
}
LoanItem.init(
  {
    id,
    quantity: { type: INTEGER, allowNull: false, defaultValue: 1 },
    returnCondition: STRING(20),
    returnNotes: STRING(300),
    createdAt: DATE,
    updatedAt: DATE,
  },
  { sequelize, tableName: 'loan_items', modelName: 'LoanItem', paranoid: false },
);

// ======================= Calendario =======================
export class CalendarEvent extends Model<InferAttributes<CalendarEvent>, InferCreationAttributes<CalendarEvent>> {
  declare id: CreationOptional<string>;
  declare title: string;
  declare type: CreationOptional<string>;
  declare unitId: ForeignKey<Unit['id']> | null;
  declare startDate: string;
  declare endDate: string;
  declare allDay: CreationOptional<boolean>;
  declare startTime: string | null;
  declare endTime: string | null;
  declare place: string | null;
  declare description: string | null;
  declare createdByUserId: ForeignKey<User['id']> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare unit?: NonAttribute<Unit | null>;
}
CalendarEvent.init(
  {
    id,
    title: { type: STRING(160), allowNull: false },
    type: { type: STRING(20), allowNull: false, defaultValue: 'otro' },
    startDate: { type: DATEONLY, allowNull: false },
    endDate: { type: DATEONLY, allowNull: false },
    allDay: { type: BOOLEAN, allowNull: false, defaultValue: true },
    startTime: STRING(5),
    endTime: STRING(5),
    place: STRING(200),
    description: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'calendar_events', modelName: 'CalendarEvent' },
);

// ======================= Actas y documentos =======================
export class CouncilMinute extends Model<InferAttributes<CouncilMinute>, InferCreationAttributes<CouncilMinute>> {
  declare id: CreationOptional<string>;
  declare number: number;
  declare year: number;
  declare date: string;
  declare kind: CreationOptional<string>;
  declare title: string;
  declare attendees: string | null;
  declare agenda: string | null;
  declare content: string | null;
  declare driveUrl: string | null;
  declare status: CreationOptional<string>;
  declare approvedAt: Date | null;
  declare createdByUserId: ForeignKey<User['id']> | null;
  /** Cuándo y quién mandó el temario como aviso. */
  declare agendaSentAt: CreationOptional<Date | null>;
  declare agendaSentByUserId: CreationOptional<string | null>;
  declare agendaMessage: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}
CouncilMinute.init(
  {
    id,
    number: { type: INTEGER, allowNull: false },
    year: { type: INTEGER, allowNull: false },
    date: { type: DATEONLY, allowNull: false },
    kind: { type: STRING(20), allowNull: false, defaultValue: 'ordinaria' },
    title: { type: STRING(200), allowNull: false },
    attendees: TEXT,
    agenda: TEXT,
    content: TEXT,
    driveUrl: STRING(500),
    status: { type: STRING(20), allowNull: false, defaultValue: 'borrador' },
    approvedAt: DATE,
    agendaSentAt: DATE,
    agendaSentByUserId: UUID,
    agendaMessage: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'council_minutes', modelName: 'CouncilMinute' },
);

// ======================= Sábados del año =======================
/** Un sábado del calendario anual (las filas de la planilla del Grupo). Las unidades de servicio son eventos "servicio". */
export class Saturday extends Model<InferAttributes<Saturday>, InferCreationAttributes<Saturday>> {
  declare id: CreationOptional<string>;
  declare date: string;
  declare noActivity: CreationOptional<boolean>;
  declare ephemeris: string | null;
  declare training: string | null;
  declare serviceNote: string | null;
  declare meetings: string | null;
  declare activities: string | null;
  declare others: string | null;
  declare updatedByUserId: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
Saturday.init(
  {
    id,
    date: { type: DATEONLY, allowNull: false, unique: true },
    noActivity: { type: BOOLEAN, allowNull: false, defaultValue: false },
    ephemeris: TEXT,
    training: TEXT,
    serviceNote: STRING(200),
    meetings: TEXT,
    activities: TEXT,
    others: TEXT,
    updatedByUserId: UUID,
    createdAt: DATE,
    updatedAt: DATE,
  },
  { sequelize, tableName: 'saturdays', modelName: 'Saturday', paranoid: false },
);

export class DocumentLink extends Model<InferAttributes<DocumentLink>, InferCreationAttributes<DocumentLink>> {
  declare id: CreationOptional<string>;
  declare title: string;
  declare category: CreationOptional<string>;
  declare url: string;
  declare description: string | null;
  declare unitId: ForeignKey<Unit['id']> | null;
  declare createdByUserId: ForeignKey<User['id']> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
  declare unit?: NonAttribute<Unit | null>;
}
DocumentLink.init(
  {
    id,
    title: { type: STRING(200), allowNull: false },
    category: { type: STRING(30), allowNull: false, defaultValue: 'otros' },
    url: { type: STRING(500), allowNull: false },
    description: TEXT,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt: DATE,
  },
  { sequelize, tableName: 'document_links', modelName: 'DocumentLink' },
);

// ======================= Relaciones =======================
Item.belongsTo(ItemCategory, { as: 'category', foreignKey: 'categoryId' });
Item.belongsTo(ItemLocation, { as: 'location', foreignKey: 'locationId' });
Item.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
Item.hasMany(LoanItem, { as: 'loanItems', foreignKey: 'itemId' });

Loan.belongsTo(Adult, { as: 'borrower', foreignKey: 'borrowerAdultId' });
Loan.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
Loan.belongsTo(User, { as: 'approvedBy', foreignKey: 'approvedByUserId' });
Loan.belongsTo(User, { as: 'createdBy', foreignKey: 'createdByUserId' });
Loan.hasMany(LoanItem, { as: 'loanItems', foreignKey: 'loanId' });
LoanItem.belongsTo(Loan, { as: 'loan', foreignKey: 'loanId' });
LoanItem.belongsTo(Item, { as: 'item', foreignKey: 'itemId' });

CalendarEvent.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
CalendarEvent.belongsTo(User, { as: 'createdBy', foreignKey: 'createdByUserId' });

CouncilMinute.belongsTo(User, { as: 'createdBy', foreignKey: 'createdByUserId' });
DocumentLink.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
DocumentLink.belongsTo(User, { as: 'createdBy', foreignKey: 'createdByUserId' });
