const fs = require('fs');
const PNG = require('pngjs').PNG;

const data = fs.readFileSync('src/assets/logo.png');
const png = PNG.sync.read(data);

// From the ASCII grid, the icon is in the top 342 pixels of the image height (571)
const splitY = 342;

let minX = png.width;
let maxX = 0;
let minY = png.height;
let maxY = 0;

// Scan the top half to find the exact bounding box of the circular icon
for (let y = 0; y < splitY; y++) {
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

console.log(`Icon Bounding Box: X: ${minX} to ${maxX}, Y: ${minY} to ${maxY}`);
const width = maxX - minX + 1;
const height = maxY - minY + 1;
console.log(`Icon Dimensions: ${width}x${height}`);

// Create a new square PNG to hold the cropped icon
const cropped = new PNG({ width, height });

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const srcIdx = (png.width * (y + minY) + (x + minX)) << 2;
    const destIdx = (width * y + x) << 2;
    
    cropped.data[destIdx] = png.data[srcIdx];
    cropped.data[destIdx + 1] = png.data[srcIdx + 1];
    cropped.data[destIdx + 2] = png.data[srcIdx + 2];
    cropped.data[destIdx + 3] = png.data[srcIdx + 3];
  }
}

const buffer = PNG.sync.write(cropped);
fs.writeFileSync('src/assets/logo.png', buffer);
console.log('Icon cropped and saved back to logo.png successfully.');
