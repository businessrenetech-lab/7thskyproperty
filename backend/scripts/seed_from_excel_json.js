'use strict';

const fs = require('fs');
const path = require('path');
const sequelize = require('../config/db.config');

const jsonPath = "C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\ee251c9d-eaf2-42f2-b2f4-13f84b4d39e8\\scratch\\parsed_workflows.json".replace(/\\/g, '/');

const VERTICALS = {
  properties: { name: 'Residential Property Purchase', prefix: 'PROP', order: 0 },
  property_care: { name: 'Property Care & Concierge (MAPS)', prefix: 'PCARE', order: 1 },
  leasing: { name: 'Residential Tenancy Management', prefix: 'LEASE', order: 2 },
  removal: { name: 'Removal & Relocation Services', prefix: 'MOVE', order: 3 },
  documentation: { name: 'Property Documentation Support', prefix: 'DOCS', order: 4 },
  nrb: { name: 'NRB Dedicated Services', prefix: 'NRB', order: 5 },
  interior: { name: 'Interior Design', prefix: 'INTR', order: 6 },
  solar: { name: 'Solar & Energy Solutions', prefix: 'SOLAR', order: 7 },
  ac: { name: 'Air Conditioning Solutions', prefix: 'AC', order: 8 },
  water_tank: { name: 'Water Tank Cleaning & Maintenance', prefix: 'WTCM', order: 9 },
  business_registration: { name: 'Business Registration', prefix: 'BREG', order: 10 },
  business_rent: { name: 'Business Rent & Lease', prefix: 'BRENT', order: 11 },
  business_sale: { name: 'Business Sale', prefix: 'BSALE', order: 12 },
  commercial_rent: { name: 'Commercial Rent & Lease', prefix: 'CRENT', order: 13 },
  commercial_sale: { name: 'Commercial Property Sale', prefix: 'CSALE', order: 14 },
  rural_rent: { name: 'Rural Rental', prefix: 'RRENT', order: 15 },
  rural_sale: { name: 'Rural Property Sale', prefix: 'RSALE', order: 16 },
  short_stay: { name: 'Short Term Stay', prefix: 'SSTAY', order: 17 }
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

async function run() {
  console.log('Loading parsed workflows JSON...');
  if (!fs.existsSync(jsonPath)) {
    console.error(`JSON file not found at: ${jsonPath}`);
    process.exit(1);
  }
  
  const parsedData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const now = new Date();
  
  console.log('Authenticating database...');
  await sequelize.authenticate();
  console.log('Database connected.');
  
  const seq = sequelize;
  
  // 1. Ensure all Verticals exist
  for (const [key, vInfo] of Object.entries(VERTICALS)) {
    const [existing] = await seq.query(
      'SELECT id FROM verticals WHERE vertical_key = :key LIMIT 1',
      { replacements: { key } }
    );
    
    if (!existing[0]) {
      console.log(`Inserting vertical: ${vInfo.name} (${key})`);
      await seq.query(
        `INSERT INTO verticals (vertical_key, name, id_prefix, dashboards, config, sort_order, is_active, is_hidden, created_at, updated_at)
         VALUES (:key, :name, :prefix, :dashboards, :config, :order, 1, 0, :now, :now)`,
        {
          replacements: {
            key,
            name: vInfo.name,
            prefix: vInfo.prefix,
            dashboards: JSON.stringify(['Executive', 'Operations', 'Financial', 'Compliance']),
            config: JSON.stringify({}),
            order: vInfo.order,
            now
          }
        }
      );
    } else {
      // Update vertical name if changed
      await seq.query(
        'UPDATE verticals SET name = :name, id_prefix = :prefix, sort_order = :order, updated_at = :now WHERE vertical_key = :key',
        {
          replacements: {
            key,
            name: vInfo.name,
            prefix: vInfo.prefix,
            order: vInfo.order,
            now
          }
        }
      );
    }
  }
  
  // 2. Loop through parsed data and upsert Workflow Templates & Register Definitions
  for (const [vertical_key, data] of Object.entries(parsedData)) {
    console.log(`\nProcessing vertical: ${vertical_key}`);
    
    // Stages mapping
    const stages = data.stages.map((s, i) => ({
      key: slug(s.name),
      name: s.name,
      order: i + 1,
      gate: true,
      checklist: (s.checklist || []).map((item) => ({
        label: typeof item === 'object' ? item.label : item,
        required: typeof item === 'object' ? !!item.required : true,
        detailed_task: typeof item === 'object' ? item.detailed_task || '' : '',
        responsible: typeof item === 'object' ? item.responsible || '' : '',
        evidence_required: typeof item === 'object' ? item.evidence_required || '' : '',
        output: typeof item === 'object' ? item.output || '' : ''
      })),
      required_docs: []
    }));
    
    // Upsert workflow template
    const [existingTpl] = await seq.query(
      'SELECT id FROM workflow_templates WHERE vertical_key = :vk LIMIT 1',
      { replacements: { vk: vertical_key } }
    );
    
    const templateName = VERTICALS[vertical_key] ? VERTICALS[vertical_key].name : `${vertical_key} Template`;
    
    if (existingTpl[0]) {
      console.log(`Updating workflow template for: ${vertical_key}`);
      await seq.query(
        'UPDATE workflow_templates SET name = :name, stages = :stages, updated_at = :now WHERE id = :id',
        {
          replacements: {
            id: existingTpl[0].id,
            name: templateName,
            stages: JSON.stringify(stages),
            now
          }
        }
      );
    } else {
      console.log(`Creating workflow template for: ${vertical_key}`);
      await seq.query(
        `INSERT INTO workflow_templates (vertical_key, name, stages, is_active, created_at, updated_at)
         VALUES (:vk, :name, :stages, 1, :now, :now)`,
        {
          replacements: {
            vk: vertical_key,
            name: templateName,
            stages: JSON.stringify(stages),
            now
          }
        }
      );
    }
    
    // Registers mapping
    for (let i = 0; i < data.registers.length; i++) {
      const reg = data.registers[i];
      const register_key = reg.key;
      const name = reg.name;
      const columns = reg.columns;
      
      const [existingReg] = await seq.query(
        'SELECT id FROM register_definitions WHERE vertical_key = :vk AND register_key = :rk LIMIT 1',
        { replacements: { vk: vertical_key, rk: register_key } }
      );
      
      if (existingReg[0]) {
        console.log(`Updating register definition: ${name} (${register_key})`);
        await seq.query(
          'UPDATE register_definitions SET name = :name, columns = :columns, sort_order = :sort, updated_at = :now WHERE id = :id',
          {
            replacements: {
              id: existingReg[0].id,
              name,
              columns: JSON.stringify(columns),
              sort: i,
              now
            }
          }
        );
      } else {
        console.log(`Creating register definition: ${name} (${register_key})`);
        await seq.query(
          `INSERT INTO register_definitions (vertical_key, register_key, name, columns, sort_order, is_active, created_at, updated_at)
           VALUES (:vk, :rk, :name, :columns, :sort, 1, :now, :now)`,
          {
            replacements: {
              vk: vertical_key,
              rk: register_key,
              name,
              columns: JSON.stringify(columns),
              sort: i,
              now
            }
          }
        );
      }
    }
  }
  
  console.log('\nSeeding completed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
