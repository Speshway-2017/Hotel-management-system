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

let modifiedFiles = 0;

walkDir(frontendSrc, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace font-display inside StatCard / PremiumStatCard header elements
  // e.g. font-display text-... font-black ... {value}
  // Pattern 1: class containing font-display and {value} on h3 or h4
  content = content.replace(/(<h[34]\s+[^>]*class(?:Name)?=["'][^"']*)\bfont-display\b([^"']*["'][^>]*>\s*\{value\}\s*<\/h[34]>)/g, (match, prefix, suffix) => {
    return `${prefix}font-sans tracking-tight tabular-nums${suffix}`;
  });

  // Pattern 2: Inside PremiumStatCard function declaration
  if (content.includes('function PremiumStatCard') || content.includes('function StatCard')) {
    content = content.replace(/(<h[34]\s+[^>]*class(?:Name)?=["'][^"']*)\bfont-display\b([^"']*["']>)/g, (match, prefix, suffix) => {
      return `${prefix}font-sans tracking-tight tabular-nums${suffix}`;
    });
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Updated KPI font in: ${path.relative(frontendSrc, filePath)}`);
  }
});

console.log(`Total files updated: ${modifiedFiles}`);
