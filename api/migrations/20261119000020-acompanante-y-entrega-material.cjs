'use strict';

/**
 * - small_groups.companion_adult_id: el educador o la educadora que acompaña a ese pequeño grupo (hoy se usa en las
 *   patrullas de las Unidades Scouts).
 * - member_progress.tool_*: entrega del material de progresión de la rama (Cartas de Exploración, Rastros, Diario de
 *   Marcha…) a cada protagonista: si ya lo tenía, si se le entregó, si lo había perdido y cómo lo pagó.
 * Idempotente.
 */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('ALTER TABLE small_groups ADD COLUMN IF NOT EXISTS companion_adult_id UUID REFERENCES adults(id) ON DELETE SET NULL');
    await q('ALTER TABLE member_progress ADD COLUMN IF NOT EXISTS tool_status VARCHAR(20)');
    await q('ALTER TABLE member_progress ADD COLUMN IF NOT EXISTS tool_lost BOOLEAN NOT NULL DEFAULT false');
    await q('ALTER TABLE member_progress ADD COLUMN IF NOT EXISTS tool_delivered_at DATE');
    await q('ALTER TABLE member_progress ADD COLUMN IF NOT EXISTS tool_payment VARCHAR(20)');
    await q('ALTER TABLE member_progress ADD COLUMN IF NOT EXISTS tool_notes TEXT');
  },
  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    for (const c of ['tool_notes', 'tool_payment', 'tool_delivered_at', 'tool_lost', 'tool_status']) await q(`ALTER TABLE member_progress DROP COLUMN IF EXISTS ${c}`);
    await q('ALTER TABLE small_groups DROP COLUMN IF EXISTS companion_adult_id');
  },
};
