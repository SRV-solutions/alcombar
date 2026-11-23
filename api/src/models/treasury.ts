/**
 * Modelos de las etapas 5 y 6: contabilidad, cuotas y pagos, eventos y campamentos.
 * Se registran al importarse (lo hacen las rutas de accounting/events/camps).
 * Los montos (NUMERIC) se leen como número.
 */
import { DataTypes, Model, type ModelAttributeColumnOptions } from 'sequelize';
import { Adult, Member, sequelize, Unit, User } from './index';

const { UUID, UUIDV4, STRING, TEXT, BOOLEAN, INTEGER, DATE, DATEONLY, DECIMAL, JSONB } = DataTypes;
const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
const ts = { createdAt: DATE, updatedAt: DATE };
const soft = { ...ts, deletedAt: DATE };

/** Columna de dinero: NUMERIC(12,2) que se lee como number. */
function money(field: string): ModelAttributeColumnOptions {
  return {
    type: DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    get(this: Model) {
      const v = this.getDataValue(field as never) as unknown;
      return v === null || v === undefined ? 0 : Number(v);
    },
  };
}

// ======================= CONTABILIDAD =======================
export class Account extends Model {
  declare id: string;
  declare name: string;
  declare type: string;
  declare holder: string | null;
  /** Unidad dueña de la cuenta (caja de la unidad); null = cuenta del Grupo. */
  declare unitId: string | null;
  declare unit?: Unit | null;
  declare initialBalance: number;
  declare initialDate: string | null;
  declare active: boolean;
  declare notes: string | null;
}
Account.init(
  {
    id,
    name: { type: STRING(80), allowNull: false },
    type: { type: STRING(20), allowNull: false, defaultValue: 'efectivo' },
    holder: STRING(120),
    initialBalance: money('initialBalance'),
    initialDate: DATEONLY,
    active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    notes: TEXT,
    ...soft,
  },
  { sequelize, tableName: 'accounts', modelName: 'Account' },
);

export class Category extends Model {
  declare id: string;
  declare code: string | null;
  declare name: string;
  declare kind: 'ingreso' | 'egreso';
  declare active: boolean;
  declare sortOrder: number;
}
Category.init(
  {
    id,
    code: STRING(40),
    name: { type: STRING(80), allowNull: false },
    kind: { type: STRING(10), allowNull: false },
    active: { type: BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: INTEGER, allowNull: false, defaultValue: 0 },
    ...soft,
  },
  { sequelize, tableName: 'categories', modelName: 'Category' },
);

export class Movement extends Model {
  declare id: string;
  declare date: string;
  declare kind: 'ingreso' | 'egreso';
  declare accountId: string;
  declare categoryId: string | null;
  declare amount: number;
  declare description: string | null;
  declare receiptUrl: string | null;
  declare eventId: string | null;
  declare campId: string | null;
  declare campRubro: string | null;
  declare paymentId: string | null;
  declare transferGroup: string | null;
  declare reversesId: string | null;
  declare voided: boolean;
  declare createdByUserId: string | null;
  declare createdAt: Date;
  declare account?: Account;
  declare category?: Category | null;
  declare createdBy?: User | null;
}
Movement.init(
  {
    id,
    date: { type: DATEONLY, allowNull: false },
    kind: { type: STRING(10), allowNull: false },
    amount: money('amount'),
    description: STRING(300),
    receiptUrl: STRING(500),
    campRubro: STRING(20),
    transferGroup: UUID,
    reversesId: UUID,
    voided: { type: BOOLEAN, allowNull: false, defaultValue: false },
    ...soft,
  },
  { sequelize, tableName: 'transactions', modelName: 'Movement' },
);

export class PeriodClose extends Model {
  declare id: string;
  declare year: number;
  declare month: number;
  declare closedByUserId: string | null;
  declare notes: string | null;
  declare createdAt: Date;
  declare closedBy?: User | null;
}
PeriodClose.init(
  { id, year: { type: INTEGER, allowNull: false }, month: { type: INTEGER, allowNull: false }, notes: TEXT, ...ts },
  { sequelize, tableName: 'period_closes', modelName: 'PeriodClose', paranoid: false },
);

export class Budget extends Model {
  declare id: string;
  declare year: number;
  declare status: 'borrador' | 'aprobado';
  declare approvedAt: Date | null;
  declare approvedByUserId: string | null;
  declare notes: string | null;
  declare lines?: BudgetLine[];
}
Budget.init(
  {
    id,
    year: { type: INTEGER, allowNull: false },
    status: { type: STRING(12), allowNull: false, defaultValue: 'borrador' },
    approvedAt: DATE,
    notes: TEXT,
    ...soft,
  },
  { sequelize, tableName: 'budgets', modelName: 'Budget' },
);

export class BudgetLine extends Model {
  declare id: string;
  declare budgetId: string;
  declare categoryId: string;
  declare amount: number;
  declare notes: string | null;
}
BudgetLine.init(
  { id, amount: money('amount'), notes: STRING(300), ...ts },
  { sequelize, tableName: 'budget_lines', modelName: 'BudgetLine', paranoid: false },
);

// ======================= CUOTAS Y PAGOS =======================
export class FeePlan extends Model {
  declare id: string;
  declare year: number;
  declare monthlyAmount: number;
  declare months: number[];
  declare affiliationAmount: number;
  declare siblingDiscountPct: number;
  declare dueDay: number;
  declare notes: string | null;
}
FeePlan.init(
  {
    id,
    year: { type: INTEGER, allowNull: false },
    monthlyAmount: money('monthlyAmount'),
    months: { type: JSONB, allowNull: false, defaultValue: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    affiliationAmount: money('affiliationAmount'),
    siblingDiscountPct: { type: INTEGER, allowNull: false, defaultValue: 0 },
    dueDay: { type: INTEGER, allowNull: false, defaultValue: 10 },
    notes: TEXT,
    ...soft,
  },
  { sequelize, tableName: 'fee_plans', modelName: 'FeePlan' },
);

export class MemberFeeSetting extends Model {
  declare id: string;
  declare memberId: string;
  declare discountPct: number;
  declare note: string | null;
  declare member?: Member;
}
MemberFeeSetting.init(
  { id, discountPct: { type: INTEGER, allowNull: false, defaultValue: 0 }, note: TEXT, ...soft },
  { sequelize, tableName: 'member_fee_settings', modelName: 'MemberFeeSetting' },
);

export class Charge extends Model {
  declare id: string;
  declare memberId: string;
  declare concept: 'cuota' | 'afiliacion' | 'campamento' | 'otro';
  declare period: string | null;
  declare description: string | null;
  declare amount: number;
  declare paidAmount: number;
  declare dueDate: string | null;
  declare campId: string | null;
  declare status: 'pendiente' | 'parcial' | 'pagado' | 'anulado';
  declare createdAt: Date;
  declare member?: Member;
  declare camp?: Camp | null;
}
Charge.init(
  {
    id,
    concept: { type: STRING(20), allowNull: false },
    period: STRING(7),
    description: STRING(200),
    amount: money('amount'),
    paidAmount: money('paidAmount'),
    dueDate: DATEONLY,
    status: { type: STRING(10), allowNull: false, defaultValue: 'pendiente' },
    ...soft,
  },
  { sequelize, tableName: 'charges', modelName: 'Charge' },
);

export class Payment extends Model {
  declare id: string;
  declare memberId: string;
  declare date: string;
  declare amount: number;
  declare method: string;
  declare accountId: string;
  declare receiptNumber: string;
  declare payerName: string | null;
  declare notes: string | null;
  declare voided: boolean;
  declare voidedAt: Date | null;
  declare createdAt: Date;
  declare member?: Member;
  declare account?: Account;
  declare allocations?: PaymentAllocation[];
}
Payment.init(
  {
    id,
    date: { type: DATEONLY, allowNull: false },
    amount: money('amount'),
    method: { type: STRING(20), allowNull: false, defaultValue: 'efectivo' },
    receiptNumber: { type: STRING(20), allowNull: false },
    payerName: STRING(160),
    notes: TEXT,
    voided: { type: BOOLEAN, allowNull: false, defaultValue: false },
    voidedAt: DATE,
    ...soft,
  },
  { sequelize, tableName: 'payments', modelName: 'Payment' },
);

export class PaymentAllocation extends Model {
  declare id: string;
  declare paymentId: string;
  declare chargeId: string;
  declare amount: number;
  declare charge?: Charge;
}
PaymentAllocation.init(
  { id, amount: money('amount'), ...ts },
  { sequelize, tableName: 'payment_allocations', modelName: 'PaymentAllocation', paranoid: false },
);

// ======================= EVENTOS =======================
export class GroupEvent extends Model {
  declare id: string;
  declare name: string;
  declare type: string;
  declare date: string | null;
  declare place: string | null;
  declare responsibleAdultId: string | null;
  declare status: 'planificacion' | 'en_curso' | 'rendido';
  declare description: string | null;
  declare resultNotes: string | null;
  declare evaluation: string | null;
  declare renderedAt: Date | null;
  declare responsible?: Adult | null;
  declare tasks?: EventTask[];
  declare budgetLines?: EventBudgetLine[];
}
GroupEvent.init(
  {
    id,
    name: { type: STRING(160), allowNull: false },
    type: { type: STRING(20), allowNull: false, defaultValue: 'otro' },
    date: DATEONLY,
    place: STRING(200),
    status: { type: STRING(20), allowNull: false, defaultValue: 'planificacion' },
    description: TEXT,
    resultNotes: TEXT,
    evaluation: TEXT,
    renderedAt: DATE,
    ...soft,
  },
  { sequelize, tableName: 'events', modelName: 'Event' },
);

export class EventTask extends Model {
  declare id: string;
  declare eventId: string;
  declare kind: 'tarea' | 'compra';
  declare title: string;
  declare responsibleAdultId: string | null;
  declare dueDate: string | null;
  declare done: boolean;
  declare notes: string | null;
  declare responsible?: Adult | null;
}
EventTask.init(
  {
    id,
    kind: { type: STRING(10), allowNull: false, defaultValue: 'tarea' },
    title: { type: STRING(200), allowNull: false },
    dueDate: DATEONLY,
    done: { type: BOOLEAN, allowNull: false, defaultValue: false },
    notes: TEXT,
    ...soft,
  },
  { sequelize, tableName: 'event_tasks', modelName: 'EventTask' },
);

export class EventBudgetLine extends Model {
  declare id: string;
  declare eventId: string;
  declare concept: string;
  declare kind: 'ingreso' | 'egreso';
  declare planned: number;
}
EventBudgetLine.init(
  { id, concept: { type: STRING(160), allowNull: false }, kind: { type: STRING(10), allowNull: false }, planned: money('planned'), ...soft },
  { sequelize, tableName: 'event_budget_lines', modelName: 'EventBudgetLine' },
);

// ======================= CAMPAMENTOS =======================
export class CampSite extends Model {
  declare id: string;
  declare name: string;
  declare location: string | null;
  declare address: string | null;
  declare contact: string | null;
  declare capacity: number | null;
  declare services: string | null;
  declare link: string | null;
  declare notes: string | null;
}
CampSite.init(
  {
    id,
    name: { type: STRING(160), allowNull: false },
    location: STRING(200),
    address: STRING(200),
    contact: STRING(200),
    capacity: INTEGER,
    services: TEXT,
    link: STRING(500),
    notes: TEXT,
    ...soft,
  },
  { sequelize, tableName: 'camp_sites', modelName: 'CampSite' },
);

export class Camp extends Model {
  declare id: string;
  declare name: string;
  declare type: string;
  declare ownerUnitId: string | null;
  declare startDate: string;
  declare endDate: string;
  declare campSiteId: string | null;
  declare place: string | null;
  declare responsibleAdultId: string | null;
  declare cost: number;
  declare status: 'borrador' | 'aprobado' | 'realizado' | 'rendido';
  declare approvedAt: Date | null;
  declare approvedByUserId: string | null;
  declare description: string | null;
  declare transportCompany: string | null;
  declare transportContact: string | null;
  declare transportSchedule: string | null;
  declare transportNotes: string | null;
  declare materials: string | null;
  declare resultNotes: string | null;
  declare siteRating: number | null;
  declare siteReview: string | null;
  declare renderedAt: Date | null;
  /** Datos del Permiso de Acampe que no salen del resto del campamento (ver campPermitSchema). */
  declare permit: Record<string, unknown> | null;
  declare ownerUnit?: Unit | null;
  declare site?: CampSite | null;
  declare responsible?: Adult | null;
  declare campUnits?: CampUnit[];
  declare approvedBy?: User | null;
}
Camp.init(
  {
    id,
    name: { type: STRING(160), allowNull: false },
    type: { type: STRING(20), allowNull: false, defaultValue: 'campamento' },
    startDate: { type: DATEONLY, allowNull: false },
    endDate: { type: DATEONLY, allowNull: false },
    place: STRING(200),
    cost: money('cost'),
    status: { type: STRING(20), allowNull: false, defaultValue: 'borrador' },
    approvedAt: DATE,
    description: TEXT,
    transportCompany: STRING(160),
    transportContact: STRING(160),
    transportSchedule: STRING(200),
    transportNotes: TEXT,
    materials: TEXT,
    resultNotes: TEXT,
    siteRating: INTEGER,
    siteReview: TEXT,
    renderedAt: DATE,
    permit: JSONB,
    ...soft,
  },
  { sequelize, tableName: 'camps', modelName: 'Camp' },
);

export class CampUnit extends Model {
  declare id: string;
  declare campId: string;
  declare unitId: string;
  declare unit?: Unit;
}
CampUnit.init({ id, ...ts }, { sequelize, tableName: 'camp_units', modelName: 'CampUnit', paranoid: false });

export class CampEnrollment extends Model {
  declare id: string;
  declare campId: string;
  declare memberId: string | null;
  declare adultId: string | null;
  declare cost: number;
  declare discountPct: number;
  declare chargeId: string | null;
  declare authorizationPresented: boolean;
  declare authorizationDate: string | null;
  declare dniPresented: boolean;
  declare notes: string | null;
  declare member?: Member | null;
  declare adult?: Adult | null;
  declare charge?: Charge | null;
}
CampEnrollment.init(
  {
    id,
    cost: money('cost'),
    discountPct: { type: INTEGER, allowNull: false, defaultValue: 0 },
    authorizationPresented: { type: BOOLEAN, allowNull: false, defaultValue: false },
    authorizationDate: DATEONLY,
    dniPresented: { type: BOOLEAN, allowNull: false, defaultValue: false },
    notes: TEXT,
    ...soft,
  },
  { sequelize, tableName: 'camp_enrollments', modelName: 'CampEnrollment' },
);

export class CampBudgetLine extends Model {
  declare id: string;
  declare campId: string;
  declare rubro: string;
  declare concept: string;
  declare planned: number;
}
CampBudgetLine.init(
  { id, rubro: { type: STRING(20), allowNull: false, defaultValue: 'otro' }, concept: { type: STRING(160), allowNull: false }, planned: money('planned'), ...soft },
  { sequelize, tableName: 'camp_budget_lines', modelName: 'CampBudgetLine' },
);

export class CampMenuItem extends Model {
  declare id: string;
  declare campId: string;
  declare day: string | null;
  declare meal: string;
  declare dish: string;
  declare notes: string | null;
}
CampMenuItem.init(
  { id, day: DATEONLY, meal: { type: STRING(20), allowNull: false, defaultValue: 'almuerzo' }, dish: { type: STRING(200), allowNull: false }, notes: TEXT, ...soft },
  { sequelize, tableName: 'camp_menu_items', modelName: 'CampMenuItem' },
);

export class CampShoppingItem extends Model {
  declare id: string;
  declare campId: string;
  declare item: string;
  declare quantity: string | null;
  declare bought: boolean;
  declare notes: string | null;
}
CampShoppingItem.init(
  { id, item: { type: STRING(200), allowNull: false }, quantity: STRING(80), bought: { type: BOOLEAN, allowNull: false, defaultValue: false }, notes: TEXT, ...soft },
  { sequelize, tableName: 'camp_shopping_items', modelName: 'CampShoppingItem' },
);

// ======================= RELACIONES =======================
Account.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
Movement.belongsTo(Account, { as: 'account', foreignKey: 'accountId' });
Movement.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });
Movement.belongsTo(GroupEvent, { as: 'event', foreignKey: 'eventId' });
Movement.belongsTo(Camp, { as: 'camp', foreignKey: 'campId' });
Movement.belongsTo(Payment, { as: 'payment', foreignKey: 'paymentId' });
Movement.belongsTo(User, { as: 'createdBy', foreignKey: 'createdByUserId' });
PeriodClose.belongsTo(User, { as: 'closedBy', foreignKey: 'closedByUserId' });
Budget.hasMany(BudgetLine, { as: 'lines', foreignKey: 'budgetId' });
Budget.belongsTo(User, { as: 'approvedBy', foreignKey: 'approvedByUserId' });
BudgetLine.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

MemberFeeSetting.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
Charge.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
Charge.belongsTo(Camp, { as: 'camp', foreignKey: 'campId' });
Payment.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
Payment.belongsTo(Account, { as: 'account', foreignKey: 'accountId' });
Payment.hasMany(PaymentAllocation, { as: 'allocations', foreignKey: 'paymentId' });
PaymentAllocation.belongsTo(Payment, { as: 'payment', foreignKey: 'paymentId' });
PaymentAllocation.belongsTo(Charge, { as: 'charge', foreignKey: 'chargeId' });

GroupEvent.belongsTo(Adult, { as: 'responsible', foreignKey: 'responsibleAdultId' });
GroupEvent.hasMany(EventTask, { as: 'tasks', foreignKey: 'eventId' });
GroupEvent.hasMany(EventBudgetLine, { as: 'budgetLines', foreignKey: 'eventId' });
EventTask.belongsTo(Adult, { as: 'responsible', foreignKey: 'responsibleAdultId' });

Camp.belongsTo(Unit, { as: 'ownerUnit', foreignKey: 'ownerUnitId' });
Camp.belongsTo(CampSite, { as: 'site', foreignKey: 'campSiteId' });
Camp.belongsTo(Adult, { as: 'responsible', foreignKey: 'responsibleAdultId' });
Camp.belongsTo(User, { as: 'approvedBy', foreignKey: 'approvedByUserId' });
Camp.hasMany(CampUnit, { as: 'campUnits', foreignKey: 'campId' });
CampUnit.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });
Camp.hasMany(CampEnrollment, { as: 'enrollments', foreignKey: 'campId' });
CampEnrollment.belongsTo(Camp, { as: 'camp', foreignKey: 'campId' });
CampEnrollment.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
CampEnrollment.belongsTo(Adult, { as: 'adult', foreignKey: 'adultId' });
CampEnrollment.belongsTo(Charge, { as: 'charge', foreignKey: 'chargeId' });
Camp.hasMany(CampBudgetLine, { as: 'budgetLines', foreignKey: 'campId' });
Camp.hasMany(CampMenuItem, { as: 'menu', foreignKey: 'campId' });
Camp.hasMany(CampShoppingItem, { as: 'shopping', foreignKey: 'campId' });

/** SQL: naturaleza de un movimiento de `transactions` (la anulación de un egreso cuenta como egreso negativo, no como ingreso). */
export const NATURE = `CASE WHEN reverses_id IS NULL THEN kind WHEN kind = 'ingreso' THEN 'egreso' ELSE 'ingreso' END`;
/** SQL: monto con signo según sea movimiento original (+) o anulación (−). Usar junto con NATURE. */
export const SIGNED = `CASE WHEN reverses_id IS NULL THEN amount ELSE -amount END`;
