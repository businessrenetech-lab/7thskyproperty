/**
 * appearance.controller.js — admin-wide look settings everyone needs to read.
 *
 * /api/settings is super-admin only, so the button colour lives behind its own
 * read that any signed-in user can call. Stored in system_settings like the
 * rest, under UI_BUTTON_COLOR:
 *
 *   'navy'    one navy for every primary button (the default)
 *   'accent'  each console's own colour
 *   '#rrggbb' a chosen colour
 */
const SystemSetting = require('../models/SystemSetting');
const { asyncHandler } = require('../utils/controllerHelpers');

const KEY = 'UI_BUTTON_COLOR';
const valid = (v) => v === 'navy' || v === 'accent' || /^#[0-9a-f]{6}$/i.test(v || '');

exports.get = asyncHandler(async (req, res) => {
  const row = await SystemSetting.findOne({ where: { setting_key: KEY } });
  const value = valid(row?.setting_value) ? row.setting_value : 'navy';
  res.json({ button_color: value });
});

exports.update = asyncHandler(async (req, res) => {
  const value = String(req.body?.button_color || '').trim();
  if (!valid(value)) return res.status(400).json({ error: "Choose 'navy', 'accent' or a colour like #0D1638." });
  const [row] = await SystemSetting.findOrCreate({
    where: { setting_key: KEY },
    defaults: { setting_value: value, description: 'Primary button colour across the admin', category: 'branding' },
  });
  if (row.setting_value !== value) await row.update({ setting_value: value });
  res.json({ button_color: value });
});
