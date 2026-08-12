/**
 * Seed Water Tank operations data — the exact sample data shown in the Figma screens
 * so every screen reflects the design. Idempotent by code. Run from backend/:
 *   node scripts/seedWaterTankOps.js
 */
require('dotenv').config();
const M = require('../models/waterTankOps');
const B = 1;
async function foc(model, code, defaults) { const [row] = await model.findOrCreate({ where: { code }, defaults: { code, branch_id: B, ...defaults } }); return row; }

(async () => {
  // ── Clients (client-list + client-detail) ────────────────────────────────
  await foc(M.WtClient, 'WTCM-C0001', {
    name: 'Sample Residential Owner', client_type: 'Residential', mobile: '01712-345678', email: 'owner.sample@gmail.com',
    district: 'Cumilla', property_type: 'House', current_status: 'Assessment Scheduled', assigned_officer: 'Tareq Rahman',
    service_address: 'Cumilla Sadar, Cumilla', lead_source: 'Website Enquiry', tanks_count: 1,
    tank_type: 'Concrete (Rooftop)', tank_capacity: '2,000 Litres (1 Tank)', key_issues: 'Algae suspected, low water pressure reported', last_cleaning: 'Never cleaned (recently built)',
    amc_package: 'Residential Basic Package', amc_annual_value: 12000, amc_status: 'Proposed',
    active_project_name: 'Rooftop Tank Cleaning', active_project_scope: 'Emptying, mechanical scraping, disinfection of 2000L concrete tank.', active_project_progress: 25,
  });
  await foc(M.WtClient, 'WTCM-C0002', { name: 'Gulshan Garden Suites Committee', client_type: 'Commercial', mobile: '01911-987654', district: 'Dhaka', property_type: 'Apartment Block', current_status: 'Active (AMC)', assigned_officer: 'Nusrat Jahan' });
  await foc(M.WtClient, 'WTCM-C0003', { name: 'Akbar Plaza, EPZ Road', client_type: 'Commercial', mobile: '01815-443322', district: 'Chittagong', property_type: 'Market Complex', current_status: 'New Lead', assigned_officer: 'Tareq Rahman' });
  await foc(M.WtClient, 'WTCM-C0004', { name: 'Dr. Aminul Islam Residence', client_type: 'Residential', mobile: '01511-223344', district: 'Dhaka', property_type: 'Duplex Villa', current_status: 'Completed', assigned_officer: 'A. S. M. Kaiser' });
  await foc(M.WtClient, 'WTCM-C0005', { name: 'Shinepukur Apparels Ltd', client_type: 'Commercial', mobile: '01715-998800', district: 'Dhaka', property_type: 'Industrial Factory', current_status: 'Active (AMC)', assigned_officer: 'Nusrat Jahan' });

  // ── Service Requests ─────────────────────────────────────────────────────
  await foc(M.WtServiceRequest, 'SR-1095', { request_date: '2024-10-02', client_name: 'Mirpur Heights Flats', category: 'Disinfection', specific_service: 'Rooftop Concrete', priority: 'High', preferred_date: '2024-10-05', visit_required: true, deposit_required: true, provider_name: 'Bengal SafeWater', status: 'New' });
  await foc(M.WtServiceRequest, 'SR-1096', { request_date: '2024-10-02', client_name: 'Haque Group Head Office', category: 'Repair & Clean', specific_service: 'Underground Tank', priority: 'Medium', preferred_date: '2024-10-06', visit_required: true, deposit_required: false, provider_name: 'Sikder Tank Services', status: 'Assigned' });
  await foc(M.WtServiceRequest, 'SR-1097', { request_date: '2024-10-01', client_name: 'Uttara sector-11 Residence', category: 'AMC Regular', specific_service: 'Routine Cleaning', priority: 'Low', preferred_date: '2024-10-08', visit_required: false, deposit_required: false, provider_name: 'MegaClean Bd Ltd', status: 'Completed' });

  // ── Site Assessments ─────────────────────────────────────────────────────
  await foc(M.WtSiteAssessment, 'SA-0402', {
    project_id: 'WTCM-P01', client_name: 'Gulshan Garden Suites', provider: 'Bengal SafeWater', assessed_date: '2024-10-03',
    access_safe: true, contamination: 'Algae Detected', leakage: 'Rooftop Joint', photos_count: 8, status: 'Completed',
    checklist: { tank_access_safe: true, confined_space: true, contamination_indicators: true, leakage_detected: false, structural_approved: true, overflow_secure: false, pump_functional: true },
    findings: 'Heavy algae build-up on north inner wall due to minor direct sunlight leak through overflow hatch. Structurally sound, concrete shows no macro cracks. Recommend wire brush scrubbing, followed by dual-pass NaOCl disinfection.',
    photos: [{ caption: 'Interior North Wall Algae' }, { caption: 'Manhole Cover Sealing' }, { caption: 'Inlet Valve Leakage' }],
  });

  // ── Quotations ───────────────────────────────────────────────────────────
  await foc(M.WtQuotation, 'Q-1049', {
    project_id: 'WT-P03', client_name: 'Hamid Residence, Dhanmondi', validity: '30 Days', decision: 'Pending',
    lines: [
      { code: 'WTC-004', name: 'Rooftop Tank Evacuation & Wash', price: 12000 },
      { code: 'WTC-011', name: 'Deep Wire Brush Scrubbing (Internal)', price: 6400 },
      { code: 'WTC-018', name: 'Sodium Hypochlorite Disinfection Pass', price: 5000 },
      { code: 'WTC-024', name: 'Chlorine Residual Safety Validation', price: 5000 },
    ],
    service_charges: 28400, provider_allocation_fee: 18000, vat: 1420, total: 29820,
  });
  await foc(M.WtQuotation, 'Q-1048', { project_id: 'WT-P02', client_name: 'Standard Chartered Bank', validity: 'Expired', decision: 'Rejected', total: 45000, service_charges: 45000 });

  // ── Work Orders ──────────────────────────────────────────────────────────
  await foc(M.WtWorkOrder, 'WO-0482', { project_id: 'WTCM-P002', client_name: 'Lalbagh Shahi Mosque Committee', provider_name: 'Bengal SafeWater Solutions', category: 'Repairs', target_date: '2024-10-08', status: 'Issued', provider_fee: 15000, total_contract: 15000 });
  await foc(M.WtWorkOrder, 'WO-0483', {
    project_id: 'WTCM-P0001', client_name: 'Sample Residential Owner (Cumilla)', provider_name: 'Sikder Tank Services', category: 'Cleaning & Disinfect', target_date: '2024-10-05', status: 'In Progress',
    provider_fee: 8000, ss_fee: 4000, total_contract: 12000, warranty: '90 Days Post-Disinfection',
    scope: 'Complete evacuation of 2,000L rooftop concrete tank. Scrape interior walls using non-abrasive food-grade steel wire brushes to remove organic debris. Disinfect utilizing approved Sodium Hypochlorite (NaOCl) solution. Post-rinse test for chlorine residual levels < 0.5ppm.',
    special_conditions: 'Ensure resident is notified 24 hours prior to water disruption. Supply backup water pump if height bypass is required.',
  });
  await foc(M.WtWorkOrder, 'WO-0484', { project_id: 'WTCM-P003', client_name: 'National Bank Office, Motijheel', provider_name: 'MegaClean Bangladesh Ltd', category: 'Disinfection', target_date: '2024-10-12', status: 'Completed', provider_fee: 24500, total_contract: 24500 });

  // ── Projects (project-detail + invoice milestones) ───────────────────────
  await foc(M.WtProject, 'WTCM-P0001', {
    name: 'Rooftop Tank Cleaning — Sample Residential Owner', client_name: 'Sample Residential Owner', assigned_provider: 'Bengal SafeWater',
    start_date: '2024-10-01', target_completion: '2024-10-08', health_index: 'Normal/Clear', stage: 'Assessment', status: 'Open',
    timeline: [
      { title: 'Site Assessment Scheduled', detail: 'Assigned to Bengal SafeWater Solutions team', by: 'Logged by Tareq Rahman', at: 'Oct 03, 11:30 AM' },
      { title: 'Lead received and processed', detail: 'Client requested r-cleaning services', by: 'Logged by Ops Desk', at: 'Oct 01, 09:00 AM' },
    ],
    linked: { work_order: { code: 'WTCM-W01', title: 'Work Order WO-1042', status: 'Draft' }, quotation: { code: 'WTCM-Q01', title: 'Quotation Q-1049', status: 'Pending Approval' }, facility: { code: 'FAC-0001', title: 'Facility Record', tag: '2,000L Concrete' } },
    milestones: [
      { title: 'Milestone 1: Deposit', amount: 10000, status: 'Cleared', date: 'Sept 15, 2024' },
      { title: 'Milestone 2: Progress (Wash Pass)', amount: 15000, status: 'Cleared', date: 'Sept 28, 2024' },
      { title: 'Milestone 3: Final Inspection Clearance', amount: 24500, status: 'Invoiced', date: 'Oct 08, 2024' },
    ],
  });

  // ── Providers ────────────────────────────────────────────────────────────
  await foc(M.WtProvider, 'SP-0012', { business_name: 'Sikder Tank Services', contact_person: 'M. Sikder', specialty: 'AMC Preferred Partner', approved_services: ['Cleaning', 'Disinfection'], status: 'Approved', onboarded_since: 'Nov 2023', completion_rate: 98.5, rating: 4.8, complaint_rate: 0.4, jobs_completed: 388, rank: 2, coverage: 'Primary: Dhaka South, Dhaka East, Cumilla Sadar Rural, Cumilla Bypass.', compliance: { trade_licence: true, tin: true, liability_insurance: true, cumilla_exclusivity: true } });
  await foc(M.WtProvider, 'SP-0014', { business_name: 'Bengal SafeWater Solutions', contact_person: 'F. Ahmed', specialty: 'Repairs & Disinfection Specialist', approved_services: ['Repairs', 'Full AMC'], status: 'Approved', onboarded_since: 'Aug 2023', completion_rate: 99.2, rating: 4.9, complaint_rate: 0.3, jobs_completed: 412, rank: 1, coverage: 'Primary: Dhaka Central, Dhaka North.', compliance: { trade_licence: true, tin: true, liability_insurance: true, cumilla_exclusivity: false } });
  await foc(M.WtProvider, 'SP-0019', { business_name: 'Dhaka Clean Water Group', contact_person: 'K. Al-Amin', specialty: 'Cleaning', approved_services: ['Cleaning'], status: 'Conditional', onboarded_since: 'Feb 2024', completion_rate: 91.0, rating: 4.3, complaint_rate: 1.2, jobs_completed: 64, rank: 3, coverage: 'Dhaka South.', compliance: { trade_licence: true, tin: false, liability_insurance: false, cumilla_exclusivity: false } });

  // ── AMC ──────────────────────────────────────────────────────────────────
  await foc(M.WtAmcContract, 'AMC-0001', { client_name: 'Standard Chartered Bank, Gulshan', package: 'Commercial Premium', frequency: 'Quarterly', start_date: '2024-01-01', end_date: '2024-12-31', next_visit: 'Oct 15, 2024', annual_value: 96000, status: 'Active' });
  await foc(M.WtAmcContract, 'AMC-0002', { client_name: 'Sample Residential Owner', package: 'Residential Basic', frequency: 'Six-Monthly', start_date: '2024-10-01', end_date: '2025-09-30', next_visit: 'Oct 03, 2024', annual_value: 12000, status: 'Proposed' });
  await foc(M.WtAmcContract, 'AMC-0003', { client_name: 'Mega Apartments, Dhanmondi', package: 'Commercial Standard', frequency: 'Six-Monthly', start_date: '2023-05-15', end_date: '2024-05-14', next_visit: 'None scheduled', annual_value: 60000, status: 'Expired' });

  // ── Invoices ─────────────────────────────────────────────────────────────
  await foc(M.WtInvoice, 'INV-0482', { project_id: 'WTCM-P01', client_name: 'Gulshan Suites Committee', inv_type: 'Final Payment', amount: 24500, due_date: '2024-10-08', outstanding: 0, status: 'Paid', provider_payout: 'Paid' });
  await foc(M.WtInvoice, 'INV-0483', { project_id: 'WTCM-P02', client_name: 'Hamid Residential Block', inv_type: 'Deposit 30%', amount: 12000, due_date: '2024-10-05', outstanding: 12000, status: 'Overdue', provider_payout: 'Not Due' });

  // ── Complaints ───────────────────────────────────────────────────────────
  await foc(M.WtComplaint, 'COMP-012', {
    client_name: 'Akbar Plaza, EPZ Road', incident_type: 'Water Discoloration', severity: 'High', sla_due: '6 Hours Left', status: 'Open', logged_date: '2024-10-04', resolution_hours: 0,
    disclosure: 'Resident reported highly turbid brownish water 2 hours post-wash. Suspect back-filtration from sludge pipe bypass due to incomplete valve seating on WTC-011.',
    timeline: [
      { title: 'Incident reported by Client', detail: 'Dhaka ops center triage desk log', at: 'Oct 04, 10:00 AM' },
      { title: 'SLA target assigned to lead provider', detail: 'Bengal SafeWater dispatched', at: 'Oct 04, 10:30 AM' },
    ],
  });
  await foc(M.WtComplaint, 'COMP-011', { client_name: 'Dr. Aminul Islam', incident_type: 'Pressure Valve leak', severity: 'Medium', sla_due: 'Resolved', status: 'Resolved', logged_date: '2024-09-20', resolved_date: '2024-09-21', resolution_hours: 18.4 });

  // ── Communication log ────────────────────────────────────────────────────
  if ((await M.WtCommLog.count({ where: { branch_id: B } })) === 0) {
    const now = Date.now();
    const rows = [
      ['Mirpur Heights Flats', 'call', 'outbound', 'Confirmed site visit window for Oct 05 morning.', 'service_request', 'SR-1095'],
      ['Hamid Residence, Dhanmondi', 'email', 'inbound', 'Client asked to revise quotation Q-1049 with AMC add-on.', 'quotation', 'Q-1049'],
      ['Gulshan Suites Committee', 'whatsapp', 'outbound', 'Shared before/after photos + final invoice INV-0482.', 'invoice', 'INV-0482'],
      ['Akbar Plaza, EPZ Road', 'call', 'inbound', 'Complaint COMP-012 logged: discoloured water post-wash.', 'complaint', 'COMP-012'],
    ];
    for (let i = 0; i < rows.length; i++) { const [client_name, channel, direction, summary, ref_type, ref_code] = rows[i]; await M.WtCommLog.create({ branch_id: B, client_name, channel, direction, summary, ref_type, ref_code, logged_at: new Date(now - i * 3600e3) }); }
  }

  console.log('Water Tank ops seeded to match Figma sample data.');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
