/**
 * The rural SALE registers the workbooks define but that were never seeded.
 *
 * Seller workbook (System 1, Sheets 1-21) and buyer workbook (System 2,
 * Sheets 1-22). Three definitions already existed on rural_sale — #162
 * seller_master_register, #163 property_register, #164 offer_register — and this
 * script never touches them.
 *
 * Many workbook sheets are DELIBERATELY absent because the system already models
 * them as tables: inspections, buyer enquiries, protected buyers and properties
 * (non_circumvention_records), transactions (property_deals), invoices, payments,
 * commission, the risk register (property_risks + the dispute lifecycle) and the
 * agreement registers (signing_envelopes). Duplicating those as registers would
 * split the truth in two. See the spec, §5.
 *
 * Idempotent and additive: matches on (vertical_key, register_key).
 * Run from backend/:  node scripts/seedRuralSaleRegisters.js
 */
const sequelize = require('../config/db.config');

const col = (key, label, type = 'text') => ({ key, label, type });

// ── Seller side — vertical rural_sale ────────────────────────────────────────
const SELLER_REGISTERS = [
  {
    register_key: 'ownership_verification',
    name: 'Ownership Verification Register',
    // Seller workbook Sheet 3. The nine documents the sale SOP §6 Step 3 lists.
    columns: [
      col('document', 'Document', 'select'),
      col('required', 'Required', 'select'),
      col('received', 'Received', 'select'),
      col('verified', 'Verified', 'select'),
      col('verification_method', 'Verification method'),
      col('remarks', 'Remarks', 'textarea'),
    ],
  },
  {
    register_key: 'marketing_register',
    name: 'Marketing Register',
    // Sheet 5: photography, videography, drone, signboard, website, Facebook,
    // buyer database, WhatsApp, NRB.
    columns: [
      col('activity', 'Activity', 'select'),
      col('required', 'Required', 'select'),
      col('completed', 'Completed', 'select'),
      col('date', 'Date', 'date'),
      col('cost', 'Cost'),
      col('remarks', 'Remarks', 'textarea'),
    ],
  },
  {
    register_key: 'negotiation_register',
    name: 'Negotiation Register',
    // Sheet 9. The offer itself is #164; this is the round-by-round trail.
    columns: [
      col('round', 'Round #'),
      col('date', 'Date', 'date'),
      col('buyer', 'Buyer'),
      col('offer', 'Offer'),
      col('counter_offer', 'Counter offer'),
      col('outcome', 'Outcome', 'select'),
      col('notes', 'Notes', 'textarea'),
    ],
  },
  {
    register_key: 'legal_coordination_register',
    name: 'Legal Coordination Register',
    // Sheet 11: lawyer, surveyor, valuer, registration consultant.
    columns: [
      col('role', 'Role', 'select'),
      col('name', 'Name'),
      col('contact', 'Contact'),
      col('engaged_on', 'Engaged on', 'date'),
      col('status', 'Status', 'select'),
      col('notes', 'Notes', 'textarea'),
    ],
  },
  {
    register_key: 'complaint_register',
    name: 'Complaint Register',
    // Sheet 17.
    columns: [
      col('date', 'Date', 'date'),
      col('party', 'Party'),
      col('complaint', 'Complaint', 'textarea'),
      col('severity', 'Severity', 'select'),
      col('action_taken', 'Action taken', 'textarea'),
      col('resolved_on', 'Resolved on', 'date'),
      col('outcome', 'Outcome'),
    ],
  },
  {
    register_key: 'communication_log',
    name: 'Communication Log',
    // Sheet 18: calls, emails, WhatsApp, meetings.
    columns: [
      col('date', 'Date', 'date'),
      col('party', 'Party'),
      col('channel', 'Channel', 'select'),
      col('subject', 'Subject'),
      col('summary', 'Summary', 'textarea'),
      col('follow_up', 'Follow-up', 'date'),
    ],
  },
  {
    register_key: 'seller_feedback_register',
    name: 'Seller Feedback Register',
    // Sheet 19.
    columns: [
      col('date', 'Date', 'date'),
      col('seller', 'Seller'),
      col('rating', 'Rating', 'select'),
      col('feedback', 'Feedback', 'textarea'),
      col('action', 'Action', 'textarea'),
    ],
  },
  {
    register_key: 'closure_register',
    name: 'Project Closure Register',
    // Sheet 20. Retention is a column here, not a register of its own — the same
    // decision the rural rent closure register records.
    columns: [
      col('project', 'Project'),
      col('closed_on', 'Closed on', 'date'),
      col('commission_reconciled', 'Commission reconciled', 'select'),
      col('records_archived', 'Records archived', 'select'),
      col('retention_until', 'Retention until', 'date'),
      col('notes', 'Notes', 'textarea'),
    ],
  },
];

// ── Buyer side — vertical rural_purchase ─────────────────────────────────────
const BUYER_REGISTERS = [
  {
    register_key: 'buyer_master_register',
    name: 'Buyer Master Register',
    // Buyer workbook Sheet 1.
    columns: [
      col('buyer_id', 'Buyer ID'),
      col('name', 'Name'),
      col('nid', 'NID'),
      col('mobile', 'Mobile'),
      col('email', 'Email'),
      col('address', 'Address'),
      col('nrb_status', 'NRB status', 'select'),
      col('budget', 'Budget'),
      col('consultant', 'Assigned consultant'),
    ],
  },
  {
    register_key: 'requirement_register',
    name: 'Buyer Requirement Register',
    // Sheet 2 — the ten rural property types the buyer will consider.
    columns: [
      col('requirement', 'Property type', 'select'),
      col('required', 'Required', 'select'),
      col('priority', 'Priority', 'select'),
      col('notes', 'Notes', 'textarea'),
    ],
  },
  {
    register_key: 'budget_register',
    name: 'Budget Register',
    // Sheet 3: min, max, financing required, cash, bank loan.
    columns: [
      col('min_budget', 'Min budget'),
      col('max_budget', 'Max budget'),
      col('financing_required', 'Financing required', 'select'),
      col('cash_purchase', 'Cash purchase', 'select'),
      col('bank_loan', 'Bank loan', 'select'),
      col('notes', 'Notes', 'textarea'),
    ],
  },
  {
    register_key: 'search_criteria_register',
    name: 'Search Criteria Register',
    // Sheet 4 — the land-record fields the buyer is searching on.
    columns: [
      col('district', 'District'),
      col('upazila', 'Upazila'),
      col('union_name', 'Union'),
      col('village', 'Village'),
      col('mouza', 'Mouza'),
      col('land_area', 'Land area'),
      col('property_type', 'Property type', 'select'),
    ],
  },
  {
    register_key: 'property_search_register',
    name: 'Property Search Register',
    // Sheet 6 — every property identified, internal, external or off-market.
    columns: [
      col('date', 'Date', 'date'),
      col('property', 'Property'),
      col('source', 'Source', 'select'),
      col('asking_price', 'Asking price'),
      col('outcome', 'Outcome', 'select'),
      col('notes', 'Notes', 'textarea'),
    ],
  },
  {
    register_key: 'shortlist_register',
    name: 'Property Shortlist Register',
    // Sheet 7 — with the advantages and risks the purchase SOP Step 6 requires.
    columns: [
      col('property', 'Property'),
      col('location', 'Location'),
      col('price', 'Price'),
      col('advantages', 'Advantages', 'textarea'),
      col('risks', 'Risks', 'textarea'),
      col('priority', 'Priority', 'select'),
      col('outcome', 'Outcome', 'select'),
    ],
  },
  {
    register_key: 'due_diligence_register',
    name: 'Due Diligence Register',
    // Sheet 12: deed, khatiyan, dag, mutation review, survey, valuation, legal.
    columns: [
      col('item', 'Item', 'select'),
      col('required', 'Required', 'select'),
      col('completed', 'Completed', 'select'),
      col('date', 'Date', 'date'),
      col('reviewer', 'Reviewer'),
      col('findings', 'Findings', 'textarea'),
    ],
  },
  {
    register_key: 'financing_register',
    name: 'Financing Register',
    // Sheet 14: loan application, valuation, approval, settlement.
    columns: [
      col('stage', 'Stage', 'select'),
      col('lender', 'Lender'),
      col('amount', 'Amount'),
      col('status', 'Status', 'select'),
      col('date', 'Date', 'date'),
      col('notes', 'Notes', 'textarea'),
    ],
  },
  {
    register_key: 'buyer_feedback_register',
    name: 'Buyer Feedback Register',
    // Sheet 20.
    columns: [
      col('date', 'Date', 'date'),
      col('buyer', 'Buyer'),
      col('rating', 'Rating', 'select'),
      col('feedback', 'Feedback', 'textarea'),
      col('action', 'Action', 'textarea'),
    ],
  },
];

const RURAL_SALE_REGISTERS = [
  ...SELLER_REGISTERS.map((d) => ({ ...d, vertical_key: 'rural_sale' })),
  ...BUYER_REGISTERS.map((d) => ({ ...d, vertical_key: 'rural_purchase' })),
];

async function run() {
  const [before] = await sequelize.query(
    "SELECT COUNT(*) AS c FROM register_definitions WHERE vertical_key IN ('rural_sale', 'rural_purchase')",
  );

  for (const def of RURAL_SALE_REGISTERS) {
    const [existing] = await sequelize.query(
      'SELECT id FROM register_definitions WHERE vertical_key = :v AND register_key = :k LIMIT 1',
      { replacements: { v: def.vertical_key, k: def.register_key } },
    );
    if (existing.length) {
      await sequelize.query(
        'UPDATE register_definitions SET name = :n, columns = :c WHERE id = :id',
        { replacements: { n: def.name, c: JSON.stringify(def.columns), id: existing[0].id } },
      );
      console.log(`  updated  ${def.vertical_key}/${def.register_key} (#${existing[0].id})`);
      continue;
    }
    const [[{ next }]] = await sequelize.query(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM register_definitions WHERE vertical_key = :v',
      { replacements: { v: def.vertical_key } },
    );
    await sequelize.query(
      `INSERT INTO register_definitions (vertical_key, register_key, name, columns, sort_order, is_active, created_at, updated_at)
       VALUES (:v, :k, :n, :c, :s, 1, NOW(), NOW())`,
      { replacements: { v: def.vertical_key, k: def.register_key, n: def.name, c: JSON.stringify(def.columns), s: next } },
    );
    console.log(`  created  ${def.vertical_key}/${def.register_key} (sort ${next})`);
  }

  const [after] = await sequelize.query(
    "SELECT COUNT(*) AS c FROM register_definitions WHERE vertical_key IN ('rural_sale', 'rural_purchase')",
  );
  console.log(`rural sale/purchase register definitions: ${before[0].c} -> ${after[0].c}`);
}

module.exports = { RURAL_SALE_REGISTERS, SELLER_REGISTERS, BUYER_REGISTERS };

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
}
