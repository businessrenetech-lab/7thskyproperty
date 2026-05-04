const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const encryptionSecret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;

if (!encryptionSecret && process.env.NODE_ENV === 'production') {
  throw new Error('ENCRYPTION_KEY or JWT_SECRET is required in production.');
}

const SECRET_KEY = crypto
  .createHash('sha256')
  .update(String(encryptionSecret || 'development-only-encryption-key'))
  .digest('base64')
  .substr(0, 32);

const encrypt = (text) => {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
  if (!text) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("[Settings] Decryption failure. Using fallback/original text.");
    return text; // Return as-is if decryption fails (e.g. if key changed or text was unencrypted)
  }
};

module.exports = {
  encrypt,
  decrypt
};
