const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3005',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://127.0.0.1:3005',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'http://127.0.0.1:5178',
  'https://darkslateblue-cormorant-104679.hostingersite.com',
  'https://languageacademy.com.bd',
  'https://www.languageacademy.com.bd',
];

const parseAllowedOrigins = () => {
  const configured = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
};

const hostFromOrigin = (origin) => {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
};

const getCorsOptions = () => {
  const allowedOrigins = parseAllowedOrigins();

  return (req, callback) => {
    const requestHost = req.get('x-forwarded-host') || req.get('host');

    callback(null, {
      credentials: true,
      origin(origin, originCallback) {
        if (!origin || allowedOrigins.includes(origin)) return originCallback(null, true);
        if (requestHost && hostFromOrigin(origin) === requestHost) return originCallback(null, true);
        return originCallback(new Error('Not allowed by CORS'));
      },
    });
  };
};

module.exports = { getCorsOptions };
