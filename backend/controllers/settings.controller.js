const SystemSetting = require('../models/SystemSetting');
const { encrypt, decrypt } = require('../utils/encryption');

// Predefined configuration keys — organized by category
const DEFAULT_SETTINGS = [
  // ── Email (SMTP) ────────────────────────────────────────
  { setting_key: 'SMTP_HOST', setting_value: 'smtp.hostinger.com', description: 'Outgoing Mail Server (SMTP)', is_secret: false, category: 'email' },
  { setting_key: 'SMTP_PORT', setting_value: '465', description: 'SMTP Port', is_secret: false, category: 'email' },
  { setting_key: 'SMTP_USER', setting_value: '', description: 'SMTP Username / Email', is_secret: false, category: 'email' },
  { setting_key: 'SMTP_PASS', setting_value: '', description: 'SMTP Password', is_secret: true, category: 'email' },

  // ── SMS Gateway ─────────────────────────────────────────
  { setting_key: 'SMS_API_KEY', setting_value: '', description: 'Alpha SMS / BulkSMSBD API Key', is_secret: true, category: 'sms' },
  { setting_key: 'SMS_SENDER_ID', setting_value: '', description: 'Approved Sender ID', is_secret: false, category: 'sms' },

  // ── Facebook Pixel & CAPI ───────────────────────────────
  { setting_key: 'FB_PIXEL_ID', setting_value: '', description: 'Facebook Pixel ID', is_secret: false, category: 'facebook' },
  { setting_key: 'FB_CAPI_TOKEN', setting_value: '', description: 'Conversions API Access Token', is_secret: true, category: 'facebook' },
  { setting_key: 'FB_TEST_EVENT_CODE', setting_value: '', description: 'Test Event Code (optional, for debugging)', is_secret: false, category: 'facebook' },

  // ── TikTok Pixel & Events API ───────────────────────────
  { setting_key: 'TIKTOK_PIXEL_ID', setting_value: '', description: 'TikTok Pixel ID', is_secret: false, category: 'tiktok' },
  { setting_key: 'TIKTOK_ACCESS_TOKEN', setting_value: '', description: 'TikTok Events API Access Token', is_secret: true, category: 'tiktok' },
  { setting_key: 'TIKTOK_TEST_EVENT_CODE', setting_value: '', description: 'Test Event Code (optional)', is_secret: false, category: 'tiktok' },

  // ── Google Analytics & Tags ─────────────────────────────
  { setting_key: 'GA4_MEASUREMENT_ID', setting_value: '', description: 'GA4 Measurement ID (G-XXXXXXXXXX)', is_secret: false, category: 'google' },
  { setting_key: 'GA4_API_SECRET', setting_value: '', description: 'GA4 Measurement Protocol API Secret', is_secret: true, category: 'google' },
  { setting_key: 'GTM_CONTAINER_ID', setting_value: '', description: 'Google Tag Manager Container ID (GTM-XXXXXXX)', is_secret: false, category: 'google' },
  { setting_key: 'GOOGLE_SEARCH_CONSOLE_META', setting_value: '', description: 'Search Console Verification Meta Tag Content', is_secret: false, category: 'google' },
  { setting_key: 'GOOGLE_ADS_ID', setting_value: '', description: 'Google Ads Conversion ID (AW-XXXXXXXXX)', is_secret: false, category: 'google' },
  { setting_key: 'GOOGLE_ADS_CONVERSION_LABEL', setting_value: '', description: 'Google Ads Conversion Label', is_secret: false, category: 'google' },

  // ── SEO & Meta ──────────────────────────────────────────
  { setting_key: 'SEO_SITE_TITLE', setting_value: 'Language Academy', description: 'Default Site Title', is_secret: false, category: 'seo' },
  { setting_key: 'SEO_META_DESCRIPTION', setting_value: '', description: 'Default Meta Description', is_secret: false, category: 'seo' },
  { setting_key: 'SEO_META_KEYWORDS', setting_value: '', description: 'Default Meta Keywords (comma-separated)', is_secret: false, category: 'seo' },
  { setting_key: 'SEO_OG_IMAGE', setting_value: '', description: 'Default Open Graph Image URL', is_secret: false, category: 'seo' },
  { setting_key: 'ROBOTS_TXT_EXTRA', setting_value: '', description: 'Extra Robots.txt Rules', is_secret: false, category: 'seo' },

  // ── Social Media Profiles ───────────────────────────────
  { setting_key: 'SOCIAL_FACEBOOK', setting_value: 'https://facebook.com/languageacademybd', description: 'Facebook Page URL', is_secret: false, category: 'social' },
  { setting_key: 'SOCIAL_INSTAGRAM', setting_value: 'https://instagram.com/languageacademyb', description: 'Instagram Profile URL', is_secret: false, category: 'social' },
  { setting_key: 'SOCIAL_YOUTUBE', setting_value: 'https://youtube.com/@languageacademybd', description: 'YouTube Channel URL', is_secret: false, category: 'social' },
  { setting_key: 'SOCIAL_LINKEDIN', setting_value: '', description: 'LinkedIn Page URL', is_secret: false, category: 'social' },
  { setting_key: 'SOCIAL_TIKTOK', setting_value: '', description: 'TikTok Profile URL', is_secret: false, category: 'social' },
  { setting_key: 'SOCIAL_TWITTER', setting_value: '', description: 'X (Twitter) Profile URL', is_secret: false, category: 'social' },

  // ── Contact Information ─────────────────────────────────
  { setting_key: 'CONTACT_PHONE_PRIMARY', setting_value: '+880-1913-373581', description: 'Primary Phone Number', is_secret: false, category: 'contact' },
  { setting_key: 'CONTACT_PHONE_SECONDARY', setting_value: '', description: 'Secondary Phone Number', is_secret: false, category: 'contact' },
  { setting_key: 'CONTACT_WHATSAPP', setting_value: '+8801913373581', description: 'WhatsApp Business Number', is_secret: false, category: 'contact' },
  { setting_key: 'CONTACT_EMAIL_PRIMARY', setting_value: '', description: 'Primary Contact Email', is_secret: false, category: 'contact' },
  { setting_key: 'CONTACT_EMAIL_SUPPORT', setting_value: '', description: 'Support Email Address', is_secret: false, category: 'contact' },
  { setting_key: 'CONTACT_ADDRESS', setting_value: 'SEL SUFI SQUARE, Unit: 1104, Level: 11, Plot: 58, Road: 16 (New) / 27 (Old), Dhanmondi R/A, Dhaka 1209', description: 'Business Address', is_secret: false, category: 'contact' },
  { setting_key: 'CONTACT_MAP_EMBED', setting_value: '', description: 'Google Maps Embed URL', is_secret: false, category: 'contact' },

  // ── Branding & Business ─────────────────────────────────
  { setting_key: 'BRAND_NAME', setting_value: 'Language Academy', description: 'Business / Brand Name', is_secret: false, category: 'branding' },
  { setting_key: 'BRAND_TAGLINE', setting_value: 'Premium PTE & IELTS Coaching in Dhaka', description: 'Brand Tagline', is_secret: false, category: 'branding' },
  { setting_key: 'BRAND_LOGO_URL', setting_value: '', description: 'Logo URL (light version)', is_secret: false, category: 'branding' },
  { setting_key: 'BRAND_LOGO_DARK_URL', setting_value: '', description: 'Logo URL (dark version)', is_secret: false, category: 'branding' },
  { setting_key: 'BRAND_FAVICON_URL', setting_value: '', description: 'Favicon URL', is_secret: false, category: 'branding' },
  { setting_key: 'BRAND_PRIMARY_COLOR', setting_value: '#7bc62e', description: 'Primary Brand Color (hex)', is_secret: false, category: 'branding' },
  { setting_key: 'BRAND_ACCENT_COLOR', setting_value: '#275fa7', description: 'Accent Brand Color (hex)', is_secret: false, category: 'branding' },

  // ── Third-party Integrations ───────────────────────────
  { setting_key: 'TAWK_TO_WIDGET_ID', setting_value: '', description: 'Tawk.to Chat Widget ID', is_secret: false, category: 'integrations' },
  { setting_key: 'SSLCOMMERZ_STORE_ID', setting_value: '', description: 'SSLCommerz Store ID', is_secret: false, category: 'integrations' },
  { setting_key: 'SSLCOMMERZ_STORE_PASS', setting_value: '', description: 'SSLCommerz Store Password', is_secret: true, category: 'integrations' },
  { setting_key: 'SSLCOMMERZ_IS_LIVE', setting_value: 'false', description: 'SSLCommerz Live Mode (true/false)', is_secret: false, category: 'integrations' },

  // ── Payment Settings ─────────────────────────────────────
  { setting_key: 'BKASH_MERCHANT_NO', setting_value: '01913-373581', description: 'bKash Merchant Number', is_secret: false, category: 'payment' },
];

// Ensure defaults exist upon first load
exports.initializeDefaults = async () => {
  for (let def of DEFAULT_SETTINGS) {
    const exists = await SystemSetting.findOne({ where: { setting_key: def.setting_key } });
    if (!exists) {
      let valToSave = def.setting_value;
      if (def.is_secret && valToSave) valToSave = encrypt(valToSave);
      await SystemSetting.create({ ...def, setting_value: valToSave });
    }
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.findAll({ order: [['id', 'ASC']] });
    
    const formattedSettings = settings.map(setting => {
      let val = setting.setting_value;
      if (setting.is_secret && val) {
        val = decrypt(val);
      }
      return {
        id: setting.id,
        key: setting.setting_key,
        value: val,
        description: setting.description,
        is_secret: setting.is_secret,
        category: setting.category || 'general',
      };
    });

    res.json(formattedSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body; // Array of { key, value }
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Expected an array of settings to update.' });
    }

    for (let update of updates) {
      const setting = await SystemSetting.findOne({ where: { setting_key: update.key } });
      if (setting) {
        let valToSave = update.value;
        if (setting.is_secret && valToSave) {
          valToSave = encrypt(valToSave);
        }
        await setting.update({ setting_value: valToSave });
      }
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
