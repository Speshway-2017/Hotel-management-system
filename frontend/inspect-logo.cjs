const fs = require('fs');
const PNG = require('pngjs').PNG;

const data = fs.readFileSync('src/assets/logo.png');
const png = PNG.sync.read(data);

let minX = png.width;
let maxX = 0;
let minY = png.height;
let maxY = 0;

for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (png.width * y + x) << 2;
    const alpha = png.data[idx + 3];
    
    if (alpha > 0) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

console.log(`Dimensions: ${png.width}x${png.height}`);
console.log(`Bounding Box of visible content:`);
console.log(`  X: ${minX} to ${maxX} (width: ${maxX - minX + 1})`);
console.log(`  Y: ${minY} to ${maxY} (height: ${maxY - minY + 1})`);
