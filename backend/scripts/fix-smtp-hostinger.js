/**
 * Update SMTP settings in the database to use Hostinger.
 * Usage: node scripts/fix-smtp-hostinger.js <password>
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.TZ = 'Asia/Dhaka';

const sequelize = require('../config/db.config');
const SystemSetting = require('../models/SystemSetting');
const { encrypt, decrypt } = require('../utils/encryption');

async function main() {
  const password = process.argv[2];

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    await SystemSetting.sync();

    // Update SMTP_HOST
    const updates = [
      { key: 'SMTP_HOST', value: 'smtp.hostinger.com', secret: false },
      { key: 'SMTP_PORT', value: '465', secret: false },
      { key: 'SMTP_USER', value: 'info@languageacademy.com.bd', secret: false },
    ];

    for (const u of updates) {
      const setting = await SystemSetting.findOne({ where: { setting_key: u.key } });
      if (setting) {
        await setting.update({ setting_value: u.value });
        console.log(`✅ ${u.key} = ${u.value}`);
      }
    }

    // Update password if provided
    if (password) {
      const passSetting = await SystemSetting.findOne({ where: { setting_key: 'SMTP_PASS' } });
      if (passSetting) {
        const encrypted = encrypt(password);
        // Verify
        const verified = decrypt(encrypted);
        console.log(`\nPassword encryption verified: ${verified === password}`);
        await passSetting.update({ setting_value: encrypted });
        console.log(`✅ SMTP_PASS updated (encrypted)`);
      }
    } else {
      console.log('\n⚠️  No password provided. Run with: node scripts/fix-smtp-hostinger.js <your-hostinger-email-password>');
    }

    // Show final state
    console.log('\n📧 Final SMTP Configuration:');
    for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']) {
      const s = await SystemSetting.findOne({ where: { setting_key: key } });
      const val = s?.is_secret && s?.setting_value ? '****' : (s?.setting_value || 'NOT SET');
      console.log(`  ${key}: ${val}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

main();
