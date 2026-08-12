const fs = require('fs');
const PNG = require('pngjs').PNG;

const data = fs.readFileSync('src/assets/logo.png');
const png = PNG.sync.read(data);

const gridW = 40;
const gridH = 30;

let output = '';
for (let gy = 0; gy < gridH; gy++) {
  for (let gx = 0; gx < gridW; gx++) {
    const x = Math.floor((gx / gridW) * png.width);
    const y = Math.floor((gy / gridH) * png.height);
    const idx = (png.width * y + x) << 2;
    const alpha = png.data[idx + 3];
    
    // Output char based on alpha
    if (alpha === 0) {
      output += ' ';
    } else if (alpha < 128) {
      output += '.';
    } else {
      output += '#';
    }
  }
  output += '\n';
}

console.log(output);
