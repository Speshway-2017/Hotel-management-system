import fs from 'fs';
import path from 'path';

const frontendSrc = 'c:/projects/Hotel-management-system/frontend/src';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      callback(fullPath);
    }
  });
}

let count = 0;

walkDir(frontendSrc, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Inside PremiumStatCard or StatCard or KPI value blocks:
  // Replace font-black with font-bold / font-semibold and soften text-navy to text-slate-800
  if (content.includes('PremiumStatCard') || content.includes('StatCard') || filePath.includes('Dashboard') || filePath.includes('Reports')) {
    content = content.replace(/(<h[34]\s+[^>]*class(?:Name)?=["'][^"']*)\bfont-black\b([^"']*["'])/g, '$1font-bold$2');
    content = content.replace(/(<h[34]\s+[^>]*class(?:Name)?=["'][^"']*)\btext-navy\b([^"']*["']>)/g, '$1text-slate-800$2');
    content = content.replace(/(<p\s+[^>]*class(?:Name)?=["'][^"']*)\bfont-extrabold\s+text-navy\b([^"']*["']>)/g, '$1font-bold text-slate-800$2');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    count++;
    console.log(`Updated weight and color in: ${path.relative(frontendSrc, filePath)}`);
  }
});

console.log(`Total files updated: ${count}`);
