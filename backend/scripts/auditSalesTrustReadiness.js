const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db.config');

async function main() {
  const [settlements, paymentIssues, payoutIssues, paidPayoutIssues, allocationIssues, completedBalanceIssues, trustBalances, scheduleIssues, fundingIssues] = await Promise.all([
    sequelize.query(`
      SELECT s.id, s.settlement_code, s.status, s.branch_id, t.property_id,
             p.trust_bank_account_id, p.agency_bank_account_id,
             p.client_money_bank_account_id, p.client_funds_liability_account_id,
             p.agency_operating_account_id, p.commission_revenue_account_id,
             p.marketing_revenue_account_id,
             (SELECT COUNT(*) FROM sale_trust_accounts sta WHERE sta.settlement_id = s.id) AS trust_account_count
      FROM sale_settlements s
      JOIN sale_transactions t ON t.id = s.transaction_id AND t.branch_id = s.branch_id
      LEFT JOIN sale_profiles p ON p.property_id = t.property_id AND p.branch_id = s.branch_id
      ORDER BY s.branch_id, s.id
    `, { type: QueryTypes.SELECT }),
    sequelize.query(`
      SELECT id, settlement_id, direction, status, reconciliation_status,
             bank_statement_line_id, journal_entry_id
      FROM sale_payments
      WHERE status IN ('cleared', 'reversed')
        AND (reconciliation_status <> 'reconciled'
          OR bank_statement_line_id IS NULL
          OR journal_entry_id IS NULL)
      ORDER BY settlement_id, id
    `, { type: QueryTypes.SELECT }),
    sequelize.query(`
      SELECT d.id, d.settlement_id, d.payee_type, d.status, d.payout_method,
             d.party_bank_account_id, d.destination_bank_account_id,
             pba.status AS recipient_account_status
      FROM sale_disbursements d
      LEFT JOIN party_bank_accounts pba ON pba.id = d.party_bank_account_id
      JOIN sale_settlements s ON s.id = d.settlement_id
      WHERE d.status NOT IN ('paid', 'cancelled')
        AND (s.status = 'locked'
          OR (d.payee_type = 'agency' AND d.destination_bank_account_id IS NULL)
          OR (d.payee_type <> 'agency' AND d.payout_method = 'manual_bank'
            AND (d.party_bank_account_id IS NULL OR pba.id IS NULL OR pba.status <> 'verified')))
      ORDER BY d.settlement_id, d.id
    `, { type: QueryTypes.SELECT }),
    sequelize.query(`
      SELECT d.id, d.settlement_id, d.payee_type, d.payment_id,
             d.amount AS payout_amount, p.amount AS payment_amount,
             p.status AS payment_status, p.reconciliation_status,
             p.bank_statement_line_id, p.payment_kind
      FROM sale_disbursements d
      LEFT JOIN sale_payments p ON p.id = d.payment_id AND p.settlement_id = d.settlement_id
      LEFT JOIN sale_transaction_parties tp ON tp.id = d.transaction_party_id
      LEFT JOIN sale_settlement_lines l ON l.id = d.settlement_line_id AND l.settlement_id = d.settlement_id
      WHERE d.status = 'paid'
        AND (p.id IS NULL OR p.status <> 'cleared'
          OR p.reconciliation_status <> 'reconciled'
          OR p.bank_statement_line_id IS NULL
          OR ROUND(p.amount * 100) <> ROUND(d.amount * 100)
          OR COALESCE(p.transaction_party_id, 0) <> COALESCE(d.transaction_party_id, 0)
          OR p.payment_kind <> CASE
            WHEN tp.party_type = 'buyer' THEN 'buyer_refund'
            WHEN d.payee_type = 'vendor' THEN 'vendor_payout'
            WHEN d.payee_type = 'agency' THEN 'agency_fee'
            ELSE 'third_party'
          END
          OR (SELECT COUNT(*) FROM sale_disbursements allocated WHERE allocated.payment_id = p.id) <> 1
          OR l.id IS NULL
          OR (d.payee_type = 'vendor' AND (l.line_type <> 'vendor_proceeds'
            OR COALESCE(l.payee_transaction_party_id, 0) <> COALESCE(d.transaction_party_id, 0)))
          OR (d.payee_type = 'agency' AND l.line_type NOT IN ('commission', 'agency_fee', 'advertising', 'admin_fee'))
          OR (d.payee_type = 'third_party' AND tp.party_type = 'buyer'
            AND (l.line_type <> 'buyer_refund' OR COALESCE(l.payee_transaction_party_id, 0) <> COALESCE(d.transaction_party_id, 0)))
          OR (d.payee_type = 'third_party' AND COALESCE(tp.party_type, '') <> 'buyer'
            AND (l.line_type NOT IN ('commission', 'agency_fee', 'advertising', 'admin_fee', 'vat_tax', 'legal_fee', 'registration_fee', 'lender_payoff', 'rates_adjustment', 'utility_adjustment', 'third_party', 'rounding')
              OR COALESCE(l.payee_contact_id, 0) <> COALESCE(d.contact_id, 0)))
          OR (d.payout_method <> 'sslcommerz_refund'
            AND REGEXP_REPLACE(LOWER(COALESCE(p.to_account_number, '')), '[^a-z0-9]', '')
              <> REGEXP_REPLACE(LOWER(COALESCE(d.bank_account_number, '')), '[^a-z0-9]', '')))
      ORDER BY d.settlement_id, d.id
    `, { type: QueryTypes.SELECT }),
    sequelize.query(`
      SELECT s.id AS settlement_id, s.status, l.id AS settlement_line_id,
             l.line_type, l.amount AS obligation_amount,
             COALESCE(SUM(CASE WHEN d.status <> 'cancelled' THEN d.amount ELSE 0 END), 0) AS allocated_amount
      FROM sale_settlements s
      JOIN sale_settlement_lines l ON l.settlement_id = s.id AND l.branch_id = s.branch_id
      LEFT JOIN sale_disbursements d ON d.settlement_line_id = l.id AND d.settlement_id = s.id
      WHERE s.status IN ('reviewed', 'approved', 'locked')
        AND l.line_type NOT IN ('purchase_price', 'deposit', 'buyer_receipt')
        AND l.amount > 0
      GROUP BY s.id, s.status, l.id, l.line_type, l.amount
      HAVING ROUND(obligation_amount * 100) <> ROUND(allocated_amount * 100)
      ORDER BY s.id, l.id
    `, { type: QueryTypes.SELECT }),
    sequelize.query(`
      SELECT s.id AS settlement_id, s.settlement_code,
             COALESCE(SUM(CASE WHEN p.direction = 'incoming' THEN p.amount ELSE -p.amount END), 0) AS payment_balance
      FROM sale_settlements s
      LEFT JOIN sale_payments p ON p.settlement_id = s.id
        AND p.status = 'cleared'
        AND p.reversal_of_payment_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM sale_payments reversal WHERE reversal.reversal_of_payment_id = p.id)
      WHERE s.status = 'locked'
      GROUP BY s.id, s.settlement_code
      HAVING ROUND(payment_balance * 100) <> 0
      ORDER BY s.id
    `, { type: QueryTypes.SELECT }),
    sequelize.query(`
      SELECT a.settlement_id, a.id AS trust_account_id, a.beneficiary_key,
             ROUND(SUM(e.debit - e.credit), 2) AS balance
      FROM sale_trust_accounts a
      LEFT JOIN sale_trust_entries e ON e.trust_account_id = a.id
      GROUP BY a.settlement_id, a.id, a.beneficiary_key
      HAVING ROUND(COALESCE(SUM(e.debit - e.credit), 0), 2) <> 0
      ORDER BY a.settlement_id, a.id
    `, { type: QueryTypes.SELECT }),
    sequelize.query(`
      SELECT s.id AS settlement_id, s.status,
             SUM(CASE WHEN l.line_type = 'purchase_price' THEN 1 ELSE 0 END) AS purchase_line_count,
             ROUND(SUM(CASE WHEN l.line_type = 'purchase_price' THEN l.amount ELSE 0 END), 2) AS purchase_price,
             ROUND(SUM(CASE WHEN l.line_type NOT IN ('purchase_price', 'deposit', 'buyer_receipt') THEN l.amount ELSE 0 END), 2) AS obligations,
             SUM(CASE WHEN l.line_type NOT IN ('purchase_price', 'deposit', 'buyer_receipt') AND l.direction <> 'debit' THEN 1 ELSE 0 END) AS invalid_directions
      FROM sale_settlements s
      LEFT JOIN sale_settlement_lines l ON l.settlement_id = s.id AND l.branch_id = s.branch_id
      GROUP BY s.id, s.status
      HAVING purchase_line_count <> 1 OR purchase_price <> obligations OR invalid_directions <> 0
      ORDER BY s.id
    `, { type: QueryTypes.SELECT }),
    sequelize.query(`
      SELECT f.id, f.settlement_id, f.status, f.paid_payment_id,
             p.status AS payment_status, p.funding_request_id
      FROM sale_funding_requests f
      LEFT JOIN sale_payments p ON p.id = f.paid_payment_id
      WHERE (f.status = 'paid' AND (p.id IS NULL OR p.status <> 'cleared'
        OR p.funding_request_id <> f.id))
        OR (f.status <> 'paid' AND f.paid_payment_id IS NOT NULL)
      ORDER BY f.settlement_id, f.id
    `, { type: QueryTypes.SELECT }),
  ]);

  const configurationIssues = settlements.map((settlement) => {
    const missing = [
      'trust_bank_account_id',
      'agency_bank_account_id',
      'client_money_bank_account_id',
      'client_funds_liability_account_id',
      'agency_operating_account_id',
      'commission_revenue_account_id',
      'marketing_revenue_account_id',
    ].filter((field) => !settlement[field]);
    return missing.length ? {
      settlement_id: settlement.id,
      settlement_code: settlement.settlement_code,
      branch_id: settlement.branch_id,
      property_id: settlement.property_id,
      status: settlement.status,
      missing,
    } : null;
  }).filter(Boolean);
  const trustLedgerMissing = settlements
    .filter((settlement) => ['approved', 'locked'].includes(settlement.status) && Number(settlement.trust_account_count) === 0)
    .map((settlement) => ({ settlement_id: settlement.id, settlement_code: settlement.settlement_code, status: settlement.status }));
  const allPayoutIssues = [...payoutIssues, ...paidPayoutIssues];

  const report = {
    mode: 'read-only',
    generated_at: new Date().toISOString(),
    settlements_audited: settlements.length,
    issue_counts: {
      configuration: configurationIssues.length,
      payment_posting_or_reconciliation: paymentIssues.length,
      payout_destination_or_allocation: allPayoutIssues.length,
      nonzero_trust_accounts: trustBalances.length,
      missing_trust_ledgers: trustLedgerMissing.length,
      invalid_schedules: scheduleIssues.length,
      invalid_line_allocations: allocationIssues.length,
      completed_payment_balances: completedBalanceIssues.length,
      funding_links: fundingIssues.length,
    },
    configuration_issues: configurationIssues,
    payment_issues: paymentIssues,
    payout_issues: allPayoutIssues,
    nonzero_trust_accounts: trustBalances,
    missing_trust_ledgers: trustLedgerMissing,
    schedule_issues: scheduleIssues,
    line_allocation_issues: allocationIssues,
    completed_payment_balance_issues: completedBalanceIssues,
    funding_link_issues: fundingIssues,
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
