import React from 'react';
import RuralRegisterBoard from './RuralRegisterBoard';

/**
 * Buyer due diligence and financing - purchase SOP Phase 5, buyer workbook
 * Sheets 12 and 14.
 *
 * The seven review items are the workbook's own: deed, khatiyan, dag and mutation
 * review, survey, valuation and legal review. Risks found here are raised as
 * DISPUTES on /rural/disputes (sale-side categories include Government
 * Acquisition Risk and Registration Delay), not recorded as findings only.
 */
const TABS = [
  { key: 'due_diligence_register', vertical: 'rural_purchase', label: 'Due Diligence' },
  { key: 'financing_register', vertical: 'rural_purchase', label: 'Financing' },
];

const CHOICES = {
  item: ['Deed Review', 'Khatiyan Review', 'Dag Review', 'Mutation Review', 'Survey', 'Valuation', 'Legal Review'],
  required: ['Yes', 'No'],
  completed: ['Yes', 'No', 'Partial'],
  stage: ['Loan Application', 'Valuation', 'Approval', 'Settlement'],
  status: ['Pending', 'Submitted', 'Approved', 'Declined', 'Completed'],
};

export default function RuralDueDiligence() {
  return (
    <RuralRegisterBoard
      title="Rural · Due Diligence"
      desc="Deed, khatiyan, dag and mutation review, survey, valuation and legal review, plus the financing trail - purchase SOP Phase 5."
      tabs={TABS}
      choices={CHOICES}
      badgeKeys={['completed', 'required', 'status']}
      emptyHint="The due diligence registers are not defined yet. Seed them with node scripts/seedRuralSaleRegisters.js from backend/."
    />
  );
}
