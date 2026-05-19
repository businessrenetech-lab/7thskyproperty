/**
 * Quick test script to send a test email from the Language Academy system.
 * Usage: node scripts/send-test-email.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Force timezone
process.env.TZ = 'Asia/Dhaka';

const sequelize = require('../config/db.config');
const SystemSetting = require('../models/SystemSetting');
const { sendEmail, brandedEmailWrapper } = require('../services/communication.service');

const TO_EMAIL = 'redowansayem73@gmail.com';

async function main() {
  try {
    // Connect to DB
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync SystemSetting table
    await SystemSetting.sync();

    // Show current SMTP config (from DB)
    const smtpHost = await SystemSetting.findOne({ where: { setting_key: 'SMTP_HOST' } });
    const smtpPort = await SystemSetting.findOne({ where: { setting_key: 'SMTP_PORT' } });
    const smtpUser = await SystemSetting.findOne({ where: { setting_key: 'SMTP_USER' } });
    const smtpPass = await SystemSetting.findOne({ where: { setting_key: 'SMTP_PASS' } });

    console.log('\n📧 SMTP Configuration:');
    console.log(`  Host (DB): ${smtpHost?.setting_value || 'NOT SET'}`);
    console.log(`  Port (DB): ${smtpPort?.setting_value || 'NOT SET'}`);
    console.log(`  User (DB): ${smtpUser?.setting_value || 'NOT SET'}`);
    console.log(`  Pass (DB): ${smtpPass?.setting_value ? '****' : 'NOT SET'}`);
    console.log(`  Host (.env): ${process.env.SMTP_HOST || 'NOT SET'}`);
    console.log(`  User (.env): ${process.env.SMTP_USER || 'NOT SET'}`);
    console.log(`  Pass (.env): ${process.env.SMTP_PASS ? '****' : 'NOT SET'}`);

    const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'full', timeStyle: 'long' });

    const bodyContent = `
      <h2 class="hero-title" style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1a1a2e;">✅ Email System Test</h2>
      <p style="margin:0 0 24px 0;font-size:15px;color:#495057;line-height:1.7;">
        This is a <strong>test email</strong> from the Language Academy system to verify that your SMTP configuration is working correctly.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e9ecef;border-radius:10px;overflow:hidden;margin-bottom:24px;">
        <tr>
          <td style="background-color:#32619A;padding:14px 20px;">
            <h3 style="margin:0;font-size:15px;font-weight:700;color:#ffffff;">SMTP Test Details</h3>
          </td>
        </tr>
        <tr>
          <td style="padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:12px 20px;font-size:14px;color:#6c757d;width:40%;border-bottom:1px solid #f0f2f5;">Sent To</td>
                <td style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;font-weight:600;border-bottom:1px solid #f0f2f5;">${TO_EMAIL}</td>
              </tr>
              <tr>
                <td style="padding:12px 20px;font-size:14px;color:#6c757d;border-bottom:1px solid #f0f2f5;">Timestamp</td>
                <td style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;border-bottom:1px solid #f0f2f5;">${now}</td>
              </tr>
              <tr>
                <td style="padding:12px 20px;font-size:14px;color:#6c757d;">From Server</td>
                <td style="padding:12px 20px 12px 0;font-size:14px;color:#2e7d32;font-weight:700;">Hostinger SMTP</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
        <tr>
          <td style="background-color:#e8f5e9;border-left:4px solid #2e7d32;padding:16px 20px;border-radius:0 8px 8px 0;">
            <p style="margin:0 0 6px 0;font-size:15px;color:#2e7d32;font-weight:700;">Configuration Verified</p>
            <p style="margin:0;font-size:14px;color:#1b5e20;line-height:1.6;">If you're reading this email, it means the Language Academy Hostinger SMTP email system is fully functional.</p>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:14px;color:#6c757d;">
        — Language Academy System
      </p>
    `;

    const html = brandedEmailWrapper('SMTP Test — Language Academy', bodyContent);

    console.log(`\n📤 Sending test email to: ${TO_EMAIL}...`);
    const result = await sendEmail(TO_EMAIL, '✅ Test Email — Language Academy (Hostinger SMTP)', html, [], 'info');

    if (result.success) {
      console.log(`\n✅ SUCCESS: ${result.message}`);
    } else {
      console.log(`\n❌ FAILED: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

main();
