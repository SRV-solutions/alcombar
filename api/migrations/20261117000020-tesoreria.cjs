'use strict';

/**
 * Etapas 5 y 6: contabilidad (cuentas, categorías, movimientos, cierres, presupuesto), cuotas y pagos de
 * protagonistas (plan, becas, cargos, pagos, recibos), eventos y campamentos (con lugares de acampe).
 * Montos en NUMERIC(12,2).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, STRING, TEXT, BOOLEAN, INTEGER, DATE, DATEONLY, DECIMAL, JSONB } = Sequelize;
    const id = { type: UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
    };
    const soft = { ...ts, deleted_at: { type: DATE, allowNull: true } };
    const money = (opts = {}) => ({ type: DECIMAL(12, 2), allowNull: opts.allowNull ?? false, defaultValue: opts.allowNull ? null : 0 });
    const fk = (table, opts = {}) => ({
      type: UUID,
      allowNull: opts.allowNull ?? true,
      references: { model: table, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: opts.onDelete ?? (opts.allowNull === false ? 'CASCADE' : 'SET NULL'),
    });

    await queryInterface.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      const create = (name, cols) => queryInterface.createTable(name, cols, t);
      const index = (table, fields, opts = {}) => queryInterface.addIndex(table, fields, { ...opts, transaction });
      const q = (sql, replacements) => queryInterface.sequelize.query(sql, { transaction, replacements });

      // ---------------- Contabilidad: catálogos ----------------
      await create('accounts', {
        id,
        name: { type: STRING(80), allowNull: false },
        type: { type: STRING(20), allowNull: false, defaultValue: 'efectivo' },
        holder: { type: STRING(120) },
        initial_balance: money(),
        initial_date: { type: DATEONLY },
        active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        notes: { type: TEXT },
        ...soft,
      });
      await create('categories', {
        id,
        code: { type: STRING(40) },
        name: { type: STRING(80), allowNull: false },
        kind: { type: STRING(10), allowNull: false },
        active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
        ...soft,
      });
      await index('categories', ['code'], { unique: true, where: { deleted_at: null }, name: 'categories_code_unique' });

      // ---------------- Eventos ----------------
      await create('events', {
        id,
        name: { type: STRING(160), allowNull: false },
        type: { type: STRING(20), allowNull: false, defaultValue: 'otro' },
        date: { type: DATEONLY },
        place: { type: STRING(200) },
        responsible_adult_id: fk('adults'),
        status: { type: STRING(20), allowNull: false, defaultValue: 'planificacion' },
        description: { type: TEXT },
        result_notes: { type: TEXT },
        evaluation: { type: TEXT },
        rendered_at: { type: DATE },
        ...soft,
      });
      await index('events', ['date']);
      await create('event_tasks', {
        id,
        event_id: fk('events', { allowNull: false }),
        kind: { type: STRING(10), allowNull: false, defaultValue: 'tarea' },
        title: { type: STRING(200), allowNull: false },
        responsible_adult_id: fk('adults'),
        due_date: { type: DATEONLY },
        done: { type: BOOLEAN, allowNull: false, defaultValue: false },
        notes: { type: TEXT },
        ...soft,
      });
      await index('event_tasks', ['event_id']);
      await create('event_budget_lines', {
        id,
        event_id: fk('events', { allowNull: false }),
        concept: { type: STRING(160), allowNull: false },
        kind: { type: STRING(10), allowNull: false },
        planned: money(),
        ...soft,
      });
      await index('event_budget_lines', ['event_id']);

      // ---------------- Campamentos ----------------
      await create('camp_sites', {
        id,
        name: { type: STRING(160), allowNull: false },
        location: { type: STRING(200) },
        address: { type: STRING(200) },
        contact: { type: STRING(200) },
        capacity: { type: INTEGER },
        services: { type: TEXT },
        link: { type: STRING(500) },
        notes: { type: TEXT },
        ...soft,
      });
      await create('camps', {
        id,
        name: { type: STRING(160), allowNull: false },
        type: { type: STRING(20), allowNull: false, defaultValue: 'campamento' },
        owner_unit_id: fk('units'),
        start_date: { type: DATEONLY, allowNull: false },
        end_date: { type: DATEONLY, allowNull: false },
        camp_site_id: fk('camp_sites'),
        place: { type: STRING(200) },
        responsible_adult_id: fk('adults'),
        cost: money(),
        status: { type: STRING(20), allowNull: false, defaultValue: 'borrador' },
        approved_at: { type: DATE },
        approved_by_user_id: fk('users'),
        description: { type: TEXT },
        transport_company: { type: STRING(160) },
        transport_contact: { type: STRING(160) },
        transport_schedule: { type: STRING(200) },
        transport_notes: { type: TEXT },
        materials: { type: TEXT },
        result_notes: { type: TEXT },
        site_rating: { type: INTEGER },
        site_review: { type: TEXT },
        rendered_at: { type: DATE },
        ...soft,
      });
      await index('camps', ['start_date']);
      await index('camps', ['owner_unit_id']);
      await create('camp_units', {
        id,
        camp_id: fk('camps', { allowNull: false }),
        unit_id: fk('units', { allowNull: false }),
        ...ts,
      });
      await index('camp_units', ['camp_id', 'unit_id'], { unique: true });
      await create('camp_budget_lines', {
        id,
        camp_id: fk('camps', { allowNull: false }),
        rubro: { type: STRING(20), allowNull: false, defaultValue: 'otro' },
        concept: { type: STRING(160), allowNull: false },
        planned: money(),
        ...soft,
      });
      await index('camp_budget_lines', ['camp_id']);
      await create('camp_menu_items', {
        id,
        camp_id: fk('camps', { allowNull: false }),
        day: { type: DATEONLY },
        meal: { type: STRING(20), allowNull: false, defaultValue: 'almuerzo' },
        dish: { type: STRING(200), allowNull: false },
        notes: { type: TEXT },
        ...soft,
      });
      await index('camp_menu_items', ['camp_id']);
      await create('camp_shopping_items', {
        id,
        camp_id: fk('camps', { allowNull: false }),
        item: { type: STRING(200), allowNull: false },
        quantity: { type: STRING(80) },
        bought: { type: BOOLEAN, allowNull: false, defaultValue: false },
        notes: { type: TEXT },
        ...soft,
      });
      await index('camp_shopping_items', ['camp_id']);

      // ---------------- Cuotas y pagos ----------------
      await create('fee_plans', {
        id,
        year: { type: INTEGER, allowNull: false },
        monthly_amount: money(),
        months: { type: JSONB, allowNull: false, defaultValue: Sequelize.literal(`'[3,4,5,6,7,8,9,10,11,12]'::jsonb`) },
        affiliation_amount: money(),
        sibling_discount_pct: { type: INTEGER, allowNull: false, defaultValue: 0 },
        due_day: { type: INTEGER, allowNull: false, defaultValue: 10 },
        notes: { type: TEXT },
        ...soft,
      });
      await index('fee_plans', ['year'], { unique: true, where: { deleted_at: null }, name: 'fee_plans_year_unique' });
      await create('member_fee_settings', {
        id,
        member_id: fk('members', { allowNull: false }),
        discount_pct: { type: INTEGER, allowNull: false, defaultValue: 0 },
        note: { type: TEXT },
        ...soft,
      });
      await index('member_fee_settings', ['member_id'], { unique: true, where: { deleted_at: null }, name: 'member_fee_settings_member_unique' });
      await create('charges', {
        id,
        member_id: fk('members', { allowNull: false, onDelete: 'RESTRICT' }),
        concept: { type: STRING(20), allowNull: false },
        period: { type: STRING(7) },
        description: { type: STRING(200) },
        amount: money(),
        paid_amount: money(),
        due_date: { type: DATEONLY },
        camp_id: fk('camps'),
        status: { type: STRING(10), allowNull: false, defaultValue: 'pendiente' },
        ...soft,
      });
      await index('charges', ['member_id']);
      await index('charges', ['member_id', 'concept', 'period'], {
        unique: true,
        where: { deleted_at: null, status: { [Sequelize.Op.ne]: 'anulado' }, period: { [Sequelize.Op.ne]: null } },
        name: 'charges_member_concept_period_unique',
      });
      await index('charges', ['member_id', 'camp_id'], {
        unique: true,
        where: { deleted_at: null, status: { [Sequelize.Op.ne]: 'anulado' }, camp_id: { [Sequelize.Op.ne]: null } },
        name: 'charges_member_camp_unique',
      });

      await create('camp_enrollments', {
        id,
        camp_id: fk('camps', { allowNull: false }),
        member_id: fk('members'),
        adult_id: fk('adults'),
        cost: money(),
        discount_pct: { type: INTEGER, allowNull: false, defaultValue: 0 },
        charge_id: fk('charges'),
        authorization_presented: { type: BOOLEAN, allowNull: false, defaultValue: false },
        authorization_date: { type: DATEONLY },
        dni_presented: { type: BOOLEAN, allowNull: false, defaultValue: false },
        notes: { type: TEXT },
        ...soft,
      });
      await index('camp_enrollments', ['camp_id']);
      await index('camp_enrollments', ['camp_id', 'member_id'], {
        unique: true,
        where: { deleted_at: null, member_id: { [Sequelize.Op.ne]: null } },
        name: 'camp_enrollments_member_unique',
      });
      await index('camp_enrollments', ['camp_id', 'adult_id'], {
        unique: true,
        where: { deleted_at: null, adult_id: { [Sequelize.Op.ne]: null } },
        name: 'camp_enrollments_adult_unique',
      });

      await create('payments', {
        id,
        member_id: fk('members', { allowNull: false, onDelete: 'RESTRICT' }),
        date: { type: DATEONLY, allowNull: false },
        amount: money(),
        method: { type: STRING(20), allowNull: false, defaultValue: 'efectivo' },
        account_id: fk('accounts', { allowNull: false, onDelete: 'RESTRICT' }),
        receipt_number: { type: STRING(20), allowNull: false },
        payer_name: { type: STRING(160) },
        notes: { type: TEXT },
        voided: { type: BOOLEAN, allowNull: false, defaultValue: false },
        voided_at: { type: DATE },
        ...soft,
      });
      await index('payments', ['receipt_number'], { unique: true });
      await index('payments', ['member_id']);
      await create('payment_allocations', {
        id,
        payment_id: fk('payments', { allowNull: false }),
        charge_id: fk('charges', { allowNull: false }),
        amount: money(),
        ...ts,
      });
      await index('payment_allocations', ['payment_id']);
      await index('payment_allocations', ['charge_id']);

      // ---------------- Movimientos ----------------
      await create('transactions', {
        id,
        date: { type: DATEONLY, allowNull: false },
        kind: { type: STRING(10), allowNull: false },
        account_id: fk('accounts', { allowNull: false, onDelete: 'RESTRICT' }),
        category_id: fk('categories', { onDelete: 'RESTRICT' }),
        amount: money(),
        description: { type: STRING(300) },
        receipt_url: { type: STRING(500) },
        event_id: fk('events'),
        camp_id: fk('camps'),
        camp_rubro: { type: STRING(20) },
        payment_id: fk('payments'),
        transfer_group: { type: UUID },
        reverses_id: { type: UUID },
        voided: { type: BOOLEAN, allowNull: false, defaultValue: false },
        created_by_user_id: fk('users'),
        ...soft,
      });
      await index('transactions', ['date']);
      await index('transactions', ['account_id']);
      await index('transactions', ['event_id']);
      await index('transactions', ['camp_id']);
      await index('transactions', ['payment_id']);

      await create('period_closes', {
        id,
        year: { type: INTEGER, allowNull: false },
        month: { type: INTEGER, allowNull: false },
        closed_by_user_id: fk('users'),
        notes: { type: TEXT },
        ...ts,
      });
      await index('period_closes', ['year', 'month'], { unique: true });

      await create('budgets', {
        id,
        year: { type: INTEGER, allowNull: false },
        status: { type: STRING(12), allowNull: false, defaultValue: 'borrador' },
        approved_at: { type: DATE },
        approved_by_user_id: fk('users'),
        notes: { type: TEXT },
        ...soft,
      });
      await index('budgets', ['year'], { unique: true, where: { deleted_at: null }, name: 'budgets_year_unique' });
      await create('budget_lines', {
        id,
        budget_id: fk('budgets', { allowNull: false }),
        category_id: fk('categories', { allowNull: false }),
        amount: money(),
        notes: { type: STRING(300) },
        ...ts,
      });
      await index('budget_lines', ['budget_id', 'category_id'], { unique: true });

      // ---------------- Datos iniciales ----------------
      const [[{ n: accounts }]] = await q('SELECT COUNT(*)::int AS n FROM accounts');
      if (!accounts) {
        await q(`INSERT INTO accounts (id, name, type, initial_balance, active, created_at, updated_at) VALUES
          (gen_random_uuid(), 'Caja (efectivo)', 'efectivo', 0, true, now(), now()),
          (gen_random_uuid(), 'Banco', 'banco', 0, true, now(), now()),
          (gen_random_uuid(), 'Mercado Pago', 'billetera', 0, true, now(), now())`);
      }
      const categories = [
        ['cuotas', 'Cuotas', 'ingreso'],
        ['afiliaciones', 'Afiliaciones', 'ingreso'],
        ['campamentos', 'Campamentos', 'ingreso'],
        ['eventos', 'Eventos y rifas', 'ingreso'],
        ['donaciones', 'Donaciones', 'ingreso'],
        ['otros_ingresos', 'Otros ingresos', 'ingreso'],
        ['afiliaciones_saac', 'Afiliaciones SAAC', 'egreso'],
        ['material_programa', 'Material de programa', 'egreso'],
        ['campamentos_gasto', 'Campamentos', 'egreso'],
        ['eventos_gasto', 'Eventos', 'egreso'],
        ['mantenimiento', 'Mantenimiento de la sede', 'egreso'],
        ['servicios', 'Servicios', 'egreso'],
        ['formacion', 'Formación', 'egreso'],
        ['insignias', 'Insignias y uniformes', 'egreso'],
        ['otros_gastos', 'Otros gastos', 'egreso'],
      ];
      for (const [i, [code, name, kind]] of categories.entries()) {
        await q(
          `INSERT INTO categories (id, code, name, kind, sort_order, active, created_at, updated_at)
           SELECT gen_random_uuid(), :code, :name, :kind, :i, true, now(), now()
           WHERE NOT EXISTS (SELECT 1 FROM categories WHERE code = :code AND deleted_at IS NULL)`,
          { code, name, kind, i },
        );
      }
    });
  },

  async down(queryInterface) {
    for (const table of [
      'budget_lines', 'budgets', 'period_closes', 'transactions', 'payment_allocations', 'payments', 'camp_enrollments',
      'charges', 'member_fee_settings', 'fee_plans', 'camp_shopping_items', 'camp_menu_items', 'camp_budget_lines',
      'camp_units', 'camps', 'camp_sites', 'event_budget_lines', 'event_tasks', 'events', 'categories', 'accounts',
    ]) {
      await queryInterface.dropTable(table);
    }
  },
};
