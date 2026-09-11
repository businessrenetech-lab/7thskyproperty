'use strict';
// Record people authorised to act on a contact's behalf (a lightweight list,
// not an access-control mechanism).
module.exports = {
  up: async (q, S) => {
    const t = await q.describeTable('contacts');
    if (!t.authorisations) await q.addColumn('contacts', 'authorisations', { type: S.JSON, allowNull: true, defaultValue: [] });
  },
  down: async (q) => { await q.removeColumn('contacts', 'authorisations').catch(() => {}); },
};
