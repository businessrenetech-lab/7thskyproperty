import React from 'react';
import RuralRegisterBoard from './RuralRegisterBoard';
import { RURAL_PROPERTY_TYPES } from '../../config/ruralPropertyTypes';

/**
 * The buyer's sourcing trail - purchase SOP Phase 2, buyer workbook Sheets 2, 3,
 * 4, 6 and 7. Requirement, budget and search criteria are what the buyer asked
 * for; property search and shortlist are what was found and presented.
 *
 * Every property introduced must also be recorded for non-circumvention (24
 * months for rural) - that lives on /rural/introductions, not here, because a
 * protected introduction is a legal record rather than a working note.
 */
const TABS = [
  { key: 'requirement_register', vertical: 'rural_purchase', label: 'Requirements' },
  { key: 'budget_register', vertical: 'rural_purchase', label: 'Budget' },
  { key: 'search_criteria_register', vertical: 'rural_purchase', label: 'Search Criteria' },
  { key: 'property_search_register', vertical: 'rural_purchase', label: 'Properties Found' },
  { key: 'shortlist_register', vertical: 'rural_purchase', label: 'Shortlist' },
  { key: 'buyer_master_register', vertical: 'rural_purchase', label: 'Buyer Register' },
];

/*
 * The purchase SOP §2 lists two kinds the rental SOP does not: Homestead Land and
 * Investment Rural Properties. They are added here rather than to
 * RURAL_PROPERTY_TYPES, because that list mirrors the backend's and a unit test
 * asserts the two have not drifted - a buyer's WISH is not a property type the
 * rental book must know about.
 */
const BUYER_TYPES = [...RURAL_PROPERTY_TYPES, 'Homestead Land', 'Investment Rural Property'];

const CHOICES = {
  requirement: BUYER_TYPES,
  property_type: BUYER_TYPES,
  priority: ['High', 'Medium', 'Low'],
  required: ['Yes', 'No'],
  financing_required: ['Yes', 'No'],
  cash_purchase: ['Yes', 'No'],
  bank_loan: ['Yes', 'No'],
  nrb_status: ['Resident', 'NRB'],
  source: ['Internal listing', 'External listing', 'Off-market', 'Rural network', 'Direct seller'],
  outcome: ['Presented', 'Shortlisted', 'Rejected', 'Pending'],
};

export default function RuralBuyerSearch() {
  return (
    <RuralRegisterBoard
      title="Rural · Search & Shortlist"
      desc="What the buyer asked for, what was found and what was presented - purchase SOP Phase 2, buyer workbook Sheets 2-7."
      tabs={TABS}
      choices={CHOICES}
      badgeKeys={['outcome', 'priority', 'required', 'financing_required']}
      emptyHint="The buyer registers are not defined yet. Seed them with node scripts/seedRuralSaleRegisters.js from backend/."
    />
  );
}
