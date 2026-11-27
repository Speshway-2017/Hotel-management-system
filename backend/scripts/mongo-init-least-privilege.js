/**
 * MongoDB Least-Privilege Initialization Script (mongosh)
 *
 * Usage:
 *   APP_DB_PASSWORD="<strong-random-password>" mongosh "mongodb://localhost:27017/admin" backend/scripts/mongo-init-least-privilege.js
 *
 * Creates a dedicated application user scoped ONLY to `readWrite` on `hourstay_hms`
 * and a read-only backup user (`read` on `hourstay_hms`).
 */

const targetDbName = process.env.HMS_DB_NAME || 'hourstay_hms';
const appUsername = process.env.APP_DB_USER || 'hourstay_app';
const appPassword = process.env.APP_DB_PASSWORD;
const backupUsername = process.env.BACKUP_DB_USER || 'hourstay_backup';
const backupPassword = process.env.BACKUP_DB_PASSWORD;

if (!appPassword || appPassword.length < 16) {
  throw new Error('APP_DB_PASSWORD env var (min 16 chars) is required. Never hardcode DB passwords.');
}

const appDb = db.getSiblingDB(targetDbName);

function upsertScopedUser(username, password, roles) {
  const existing = appDb.getUser(username);
  if (existing) {
    appDb.updateUser(username, { pwd: password, roles });
    print(`Updated least-privilege MongoDB user '${username}' on '${targetDbName}'`);
  } else {
    appDb.createUser({ user: username, pwd: password, roles });
    print(`Created least-privilege MongoDB user '${username}' on '${targetDbName}'`);
  }
}

upsertScopedUser(appUsername, appPassword, [
  { role: 'readWrite', db: targetDbName }
]);

if (backupPassword && backupPassword.length >= 16) {
  upsertScopedUser(backupUsername, backupPassword, [
    { role: 'read', db: targetDbName }
  ]);
}

