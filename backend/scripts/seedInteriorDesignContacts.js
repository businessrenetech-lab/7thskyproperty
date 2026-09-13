/**
 * seedInteriorDesignContacts.js
 * Seeds realistic CRM contacts & leads tailored for Residential Interior Design.
 * Run from backend/: node scripts/seedInteriorDesignContacts.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Op } = require('sequelize');
const Contact = require('../models/Contact');
const Branch = require('../models/Branch');

async function seed() {
  console.log('Seeding Residential Interior Design CRM contacts...');

  const branch = await Branch.findOne();
  const branchId = branch ? branch.id : 1;

  const interiorLeads = [
    {
      contact_code: 'CT-INT-001',
      full_name: 'Tanvir Ahmed Chowdhury',
      first_name: 'Tanvir',
      last_name: 'Chowdhury',
      company_name: 'Apex Horizon Ltd',
      contact_type: 'individual',
      primary_phone: '+8801715888999',
      whatsapp: '+8801715888999',
      email: 'tanvir.chowdhury@apexhorizon.com',
      contact_list: 'Interior Design Leads',
      contact_lists: ['Interior Design Leads', 'Luxury Villa Interiors'],
      lead_status: 'qualified',
      lead_source: 'Website Consultation',
      looking_for: 'interior',
      preferred_areas: ['Gulshan 2', 'Baridhara Diplomatic'],
      property_types: ['Penthouse', 'Duplex Villa'],
      budget_min: 4500000,
      budget_max: 8000000,
      size_min_sft: 4200,
      urgency: 'immediate',
      area: 'Gulshan 2',
      city: 'Dhaka',
      lead_notes: '4,200 sft penthouse renovation. Requests modern European minimalist theme, Italian marble flooring, and smart automation.',
      status: 'active',
    },
    {
      contact_code: 'CT-INT-002',
      full_name: 'Syeda Mehnaz Karim',
      first_name: 'Syeda',
      last_name: 'Karim',
      company_name: '',
      contact_type: 'individual',
      primary_phone: '+8801819777666',
      whatsapp: '+8801819777666',
      email: 'mehnaz.karim@gmail.com',
      contact_list: 'Full Home Renovation',
      contact_lists: ['Full Home Renovation'],
      lead_status: 'new',
      lead_source: 'Instagram Campaign',
      looking_for: 'interior',
      preferred_areas: ['Banani', 'DOHS Mohakhali'],
      property_types: ['Apartment'],
      budget_min: 2000000,
      budget_max: 3500000,
      size_min_sft: 2100,
      urgency: '1_3_months',
      area: 'Banani Road 11',
      city: 'Dhaka',
      lead_notes: 'Recently handed over apartment in Banani. Needs complete interior fitout: drawing, dining, master bedroom, and two kids rooms.',
      status: 'active',
    },
    {
      contact_code: 'CT-INT-003',
      full_name: 'Engr. Kazi Rafiqul Islam',
      first_name: 'Kazi',
      last_name: 'Islam',
      company_name: 'Rafiqul Engineering Works',
      contact_type: 'individual',
      primary_phone: '+8801912444555',
      whatsapp: '+8801912444555',
      email: 'kazi.rafiq@yahoo.com',
      contact_list: 'Modular Kitchen & Wardrobes',
      contact_lists: ['Modular Kitchen & Wardrobes', 'Interior Design Leads'],
      lead_status: 'contacted',
      lead_source: 'Direct Referral',
      looking_for: 'interior',
      preferred_areas: ['Uttara Sector 4'],
      property_types: ['Apartment', 'Duplex'],
      budget_min: 1200000,
      budget_max: 1800000,
      size_min_sft: 1800,
      urgency: 'immediate',
      area: 'Uttara Sector 4',
      city: 'Dhaka',
      lead_notes: 'Wants premium acrylic modular kitchen with Blum hardware and built-in quartz countertop, plus 3 walk-in wardrobe units.',
      status: 'active',
    },
    {
      contact_code: 'CT-INT-004',
      full_name: 'Dr. Shahana Akhter',
      first_name: 'Shahana',
      last_name: 'Akhter',
      company_name: 'Square Hospitals Ltd',
      contact_type: 'individual',
      primary_phone: '+8801733222111',
      whatsapp: '+8801733222111',
      email: 'dr.shahana.akhter@squarehospital.com',
      contact_list: 'Consultation & Styling',
      contact_lists: ['Consultation & Styling'],
      lead_status: 'site_visit_scheduled',
      lead_source: 'Walk-in',
      looking_for: 'interior',
      preferred_areas: ['Dhanmondi Road 27'],
      property_types: ['Apartment'],
      budget_min: 1500000,
      budget_max: 2500000,
      size_min_sft: 2400,
      urgency: '1_3_months',
      area: 'Dhanmondi',
      city: 'Dhaka',
      lead_notes: 'Consultation for living room acoustic wall panels, false ceiling lighting design, and contemporary balcony garden styling.',
      status: 'active',
    },
    {
      contact_code: 'CT-INT-005',
      full_name: 'Navid Hasan & Partners',
      first_name: 'Navid',
      last_name: 'Hasan',
      company_name: 'Insignia Venture Studio',
      contact_type: 'company',
      primary_phone: '+8801611333222',
      whatsapp: '+8801611333222',
      email: 'navid@insigniastudio.com',
      contact_list: 'Commercial & Office Fitout',
      contact_lists: ['Commercial & Office Fitout'],
      lead_status: 'proposal_sent',
      lead_source: 'LinkedIn',
      looking_for: 'interior',
      preferred_areas: ['Gulshan 1', 'Tejgaon I/A'],
      property_types: ['Commercial Office'],
      budget_min: 3500000,
      budget_max: 6000000,
      size_min_sft: 3500,
      urgency: 'immediate',
      area: 'Gulshan Avenue',
      city: 'Dhaka',
      lead_notes: '3,500 sft tech startup studio fitout. Open-concept workstations, glass partition conference pods, executive lounge and cafeteria.',
      status: 'active',
    },
  ];

  let created = 0;
  let updated = 0;

  for (const item of interiorLeads) {
    const existing = await Contact.findOne({
      where: {
        [Op.or]: [
          { contact_code: item.contact_code },
          { email: item.email },
          { primary_phone: item.primary_phone },
        ],
      },
    });

    if (existing) {
      await existing.update({ ...item, branch_id: branchId });
      updated++;
    } else {
      await Contact.create({ ...item, branch_id: branchId });
      created++;
    }
  }

  console.log(`Interior design contacts seeding complete: ${created} created, ${updated} updated.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
