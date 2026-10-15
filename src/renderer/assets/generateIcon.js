// Generates a valid 32x32 and 64x64 PNG icon with a vibrant Mantis teal/cyan circle
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function createPng(width, height) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // Raw image data with scanline filters
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.42;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Glowing cyan/teal gradient: #00ffcc -> #028090
        const factor = dist / radius;
        rawData[pxOffset + 0] = Math.floor(0 * (1 - factor) + 2 * factor); // R
        rawData[pxOffset + 1] = Math.floor(255 * (1 - factor) + 128 * factor); // G
        rawData[pxOffset + 2] = Math.floor(204 * (1 - factor) + 144 * factor); // B
        rawData[pxOffset + 3] = 255; // Alpha
      } else if (dist <= radius + 2) {
        // Soft outer antialias glow
        rawData[pxOffset + 0] = 0;
        rawData[pxOffset + 1] = 255;
        rawData[pxOffset + 2] = 204;
        rawData[pxOffset + 3] = 80;
      } else {
        // Transparent
        rawData[pxOffset + 0] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(calculateCrc(body), 0);

  return Buffer.concat([length, body, crc]);
}

function calculateCrc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

const targetPath = path.join(__dirname, 'icon.png');
fs.writeFileSync(targetPath, createPng(64, 64));
console.log('Generated icon.png at:', targetPath);
