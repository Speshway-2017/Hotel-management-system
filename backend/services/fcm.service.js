import { getFirebaseMessaging } from '../config/firebase.config.js';
import User from '../models/user.model.js';

/**
 * Sends a push notification to an array or set of FCM registration tokens.
 * Automatically cleans up invalid/unregistered tokens from MongoDB.
 */
export const sendPushToTokens = async (tokensInput, { title, body, data = {}, notificationId, category, role, propertyId }) => {
  const tokens = Array.from(
    new Set((Array.isArray(tokensInput) ? tokensInput : [tokensInput]).filter(t => typeof t === 'string' && t.trim().length > 10))
  );

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, message: 'No valid tokens provided' };
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    console.log(`📱 [FCM PUSH STAGE: DISPATCH_ATTEMPT] Target: ${tokens.length} token(s) | Title: "${title}"`);
    console.warn(`⚠️ [FCM PUSH NOTICE] Firebase Admin credentials for 'hour-stay' are not configured yet.`);
    console.warn(`👉 [ACTION REQUIRED FOR REAL PHONE PUSH]: Download service-account.json from Firebase Console (Project Settings -> Service Accounts -> Generate new private key) and place it at "backend/service-account.json" (or add FIREBASE_SERVICE_ACCOUNT to backend/.env).`);
    return { successCount: 0, failureCount: 0, message: 'Firebase Admin not configured' };
  }

  // Convert all data values to strings (FCM requirement)
  const stringData = {};
  if (data && typeof data === 'object') {
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && val !== null) {
        stringData[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
      }
    }
  }

  stringData.title = String(title || '');
  stringData.body = String(body || '');
  if (notificationId) stringData.notificationId = String(notificationId);
  if (category) stringData.category = String(category);
  if (role) stringData.role = String(role);
  if (propertyId) stringData.propertyId = String(propertyId);
  stringData.click_action = 'FLUTTER_NOTIFICATION_CLICK';

  const payload = {
    tokens,
    notification: {
      title: title || 'Hour Stay Notification',
      body: body || ''
    },
    data: stringData,
    android: {
      priority: 'high',
      notification: {
        channelId: 'hourstay_high_importance_channel',
        sound: 'default',
        priority: 'high',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  try {
    console.log(`📱 [FCM PUSH] Dispatching notification to ${tokens.length} device(s): "${title}"`);
    const response = await messaging.sendEachForMulticast(payload);
    console.log(`✅ [FCM PUSH] Sent: ${response.successCount} succeeded, ${response.failureCount} failed.`);

    // Clean up expired or unregistered tokens
    if (response.failureCount > 0) {
      const deadTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            deadTokens.push(tokens[idx]);
          }
        }
      });

      if (deadTokens.length > 0) {
        console.log(`🧹 [FCM PUSH] Removing ${deadTokens.length} expired FCM token(s) from database...`);
        await User.updateMany(
          { $or: [{ fcmToken: { $in: deadTokens } }, { fcmTokens: { $in: deadTokens } }] },
          {
            $pull: { fcmTokens: { $in: deadTokens } }
          }
        ).catch(err => console.warn('Could not clean up dead tokens:', err.message));

        await User.updateMany(
          { fcmToken: { $in: deadTokens } },
          { $set: { fcmToken: null } }
        ).catch(err => console.warn('Could not reset dead fcmToken:', err.message));
      }
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses
    };
  } catch (err) {
    console.error('❌ [FCM PUSH ERROR] Failed to send multicast message:', err.message);
    return { successCount: 0, failureCount: tokens.length, error: err.message };
  }
};

/**
 * Dispatches a push notification to specific users by ID or Role.
 */
export const dispatchPushNotification = async ({ userIds, role, propertyId, title, body, data = {}, notificationId, category }) => {
  try {
    const userQuery = [];

    if (userIds && (Array.isArray(userIds) ? userIds.length > 0 : userIds)) {
      const ids = Array.isArray(userIds) ? userIds : [userIds];
      for (const id of ids) {
        if (id) userQuery.push({ _id: id }, { id: id });
      }
    } else if (role && propertyId) {
      userQuery.push({ role, propertyId });
    } else if (role) {
      userQuery.push({ role });
    } else if (propertyId) {
      userQuery.push({ propertyId, role: 'manager' });
    }

    if (userQuery.length === 0) return;

    const users = await User.find({ $or: userQuery });
    const tokens = new Set();
    for (const u of users) {
      if (u.fcmToken) tokens.add(u.fcmToken);
      if (Array.isArray(u.fcmTokens)) {
        for (const t of u.fcmTokens) {
          if (t) tokens.add(t);
        }
      }
    }

    if (tokens.size > 0) {
      await sendPushToTokens(Array.from(tokens), {
        title,
        body,
        data,
        notificationId,
        category,
        role,
        propertyId
      });
    }
  } catch (err) {
    console.warn('⚠️ [FCM DISPATCH] Exception during token lookup & dispatch:', err.message);
  }
};

export default {
  sendPushToTokens,
  dispatchPushNotification
};
