/**
 * Which agreement variant to build.
 *
 * The PM and TM controllers used a residential-or-commercial binary, so a
 * business or rural console silently received a RESIDENTIAL agreement with
 * residential codes (ENV-RPRM-, RPRM-018). Wrong paperwork issued without a
 * warning is worse than a refusal, so an unsupported category now fails with a
 * 400 naming what is missing. Registering a builder is how a console becomes
 * supported.
 */
function resolveAgreementCategory(value, builders = {}) {
  const c = String(value == null || value === '' ? 'residential' : value).toLowerCase().trim();
  if (builders[c]) return { category: c, build: builders[c] };
  const err = new Error(`No agreement builder is available for the '${c}' category. Supported: ${Object.keys(builders).join(', ')}.`);
  err.status = 400;
  throw err;
}

module.exports = { resolveAgreementCategory };
