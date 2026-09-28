/**
 * The rural land record (CRM workbook, Owner Sheet 2).
 *
 * A rural property is identified by its land record — district, upazila, union,
 * village, mouza, khatiyan, dag — not by a street address. `district` already
 * existed; the rest are new. These live on `properties` rather than a side table
 * so the console can filter and search on them, and so Rural Sale inherits them.
 */
const RURAL_LAND_FIELDS = [
  'district', 'upazila', 'union_name', 'village', 'mouza', 'khatiyan', 'dag',
  'land_area_decimal', 'current_use',
];

module.exports = { RURAL_LAND_FIELDS };
