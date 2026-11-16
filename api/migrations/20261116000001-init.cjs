'use strict';

/** Migración inicial: Etapas 0, 1 y 2 (acceso, grupo, adultos, protagonistas). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, STRING, TEXT, BOOLEAN, INTEGER, DATE, DATEONLY, JSONB } = Sequelize;
    const id = { type: UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
    };
    const soft = { ...ts, deleted_at: { type: DATE, allowNull: true } };
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

      // ---------- Grupo ----------
      await create('units', {
        id,
        code: { type: STRING(12), allowNull: false },
        name: { type: STRING(120), allowNull: false },
        branch: { type: STRING(20), allowNull: false },
        min_adults: { type: INTEGER, allowNull: true },
        active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        ...soft,
      });
      await index('units', ['code'], { unique: true, where: { deleted_at: null }, name: 'units_code_unique' });

      await create('small_groups', {
        id,
        unit_id: fk('units', { allowNull: false }),
        name: { type: STRING(80), allowNull: false },
        kind: { type: STRING(20), allowNull: false },
        active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        ...soft,
      });
      await index('small_groups', ['unit_id']);

      // ---------- Adultos ----------
      await create('adults', {
        id,
        first_name: { type: STRING(80), allowNull: false },
        last_name: { type: STRING(80), allowNull: false },
        totem: { type: STRING(80) },
        dni: { type: STRING(12) },
        birth_date: { type: DATEONLY },
        email: { type: STRING(200) },
        phone: { type: STRING(40) },
        address: { type: STRING(200) },
        joined_at: { type: DATEONLY },
        status: { type: STRING(20), allowNull: false, defaultValue: 'alta' },
        advisor_adult_id: fk('adults'),
        notes: { type: TEXT },
        ...soft,
      });
      await index('adults', ['dni']);
      await index('adults', ['last_name', 'first_name']);

      await create('support_teams', {
        id,
        name: { type: STRING(120), allowNull: false },
        description: { type: TEXT },
        leader_adult_id: fk('adults'),
        ...soft,
      });

      await create('adult_assignments', {
        id,
        adult_id: fk('adults', { allowNull: false }),
        year: { type: INTEGER, allowNull: false },
        position: { type: STRING(120), allowNull: false },
        unit_id: fk('units'),
        support_team_id: fk('support_teams'),
        notes: { type: TEXT },
        ...soft,
      });
      await index('adult_assignments', ['adult_id']);
      await index('adult_assignments', ['year', 'unit_id']);

      await create('courses', {
        id,
        name: { type: STRING(160), allowNull: false },
        kind: { type: STRING(30), allowNull: false },
        active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        ...soft,
      });

      await create('adult_courses', {
        id,
        adult_id: fk('adults', { allowNull: false }),
        course_id: fk('courses', { allowNull: false, onDelete: 'RESTRICT' }),
        completed_at: { type: DATEONLY },
        certificate_url: { type: STRING(500) },
        notes: { type: TEXT },
        ...soft,
      });
      await index('adult_courses', ['adult_id']);

      // ---------- Acceso ----------
      await create('users', {
        id,
        email: { type: STRING(200), allowNull: false },
        name: { type: STRING(120), allowNull: false },
        password_hash: { type: STRING(200) },
        adult_id: fk('adults'),
        active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        last_login_at: { type: DATE },
        failed_logins: { type: INTEGER, allowNull: false, defaultValue: 0 },
        locked_until: { type: DATE },
        ...soft,
      });
      await index('users', ['email'], { unique: true, where: { deleted_at: null }, name: 'users_email_unique' });

      await create('roles', {
        id,
        key: { type: STRING(40) },
        name: { type: STRING(80), allowNull: false },
        description: { type: TEXT },
        scope: { type: STRING(10), allowNull: false, defaultValue: 'group' },
        is_system: { type: BOOLEAN, allowNull: false, defaultValue: false },
        ...soft,
      });
      await index('roles', ['key'], { unique: true, where: { deleted_at: null }, name: 'roles_key_unique' });

      await create('permissions', {
        id,
        module: { type: STRING(40), allowNull: false },
        action: { type: STRING(20), allowNull: false },
        ...ts,
      });
      await index('permissions', ['module', 'action'], { unique: true });

      await create('role_permissions', {
        id,
        role_id: fk('roles', { allowNull: false }),
        permission_id: fk('permissions', { allowNull: false }),
        unit_limited: { type: BOOLEAN, allowNull: false, defaultValue: false },
        ...ts,
      });
      await index('role_permissions', ['role_id', 'permission_id'], { unique: true });

      await create('user_roles', {
        id,
        user_id: fk('users', { allowNull: false }),
        role_id: fk('roles', { allowNull: false }),
        unit_id: fk('units', { allowNull: true, onDelete: 'CASCADE' }),
        ...ts,
      });
      await index('user_roles', ['user_id']);

      await create('sessions', {
        id,
        user_id: fk('users', { allowNull: false }),
        token_hash: { type: STRING(128), allowNull: false },
        expires_at: { type: DATE, allowNull: false },
        revoked_at: { type: DATE },
        replaced_by_id: { type: UUID },
        user_agent: { type: STRING(300) },
        ip: { type: STRING(60) },
        ...ts,
      });
      await index('sessions', ['token_hash'], { unique: true });
      await index('sessions', ['user_id']);

      await create('password_tokens', {
        id,
        user_id: fk('users', { allowNull: false }),
        token_hash: { type: STRING(128), allowNull: false },
        purpose: { type: STRING(10), allowNull: false },
        expires_at: { type: DATE, allowNull: false },
        used_at: { type: DATE },
        ...ts,
      });
      await index('password_tokens', ['token_hash'], { unique: true });

      await create('audit_logs', {
        id,
        user_id: fk('users'),
        action: { type: STRING(20), allowNull: false },
        entity: { type: STRING(60), allowNull: false },
        entity_id: { type: STRING(60) },
        summary: { type: STRING(300) },
        changes: { type: JSONB },
        ip: { type: STRING(60) },
        created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      });
      await index('audit_logs', ['entity', 'entity_id']);
      await index('audit_logs', ['created_at']);
      await index('audit_logs', ['user_id']);

      // ---------- Protagonistas ----------
      await create('members', {
        id,
        first_name: { type: STRING(80), allowNull: false },
        last_name: { type: STRING(80), allowNull: false },
        dni: { type: STRING(12) },
        birth_date: { type: DATEONLY },
        unit_id: fk('units', { allowNull: false, onDelete: 'RESTRICT' }),
        small_group_id: fk('small_groups'),
        joined_at: { type: DATEONLY },
        promise_date: { type: DATEONLY },
        address: { type: STRING(200) },
        phone: { type: STRING(40) },
        email: { type: STRING(200) },
        status: { type: STRING(20), allowNull: false, defaultValue: 'activo' },
        left_at: { type: DATEONLY },
        notes: { type: TEXT },
        ...soft,
      });
      await index('members', ['unit_id']);
      await index('members', ['dni']);
      await index('members', ['last_name', 'first_name']);

      await create('guardians', {
        id,
        name: { type: STRING(160), allowNull: false },
        dni: { type: STRING(12) },
        phone: { type: STRING(40) },
        email: { type: STRING(200) },
        address: { type: STRING(200) },
        ...soft,
      });
      await index('guardians', ['dni']);

      await create('member_guardians', {
        id,
        member_id: fk('members', { allowNull: false }),
        guardian_id: fk('guardians', { allowNull: false }),
        relationship: { type: STRING(60) },
        sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await index('member_guardians', ['member_id', 'guardian_id'], { unique: true });

      await create('unit_transfers', {
        id,
        member_id: fk('members', { allowNull: false }),
        from_unit_id: fk('units'),
        to_unit_id: fk('units'),
        date: { type: DATEONLY, allowNull: false },
        notes: { type: TEXT },
        ...soft,
      });
      await index('unit_transfers', ['member_id']);

      await create('affiliations', {
        id,
        member_id: fk('members', { allowNull: false }),
        year: { type: INTEGER, allowNull: false },
        status: { type: STRING(20), allowNull: false },
        date: { type: DATEONLY },
        notes: { type: TEXT },
        ...soft,
      });
      await index('affiliations', ['member_id', 'year'], { unique: true, where: { deleted_at: null }, name: 'affiliations_member_year_unique' });

      await create('document_types', {
        id,
        code: { type: STRING(40) },
        name: { type: STRING(120), allowNull: false },
        has_expiry: { type: BOOLEAN, allowNull: false, defaultValue: false },
        active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
        ...soft,
      });

      await create('member_documents', {
        id,
        member_id: fk('members', { allowNull: false }),
        document_type_id: fk('document_types', { allowNull: false }),
        presented: { type: BOOLEAN, allowNull: false, defaultValue: false },
        presented_at: { type: DATEONLY },
        expires_at: { type: DATEONLY },
        notes: { type: TEXT },
        ...soft,
      });
      await index('member_documents', ['member_id', 'document_type_id'], {
        unique: true,
        where: { deleted_at: null },
        name: 'member_documents_member_type_unique',
      });

      await create('attendances', {
        id,
        member_id: fk('members', { allowNull: false }),
        unit_id: fk('units', { allowNull: false }),
        date: { type: DATEONLY, allowNull: false },
        status: { type: STRING(20), allowNull: false },
        notes: { type: STRING(200) },
        ...ts,
      });
      await index('attendances', ['member_id', 'date'], { unique: true });
      await index('attendances', ['unit_id', 'date']);
    });
  },

  async down(queryInterface) {
    const tables = [
      'attendances', 'member_documents', 'document_types', 'affiliations', 'unit_transfers', 'member_guardians',
      'guardians', 'members', 'audit_logs', 'password_tokens', 'sessions', 'user_roles', 'role_permissions',
      'permissions', 'roles', 'users', 'adult_courses', 'courses', 'adult_assignments', 'support_teams', 'adults',
      'small_groups', 'units',
    ];
    for (const table of tables) await queryInterface.dropTable(table);
  },
};
