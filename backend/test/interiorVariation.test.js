// InteriorVariation model + Completion Sign-Off report type.
const assert = require('assert');
(async () => {
  const InteriorVariation = require('../models/InteriorVariation');
  const { getServiceLine } = require('../config/serviceLines');

  // Completion Sign-Off is a report type on the interior line (no new table).
  const rt = getServiceLine('residential_interior_design').ui.report_types || [];
  assert.ok(rt.includes('Completion Sign-Off'), 'Completion Sign-Off is a report type');

  // Create + find a variation scoped by service_line.
  const code = `TEST-RIDW-V-${Date.now().toString().slice(-6)}`;
  const row = await InteriorVariation.create({
    branch_id: 1, service_line: 'residential_interior_design',
    variation_code: code, project_id: 'RIDS-P0001', client_name: 'Test',
    description: 'Add a study nook', amount_delta: 45000, status: 'draft',
  });
  assert.ok(row.id, 'variation created');
  const found = await InteriorVariation.findOne({ where: { variation_code: code, service_line: 'residential_interior_design' } });
  assert.ok(found && Number(found.amount_delta) === 45000, 'found by service_line with delta');
  await row.destroy(); // clean up this synthetic row (test artifact, not real data)
  console.log('PASS interiorVariation');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
