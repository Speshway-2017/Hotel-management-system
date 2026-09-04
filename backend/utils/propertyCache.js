import mongoose from 'mongoose';
import Property from '../models/property.model.js';

// In-memory property cache: key -> { data, timestamp }
const propertyCache = new Map();
const CACHE_TTL_MS = 30000; // 30 seconds TTL

/**
 * Invalidate cached property data
 */
export function invalidatePropertyCache(propId = null) {
  if (!propId) {
    propertyCache.clear();
    return;
  }
  const cleanId = String(propId).trim();
  for (const key of propertyCache.keys()) {
    if (key.includes(cleanId) || key === 'default') {
      propertyCache.delete(key);
    }
  }
}

/**
 * High-performance safe property resolver with caching
 */
export async function findPropertySafely(propertyId = null, user = null) {
  const cacheKey = `${propertyId || ''}:${user?._id || user?.id || ''}:${user?.email || ''}`;

  const cached = propertyCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  let property = null;

  try {
    // 1. If propertyId provided
    if (propertyId) {
      if (mongoose.Types.ObjectId.isValid(propertyId)) {
        property = await Property.findById(propertyId);
      }
      if (!property) {
        property = await Property.findOne({
          $or: [
            { propertyId: propertyId },
            { id: propertyId },
            { _id: propertyId },
            { name: propertyId }
          ]
        });
      }
    }

    // 2. If user provided and assigned to property
    if (!property && user) {
      const userPropId = user.propertyId;
      if (userPropId) {
        if (mongoose.Types.ObjectId.isValid(userPropId)) {
          property = await Property.findById(userPropId);
        }
        if (!property) {
          property = await Property.findOne({
            $or: [
              { propertyId: userPropId },
              { id: userPropId },
              { _id: userPropId }
            ]
          });
        }
      }

      if (!property && user._id && mongoose.Types.ObjectId.isValid(user._id)) {
        property = await Property.findOne({ assignedAdmin: user._id });
      }

      if (!property && user.email) {
        property = await Property.findOne({ assignedAdmin: user.email });
      }
    }

    // 3. Fallback to first available property in MongoDB
    if (!property) {
      property = await Property.findOne();
    }

    if (property) {
      propertyCache.set(cacheKey, { data: property, timestamp: Date.now() });
      if (property._id) {
        propertyCache.set(String(property._id), { data: property, timestamp: Date.now() });
      }
      if (property.id) {
        propertyCache.set(String(property.id), { data: property, timestamp: Date.now() });
      }
    }
  } catch (err) {
    console.error('findPropertySafely error:', err.message);
  }

  return property;
}

export default { findPropertySafely, invalidatePropertyCache };
