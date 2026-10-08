import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseApp = null;
let isConfigured = false;

export const initializeFirebaseAdmin = () => {
  if (firebaseApp) return firebaseApp;
  if (getApps().length > 0) {
    firebaseApp = getApp();
    return firebaseApp;
  }

  try {
    let serviceAccount = null;

    // 1. Check direct JSON string in ENV
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : process.env.FIREBASE_SERVICE_ACCOUNT;
      } catch (err) {
        console.warn('⚠️ [FIREBASE ADMIN] Could not parse FIREBASE_SERVICE_ACCOUNT JSON from environment:', err.message);
      }
    }

    // 2. Check ENV file path
    if (!serviceAccount && (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      const credPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const resolvedPath = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
      if (fs.existsSync(resolvedPath)) {
        try {
          const raw = fs.readFileSync(resolvedPath, 'utf8');
          serviceAccount = JSON.parse(raw);
        } catch (err) {
          console.warn(`⚠️ [FIREBASE ADMIN] Could not read service account from ${resolvedPath}:`, err.message);
        }
      }
    }

    // 3. Check default service-account.json in backend directory
    if (!serviceAccount) {
      const defaultPath = path.resolve(__dirname, '../service-account.json');
      if (fs.existsSync(defaultPath)) {
        try {
          const raw = fs.readFileSync(defaultPath, 'utf8');
          serviceAccount = JSON.parse(raw);
        } catch (_) {}
      }
    }

    // Validate that credentials are not mock/placeholder
    if (
      serviceAccount &&
      serviceAccount.project_id &&
      serviceAccount.private_key &&
      !serviceAccount.private_key.includes('MOCK_KEY') &&
      serviceAccount.client_email &&
      !serviceAccount.client_email.includes('mock')
    ) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      isConfigured = true;
      console.log(`🔥 [FIREBASE ADMIN] Initialized successfully for project: "${serviceAccount.project_id}" (${serviceAccount.client_email})`);
    } else {
      isConfigured = false;
      console.warn('ℹ️ [FIREBASE ADMIN] Notice: Valid Firebase Service Account private key for project "hour-stay" is required in backend/service-account.json to deliver FCM push notifications to device notification trays.');
    }
  } catch (err) {
    console.error('❌ [FIREBASE ADMIN] Initialization exception:', err.message);
  }

  return firebaseApp;
};

export const getFirebaseMessaging = () => {
  if (!firebaseApp && !isConfigured) {
    initializeFirebaseAdmin();
  }
  if (!isConfigured || !firebaseApp) {
    return null;
  }
  try {
    return getMessaging(firebaseApp);
  } catch (err) {
    console.warn('⚠️ [FIREBASE ADMIN] Could not get messaging instance:', err.message);
    return null;
  }
};

export default {
  initializeFirebaseAdmin,
  getFirebaseMessaging,
  get isConfigured() {
    return isConfigured;
  }
};
