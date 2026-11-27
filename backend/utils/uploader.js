import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { cloudinary, isConfigured } from '../config/cloudinary.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const PROTECTED_ID_DIR = path.join(__dirname, '../uploads/protected-ids');

for (const dir of [UPLOADS_DIR, PROTECTED_ID_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const SAFE_IMAGE_DATA_URI = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/i;
const SAFE_PDF_DATA_URI = /^data:application\/pdf;base64,[A-Za-z0-9+/=\s]+$/i;

export function isSafeUrlOrImageData(value, { allowPdf = false } = {}) {
  if (!value) return true;
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return true;

  if (trimmed.startsWith('data:')) {
    if (SAFE_IMAGE_DATA_URI.test(trimmed)) return true;
    if (allowPdf && SAFE_PDF_DATA_URI.test(trimmed)) return true;
    return false;
  }

  if (trimmed.startsWith('/uploads/')) {
    return !trimmed.includes('..');
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && parsed.protocol === 'http:');
  } catch {
    return false;
  }
}

/**
 * Inspects file magic bytes to prevent spoofed extensions (e.g., HTML/JS/EXE renamed to .jpg).
 */
export function validateUploadedImageMagicBytes(filePath, { allowPdf = false } = {}) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(16);
    const bytesRead = fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) {
      fs.unlinkSync(filePath);
      return { valid: false, message: 'Uploaded file is empty or corrupted.' };
    }

    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const isWebp =
      buf.slice(0, 4).toString('ascii') === 'RIFF' &&
      buf.slice(8, 12).toString('ascii') === 'WEBP';
    const isPdf = allowPdf && buf.slice(0, 5).toString('ascii') === '%PDF-';

    if (isJpeg || isPng || isWebp || isPdf) {
      return { valid: true };
    }

    fs.unlinkSync(filePath);
    return { valid: false, message: 'File signature validation failed. Only authentic JPG, PNG, or WEBP images are allowed.' };
  } catch (err) {
    return { valid: false, message: `Unable to verify uploaded file: ${err.message}` };
  }
}

// Multer Storage Configuration with crypto-random filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(path.basename(file.originalname || '')).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.png';
    const randomName = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${safeExt}`;
    cb(null, randomName);
  }
});

// Strict MIME + Extension File Filter
const fileFilter = (_req, file, cb) => {
  const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  const allowedMime = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();

  if (allowedExt.has(ext) && allowedMime.has(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter
});

const uploadImageToCloudinary = async (fileOrPath, folder = 'hourstay_hms_assets') => {
  let targetPath = null;

  if (typeof fileOrPath === 'string') {
    targetPath = fileOrPath;
  } else if (fileOrPath && typeof fileOrPath === 'object') {
    if (Buffer.isBuffer(fileOrPath)) {
      const uniqueName = `buf-${Date.now()}-${crypto.randomBytes(12).toString('hex')}.png`;
      targetPath = path.join(UPLOADS_DIR, uniqueName);
      fs.writeFileSync(targetPath, fileOrPath);
    } else if (fileOrPath.path) {
      targetPath = fileOrPath.path;
    } else if (fileOrPath.tempFilePath) {
      targetPath = fileOrPath.tempFilePath;
    } else if (fileOrPath.buffer && Buffer.isBuffer(fileOrPath.buffer)) {
      const ext = fileOrPath.originalname ? path.extname(fileOrPath.originalname).toLowerCase() : '.png';
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.png';
      const uniqueName = `upload-${Date.now()}-${crypto.randomBytes(12).toString('hex')}${safeExt}`;
      targetPath = path.join(UPLOADS_DIR, uniqueName);
      fs.writeFileSync(targetPath, fileOrPath.buffer);
    }
  }

  if (!targetPath || typeof targetPath !== 'string') {
    throw new Error('Invalid file path or buffer provided for image upload.');
  }

  const magicCheck = validateUploadedImageMagicBytes(targetPath);
  if (!magicCheck.valid) {
    throw new Error(magicCheck.message);
  }

  const filename = path.basename(targetPath);
  const backendBase = process.env.BACKEND_URL || process.env.API_BASE_URL || 'http://localhost:5000';

  if (isConfigured) {
    try {
      const result = await cloudinary.uploader.upload(targetPath, {
        folder: folder || 'hourstay_hms_assets',
        resource_type: 'image'
      });
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      return {
        url: result.secure_url,
        publicId: result.public_id
      };
    } catch (error) {
      console.warn('Cloudinary upload failure, falling back to local static URL:', error.message);
      return {
        url: `${backendBase}/uploads/${filename}`,
        publicId: `local_${filename}`
      };
    }
  } else {
    return {
      url: `${backendBase}/uploads/${filename}`,
      publicId: `local_${filename}`
    };
  }
};

const deleteImageFromCloudinary = async (publicId) => {
  if (!publicId) return;

  if (typeof publicId === 'string' && publicId.startsWith('local_')) {
    const filename = path.basename(publicId.replace('local_', ''));
    const localPath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  } else if (isConfigured) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Cloudinary asset removal failed:', error.message);
    }
  }
};

export {
  upload,
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
  UPLOADS_DIR,
  PROTECTED_ID_DIR
};
