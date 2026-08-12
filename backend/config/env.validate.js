const REQUIRED_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'CLIENT_URL'
];

export function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌  Missing required backend environment variables:');
    missing.forEach((key) => console.error(`    - ${key}`));
    console.error('\nPlease check your backend .env file and add the missing values.');
    process.exit(1);
  }
}
