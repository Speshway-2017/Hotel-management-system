import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { cloudinary, isConfigured } from '../config/cloudinary.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File Type Filter
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max size
  fileFilter
});

// Upload local file or buffer to Cloudinary with local storage fallback
const uploadImageToCloudinary = async (fileOrPath, folder = 'hourstay_hms_assets') => {
  let targetPath = null;
  let isTempCreated = false;

  if (typeof fileOrPath === 'string') {
    targetPath = fileOrPath;
  } else if (fileOrPath && typeof fileOrPath === 'object') {
    if (Buffer.isBuffer(fileOrPath)) {
      const uniqueName = `buf-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
      targetPath = path.join(UPLOADS_DIR, uniqueName);
      fs.writeFileSync(targetPath, fileOrPath);
      isTempCreated = true;
    } else if (fileOrPath.path) {
      targetPath = fileOrPath.path;
    } else if (fileOrPath.tempFilePath) {
      targetPath = fileOrPath.tempFilePath;
    } else if (fileOrPath.buffer && Buffer.isBuffer(fileOrPath.buffer)) {
      const ext = fileOrPath.originalname ? path.extname(fileOrPath.originalname) : '.png';
      const uniqueName = `upload-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      targetPath = path.join(UPLOADS_DIR, uniqueName);
      fs.writeFileSync(targetPath, fileOrPath.buffer);
      isTempCreated = true;
    }
  }

  if (!targetPath || typeof targetPath !== 'string') {
    throw new Error('Invalid file path or buffer provided for image upload.');
  }

  const filename = path.basename(targetPath);
  const backendBase = process.env.BACKEND_URL || process.env.API_BASE_URL || 'http://localhost:5000';

  if (isConfigured) {
    try {
      const result = await cloudinary.uploader.upload(targetPath, {
        folder: folder || 'hourstay_hms_assets'
      });
      // Delete local temporary file
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
    // Local fallback: Return local static URL path
    return {
      url: `${backendBase}/uploads/${filename}`,
      publicId: `local_${filename}`
    };
  }
};

// Delete asset from Cloudinary or local folder
const deleteImageFromCloudinary = async (publicId) => {
  if (!publicId) return;

  if (typeof publicId === 'string' && publicId.startsWith('local_')) {
    const filename = publicId.replace('local_', '');
    const localPath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log('🗑️ Local file removed:', filename);
    }
  } else if (isConfigured) {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log('🗑️ Cloudinary asset removed:', publicId);
    } catch (error) {
      console.error('Cloudinary asset removal failed:', error.message);
    }
  }
};

export { upload, uploadImageToCloudinary, deleteImageFromCloudinary };
