'use strict';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const SALE_STAGES = [
  ['Enquiry & Consultation', ['Seller/property/source captured', 'Consultation recorded', 'Phase-1 quotation/agreement issued', 'Inspection scheduled']],
  ['Inspection & Assessment', ['Condition report + photos', 'Preparation recommendations', 'Comparative market analysis (if applicable)']],
  ['Documents & Risk', ['Deed / mutation / taxes / utilities verified', 'Succession/approvals as applicable', 'Seller indemnity', 'Minimum estimated value discussed', 'Risk decision recorded']],
  ['Agreement & Phase-2 Approval', ['Scope, commission, exclusivity, dates', 'Phase-2 approved + payment schedule', 'Staff assigned']],
  ['Preparation', ['Approved quote + supplier assignment', 'Work evidence + completion', 'Or explicit not-required decision']],
  ['Marketing & Listing', ['Approved copy/media/pricing', 'Publish locations + campaign refs', 'Listing activation']],
  ['Buyer Enquiries & Inspections', ['Routed enquiries + screening', 'Viewing calendar', 'Feedback + seller updates']],
  ['Offers & Negotiation', ['Offer comparison', 'Written approval', 'Price-limit exception (if applicable)', 'Versioned counters']],
  ['Agreement & Settlement', ['Contract/registration/payment/possession milestones', 'Fee collection', 'Payout evidence']],
  ['Closure & Post-Sale', ['Handover pack', 'Closing statement', 'Feedback + archive', 'Follow-up + resolved exceptions']],
];
module.exports = {
  up: async (q) => {
    const now = new Date();
    const stages = SALE_STAGES.map(([name, items], i) => ({
      key: slug(name), name, order: i + 1, gate: true,
      checklist: items.map((label) => ({ label, required: true })),
      required_docs: [],
    }));
    await q.sequelize.query('DELETE FROM workflow_templates WHERE vertical_key = :v', { replacements: { v: 'properties_sale' } });
    await q.bulkInsert('workflow_templates', [{
      vertical_key: 'properties_sale', name: 'Residential Sale SOP',
      stages: JSON.stringify(stages), is_active: true, created_at: now, updated_at: now,
    }]);
  },
  down: async (q) => { await q.sequelize.query("DELETE FROM workflow_templates WHERE vertical_key = 'properties_sale'"); },
};
