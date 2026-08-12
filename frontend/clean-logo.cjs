const fs = require('fs');
const PNG = require('pngjs').PNG;

const inputPath = 'src/assets/logo.png';
const outputPath = 'src/assets/logo.png';

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found at ${inputPath}`);
  process.exit(1);
}

const data = fs.readFileSync(inputPath);
const png = PNG.sync.read(data);

for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (png.width * y + x) << 2;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    
    // Check if pixel is close to white (threshold: 240 out of 255)
    if (r > 240 && g > 240 && b > 240) {
      png.data[idx + 3] = 0; // set alpha channel to 0 (transparent)
    }
  }
}

const buffer = PNG.sync.write(png);
fs.writeFileSync(outputPath, buffer);
console.log('Logo cleaned and saved successfully.');
