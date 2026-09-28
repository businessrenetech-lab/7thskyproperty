/**
 * The rural fee structure (SOP Rural Rental Management §7 Step 6).
 *
 * property_owner_profiles already carries management_commission, onboarding_fee,
 * agreement_start_date and termination_notice_days. These are the four the SOP
 * names that it did not already have, so nothing is duplicated.
 */
const RURAL_FEE_FIELDS = ['leasing_fee', 'marketing_budget', 'early_termination_fee', 'exclusive_until'];

module.exports = { RURAL_FEE_FIELDS };
