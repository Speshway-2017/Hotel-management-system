import express from 'express';
import path from 'path';
import fs from 'fs';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { SecurityEvent, BlockedEntity } from '../models/securityEvent.model.js';
import { recordSecurityEvent } from '../services/securityMonitor.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { PROTECTED_ID_DIR, UPLOADS_DIR } from '../utils/uploader.js';

const router = express.Router();

/**
 * POST /api/security/csp-report
 * Collects browser Content Security Policy violation reports without exposing secrets.
 */
router.post('/csp-report', express.json({ type: ['application/csp-report', 'application/reports+json', 'application/json'] }), async (req, res) => {
  try {
    const report = req.body?.['csp-report'] || req.body || {};
    await recordSecurityEvent({
      type: 'CSP_VIOLATION',
      severity: 'medium',
      req,
      details: `Blocked URI: ${report['blocked-uri'] || 'unknown'} on directive ${report['violated-directive'] || report['effective-directive'] || 'unknown'}`,
      metadata: {
        documentUri: report['document-uri'],
        blockedUri: report['blocked-uri'],
        violatedDirective: report['violated-directive'] || report['effective-directive']
      }
    });
  } catch {}
  return res.status(204).end();
});

/**
 * GET /api/security/events
 * Retrieves security audit events (Super Admin & Property Admin).
 */
router.get('/events', protect, authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const { severity, type, limit } = req.query;
    const query = {};
    if (severity) query.severity = String(severity);
    if (type) query.type = String(type);
    const events = await SecurityEvent.find(query, Math.min(200, Number(limit) || 100));
    const filtered = req.user.role === 'super-admin'
      ? events
      : events.filter((e) => !e.propertyId || String(e.propertyId) === String(req.user.propertyId));
    return sendSuccess(res, 200, filtered, 'Security events retrieved');
  } catch (err) {
    return sendError(res, 500, 'Failed to fetch security events');
  }
});

/**
 * GET /api/security/blocks
 * Lists currently active temporary IP/account lockouts.
 */
router.get('/blocks', protect, authorize('super-admin'), async (_req, res) => {
  try {
    const blocks = await BlockedEntity.listActive();
    return sendSuccess(res, 200, blocks, 'Active security blocks retrieved');
  } catch (err) {
    return sendError(res, 500, 'Failed to fetch active blocks');
  }
});

/**
 * POST /api/security/unblock
 * Super Admin recovery mechanism to clear a temporary IP or account lockout.
 */
router.post('/unblock', protect, authorize('super-admin'), async (req, res) => {
  try {
    const { entityType, entityValue } = req.body;
    if (!['ip', 'email', 'userId'].includes(entityType) || !entityValue) {
      return sendError(res, 400, 'Valid entityType (ip, email, userId) and entityValue are required');
    }
    const result = await BlockedEntity.unblock({
      entityType,
      entityValue,
      unblockedBy: req.user.email || 'super-admin'
    });
    await recordSecurityEvent({
      type: 'ENTITY_UNBLOCKED',
      severity: 'low',
      req,
      user: req.user,
      details: `Super Admin unblocked ${entityType}: ${entityValue}`
    });
    return sendSuccess(res, 200, result, 'Entity unblocked successfully');
  } catch (err) {
    return sendError(res, 500, 'Failed to unblock entity');
  }
});

/**
 * GET /api/security/documents/:filename
 * Authenticated, RBAC-protected document viewer for protected guest ID scans.
 */
router.get('/documents/:filename', protect, authorize('super-admin', 'admin', 'manager', 'receptionist'), (req, res) => {
  const safeName = path.basename(String(req.params.filename || ''));
  if (!safeName || safeName.includes('..')) {
    return sendError(res, 400, 'Invalid document filename');
  }

  const protectedPath = path.join(PROTECTED_ID_DIR, safeName);
  const uploadPath = path.join(UPLOADS_DIR, safeName);
  const targetFile = fs.existsSync(protectedPath) ? protectedPath : (fs.existsSync(uploadPath) ? uploadPath : null);

  if (!targetFile) {
    return sendError(res, 404, 'Document not found');
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  return res.sendFile(targetFile);
});

export default router;

