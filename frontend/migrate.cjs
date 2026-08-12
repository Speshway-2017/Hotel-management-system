const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const SRC_DIR = path.resolve(__dirname, '../ui/src');
const DEST_DIR = path.resolve(__dirname, './src');
const PUBLIC_SRC = path.resolve(__dirname, '../ui/public');
const PUBLIC_DEST = path.resolve(__dirname, './public');

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) fs.mkdirSync(to);
  fs.readdirSync(from).forEach(element => {
    if (fs.lstatSync(path.join(from, element)).isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    } else {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    }
  });
}

function camelCase(str) {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function mapRouteFile(filename) {
  if (filename === 'index.tsx') return 'pages/Home.jsx';
  if (filename === 'about.tsx') return 'pages/About.jsx';
  if (filename === 'features.tsx') return 'pages/Features.jsx';
  if (filename === 'contact.tsx') return 'pages/Contact.jsx';
  if (filename === 'search.tsx') return 'pages/Search.jsx';
  if (filename === 'rooms.$roomId.tsx') return 'pages/RoomDetails.jsx';
  if (filename === 'blog.index.tsx') return 'pages/BlogIndex.jsx';
  if (filename === 'blog.$slug.tsx') return 'pages/BlogPost.jsx';
  if (filename === 'login.tsx') return 'pages/Login.jsx';
  if (filename === 'register.tsx') return 'pages/Register.jsx';
  if (filename === 'forgot-password.tsx') return 'pages/ForgotPassword.jsx';
  if (filename === 'booking.index.tsx') return 'pages/BookingIndex.jsx';
  if (filename === 'booking.confirmation.tsx') return 'pages/BookingConfirmation.jsx';

  // Admin routes
  if (filename.startsWith('admin.')) {
    const sub = filename.substring(6); // remove 'admin.'
    if (sub === 'index.tsx') return 'roles/admin/pages/Dashboard.jsx';
    if (sub === 'tsx') return 'roles/admin/pages/AdminLayout.jsx'; // admin.tsx
    const cleanName = camelCase(sub.replace('.tsx', ''));
    return `roles/admin/pages/${cleanName}.jsx`;
  }

  // Manager routes
  if (filename.startsWith('manager.')) {
    const sub = filename.substring(8); // remove 'manager.'
    if (sub === 'index.tsx') return 'roles/manager/pages/Dashboard.jsx';
    if (sub === 'tsx') return 'roles/manager/pages/ManagerLayout.jsx'; // manager.tsx
    const cleanName = camelCase(sub.replace('.tsx', ''));
    return `roles/manager/pages/${cleanName}.jsx`;
  }

  // Reception routes (receptionist)
  if (filename.startsWith('reception.')) {
    const sub = filename.substring(10); // remove 'reception.'
    if (sub === 'index.tsx') return 'roles/receptionist/pages/Dashboard.jsx';
    if (sub === 'tsx') return 'roles/receptionist/pages/ReceptionLayout.jsx'; // reception.tsx
    const cleanName = camelCase(sub.replace('.tsx', ''));
    return `roles/receptionist/pages/${cleanName}.jsx`;
  }

  // Guest routes
  if (filename.startsWith('guest.')) {
    const sub = filename.substring(6); // remove 'guest.'
    if (sub === 'index.tsx') return 'roles/guest/pages/Dashboard.jsx';
    if (sub === 'tsx') return 'roles/guest/pages/GuestLayout.jsx'; // guest.tsx
    const cleanName = camelCase(sub.replace('.tsx', ''));
    return `roles/guest/pages/${cleanName}.jsx`;
  }

  // Super-admin routes
  if (filename.startsWith('super-admin.')) {
    const sub = filename.substring(12); // remove 'super-admin.'
    if (sub === 'index.tsx') return 'roles/super-admin/pages/Dashboard.jsx';
    if (sub === 'tsx') return 'roles/super-admin/pages/SuperAdminLayout.jsx'; // super-admin.tsx
    const cleanName = camelCase(sub.replace('.tsx', ''));
    return `roles/super-admin/pages/${cleanName}.jsx`;
  }

  return `pages/${filename.replace('.tsx', '.jsx').replace('.ts', '.js')}`;
}

function processFile(relativeSrcPath) {
  const srcPath = path.join(SRC_DIR, relativeSrcPath);
  const ext = path.extname(relativeSrcPath);
  
  if (relativeSrcPath.includes('routeTree.gen.ts') || 
      relativeSrcPath.includes('router.tsx') || 
      relativeSrcPath.includes('server.ts') || 
      relativeSrcPath.includes('start.ts') ||
      relativeSrcPath.includes('__root.tsx') ||
      relativeSrcPath.includes('README.md')) {
    console.log(`Skipping Tanstack Start specific file: ${relativeSrcPath}`);
    return;
  }

  let destSubPath = relativeSrcPath;

  if (relativeSrcPath.startsWith('components' + path.sep + 'hs' + path.sep)) {
    const filename = path.basename(relativeSrcPath);
    if (['SiteLayout.tsx', 'DashShell.tsx', 'Logo.tsx', 'nav.ts'].includes(filename)) {
      destSubPath = `layouts/${filename.replace('.tsx', '.jsx').replace('.ts', '.js')}`;
    } else {
      destSubPath = relativeSrcPath.replace('.tsx', '.jsx').replace('.ts', '.js');
    }
  } else if (relativeSrcPath.startsWith('lib' + path.sep)) {
    const filename = path.basename(relativeSrcPath);
    if (filename === 'hs-data.ts') {
      destSubPath = 'data/hs-data.js';
    } else if (filename === 'lovable-error-reporting.ts') {
      destSubPath = 'utils/lovable-error-reporting.js';
    } else if (filename === 'utils.ts') {
      destSubPath = 'utils/utils.js';
    } else {
      destSubPath = `utils/${filename.replace('.ts', '.js')}`;
    }
  } else if (relativeSrcPath.startsWith('routes' + path.sep)) {
    const filename = path.basename(relativeSrcPath);
    destSubPath = mapRouteFile(filename);
  } else if (relativeSrcPath === 'styles.css') {
    destSubPath = 'index.css';
  } else {
    destSubPath = relativeSrcPath.replace('.tsx', '.jsx').replace('.ts', '.js');
  }

  const destPath = path.join(DEST_DIR, destSubPath);
  ensureDirectoryExistence(destPath);

  if (ext === '.ts' || ext === '.tsx') {
    console.log(`Compiling TS -> JS: ${relativeSrcPath} -> ${destSubPath}`);
    const code = fs.readFileSync(srcPath, 'utf8');
    
    try {
      let transformed = babel.transformSync(code, {
        plugins: [
          ['@babel/plugin-transform-typescript', { isTSX: true, allExtensions: true }]
        ],
        parserOpts: {
          plugins: ['typescript', 'jsx']
        },
        filename: srcPath,
        retainLines: true
      }).code;

      transformed = transformed
        .replace(/from\s+["'].*?\/components\/hs\/SiteLayout["']/g, 'from "@/layouts/SiteLayout"')
        .replace(/from\s+["'].*?\/components\/hs\/DashShell["']/g, 'from "@/layouts/DashShell"')
        .replace(/from\s+["'].*?\/components\/hs\/Logo["']/g, 'from "@/layouts/Logo"')
        .replace(/from\s+["'].*?\/components\/hs\/nav["']/g, 'from "@/layouts/nav"')
        .replace(/from\s+["'].*?\/lib\/hs-data["']/g, 'from "@/data/hs-data"')
        .replace(/from\s+["'].*?\/lib\/lovable-error-reporting["']/g, 'from "@/utils/lovable-error-reporting"')
        .replace(/from\s+["'].*?\/lib\/utils["']/g, 'from "@/utils/utils"')
        .replace(/from\s+["'].*?\/lib\/error-capture["']/g, 'from "@/utils/error-capture"')
        .replace(/from\s+["'].*?\/lib\/error-page["']/g, 'from "@/utils/error-page"');

      if (!destSubPath.startsWith('layouts/')) {
        transformed = transformed
          .replace(/from\s+["']\.\/Logo["']/g, 'from "@/layouts/Logo"')
          .replace(/from\s+["']\.\/nav["']/g, 'from "@/layouts/nav"');
      }

      fs.writeFileSync(destPath, transformed, 'utf8');
    } catch (err) {
      console.error(`Error compiling ${srcPath}:`, err);
    }
  } else {
    console.log(`Copying asset: ${relativeSrcPath} -> ${destSubPath}`);
    fs.copyFileSync(srcPath, destPath);
  }
}

function scanDir(dir, baseDir = '') {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.join(baseDir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath, relPath);
    } else {
      processFile(relPath);
    }
  }
}

console.log('Starting migration...');
scanDir(SRC_DIR);
console.log('Copying public assets...');
copyFolderSync(PUBLIC_SRC, PUBLIC_DEST);
console.log('Migration finished.');
