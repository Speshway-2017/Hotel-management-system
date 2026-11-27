const REQUIRED_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'CLIENT_URL',
];

export function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌  Missing required backend environment variables:');
    missing.forEach((key) => console.error(`    - ${key}`));
    console.error('\nPlease check your backend .env file and add the missing values.');
    process.exit(1);
  }

  const isProd = process.env.NODE_ENV === 'production';
  const jwtSecret = String(process.env.JWT_SECRET || '');

  if (isProd) {
    if (jwtSecret.length < 32 || jwtSecret === 'secret123' || jwtSecret.includes('12345')) {
      console.error('🛑 Production security violation: JWT_SECRET is too weak or uses a default value.');
      process.exit(1);
    }
  } else if (jwtSecret.length < 24 || jwtSecret === 'secret123') {
    console.warn('⚠️  [Security] JWT_SECRET is weak for development. Set a 32+ char random secret before production.');
  }

  if (isProd && !process.env.JWT_REFRESH_SECRET) {
    console.warn('⚠️  [Security] JWT_REFRESH_SECRET not set; deriving separate refresh signing key from JWT_SECRET.');
  }
}
