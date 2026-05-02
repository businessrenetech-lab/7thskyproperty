const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'http://127.0.0.1:5178',
];

const parseAllowedOrigins = () => {
  const configured = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
};

const getCorsOptions = () => {
  const allowedOrigins = parseAllowedOrigins();

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
  };
};

module.exports = { getCorsOptions };
