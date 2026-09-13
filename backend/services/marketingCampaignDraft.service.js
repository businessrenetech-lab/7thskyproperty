'use strict';

// backend/services/marketingCampaignDraft.service.js
//
// Automated Marketing Campaign Generator for Newly Listed Real Estate Properties.
// Crafts luxury responsive HTML email showcases with architectural specs, hero imagery,
// pricing badges, advisor credentials, and direct inspection booking CTAs.

const { Op } = require('sequelize');
const Property = require('../models/Property');
const PropertyMedia = require('../models/PropertyMedia');
const User = require('../models/User');
const Contact = require('../models/Contact');
const MarketingCampaign = require('../models/MarketingCampaign');
const MarketingCampaignRecipient = require('../models/MarketingCampaignRecipient');

/**
 * Format BDT currency with comma separations and crore/lac human readable text.
 */
function formatPrice(val, currency = 'BDT', unit = '') {
  const num = Number(val);
  if (!num || isNaN(num)) return 'Price on Application';
  const formatted = num.toLocaleString('en-BD');
  let label = `৳${formatted}`;
  if (unit) label += ` / ${unit}`;
  return label;
}

/**
 * Clean and truncate plain text.
 */
function cleanText(txt, maxLen = 300) {
  if (!txt) return '';
  const cleaned = txt.replace(/<[^>]*>/g, '').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen) + '...';
}

/**
 * Generate a luxury responsive HTML email showcase for a newly listed property.
 */
function generateListingShowcaseHtml(property, advisor = {}, options = {}) {
  const area = property.area || 'Prime Dhaka';
  const city = property.city || 'Dhaka';
  const fullLoc = [property.address, area, city].filter(Boolean).join(', ');
  const priceDisplay = formatPrice(property.price, property.currency, property.listing_type === 'rent' ? (property.price_unit || 'month') : '');
  const listingTypeLabel = property.listing_type === 'rent' ? 'Exclusive Rental' : 'Prime Sales Listing';
  const heroImage = property.featured_image_url || options.heroImage || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80';

  const advisorName = advisor.name || 'Seventh Sky Residential Advisor';
  const advisorPhone = advisor.phone || '+880 1711-000000';
  const advisorEmail = advisor.email || 'advisory@seventhskyproperty.com';
  const waCleanPhone = advisorPhone.replace(/[^0-9]/g, '');

  // Extract top amenities
  let featuresList = [];
  if (Array.isArray(property.features)) {
    featuresList = property.features.slice(0, 6);
  } else if (typeof property.features === 'string') {
    try {
      const parsed = JSON.parse(property.features);
      if (Array.isArray(parsed)) featuresList = parsed.slice(0, 6);
    } catch {
      featuresList = property.features.split(',').map(s => s.trim()).filter(Boolean).slice(0, 6);
    }
  }

  if (!featuresList.length) {
    featuresList = [
      `Prestigious ${area} Enclave`,
      '24/7 Concierge Security & CCTV',
      'Full Standby Generator Power',
      'High-Speed Modern Elevators',
      'South-Facing Optimal Ventilation',
      'Immediate Ready Possession'
    ];
  }

  const overviewText = cleanText(property.description, 350) || 
    `Seventh Sky Properties is pleased to present this distinguished newly listed property in ${area}. Offering exceptional architectural proportions, superior natural light, and refined finishes, this residence represents an exceptional acquisition for discerning homeowners and astute investors.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>✨ Just Listed: ${property.title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .body-cell { padding: 20px 16px !important; }
      .header-cell { padding: 20px 16px !important; }
      .spec-cell { display: block !important; width: 100% !important; margin-bottom: 8px !important; }
      .btn-cell { display: block !important; width: 100% !important; margin-bottom: 8px !important; }
      .headline-text { font-size: 21px !important; }
      .price-hero { font-size: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <!-- Preheader -->
  <div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Exclusive New Listing: ${property.title} in ${area}. ${property.bedrooms ? property.bedrooms + ' Beds · ' : ''}${priceDisplay}. Book a private walkthrough today.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:24px 8px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
          
          <!-- Top Navy & Gold Brand Header -->
          <tr>
            <td class="header-cell" style="background-color:#002B49;padding:26px 36px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <div style="font-size:11px;font-weight:700;color:#D4AF37;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">
                      ✦ SEVENTH SKY PROPERTIES ✦
                    </div>
                    <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">
                      Private Client Property Advisory
                    </div>
                    <div style="font-size:12px;color:#94a3b8;font-weight:500;margin-top:4px;">
                      Dhaka Luxury Real Estate · Investment Portfolio
                    </div>
                    <div style="width:40px;height:2px;background:#D4AF37;margin:12px auto 0 auto;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Gold VIP Sub-Banner -->
          <tr>
            <td style="background-color:#FAF8F5;border-bottom:1px solid #F3EBDD;padding:10px 24px;text-align:center;">
              <span style="font-size:11px;font-weight:800;color:#8C6D1F;text-transform:uppercase;letter-spacing:1.5px;">
                ✦ JUST LISTED · FIRST-LOOK EXCLUSIVE PREVIEW ✦
              </span>
            </td>
          </tr>

          <!-- Hero Property Image -->
          <tr>
            <td style="padding:0;background-color:#000;">
              <img src="${heroImage}" alt="${property.title}" width="620" style="width:100%;max-width:620px;height:auto;display:block;border-bottom:3px solid #D4AF37;" />
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="body-cell" style="padding:32px 36px;color:#1e293b;font-size:14px;line-height:1.65;">
              
              <!-- Greeting -->
              <p style="font-size:14px;color:#64748b;margin:0 0 14px 0;">
                Dear {{first_name}},
              </p>

              <!-- Category & Location Tag -->
              <div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;">
                <span style="background-color:#e0f2fe;color:#0369a1;font-size:11px;font-weight:800;padding:4px 10px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">
                  ${listingTypeLabel}
                </span>
                <span style="background-color:#f1f5f9;color:#475569;font-size:11px;font-weight:700;padding:4px 10px;border-radius:4px;text-transform:uppercase;">
                  📍 ${area}
                </span>
              </div>

              <!-- Property Headline -->
              <h1 class="headline-text" style="color:#002B49;font-size:23px;font-weight:800;margin:0 0 10px 0;line-height:1.3;letter-spacing:-0.3px;">
                ${property.title}
              </h1>

              <!-- Address subtitle -->
              <p style="margin:0 0 20px 0;font-size:13px;color:#64748b;">
                ${fullLoc}
              </p>

              <!-- Price Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg, #002B49, #004170);border-radius:10px;margin-bottom:24px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <div style="font-size:11px;color:#D4AF37;text-transform:uppercase;letter-spacing:1px;font-weight:700;">
                            ${property.listing_type === 'rent' ? 'Monthly Rental' : 'Asking / Guide Price'}
                          </div>
                          <div class="price-hero" style="font-size:24px;font-weight:800;color:#ffffff;margin-top:2px;">
                            ${priceDisplay}
                          </div>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <span style="background-color:rgba(212,175,55,0.2);color:#D4AF37;border:1px solid #D4AF37;font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;">
                            ${property.is_negotiable ? 'Negotiable' : 'Fixed Price'}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Architectural Specs Grid (4 Columns) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;text-align:center;">
                <tr>
                  <td class="spec-cell" width="25%" style="padding:14px 8px;border-right:1px solid #e2e8f0;">
                    <div style="font-size:16px;">🛏️</div>
                    <div style="font-size:14px;font-weight:800;color:#002B49;margin-top:4px;">${property.bedrooms || '—'} Beds</div>
                    <div style="font-size:10.5px;color:#64748b;text-transform:uppercase;">Bedrooms</div>
                  </td>
                  <td class="spec-cell" width="25%" style="padding:14px 8px;border-right:1px solid #e2e8f0;">
                    <div style="font-size:16px;">🚿</div>
                    <div style="font-size:14px;font-weight:800;color:#002B49;margin-top:4px;">${property.bathrooms || '—'} Baths</div>
                    <div style="font-size:10.5px;color:#64748b;text-transform:uppercase;">Bathrooms</div>
                  </td>
                  <td class="spec-cell" width="25%" style="padding:14px 8px;border-right:1px solid #e2e8f0;">
                    <div style="font-size:16px;">📐</div>
                    <div style="font-size:14px;font-weight:800;color:#002B49;margin-top:4px;">${property.building_size || property.land_size || 'Spacious'}</div>
                    <div style="font-size:10.5px;color:#64748b;text-transform:uppercase;">Built Area</div>
                  </td>
                  <td class="spec-cell" width="25%" style="padding:14px 8px;">
                    <div style="font-size:16px;">🚗</div>
                    <div style="font-size:14px;font-weight:800;color:#002B49;margin-top:4px;">${property.parking || '1'} Bay</div>
                    <div style="font-size:10.5px;color:#64748b;text-transform:uppercase;">Parking</div>
                  </td>
                </tr>
              </table>

              <!-- Property Narrative & Highlights -->
              <h3 style="font-size:15px;font-weight:750;color:#002B49;margin:0 0 10px 0;text-transform:uppercase;letter-spacing:0.5px;">
                Property Overview &amp; Key Highlights
              </h3>
              <p style="font-size:13.5px;line-height:1.7;color:#334155;margin:0 0 16px 0;">
                ${overviewText}
              </p>

              <!-- Feature Bullet Badges -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                ${featuresList.map((f, idx) => {
                  if (idx % 2 === 0) {
                    const nextF = featuresList[idx + 1];
                    return `
                    <tr>
                      <td width="50%" style="padding:5px 8px 5px 0;font-size:12.5px;color:#1e293b;">
                        <span style="color:#D4AF37;font-weight:bold;margin-right:6px;">✔</span> ${f}
                      </td>
                      <td width="50%" style="padding:5px 0 5px 8px;font-size:12.5px;color:#1e293b;">
                        ${nextF ? `<span style="color:#D4AF37;font-weight:bold;margin-right:6px;">✔</span> ${nextF}` : ''}
                      </td>
                    </tr>`;
                  }
                  return '';
                }).join('')}
              </table>

              <!-- Action CTAs -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                <tr>
                  <td class="btn-cell" align="center" style="padding:6px 8px 6px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="border-radius:6px;background-color:#002B49;border:1px solid #002B49;">
                          <a href="{{view_link}}" target="_blank" style="display:block;padding:14px 20px;font-size:13.5px;font-weight:750;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">
                            📅 Book Private Inspection &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  ${waCleanPhone ? `
                  <td class="btn-cell" align="center" style="padding:6px 0 6px 8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="border-radius:6px;background-color:#16a34a;border:1px solid #16a34a;">
                          <a href="https://wa.me/${waCleanPhone}?text=${encodeURIComponent('Hello ' + advisorName + ', I am enquiring about the newly listed property: ' + property.title)}" target="_blank" style="display:block;padding:14px 20px;font-size:13.5px;font-weight:750;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">
                            💬 WhatsApp Advisor &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>` : ''}
                </tr>
              </table>

              <!-- Dedicated Advisor Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAF8F5;border:1px solid #F3EBDD;border-radius:8px;padding:14px;margin-top:28px;">
                <tr>
                  <td width="48" style="vertical-align:top;padding-right:12px;">
                    <div style="width:44px;height:44px;border-radius:50%;background-color:#002B49;color:#D4AF37;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:16px;text-align:center;line-height:44px;">
                      ${advisorName.charAt(0)}
                    </div>
                  </td>
                  <td style="vertical-align:top;">
                    <div style="font-size:11px;font-weight:700;color:#8C6D1F;text-transform:uppercase;">
                      Listing Concierge &amp; Private Advisor
                    </div>
                    <div style="font-size:14px;font-weight:800;color:#002B49;margin-top:2px;">
                      ${advisorName}
                    </div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">
                      Direct: <a href="tel:${advisorPhone}" style="color:#002B49;text-decoration:none;font-weight:600;">${advisorPhone}</a> &nbsp;|&nbsp; 
                      <a href="mailto:${advisorEmail}" style="color:#002B49;text-decoration:none;">${advisorEmail}</a>
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:22px 36px;border-top:1px solid #e2e8f0;text-align:center;font-size:11.5px;color:#64748b;line-height:1.5;">
              <p style="margin:0 0 6px 0;font-weight:700;color:#002B49;">Seventh Sky Property Care Limited</p>
              <p style="margin:0 0 8px 0;">Navana Tower, Gulshan 1, Dhaka 1212, Bangladesh</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">
                This communication is confidential and intended solely for registered clients of Seventh Sky Properties.
                <br/><a href="{{unsubscribe_link}}" style="color:#64748b;text-decoration:underline;">Update notification preferences</a> | <a href="{{unsubscribe_link}}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate plaintext counterpart for email clients without HTML.
 */
function generateListingShowcaseText(property, advisor = {}) {
  const priceDisplay = formatPrice(property.price, property.currency, property.listing_type === 'rent' ? (property.price_unit || 'month') : '');
  const advisorName = advisor.name || 'Seventh Sky Residential Advisor';
  const advisorPhone = advisor.phone || '+880 1711-000000';

  return `SEVENTH SKY PROPERTIES · NEW LISTING EXCLUSIVE

Dear {{first_name}},

We are pleased to introduce our newly listed property in ${property.area || 'Dhaka'}:

PROPERTY: ${property.title}
LOCATION: ${property.address ? property.address + ', ' : ''}${property.area || 'Dhaka'}, ${property.city || 'Bangladesh'}
PRICE: ${priceDisplay}
SPECIFICATIONS: ${property.bedrooms || '—'} Beds | ${property.bathrooms || '—'} Baths | ${property.building_size || property.land_size || 'Spacious'} Built Area

${cleanText(property.description, 280)}

To schedule a private inspection or request the complete investment dossier, please visit:
{{view_link}}

Or contact your dedicated advisor directly:
${advisorName}
Phone / WhatsApp: ${advisorPhone}
Seventh Sky Properties Limited

To unsubscribe: {{unsubscribe_link}}`;
}

/**
 * Automatically create a draft marketing campaign for a newly listed or created property.
 *
 * @param {Property|number} propertyOrId - The property instance or property ID.
 * @param {object} [user] - The creator / logged-in user.
 * @param {object} [options] - Optional flags (e.g. forceRegenerate).
 * @returns {Promise<{ campaign: MarketingCampaign, is_new: boolean, message: string }>}
 */
async function autoDraftListingCampaign(propertyOrId, user = {}, options = {}) {
  try {
    let property = null;
    if (typeof propertyOrId === 'object' && propertyOrId.id) {
      property = propertyOrId;
    } else {
      property = await Property.findByPk(propertyOrId);
    }

    if (!property) {
      return { success: false, error: 'Property not found for campaign drafting.' };
    }

    // Check if an existing draft campaign already exists for this property
    if (!options.forceRegenerate) {
      const existing = await MarketingCampaign.findOne({
        where: {
          property_id: property.id,
          status: 'draft'
        }
      });
      if (existing) {
        return {
          campaign: existing,
          is_new: false,
          message: `Existing draft campaign "${existing.name}" found for this property.`
        };
      }
    }

    // Resolve media if featured image is not set
    let heroImage = property.featured_image_url;
    if (!heroImage) {
      const media = await PropertyMedia.findOne({
        where: { property_id: property.id, media_type: 'image' },
        order: [['sort_order', 'ASC']]
      });
      if (media && media.file_url) {
        heroImage = media.file_url;
      }
    }

    // Resolve Advisor
    let advisor = {
      name: user.name || 'Seventh Sky Residential Advisor',
      phone: user.phone || '+880 1711-000000',
      email: user.email || 'advisory@seventhskyproperty.com'
    };

    if (property.listing_agent_id) {
      const agentUser = await User.findByPk(property.listing_agent_id);
      if (agentUser) {
        advisor = {
          name: agentUser.name,
          phone: agentUser.phone || advisor.phone,
          email: agentUser.email || advisor.email
        };
      }
    }

    // Generate responsive HTML and Plaintext
    const bodyHtml = generateListingShowcaseHtml(property, advisor, { heroImage });
    const bodyText = generateListingShowcaseText(property, advisor);

    // Determine target audience
    const targetType = property.listing_type === 'sale' ? 'buyers' : 'all_contacts';
    const branchId = property.branch_id || 1;

    // Resolve initial audience count
    let recipientCount = 0;
    try {
      if (targetType === 'buyers') {
        recipientCount = await Contact.count({
          where: {
            branch_id: branchId,
            [Op.or]: [
              { tags: { [Op.like]: '%buyer%' } },
              { tags: { [Op.like]: '%investor%' } },
              { is_client: true }
            ]
          }
        });
      } else {
        recipientCount = await Contact.count({
          where: { branch_id: branchId, status: 'active' }
        });
      }
    } catch {
      recipientCount = 0;
    }

    const campaignCode = `CMP-AUTO-${property.property_code ? property.property_code.replace(/[^A-Za-z0-9]/g, '') : property.id}-${Date.now().toString().slice(-4)}`;
    const areaTag = property.area ? `in ${property.area}` : 'Dhaka';

    const campaign = await MarketingCampaign.create({
      branch_id: branchId,
      campaign_code: campaignCode,
      name: `✨ Auto-Draft: ${property.title}`,
      channel: 'email',
      campaign_type: 'new_listing',
      property_id: property.id,
      subject: `✨ Just Listed: ${property.title} ${areaTag}`,
      preheader: `Exclusive first-look preview: ${property.bedrooms ? property.bedrooms + ' Beds · ' : ''}${property.area || 'Dhaka'} luxury residence. Book a private inspection.`,
      body_html: bodyHtml,
      body_text: bodyText,
      target_type: targetType,
      target_filter: { property_id: property.id, area: property.area, category: property.category },
      recipient_count: recipientCount,
      status: 'draft',
      created_by: user.id || property.created_by || 1,
    });

    return {
      campaign,
      is_new: true,
      message: `Auto-drafted luxury marketing campaign created for "${property.title}"!`
    };
  } catch (err) {
    console.error('[autoDraftListingCampaign] Error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  generateListingShowcaseHtml,
  generateListingShowcaseText,
  autoDraftListingCampaign,
  formatPrice,
};
