'use strict';
require('dotenv').config();
const sequelize = require('../config/db.config');
const MarketingTemplate = require('../models/MarketingTemplate');

/**
 * Standard responsive HTML email layout generator for Seventh Sky Property Care.
 * Bulletproof table-based, mobile-first, luxury branding.
 */
function generateEmailHtml({ title, preheader, badge, headline, bodyText, propertyCard, ctaText, ctaUrl, noticeText }) {
  const propertyHtml = propertyCard ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:24px 0;overflow:hidden;">
      ${propertyCard.image ? `
      <tr>
        <td style="padding:0;">
          <img src="${propertyCard.image}" alt="${propertyCard.title || 'Property'}" width="520" style="width:100%;max-width:520px;height:auto;display:block;border-bottom:1px solid #e2e8f0;" />
        </td>
      </tr>` : ''}
      <tr>
        <td style="padding:18px 20px;">
          ${propertyCard.tag ? `<span style="display:inline-block;background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${propertyCard.tag}</span>` : ''}
          <h3 style="margin:4px 0 8px 0;color:#012a4e;font-size:18px;font-weight:700;">${propertyCard.title || 'Exclusive Property Spotlight'}</h3>
          <p style="margin:0 0 12px 0;color:#64748b;font-size:13px;line-height:1.5;">${propertyCard.location || 'Dhaka, Bangladesh'}</p>
          
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
            <tr>
              ${propertyCard.beds ? `<td style="font-size:12px;color:#334155;">🛏️ <b>${propertyCard.beds}</b> Beds</td>` : ''}
              ${propertyCard.baths ? `<td style="font-size:12px;color:#334155;">🚿 <b>${propertyCard.baths}</b> Baths</td>` : ''}
              ${propertyCard.size ? `<td style="font-size:12px;color:#334155;">📐 <b>${propertyCard.size}</b></td>` : ''}
              ${propertyCard.parking ? `<td style="font-size:12px;color:#334155;">🚗 <b>${propertyCard.parking}</b> Parking</td>` : ''}
            </tr>
          </table>

          ${propertyCard.price ? `
          <div style="border-top:1px dashed #cbd5e1;padding-top:10px;margin-top:10px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:#64748b;">Guide Price / Expected Value:</span>
            <span style="font-size:17px;font-weight:800;color:#003768;">${propertyCard.price}</span>
          </div>` : ''}
        </td>
      </tr>
    </table>` : '';

  const ctaButtonHtml = ctaText ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 16px 0;">
      <tr>
        <td align="center" style="border-radius:6px;background-color:#003768;">
          <a href="${ctaUrl || '{{view_link}}'}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
            ${ctaText} &rarr;
          </a>
        </td>
      </tr>
    </table>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .body-cell { padding: 20px 16px !important; }
      .header-cell { padding: 20px 16px !important; }
      .headline-text { font-size: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader || title}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:24px 8px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td class="header-cell" style="background-color:#003768;padding:26px 36px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">Seventh Sky Property Care</div>
                    <div style="font-size:12px;color:#38bdf8;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-top:4px;">Residential Sales &amp; Asset Advisory</div>
                    <div style="width:36px;height:2px;background:#38bdf8;margin:12px auto 0 auto;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="body-cell" style="padding:32px 36px;color:#1e293b;font-size:14px;line-height:1.65;">
              ${badge ? `<div style="margin-bottom:12px;"><span style="background-color:#e0f2fe;color:#0369a1;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.8px;">${badge}</span></div>` : ''}
              
              <h1 class="headline-text" style="color:#012a4e;font-size:22px;font-weight:800;margin:0 0 16px 0;line-height:1.35;letter-spacing:-0.2px;">
                ${headline}
              </h1>

              <div style="color:#334155;font-size:14px;line-height:1.7;">
                ${bodyText}
              </div>

              ${propertyHtml}

              ${ctaButtonHtml}

              ${noticeText ? `
              <div style="margin-top:20px;padding:12px 14px;background:#f8fafc;border-left:3px solid #0284c7;border-radius:4px;font-size:12.5px;color:#475569;">
                ${noticeText}
              </div>` : ''}

              <!-- Sign-off -->
              <div style="margin-top:28px;padding-top:16px;border-top:1px solid #f1f5f9;font-size:13px;color:#475569;">
                <p style="margin:0 0 4px 0;">Warm regards,</p>
                <p style="margin:0;font-weight:700;color:#012a4e;">{{agent_name}}</p>
                <p style="margin:0;color:#64748b;font-size:12px;">Seventh Sky Residential Property Advisor</p>
                <p style="margin:2px 0 0 0;color:#0284c7;font-size:12px;">📞 {{agent_phone}} &nbsp;|&nbsp; ✉️ {{agent_email}}</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:22px 36px;border-top:1px solid #e2e8f0;text-align:center;font-size:11.5px;color:#64748b;line-height:1.5;">
              <p style="margin:0 0 6px 0;font-weight:600;color:#334155;">Seventh Sky Property Care Limited</p>
              <p style="margin:0 0 8px 0;">Level 6, Navana Tower, Gulshan 1, Dhaka 1212, Bangladesh</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">
                You received this advisory as a registered Seventh Sky client or enquiry.
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
 * 20 Prebuilt Templates for Local Markets and Buyer/Seller Engagement
 */
const TEMPLATES_DATA = [
  // ── A. NEW LISTING UPDATES (1 - 5) ──
  {
    template_code: 'TPL-NL-01',
    name: 'Gulshan 2 Luxury Penthouse Debut',
    category: 'new_listing',
    channel: 'any',
    subject: 'Exclusive Debut: Luxury Duplex Penthouse in Gulshan 2 — {{name}}',
    preheader: 'Off-market opportunity: 4,500 sq ft duplex penthouse with private lift and rooftop garden.',
    headline: 'Private Debut: Architectural Masterpiece in Gulshan 2',
    tags: ['luxury', 'gulshan', 'penthouse', 'hni_buyer', 'new_listing'],
    bodyText: `<p>Dear {{name}},</p>
<p>We are delighted to present a newly listed, bespoke residential trophy asset in prime Gulshan 2. Designed for privacy and effortless executive entertaining, this duplex penthouse offers unmatched lake and park panoramas.</p>
<p>Features include a private dedicated elevator, double-height ceiling in the primary formal lounge, imported marble finishes, and 3 secure basement parking bays.</p>`,
    propertyCard: {
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      tag: 'Prime Residential · Off-Market',
      title: 'The Sky Residence · Road 71, Gulshan 2',
      location: 'Gulshan 2, Dhaka',
      beds: '4 Master Suites',
      baths: '5 Baths',
      size: '4,500 sq ft',
      parking: '3 Dedicated',
      price: '৳ 16.50 Crore'
    },
    ctaText: 'Schedule a Private Walkthrough',
    ctaUrl: '{{view_link}}',
    noticeText: 'Private inspections arranged exclusively for qualified buyers with 24-hour advance notice.',
    body_text: `Exclusive Debut: Luxury Duplex Penthouse in Gulshan 2.
Dear {{name}},
Seventh Sky is pleased to present The Sky Residence, Gulshan 2.
- 4,500 sq ft Duplex with private elevator & 3 parking bays
- 4 Master Suites | 5 Baths | Expansive Rooftop Terrace
- Price: ৳ 16.50 Crore
View property details & schedule viewing: {{view_link}}
Contact Advisor: {{agent_phone}}`
  },

  {
    template_code: 'TPL-NL-02',
    name: 'Dhanmondi Lakefront Family Residence',
    category: 'new_listing',
    channel: 'any',
    subject: 'New Listing: Peaceful Lakefront Apartment in Dhanmondi — {{name}}',
    preheader: 'South-facing 2,800 sq ft residence on Road 8/A with uninterrupted Dhanmondi Lake vistas.',
    headline: 'Serene Lakefront Living in Historic Dhanmondi',
    tags: ['dhanmondi', 'lakefront', 'family', 'south_facing', 'new_listing'],
    bodyText: `<p>Dear {{name}},</p>
<p>Finding an authentic south-facing lake-view residence in Dhanmondi is increasingly rare. Seventh Sky has just been exclusively mandated to represent this pristine 2,800 sq ft residence on Road 8/A.</p>
<p>Boasting panoramic natural breeze, 3 expansive balconies overlooking Dhanmondi Lake, and walking distance to reputable schools and dining, it represents the ideal Dhaka family sanctuary.</p>`,
    propertyCard: {
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
      tag: 'Residential Sale · South Facing',
      title: 'Lake Breeze Haven · Road 8/A, Dhanmondi',
      location: 'Dhanmondi R/A, Dhaka',
      beds: '3 Beds',
      baths: '4 Baths',
      size: '2,800 sq ft',
      parking: '2 Dedicated',
      price: '৳ 5.80 Crore'
    },
    ctaText: 'View Photos & Floor Plan',
    ctaUrl: '{{view_link}}',
    noticeText: 'RAJUK plan approved, mutation complete, single-owner clean chain of title verified by Seventh Sky Legal.',
    body_text: `New Listing: Serene Lakefront Apartment in Dhanmondi 8/A.
Dear {{name}},
Rare south-facing 2,800 sq ft family home with unobstructed lake views.
- 3 Beds | 4 Baths | 2 Car Parks | 3 Lake Balconies
- Guide Price: ৳ 5.80 Crore (Negotiable)
Explore floor plans & photos: {{view_link}}
Call Seventh Sky: {{agent_phone}}`
  },

  {
    template_code: 'TPL-NL-03',
    name: 'Uttara Modern Smart Apartment',
    category: 'new_listing',
    channel: 'any',
    subject: 'Fresh to Market: Modern Smart Home in Uttara Sector 4 — {{name}}',
    preheader: 'Just 5 minutes from Metro Rail station. 3-bed smart apartment with full generator backup.',
    headline: 'Contemporary Connectivity: Smart Living in Uttara',
    tags: ['uttara', 'metro_rail', 'smart_home', 'modern', 'new_listing'],
    bodyText: `<p>Dear {{name}},</p>
<p>Convenience and metropolitan transit connectivity unite in this newly completed smart apartment in Sector 4, Uttara. Positioned minutes from the Uttara Center Metro Station and Hazrat Shahjalal International Airport, daily commutes become effortless.</p>
<p>The unit includes voice-controlled smart ambient lighting, biometric entry locks, 100% generator power backup, and modern modular kitchen cabinetry.</p>`,
    propertyCard: {
      image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
      tag: 'New Completion · Transit Adjacent',
      title: 'Metroline Smart Flats · Sector 4, Uttara',
      location: 'Uttara Model Town, Dhaka',
      beds: '3 Beds',
      baths: '3 Baths',
      size: '1,950 sq ft',
      parking: '1 Dedicated',
      price: '৳ 2.65 Crore'
    },
    ctaText: 'Request Full Brochure',
    ctaUrl: '{{view_link}}',
    noticeText: 'Ready for immediate interior handover. Bank home loan pre-approved with BRAC Bank & EBL.',
    body_text: `Fresh Listing: Modern Smart Apartment in Uttara Sector 4.
Hi {{name}},
Just 5 minutes from Uttara Metro Station:
- 1,950 sq ft | 3 Beds | 3 Baths | 100% Full Power Backup
- Biometric Smart Locks & Modern Modular Kitchen
- Price: ৳ 2.65 Crore
View full spec sheet: {{view_link}}
Phone: {{agent_phone}}`
  },

  {
    template_code: 'TPL-NL-04',
    name: 'Bashundhara R/A Green Duplex Villa',
    category: 'new_listing',
    channel: 'any',
    subject: 'Architectural Duplex Villa on 5 Katha: Bashundhara Block I — {{name}}',
    preheader: 'Independent luxury duplex with private manicured lawn, rooftop pergola, and 4-car parking.',
    headline: 'Independent Villa Living in Bashundhara R/A',
    tags: ['bashundhara', 'duplex', 'villa', 'independent_house', 'new_listing'],
    bodyText: `<p>Dear {{name}},</p>
<p>For discerning buyers who value land ownership and independent sanctuary, Seventh Sky is proud to introduce an architectural 5-Katha duplex villa in Bashundhara R/A (Block I).</p>
<p>Features 4,800 sq ft of built-up space across two levels, private perimeter security, manicured lawn, imported fittings, and a rooftop entertainment lounge.</p>`,
    propertyCard: {
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
      tag: 'Independent Villa · Freehold Land',
      title: 'The Green Haven Villa · Block I, Bashundhara',
      location: 'Bashundhara R/A, Dhaka',
      beds: '5 En-Suite Bedrooms',
      baths: '6 Baths',
      size: '5 Katha Land (4,800 sq ft Built)',
      parking: '4 Cars Secure',
      price: '৳ 11.20 Crore'
    },
    ctaText: 'Book an Exclusive Site Visit',
    ctaUrl: '{{view_link}}',
    noticeText: 'Freehold title with registered deed, mutation, and Bashundhara clearance in hand.',
    body_text: `Exclusive Villa: 5 Katha Duplex in Bashundhara Block I.
Dear {{name}},
Discover independent luxury living:
- 5 Katha Plot | 4,800 sq ft Duplex Villa
- 5 En-Suite Bedrooms | Private Lawn | 4-Car Parking
- Asking Price: ৳ 11.20 Crore
Schedule your personal inspection: {{view_link}}
Call Seventh Sky: {{agent_phone}}`
  },

  {
    template_code: 'TPL-NL-05',
    name: 'Commercial & Mixed-Use Investment Floor',
    category: 'new_listing',
    channel: 'any',
    subject: 'Commercial Investment Opportunity: 8.5% Net Rental Yield in Tejgaon — {{name}}',
    preheader: 'Corporate-tenanted commercial floor in prime Tejgaon Commercial Area with long lease.',
    headline: 'High-Yield Commercial Real Estate Asset in Dhaka',
    tags: ['commercial', 'investment', 'rental_yield', 'tejgaon', 'corporate'],
    bodyText: `<p>Dear {{name}},</p>
<p>Generating reliable, index-linked rental cash flow remains one of the safest wealth preservation hedges in Bangladesh. We have secured an institutional commercial office floor in an A-grade glass facade tower in Tejgaon.</p>
<p>Currently leased to a multinational tech firm with 4 years remaining on the lease agreement, delivering an attractive net cash-on-cash yield of 8.5% annually.</p>`,
    propertyCard: {
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      tag: 'Tenanted Commercial · High ROI',
      title: 'Apex Corporate Tower · Tejgaon Link Road',
      location: 'Tejgaon I/A, Dhaka',
      beds: 'Open Plan Office Floor',
      baths: 'Executive Washrooms',
      size: '5,200 sq ft',
      parking: '6 Underground Slots',
      price: '৳ 14.50 Crore (Yield: 8.5%)'
    },
    ctaText: 'Download Financial Prospectus',
    ctaUrl: '{{view_link}}',
    noticeText: 'Full corporate lease agreement, tenant audit, and monthly rental collection history available under NDA.',
    body_text: `Commercial Investment: 8.5% Net Yield in Tejgaon Link Road.
Dear {{name}},
A-Grade commercial office floor with AAA multinational corporate tenant in place:
- 5,200 sq ft | 6 Basement Car Parks | 4-Year Active Lease
- Annual Rental Income: ৳ 1.23 Crore (8.5% Net Yield)
- Price: ৳ 14.50 Crore
Download prospectus: {{view_link}}
Enquire: {{agent_phone}}`
  },

  // ── B. SALES & MARKET UPDATES (6 - 10) ──
  {
    template_code: 'TPL-SU-01',
    name: 'Quarterly Dhaka Prime Property Market Report',
    category: 'market_report',
    channel: 'any',
    subject: 'Dhaka Real Estate Quarterly Market Intelligence Report — {{name}}',
    preheader: 'Capital appreciation, pricing per sq ft in Gulshan, Banani, Dhanmondi, and Uttara.',
    headline: 'Dhaka Prime Real Estate Market Outlook & Trends',
    tags: ['market_report', 'analytics', 'capital_growth', 'investment_insights'],
    bodyText: `<p>Dear {{name}},</p>
<p>Real estate remains the benchmark asset class for wealth preservation in Bangladesh. In our newly released Quarterly Intelligence Report, our advisory desk analyzes transaction volumes, land price inflation, and shifting buyer preferences across Dhaka's key zones.</p>
<p><b>Key Highlights from the Report:</b></p>
<ul>
  <li><b>Gulshan &amp; Banani:</b> Capital values rose by 9.2% year-on-year, driven by scarce land supply.</li>
  <li><b>Dhanmondi:</b> Premium lakefront and south-facing residences commanded a 14% premium over standard stock.</li>
  <li><b>Purbachal &amp; Expressway:</b> Surge in demand for weekend residences and gated plotted communities.</li>
</ul>`,
    propertyCard: null,
    ctaText: 'Read Full Quarterly Market Report',
    ctaUrl: '{{view_link}}',
    noticeText: 'Prepared by Seventh Sky Property Care Research & Valuation Desk.',
    body_text: `Dhaka Prime Property Market Report 2026.
Dear {{name}},
Seventh Sky Research has published our quarterly real estate intelligence:
- Gulshan/Banani capital appreciation: +9.2% YoY
- Prime Dhanmondi lake-facing units holding historic value
- Purbachal corridor experiencing highest growth velocity
Read the full complimentary report: {{view_link}}
Questions? Contact your advisor: {{agent_phone}}`
  },

  {
    template_code: 'TPL-SU-02',
    name: 'Urgent Price Reduction / Motivated Seller Alert',
    category: 'sales_update',
    channel: 'any',
    subject: 'Price Reduction Notice: Banani Road 11 Luxury Flat — {{name}}',
    preheader: 'Price reduced by ৳ 45 Lac for a limited 10-day window due to motivated seller relocation.',
    headline: 'Time-Sensitive Opportunity: Motivated Seller Price Adjustment',
    tags: ['price_reduction', 'deal', 'banani', 'urgent', 'buyer_alert'],
    bodyText: `<p>Dear {{name}},</p>
<p>We are notifying our registered VIP buyers of an immediate price reduction on one of our premier residential properties in Banani (Block D).</p>
<p>Due to the owner's overseas relocation deadline, the asking price has been adjusted downwards from <b>৳ 4.65 Crore</b> to <b>৳ 4.20 Crore</b> for contracts exchanged within the next 10 business days.</p>`,
    propertyCard: {
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      tag: 'Urgent Opportunity · Price Reduced',
      title: 'Banani Block D Executive Residence',
      location: 'Banani, Dhaka',
      beds: '3 Beds',
      baths: '4 Baths',
      size: '2,350 sq ft',
      parking: '2 Cars',
      price: '৳ 4.20 Crore (Was ৳ 4.65 Cr)'
    },
    ctaText: 'Lock In Priority Viewing Slot',
    ctaUrl: '{{view_link}}',
    noticeText: 'Offers reviewed on a first-come, first-evaluated basis. Clear title documents ready for immediate registry.',
    body_text: `Price Reduction Alert: Banani Block D Luxury Apartment.
Dear {{name}},
Price dropped from ৳ 4.65 Cr to ৳ 4.20 Cr (Save ৳ 45 Lac):
- 2,350 sq ft | 3 Beds | 4 Baths | 2 Car Parking
- Motivated owner relocating abroad. Quick transaction required.
View photos & schedule viewing: {{view_link}}
Urgent Hotline: {{agent_phone}}`
  },

  {
    template_code: 'TPL-SU-03',
    name: 'Weekend VIP Open House & Private Preview',
    category: 'sales_update',
    channel: 'any',
    subject: 'Invitation: VIP Open House Weekend in Baridhara Diplomatic Zone — {{name}}',
    preheader: 'Exclusive walkthrough of 2 newly completed diplomatic residences this Saturday 11 AM - 4 PM.',
    headline: 'You Are Invited: Private Property Preview in Baridhara',
    tags: ['open_house', 'baridhara', 'vip_invitation', 'private_preview'],
    bodyText: `<p>Dear {{name}},</p>
<p>Seventh Sky Property Care cordially invites you to our private weekend Open House showcase in the Baridhara Diplomatic Enclave.</p>
<p>Join our senior advisory partners for a curated walkthrough of two freshly commissioned ambassadorial-standard apartments. Refreshments and private consultations will be provided.</p>
<p><b>Date:</b> This Saturday &amp; Sunday<br/><b>Time:</b> 11:00 AM &ndash; 4:30 PM<br/><b>Location:</b> Park Road, Baridhara Diplomatic Zone, Dhaka</p>`,
    propertyCard: {
      image: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80',
      tag: 'Open House Showcase · Baridhara',
      title: 'The Diplomat Residences · Park Road',
      location: 'Baridhara Diplomatic Zone, Dhaka',
      beds: '4 Master En-Suites',
      baths: '5 Baths',
      size: '3,850 sq ft',
      parking: '3 Parking Slots',
      price: 'From ৳ 12.80 Crore'
    },
    ctaText: 'RSVP for Open House Access',
    ctaUrl: '{{view_link}}',
    noticeText: 'Due to Baridhara diplomatic security protocols, guest names and vehicle numbers must be registered in advance.',
    body_text: `VIP Open House Invitation: Baridhara Diplomatic Zone.
Dear {{name}},
Join Seventh Sky this Saturday 11 AM - 4 PM:
- Exclusive preview of 3,850 sq ft Diplomatic Residences
- Park Road, Baridhara Enclave
- High-security zone, ambassadorial quality
RSVP to receive gate security pass: {{view_link}}
Contact: {{agent_phone}}`
  },

  {
    template_code: 'TPL-SU-04',
    name: 'Home Loan & Bank Financing Guide 2026',
    category: 'sales_update',
    channel: 'any',
    subject: 'Preferential Home Loan Rates for Seventh Sky Buyers — {{name}}',
    preheader: 'Exclusive 8.25% mortgage interest rates and express approval with partner banks.',
    headline: 'Smart Financing: Premium Home Loan Solutions',
    tags: ['home_loan', 'financing', 'bank_rates', 'buyer_advisory'],
    bodyText: `<p>Dear {{name}},</p>
<p>Securing the right mortgage structuring can save millions of Taka over the lifespan of a residential investment. Seventh Sky Property Care has partnered with leading financial institutions (including BRAC Bank, Standard Chartered, and DBH) to offer our clients exclusive terms.</p>
<p><b>Your Exclusive Privileges:</b></p>
<ul>
  <li>Special home loan interest rates starting from <b>8.25% p.a.</b></li>
  <li>Fast-track legal vetting and valuation approval within 72 hours</li>
  <li>Financing up to 70% of total property valuation with flexible tenures up to 25 years</li>
</ul>`,
    propertyCard: null,
    ctaText: 'Calculate Your Monthly Loan Instalment',
    ctaUrl: '{{view_link}}',
    noticeText: 'Available for salaried professionals, business owners, and non-resident Bangladeshis (NRBs).',
    body_text: `Preferential Home Loan Rates for Seventh Sky Clients.
Dear {{name}},
Looking to finance your dream property in Dhaka?
- Home loan rates starting from 8.25% p.a.
- Express approval within 72 hours via our partner banks
- Up to 70% financing for local & NRB buyers
Calculate your monthly EMI & check eligibility: {{view_link}}
Financing Desk: {{agent_phone}}`
  },

  {
    template_code: 'TPL-SU-05',
    name: 'Infrastructure Corridor Alert: Metro Rail & Purbachal Expressway',
    category: 'market_report',
    channel: 'any',
    subject: 'Investment Alert: Capital Boom Along Purbachal 300 Feet Corridor — {{name}}',
    preheader: 'How the 300-ft Expressway and Metro Line 1 are driving 18% annual capital appreciation.',
    headline: 'Emerging Megaprojects: Where Dhaka Real Estate is Heading',
    tags: ['purbachal', 'expressway', 'infrastructure', 'metro_rail', 'investment'],
    bodyText: `<p>Dear {{name}},</p>
<p>Infrastructure is the single largest determinant of real estate value appreciation. Over the past 24 months, properties adjacent to the 300-Feet Purbachal Expressway and the upcoming MRT Line 1 stations have outpaced central city growth.</p>
<p>We have curated an exclusive portfolio of residential apartments, commercial plots, and gated community villas ready for capital acquisition before secondary phase completion.</p>`,
    propertyCard: null,
    ctaText: 'Explore Purbachal Corridor Listings',
    ctaUrl: '{{view_link}}',
    noticeText: 'Includes vetted RAJUK plots and developer projects with verified layout approvals.',
    body_text: `Investment Alert: Purbachal 300 Feet Corridor Growth.
Dear {{name}},
Infrastructure is driving up to 18% annual capital appreciation along the 300-ft expressway and upcoming MRT Line 1.
Seventh Sky has vetted key high-potential residential & commercial opportunities.
Explore verified listings: {{view_link}}
Consult our Investment Desk: {{agent_phone}}`
  },

  // ── C. SOLD & SUCCESS UPDATES (11 - 14) ──
  {
    template_code: 'TPL-SO-01',
    name: 'Just Sold in Record Time — Gulshan 2',
    category: 'sold_update',
    channel: 'any',
    subject: 'Success Story: Gulshan 2 Luxury Residence Sold in Just 14 Days — {{name}}',
    preheader: 'Full asking price achieved through Seventh Sky’s private network of vetted buyers.',
    headline: 'Transaction Milestone: Another Record Sale in Gulshan 2',
    tags: ['just_sold', 'gulshan', 'success_story', 'seller_confidence'],
    bodyText: `<p>Dear {{name}},</p>
<p>We are delighted to announce the successful sale of <b>The Grand Vista</b> on Road 54, Gulshan 2. Through our targeted multi-channel marketing campaign and private buyer register, contracts were exchanged in just 14 days from listing.</p>
<p>This transaction achieved 100% of the vendor's target valuation, demonstrating the strong liquidity and buyer appetite Seventh Sky commands for top-tier properties.</p>`,
    propertyCard: {
      image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
      tag: 'TRANSACTION COMPLETED · SOLD',
      title: 'The Grand Vista · Road 54, Gulshan 2',
      location: 'Gulshan 2, Dhaka',
      beds: '4 Beds',
      baths: '5 Baths',
      size: '3,600 sq ft',
      parking: '2 Cars',
      price: 'SOLD AT ৳ 11.80 Crore'
    },
    ctaText: 'Discover What Your Property is Worth',
    ctaUrl: '{{view_link}}',
    noticeText: 'Thinking of selling or repositioning your Dhaka real estate portfolio? Speak to our sales directors.',
    body_text: `Just Sold in Gulshan 2 in 14 Days!
Dear {{name}},
Seventh Sky Property Care has successfully concluded the sale of The Grand Vista, Road 54, Gulshan 2 at ৳ 11.80 Crore.
We have 8 pre-qualified buyers currently seeking similar 3-4 bed residences in Gulshan and Banani.
Request a confidential appraisal for your home: {{view_link}}
Call: {{agent_phone}}`
  },

  {
    template_code: 'TPL-SO-02',
    name: 'Record-Breaking Sale Milestone in Banani',
    category: 'sold_update',
    channel: 'any',
    subject: 'Record Milestone Achieved: Banani Commercial & Residential Asset Sold — {{name}}',
    preheader: 'Setting a new price-per-square-foot benchmark in Banani Block E.',
    headline: 'Setting New Benchmarks in Banani Real Estate',
    tags: ['just_sold', 'banani', 'benchmark', 'social_proof'],
    bodyText: `<p>Dear {{name}},</p>
<p>Seventh Sky Property Care has officially closed another benchmark transaction in Banani Block E, achieving the highest recorded price per square foot in the sector this fiscal quarter.</p>
<p>Our tailored staging, professional drone cinematography, and confidential buyer negotiation ensured a frictionless closing with zero price attrition.</p>`,
    propertyCard: null,
    ctaText: 'See Our Recent Sales Track Record',
    ctaUrl: '{{view_link}}',
    noticeText: 'All client identity and financial settlement data strictly maintained under confidentiality agreements.',
    body_text: `Banani Sales Milestone Achieved!
Dear {{name}},
Seventh Sky has completed another benchmark sale in Banani Block E, setting a new price-per-sq-ft record.
Looking to achieve maximum value for your residential or commercial asset?
View our closing portfolio: {{view_link}}
Contact: {{agent_phone}}`
  },

  {
    template_code: 'TPL-SO-03',
    name: 'Off-Market Confidential Transaction Completed',
    category: 'sold_update',
    channel: 'any',
    subject: 'Confidential Closing: High-Value Residence Sold Off-Market — {{name}}',
    preheader: 'Total privacy maintained. Handled through direct private client matching.',
    headline: 'Discretion, Precision, Results: Off-Market Sale Completed',
    tags: ['off_market', 'confidential', 'private_sale', 'discretion'],
    bodyText: `<p>Dear {{name}},</p>
<p>Many of Bangladesh's most distinguished property transactions never appear on public classifieds or social media. Discretion, family privacy, and security are paramount.</p>
<p>This week, Seventh Sky successfully closed the off-market acquisition of a 4,200 sq ft luxury residence in Central Dhaka, connecting the vendor directly with an institutional diaspora buyer in under three weeks.</p>`,
    propertyCard: null,
    ctaText: 'Register for Off-Market Opportunities',
    ctaUrl: '{{view_link}}',
    noticeText: 'Both buyers and sellers can request confidential off-market representation with our leadership team.',
    body_text: `Confidential Off-Market Transaction Closed.
Dear {{name}},
Seventh Sky has successfully completed another private, non-public real estate acquisition in central Dhaka.
Whether you wish to sell without public publicity or acquire unlisted trophy homes:
Join our Private Client Register: {{view_link}}
Director Hotline: {{agent_phone}}`
  },

  {
    template_code: 'TPL-SO-04',
    name: 'Just Sold in Uttara — 15 Qualified Waiting Buyers',
    category: 'sold_update',
    channel: 'any',
    subject: 'Just Sold in Uttara Sector 3: We Have 15 Qualified Buyers Waiting — {{name}}',
    preheader: 'Following our recent sale in Sector 3, we have vetted buyers seeking 3-4 bed apartments in Uttara.',
    headline: 'Do You Own an Apartment in Uttara? Buyers Are Waiting',
    tags: ['uttara', 'waiting_buyers', 'seller_lead', 'just_sold'],
    bodyText: `<p>Dear {{name}},</p>
<p>Following our recent sale of a 3-bedroom apartment on Road 7, Uttara Sector 3, we received over 22 qualified enquiries. With only one apartment available, <b>15 pre-approved buyers missed out</b> and are actively seeking similar homes.</p>
<p>If you own an apartment or floor in Uttara (Sectors 1 to 14) and have considered selling, you can capitalize on this immediate buyer pool with zero downtime.</p>`,
    propertyCard: null,
    ctaText: 'Request Free Valuation for Your Uttara Property',
    ctaUrl: '{{view_link}}',
    noticeText: 'We can match your property with waiting buyers privately without public signage or open viewings.',
    body_text: `Sold in Uttara Sector 3 — 15 Pre-Approved Buyers Missed Out!
Dear {{name}},
We have 15 qualified buyers urgently looking for 3 & 4-bed apartments in Uttara (Sectors 1 - 14).
If you are considering selling, we have buyers ready to make immediate offers.
Get a free valuation: {{view_link}}
Call Seventh Sky Uttara Team: {{agent_phone}}`
  },

  // ── D. BUYER ENGAGEMENT & NURTURING (15 - 17) ──
  {
    template_code: 'TPL-BN-01',
    name: 'Personalized Property Match Recommendation',
    category: 'buyer_nurture',
    channel: 'any',
    subject: 'Handpicked Property Matches for {{name}} in Dhaka',
    preheader: 'Based on your search criteria, our team has curated 3 prime properties matching your wishlist.',
    headline: 'Curated Especially For You: Tailored Property Portfolio',
    tags: ['buyer_nurture', 'curated_matches', 'personalized', 'hot_leads'],
    bodyText: `<p>Dear {{name}},</p>
<p>We have updated our internal registry with newly vetted properties matching your preferred zones, budget bracket, and layout requirements.</p>
<p>Rather than sending generic listings, your personal Seventh Sky advisor has handpicked 3 standout homes offering superior build quality, prime orientation, and clean legal titles.</p>`,
    propertyCard: {
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      tag: 'Top Recommended Match',
      title: 'The Parkview Residence · Prime Location',
      location: 'Gulshan / Banani Corridor, Dhaka',
      beds: '3 & 4 Bed Options',
      baths: '4 En-Suite',
      size: '2,400 – 3,200 sq ft',
      parking: '2 Dedicated',
      price: 'Starting from ৳ 4.50 Crore'
    },
    ctaText: 'View Your Complete Curated Shortlist',
    ctaUrl: '{{view_link}}',
    noticeText: 'Would you like to adjust your search parameters? Simply reply to this email or contact your advisor.',
    body_text: `Curated Property Recommendations for {{name}}.
Hello {{name}},
Your Seventh Sky advisor has selected 3 vetted properties matching your specifications in Dhaka.
View your curated shortlist and floor plans: {{view_link}}
To schedule viewings this week, call your advisor at: {{agent_phone}}`
  },

  {
    template_code: 'TPL-BN-02',
    name: 'First-Time Buyer Checklist & Legal Due Diligence',
    category: 'buyer_nurture',
    channel: 'any',
    subject: 'Essential Real Estate Due Diligence Checklist for Dhaka Buyers — {{name}}',
    preheader: 'How to verify CS, SA, RS, BS Khatians, RAJUK approvals, and avoid common legal pitfalls.',
    headline: 'Buy with Absolute Peace of Mind: The Due Diligence Guide',
    tags: ['buyer_education', 'due_diligence', 'legal', 'khatian', 'rajuk'],
    bodyText: `<p>Dear {{name}},</p>
<p>Buying property in Bangladesh should be a joyful milestone, not a stressful legal maze. At Seventh Sky Property Care, every property we represent undergoes our rigorous <b>24-Point Legal Due Diligence Audit</b>.</p>
<p><b>5 Critical Things to Verify Before Paying Any Advance:</b></p>
<ol>
  <li>Chain of title continuity from CS to RS to BS Khatian.</li>
  <li>Up-to-date Land Development Tax (Dakhila) &amp; City Corporation mutation.</li>
  <li>RAJUK approved architectural plan vs as-built structural verification.</li>
  <li>Clear Non-Encumbrance Certificate (NEC) from the Sub-Registry Office.</li>
  <li>Bank loan clearance / mortgage lien verification if applicable.</li>
</ol>`,
    propertyCard: null,
    ctaText: 'Download Complete Legal Due Diligence Checklist',
    ctaUrl: '{{view_link}}',
    noticeText: 'Seventh Sky provides complimentary title verification for all agreements managed through our platform.',
    body_text: `Essential Property Due Diligence Guide for Dhaka Buyers.
Dear {{name}},
Avoid costly mistakes when purchasing property in Bangladesh.
Check our 24-point legal due diligence guide:
- Verifying CS, SA, RS, BS Khatians & Mutation
- RAJUK approval compliance
- Sub-registry Non-Encumbrance Certificates
Download the free guide: {{view_link}}
Speak with our legal advisory desk: {{agent_phone}}`
  },

  {
    template_code: 'TPL-BN-03',
    name: 'Inactive Buyer Re-Engagement ("Still searching?")',
    category: 'buyer_nurture',
    channel: 'any',
    subject: 'Are you still looking for a property in Dhaka, {{name}}?',
    preheader: 'We have updated our inventory with 18 newly listed apartments across Gulshan, Banani, and Dhanmondi.',
    headline: 'Quick Check-in on Your Dhaka Home Search',
    tags: ['re_engagement', 'buyer_nurture', 'check_in', 'warm_lead'],
    bodyText: `<p>Dear {{name}},</p>
<p>We noticed it has been a little while since we last spoke regarding your property search in Dhaka. The market has been active, and several brand-new listings have arrived in our catalog this month.</p>
<p>Are you still actively looking to purchase, or have your timeline or requirements shifted? Let us know with one click below so we can keep our service tailored to you.</p>`,
    propertyCard: null,
    ctaText: 'View Fresh Listings Available This Week',
    ctaUrl: '{{view_link}}',
    noticeText: 'Reply directly to this email with any specific requirements (area, budget, bedrooms) and we will send matching options.',
    body_text: `Are you still searching for a home in Dhaka, {{name}}?
Hi {{name}},
Just checking in from Seventh Sky Property Care. Several fresh apartments have arrived in Gulshan, Banani, Dhanmondi, and Uttara this month.
Are you still looking, or have your requirements changed?
Browse new arrivals: {{view_link}}
Or reply to chat with {{agent_name}}: {{agent_phone}}`
  },

  // ── E. SELLER & OWNER ENGAGEMENT (18 - 20) ──
  {
    template_code: 'TPL-SE-01',
    name: 'Complimentary 2026 Property Valuation & Market Appraisal',
    category: 'seller_engagement',
    channel: 'any',
    subject: 'What is your Dhaka property worth in 2026? — {{name}}',
    preheader: 'Complimentary, data-backed professional market appraisal by Seventh Sky valuation consultants.',
    headline: 'Discover the True Current Market Value of Your Asset',
    tags: ['valuation', 'market_appraisal', 'seller_lead', 'property_owner'],
    bodyText: `<p>Dear {{name}},</p>
<p>With significant infrastructure upgrades and changing demand dynamics across Dhaka, property valuations have shifted considerably over the past 12 months.</p>
<p>Whether you are considering selling, upgrading, refinancing, or simply assessing your net worth, Seventh Sky provides a <b>complimentary, confidential Market Valuation Report</b> for your residential apartment, building, or land.</p>`,
    propertyCard: null,
    ctaText: 'Request Your Free Property Appraisal',
    ctaUrl: '{{view_link}}',
    noticeText: 'Includes recent comparable neighborhood sales, current price per sq ft analysis, and rental yield forecast.',
    body_text: `What is your property worth in today's Dhaka market?
Dear {{name}},
Curious about the 2026 valuation of your apartment or land?
Seventh Sky provides complimentary, confidential market appraisals backed by real transaction data.
Request your free valuation report: {{view_link}}
Or speak with our Senior Appraiser: {{agent_phone}}`
  },

  {
    template_code: 'TPL-SE-02',
    name: '5 Reasons Properties Linger on the Market & How We Fix Them',
    category: 'seller_engagement',
    channel: 'any',
    subject: 'Why Some Dhaka Properties Take Months to Sell — {{name}}',
    preheader: 'The 5 most common mistakes property owners make when listing, and how to avoid them.',
    headline: 'Maximize Sale Value & Minimize Days on Market',
    tags: ['seller_tips', 'how_to_sell', 'staging', 'pricing_strategy'],
    bodyText: `<p>Dear {{name}},</p>
<p>When a property sits on the market for 6 months without qualified offers, buyers begin to ask: <i>"What is wrong with it?"</i> In reality, the property itself is often fine &mdash; it is the go-to-market strategy that failed.</p>
<p><b>The 5 Common Traps We Solve for Vendors:</b></p>
<ol>
  <li><b>Emotional overpricing:</b> Listing above fair market value scares off active pre-approved buyers in weeks 1&ndash;3.</li>
  <li><b>Poor visual presentation:</b> Smartphone photos and cluttered rooms reduce online clicks by up to 60%.</li>
  <li><b>Unverified paperwork:</b> Missing mutation or delayed documents stall deals during buyer due diligence.</li>
  <li><b>Limited marketing reach:</b> Relying solely on word-of-mouth or single classified portals.</li>
  <li><b>Unqualified viewings:</b> Wasting vendor time with casual lookers instead of pre-vetted decision makers.</li>
</ol>`,
    propertyCard: null,
    ctaText: 'Speak to a Seventh Sky Sales Strategist',
    ctaUrl: '{{view_link}}',
    noticeText: 'Seventh Sky properties average 38 days to exchange with a 98.4% target price realization.',
    body_text: `Why Some Properties Take Months to Sell in Dhaka.
Dear {{name}},
Selling property requires the right strategy:
- Overcoming overpricing traps
- Professional architectural staging & media
- Reaching verified buyers across Bangladesh & the NRB diaspora
Read our guide on maximizing your property's value: {{view_link}}
Consult our team: {{agent_phone}}`
  },

  {
    template_code: 'TPL-SE-03',
    name: 'NRB Diaspora Exclusive: Remote Property Asset Management & Sale',
    category: 'seller_engagement',
    channel: 'any',
    subject: 'NRB Property Management & Hassle-Free Selling from Abroad — {{name}}',
    preheader: 'Managing or selling property in Bangladesh while living in UK, USA, Canada, UAE, or Australia.',
    headline: 'Expatriate & NRB Property Advisory: Complete Peace of Mind',
    tags: ['nrb', 'diaspora', 'remote_selling', 'power_of_attorney', 'asset_care'],
    bodyText: `<p>Dear {{name}},</p>
<p>For Non-Resident Bangladeshis (NRBs) living in the UK, North America, Australia, or the Gulf, managing or disposing of property back home is often complicated by distance, timezone differences, and reliance on distant relatives.</p>
<p>Seventh Sky Property Care offers an end-to-end institutional service tailored specifically for expatriates:</p>
<ul>
  <li><b>Vetted Power of Attorney (PoA) guidance:</b> Embassy / High Commission endorsement assistance.</li>
  <li><b>Physical property care &amp; staging:</b> Cleaning, maintenance, repairs, and handover readiness.</li>
  <li><b>Virtual 4K video tours:</b> Full transparency before and during marketing.</li>
  <li><b>Repatriation &amp; legal settlement support:</b> Coordinating with approved foreign exchange channels.</li>
</ul>`,
    propertyCard: null,
    ctaText: 'Schedule a Zoom Consultation with our NRB Desk',
    ctaUrl: '{{view_link}}',
    noticeText: 'Our NRB desk accommodates London, New York, Toronto, Sydney, and Dubai timezones.',
    body_text: `NRB Property Care & Selling from Abroad.
Dear {{name}},
Living abroad and own property in Dhaka?
Seventh Sky provides complete remote property management, valuation, and sales execution:
- High Commission PoA coordination
- Physical property care & staging
- Foreign exchange repatriation support
Book a confidential Zoom consultation: {{view_link}}
WhatsApp NRB Desk: {{agent_phone}}`
  }
];

async function run() {
  console.log('--- Starting Seeding of 20 Marketing Templates ---');
  await sequelize.authenticate();

  let count = 0;
  for (const tpl of TEMPLATES_DATA) {
    const body_html = generateEmailHtml({
      title: tpl.subject,
      preheader: tpl.preheader,
      badge: tpl.category.toUpperCase().replace('_', ' '),
      headline: tpl.headline,
      bodyText: tpl.bodyText,
      propertyCard: tpl.propertyCard,
      ctaText: tpl.ctaText,
      ctaUrl: tpl.ctaUrl,
      noticeText: tpl.noticeText
    });

    const [record, created] = await MarketingTemplate.findOrCreate({
      where: { template_code: tpl.template_code },
      defaults: {
        branch_id: 1,
        template_code: tpl.template_code,
        name: tpl.name,
        category: tpl.category,
        channel: tpl.channel,
        subject: tpl.subject,
        preheader: tpl.preheader,
        headline: tpl.headline,
        body_html: body_html,
        body_text: tpl.body_text,
        thumbnail_url: tpl.propertyCard?.image || null,
        variables: ['{{name}}', '{{property_title}}', '{{agent_name}}', '{{agent_phone}}', '{{agent_email}}', '{{view_link}}', '{{unsubscribe_link}}'],
        tags: tpl.tags,
        is_system: true,
        is_active: true,
        created_by: 1
      }
    });

    if (!created) {
      // Update with latest refined HTML
      await record.update({
        name: tpl.name,
        category: tpl.category,
        channel: tpl.channel,
        subject: tpl.subject,
        preheader: tpl.preheader,
        headline: tpl.headline,
        body_html: body_html,
        body_text: tpl.body_text,
        thumbnail_url: tpl.propertyCard?.image || null,
        variables: ['{{name}}', '{{property_title}}', '{{agent_name}}', '{{agent_phone}}', '{{agent_email}}', '{{view_link}}', '{{unsubscribe_link}}'],
        tags: tpl.tags,
        is_system: true,
        is_active: true
      });
    }

    count++;
    console.log(`[${count}/20] Seeded template: ${tpl.template_code} - ${tpl.name}`);
  }

  console.log(`Successfully seeded ${count} marketing templates!`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Error seeding marketing templates:', err);
  process.exit(1);
});
