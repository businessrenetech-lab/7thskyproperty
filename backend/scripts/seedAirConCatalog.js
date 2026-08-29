/**
 * seedAirConCatalog.js — give the Air Conditioning service line a working
 * catalogue by cloning the Water Tank price schedule (vertical water_tank_csa)
 * into vertical air_conditioning_csa. A starting point the operator refines via
 * the Price Schedule screen; codes/prices are carried over so AC quotes work
 * immediately. Idempotent: skips items already present in the AC vertical.
 */
const ServiceItem = require('../models/ServiceItem');

const SRC = 'water_tank_csa';
const DST = 'air_conditioning_csa';

async function run() {
  const src = await ServiceItem.findAll({ where: { vertical: SRC }, raw: true });
  if (!src.length) { console.log(`No ${SRC} catalogue to clone from.`); return; }

  let created = 0; let skipped = 0;
  for (const item of src) {
    const exists = await ServiceItem.findOne({ where: { vertical: DST, code: item.code } });
    if (exists) { skipped++; continue; }
    const { id, createdAt, updatedAt, category_id, parent_id, ...rest } = item;
    await ServiceItem.create({
      ...rest,
      vertical: DST,
      // keep code/name/price/unit/tags so the AC quote + agreement Schedule C work;
      // the operator renames these to AC services from the Price Schedule screen.
    });
    created++;
  }
  console.log(`Air Conditioning catalogue: ${created} items cloned into ${DST}, ${skipped} already present.`);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
