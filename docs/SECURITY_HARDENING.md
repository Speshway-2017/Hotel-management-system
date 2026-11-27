# Hour Stay HMS — Security & Production Deployment Guide

## 1. Environment & Secret Management
- Never commit `.env`, `service-account.json`, or private keys to Git (enforced via `.gitignore`).
- Generate strong cryptographic keys for production:
  - `JWT_SECRET` (64+ hex characters)
  - `JWT_REFRESH_SECRET` (distinct 64+ hex characters)
  - `AADHAAR_ENCRYPTION_KEY` (32+ bytes for AES-256-GCM field encryption)
  - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- Set `NODE_ENV=production`, `ALLOW_INSECURE_HTTP=false`, and `ALLOWED_ORIGINS=https://booknstay.speshway.site`.

## 2. Content Security Policy (CSP) & Reverse Proxy (Nginx / TLS)
- Helmet.js applies environment-aware CSP:
  - **Development:** allows `'unsafe-inline'` for Vite HMR and `localhost` / `ws://localhost` connections.
  - **Production:** removes `'unsafe-inline'` from `script-src`, enables `upgrade-insecure-requests`, enforces HSTS (`max-age=31536000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- Allowed third-party integrations:
  - **Razorpay:** `https://checkout.razorpay.com`, `https://api.razorpay.com`, `https://lumberjack.razorpay.com`
  - **Firebase / FCM:** `https://www.gstatic.com`, `https://*.firebaseapp.com`, `https://fcm.googleapis.com`, `https://identitytoolkit.googleapis.com`
  - **Cloudinary & Unsplash:** `https://res.cloudinary.com`, `https://images.unsplash.com`
  - **Google Maps & Fonts:** `https://maps.googleapis.com`, `https://maps.gstatic.com`, `https://fonts.googleapis.com`, `https://fonts.gstatic.com`
  - **Socket.io:** `wss://` matching configured origins.
- Ensure TLS 1.2/1.3 termination at Nginx/Cloudflare sets `X-Forwarded-Proto: https` and `X-Forwarded-For`.

## 3. MongoDB Least-Privilege, Network & Backups
- **Least-Privilege Access:** Run `backend/scripts/mongo-init-least-privilege.js` via `mongosh` so the application connects as `hourstay_app` (`readWrite` on `hourstay_hms` only — never `root` or `dbAdminAnyDatabase`).
- **Network Restrictions:**
  - In MongoDB Atlas: restrict IP Access List strictly to backend application server IPs / VPC peering (never `0.0.0.0/0` in production).
  - Self-hosted `mongod`: bind to `127.0.0.1` or private VPC interface (`net.bindIp`), require SCRAM-SHA-256 auth (`security.authorization: enabled`), and enable TLS (`net.tls.mode: requireTLS`).
- **Backups:** Schedule `node backend/scripts/backup-mongodb.mjs` via cron/Task Scheduler daily; store encrypted offsite backups with 14-day retention (`BACKUP_RETENTION_DAYS=14`).

## 4. Security Operations & Incident Recovery
- Security events & intrusion alerts are logged in `SecurityEvent` and `AuditLog` (sensitive credentials, JWTs, and full Aadhaar numbers are redacted automatically).
- Brute-force lockouts (5 failed auth attempts in 15m) temporarily block the offending IP/email for 15m.
- Super Admins can inspect events (`GET /api/v1/security/events`), active blocks (`GET /api/v1/security/blocks`), and clear false-positive lockouts (`POST /api/v1/security/unblock`).

